import { atom, read } from 'claude-code'
import type { EngineInterface, PluginOptions, Register, RenderElement, RenderInput } from 'claude-code'

import type { Draft, Gloss } from '../types'
import {
  FIX,
  LANGUAGES,
  OFF,
  SAME,
  classify,
  decide,
  findLanguage,
  hasChip,
  hash,
  isCommand,
  plain,
  polishPrompt,
  shield,
  systemPrompt,
  unshieldExact,
  unshieldForDisplay,
} from './lang'
import type { Language } from './lang'

// ---- settings (from /config; a change there reloads this module) -----------

type Settings = {
  target: Language | undefined
  preview: boolean
  polish: boolean
  prompts: boolean
  replies: boolean
}

const CONFIG_KEY = 'lingo.targetLanguage'

function readSettings(options: PluginOptions): Settings {
  const bool = (v: unknown) => v !== false && v !== 'false'
  return {
    target: findLanguage(String(options.targetLanguage ?? 'English')),
    preview: bool(options.previewWhileTyping),
    polish: bool(options.polishWhileTyping),
    prompts: bool(options.translatePrompts),
    replies: bool(options.translateReplies),
  }
}

let settings: Settings = readSettings({})

// ---- state -----------------------------------------------------------------

const GLOSS = { plugin: 'lingo', key: 'gloss' } as const
const DRAFT = { plugin: 'lingo', key: 'draft' } as const
const MENU = { plugin: 'lingo', key: 'menu' } as const
const HIDDEN = { plugin: 'lingo', key: 'hidden' } as const
const draft = atom(DRAFT, null)

const ACCENT = 'suggestion'
const PREVIEW_DELAY_MS = 600
const MAX_TOKENS = 4096
const RETRY_DELAY_MS = 1500
/** Glosses translated at once; the rest wait (a resumed session draws its whole history). */
const MAX_PARALLEL = 2

const TEXT = {
  translating: 'Translating…',
  failed: 'Translation failed',
  retry: 'Translation failed · Retry',
  preview: 'Preview',
  better: 'Better',
  use: 'Use',
  hide: 'Hide this translation',
  off: 'Turn off Lingo',
  settings: 'Settings…',
}

const ARGUMENT_HINT = [...LANGUAGES.map(l => l.code), 'off'].join(' | ')

// Module variables: lost on a reload, which at worst runs one translation twice.
// A gloss left `pending` with no entry here was started by a module since reloaded: it is redone.
const inFlight = new Set<string>()
/** Glosses waiting for a free slot: each starts its own translation. */
const queue: Array<() => void> = []
let running = 0
let previewInFlight: string | undefined
/** The gloss the preview is translating now: a prompt sent meanwhile waits for it, not a second call. */
let previewGloss: string | undefined
/** Glosses asked for while the preview held them; on a preview error they turn into a retry. */
const awaitingPreview = new Set<string>()
let previewTimer: { cancel: () => void } | undefined

/** One gloss per target and text; the preview of a draft and the sent prompt share it. */
function glossId(target: Language, text: string): string {
  return hash(target.code + '\u0000' + text.trim())
}

// ---- translation (outside any render) --------------------------------------

type Asked = { ok: true; text: string; outputTokens: number } | { ok: false; why: string }

/**
 * One completion, retried once after a pause when the failure may pass (a rate limit, an
 * overload, a 5xx, a dropped connection, a call cut off). A failure says why in a few words,
 * drawn on the failed line and written to the debug log.
 */
async function ask($: EngineInterface, system: string, prompt: string): Promise<Asked> {
  let why = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await $.clock.sleep(RETRY_DELAY_MS)
    let r
    try {
      r = await $.model.complete({ model: 'haiku', system, prompt, maxTokens: MAX_TOKENS, timeoutMs: 30000 })
    } catch (err) {
      // The engine would not send it (a blocked model, a setting): asking again changes nothing.
      why = `refused: ${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`
      break
    }
    if (r.isAnswered) return { ok: true, text: r.text, outputTokens: r.usage.output_tokens }
    if (r.reason === 'api-error') {
      const { error, status } = r
      why = status === null ? 'no connection' : `${error} ${status}`
      const passing = status === null || status === 429 || status >= 500 || error === 'rate_limit' || error === 'overloaded'
      if (!passing) break
    } else if (r.reason === 'aborted') {
      why = 'timed out or cut off' // the 30 s limit, or the plugin reloaded mid-call
    } else {
      why = 'empty reply'
      break
    }
  }
  $.ui.log(`Lingo: translation failed (${why})`, { to: 'debug' })
  return { ok: false, why }
}

async function translate($: EngineInterface, text: string, target: Language, allowSame: boolean) {
  const sent = shield(text)
  const a = await ask($, systemPrompt(target, allowSame), sent.text)
  if (!a.ok) return { status: 'error', text: '', why: a.why } as const
  const out = a.text.trim()
  if (allowSame && out === SAME) return { status: 'same', text: '' } as const
  const cut = a.outputTokens >= MAX_TOKENS ? ' …' : '' // stopped at the cap
  return { status: 'done', text: plain(unshieldForDisplay(out, sent.kept)) + cut } as const
}

/** A draft the developer wrote in the target language: SAME, or a better version (FIX). */
async function polish($: EngineInterface, text: string, target: Language, mayTranslate: boolean) {
  const sent = shield(text)
  const a = await ask($, polishPrompt(target, mayTranslate), sent.text)
  if (!a.ok) return { status: 'error', text: '', why: a.why } as const
  const out = a.text.trim()
  if (out === SAME) return { status: 'same', text: '' } as const
  const marked = out.startsWith(FIX)
  if (!marked && mayTranslate) return { status: 'done', text: plain(unshieldForDisplay(out, sent.kept)) } as const
  // A fix keeps the draft's own marks (backticks, emphasis): it may replace the draft.
  const fixed = (marked ? out.slice(FIX.length) : out).trim()
  if (!fixed || fixed === sent.text) return { status: 'same', text: '' } as const
  // Use is offered only when every command, mention and code block comes back as written.
  const whole = hasChip(text) ? undefined : unshieldExact(fixed, sent.kept)
  return { status: 'fix' as const, text: unshieldForDisplay(fixed, sent.kept), fix: whole }
}

async function runGloss($: EngineInterface, text: string, target: Language, id: string, allowSame: boolean) {
  try {
    const ref = { ...GLOSS, id }
    const { value } = await $.state.get(ref)
    // `pending` here is an orphan (this module owns `id` now): translate it again.
    if (value?.status === 'done' || value?.status === 'same') return
    await $.state.set(ref, { status: 'pending', text: '' } satisfies Gloss)
    await $.state.set(ref, (await translate($, text, target, allowSame)) satisfies Gloss)
  } finally {
    inFlight.delete(id)
  }
}

/** Starts queued glosses up to MAX_PARALLEL, newest first: the rows nearest the prompt. */
function pump() {
  while (running < MAX_PARALLEL && queue.length > 0) {
    running++
    queue.pop()!()
  }
}

function done() {
  running--
  pump()
}

function schedule($: EngineInterface, text: string, target: Language) {
  const verdict = decide(text, target)
  if (verdict === 'skip') return
  const id = glossId(target, text)
  if (inFlight.has(id)) return
  if (id === previewGloss) {
    awaitingPreview.add(id)
    return
  }
  inFlight.add(id)
  const allowSame = verdict === 'ask'
  queue.push(() => $.clock.after(0, () => void runGloss($, text, target, id, allowSame).finally(done)))
  pump()
}

// ---- actions from the tag menu ---------------------------------------------

async function toggleMenu($: EngineInterface, menuId: string) {
  const ref = { ...MENU, id: menuId }
  const open = (await $.state.get(ref)).value ?? false
  await $.state.set(ref, !open)
}

async function setLanguage($: EngineInterface, menuId: string, option: string) {
  await $.state.set({ ...MENU, id: menuId }, false)
  const r = await $.config.set({ key: CONFIG_KEY, value: option })
  if ('deny' in r && r.deny) $.ui.toast(`Lingo: couldn't change the language (${r.deny})`)
}

async function hideGloss($: EngineInterface, menuId: string, id: string) {
  await $.state.set({ ...MENU, id: menuId }, false)
  await $.state.set({ ...HIDDEN, id }, true)
}

async function openSettings($: EngineInterface, menuId: string) {
  await $.state.set({ ...MENU, id: menuId }, false)
  await $.prompt.fill({ text: '/config' })
}

// ---- drawing ---------------------------------------------------------------

/** The message row with a gloss under it: language tag + italic translation, and the tag's menu. */
async function glossRow($: EngineInterface, e: RenderInput, row: RenderElement, text: string): Promise<RenderElement> {
  const target = settings.target
  if (!target) return row
  const verdict = decide(text, target)
  if (verdict === 'skip') return row

  const id = glossId(target, text)
  const { value } = await $.state.get({ ...GLOSS, id })
  if (!value || (value.status === 'pending' && !inFlight.has(id))) schedule($, text, target)
  if (value?.status === 'same') return row
  if ((await $.state.get({ ...HIDDEN, id })).value) return row
  // One menu per gloss, so a row whose text (and gloss) changes never shows a stale menu.
  const menuId = `${e.requestId}:${id}`
  const isOpen = (await $.state.get({ ...MENU, id: menuId })).value ?? false

  const { Box, Button, Text } = $.ui.resolve(e)
  const framed = e.surface !== 'terminal'

  const tag = (
    <Button key="lingo-tag" plain onPress={() => void toggleMenu($, menuId)}>
      <Text color={ACCENT} bold size="caption">
        {target.tag}
      </Text>
    </Button>
  )

  const body =
    value?.status === 'done' ? (
      <Text color={ACCENT} italic>
        {value.text}
      </Text>
    ) : value?.status === 'error' ? (
      <Button key="lingo-retry" plain onPress={() => schedule($, text, target)}>
        <Text dimColor>{value.why ? `${TEXT.failed} (${value.why}) · Retry` : TEXT.retry}</Text>
      </Button>
    ) : (
      <Text dimColor>{TEXT.translating}</Text>
    )

  return (
    <Box flexDirection="column">
      {row}
      <Box flexDirection="row" gap={1} marginTop={1} paddingLeft={2}>
        {framed ? (
          <Box borderStyle="round" borderColor={ACCENT} paddingX={1}>
            {tag}
          </Box>
        ) : (
          tag
        )}
        <Box flexShrink={1}>{body}</Box>
      </Box>
      {isOpen && (
        <Box flexDirection="column" gap={1} marginTop={1} paddingLeft={2}>
          <Box flexDirection="row" flexWrap="wrap" gap={2}>
            {LANGUAGES.map(l => (
              <Button
                key={`lingo-lang-${l.code}`}
                plain
                onPress={() => void setLanguage($, menuId, l.option)}
              >
                {l.code === target.code ? (
                  <Text color={ACCENT} bold>
                    {l.option} ✓
                  </Text>
                ) : (
                  l.option
                )}
              </Button>
            ))}
          </Box>
          <Box flexDirection="row" flexWrap="wrap" gap={2}>
            <Button key="lingo-hide" plain onPress={() => void hideGloss($, menuId, id)}>
              {TEXT.hide}
            </Button>
            <Button key="lingo-off" plain onPress={() => void setLanguage($, menuId, OFF)}>
              {TEXT.off}
            </Button>
            <Button key="lingo-settings" plain onPress={() => void openSettings($, menuId)}>
              <Text dimColor>{TEXT.settings}</Text>
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ---- live preview ----------------------------------------------------------

type PreviewMode = 'translate' | 'ask' | 'polish' | 'either'

/**
 * What the band does for a draft: translate it (another language), polish it (the target
 * language), or let the model tell the two apart (`ask` / `either`, same script, unsure).
 */
function previewMode(src: string, target: Language): PreviewMode | undefined {
  if (isCommand(src)) return undefined
  switch (classify(src, target)) {
    case 'other':
      return settings.preview ? 'translate' : undefined
    case 'target':
      return settings.polish ? 'polish' : undefined
    case 'unsure':
      return settings.polish ? 'either' : settings.preview ? 'ask' : undefined
    default:
      return undefined
  }
}

async function runPreview($: EngineInterface) {
  const target = settings.target
  const src = (await $.prompt.read()).text.trim()
  const mode = target ? previewMode(src, target) : undefined
  if (!target || !mode) {
    if ((await $.state.get(DRAFT)).value) await $.state.set(DRAFT, null)
    return
  }
  const kind = mode === 'translate' || mode === 'ask' ? 'translate' : 'polish'
  const held = (await $.state.get(DRAFT)).value
  // A settled answer for this very draft is kept: a pause or a caret move does not ask again.
  const settled = held?.src === src && held.status !== 'pending' && held.status !== 'error'
  if (settled || previewInFlight === src) return
  previewInFlight = src
  try {
    // The prompt's gloss may already hold this text (a draft recalled from history).
    const id = glossId(target, src)
    const ref = { ...GLOSS, id }
    const known = (await $.state.get(ref)).value
    if (known?.status === 'done' || (known?.status === 'same' && kind === 'translate')) {
      await $.state.set(DRAFT, { src, status: known.status, text: known.text, kind: 'translate' } satisfies Draft)
      return
    }
    // Known to be in the target already: only the polish is left to ask.
    const mayTranslate = mode === 'either' && known?.status !== 'same'
    const shown = held?.status === 'done' || held?.status === 'fix'
    await $.state.set(DRAFT, {
      src,
      status: 'pending',
      text: shown ? held.text : '',
      kind: shown ? held.kind : kind,
    } satisfies Draft)
    previewGloss = id
    let r: { status: 'done' | 'fix' | 'same' | 'error'; text: string; fix?: string; why?: string }
    try {
      r = kind === 'translate' ? await translate($, src, target, mode === 'ask') : await polish($, src, target, mayTranslate)
    } finally {
      if (previewGloss === id) previewGloss = undefined
    }
    // Settled answers go to the gloss too, so sending this draft costs no second call;
    // an error goes there only when the sent prompt was waiting on it (it shows Retry).
    // A fix means the draft is in the target: its gloss is `same`.
    const gloss: Gloss = r.status === 'fix' ? { status: 'same', text: '' } : { status: r.status, text: r.text, why: r.why }
    const waited = awaitingPreview.delete(id)
    if ((gloss.status !== 'error' || waited) && !inFlight.has(id)) await $.state.set(ref, gloss)
    // The person may have typed on meanwhile: keep only the answer for the newest draft.
    if ((await $.prompt.read()).text.trim() !== src) return
    if (settings.target?.code !== target.code) return
    // An unsure draft may turn out to be another language while only the polish is on.
    if (r.status === 'done' && !settings.preview) r = { status: 'same', text: '' }
    const answerKind = r.status === 'done' ? 'translate' : r.status === 'fix' ? 'polish' : kind
    await $.state.set(DRAFT, { src, status: r.status, text: r.text, kind: answerKind, fix: r.fix, why: r.why } satisfies Draft)
  } finally {
    if (previewInFlight === src) previewInFlight = undefined
  }
}

function queuePreview($: EngineInterface) {
  previewTimer?.cancel()
  if (!settings.target || !(settings.preview || settings.polish)) return
  previewTimer = $.clock.after(PREVIEW_DELAY_MS, () => void runPreview($))
}

/** Puts the better version in the prompt box, code, commands and mentions as written; it is not checked again. */
async function useFix($: EngineInterface, text: string) {
  previewTimer?.cancel()
  await $.state.set(DRAFT, { src: text.trim(), status: 'same', text: '', kind: 'polish' } satisfies Draft)
  await $.prompt.fill({ text })
}

async function clearPreview($: EngineInterface) {
  previewTimer?.cancel()
  previewTimer = undefined
  previewInFlight = undefined
  if ((await $.state.get(DRAFT)).value) await $.state.set(DRAFT, null)
}

// ---- hooks -----------------------------------------------------------------

export const register: Register = (on, options) => {
  settings = readSettings(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'lingo',
      description: 'Switch the language Lingo translates into: /lingo fr, /lingo ja, /lingo off',
      argumentHint: ARGUMENT_HINT,
    })
    return next(e)
  })

  on('command.run', { command: 'lingo' }, async ($, e) => {
    const arg = String(e.args ?? '').trim()
    const lang = findLanguage(arg)
    const option = arg.toLowerCase() === 'off' ? OFF : lang?.option
    if (!option) {
      const now = settings.target?.option ?? OFF
      return { text: `Lingo: translating into ${now}. Try /lingo fr, /lingo ja or /lingo off; /config has every setting.` }
    }
    const r = await $.config.set({ key: CONFIG_KEY, value: option })
    if ('deny' in r && r.deny) return { text: `Lingo: couldn't change the language (${r.deny}).` }
    return { text: option === OFF ? 'Lingo: translations off.' : `Lingo: translating into ${option}.` }
  })

  // Start translating a prompt the moment it is sent, so its row finds it ready.
  on('prompt.submit', async ($, e, next) => {
    const target = settings.target
    if (target && settings.prompts && !isCommand(e.text)) schedule($, e.text, target)
    await clearPreview($)
    return next(e)
  }).catch(($, e, next) => next(e)) // never block a prompt over a translation

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    if (!settings.prompts || e.props.origin.kind !== 'composer' || isCommand(e.props.text)) return row
    return glossRow($, e, row, e.props.text)
  })

  // Claude's text blocks; tool calls are rows of their own and never reach here.
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const row = await next(e)
    if (!settings.replies || e.props.isSummary) return row
    return glossRow($, e, row, e.props.text)
  })

  on('prompt.edit', async ($, e, next) => {
    const result = await next(e)
    queuePreview($)
    return result
  })

  on('prompt.change', async ($, e, next) => {
    const result = await next(e)
    if (e.origin.kind === 'clear') await clearPreview($)
    else queuePreview($)
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const target = settings.target
    const d = await read($, draft)
    if (!target || !d || d.status === 'same' || e.props.hasSurvey) return next(e)
    const polishing = d.kind === 'polish'
    if (!(polishing ? settings.polish : settings.preview)) return next(e)
    // Checking a draft written in the target stays quiet until there is something to suggest.
    if (polishing && (d.status === 'error' || (d.status === 'pending' && !d.text))) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const whole = polishing && d.status === 'fix' ? d.fix : undefined
    return (
      <Box flexDirection="row" gap={1}>
        <Text color={ACCENT} bold size="caption">
          {target.tag}
        </Text>
        <Text dimColor size="caption">
          {polishing ? TEXT.better : TEXT.preview}
        </Text>
        <Box flexShrink={1}>
          {d.status === 'error' ? (
            <Text dimColor>{d.why ? `${TEXT.failed} (${d.why})` : TEXT.failed}</Text>
          ) : d.text ? (
            <Text color={ACCENT} italic dimColor={d.status === 'pending'}>
              {d.text}
            </Text>
          ) : (
            <Text dimColor>{TEXT.translating}</Text>
          )}
        </Box>
        {whole !== undefined && (
          <Button key="lingo-use" plain hotkey="u" onPress={() => void useFix($, whole)}>
            {TEXT.use}
          </Button>
        )}
      </Box>
    )
  })
}
