import { atom, read } from 'claude-code'
import type { EngineInterface, PluginOptions, Register, RenderElement, RenderInput } from 'claude-code'

import type { Draft, Gloss } from '../types'
import { LANGUAGES, OFF, SAME, decide, findLanguage, forModel, hash, plain, systemPrompt } from './lang'
import type { Language } from './lang'

// ---- settings (from /config; a change there reloads this module) -----------

type Settings = {
  target: Language | undefined
  preview: boolean
  prompts: boolean
  replies: boolean
}

const CONFIG_KEY = 'lingo.targetLanguage'

function readSettings(options: PluginOptions): Settings {
  const bool = (v: unknown) => v !== false && v !== 'false'
  return {
    target: findLanguage(String(options.targetLanguage ?? 'English')),
    preview: bool(options.previewWhileTyping),
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
/** Glosses translated at once; the rest wait (a resumed session draws its whole history). */
const MAX_PARALLEL = 2

const TEXT = {
  translating: 'Translating…',
  failed: 'Translation failed',
  retry: 'Translation failed · Retry',
  preview: 'Preview',
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
let previewTimer: { cancel: () => void } | undefined

/** One gloss per target and text; the preview of a draft and the sent prompt share it. */
function glossId(target: Language, text: string): string {
  return hash(target.code + '\u0000' + text.trim())
}

// ---- translation (outside any render) --------------------------------------

async function translate($: EngineInterface, text: string, target: Language, allowSame: boolean) {
  try {
    const r = await $.model.complete({
      model: 'haiku',
      system: systemPrompt(target, allowSame),
      prompt: forModel(text),
      maxTokens: MAX_TOKENS,
      timeoutMs: 30000,
    })
    if (!r.isAnswered) return { status: 'error', text: '' } as const
    const out = r.text.trim()
    if (allowSame && out === SAME) return { status: 'same', text: '' } as const
    const cut = r.usage.output_tokens >= MAX_TOKENS ? ' …' : '' // stopped at the cap
    return { status: 'done', text: plain(out) + cut } as const
  } catch {
    return { status: 'error', text: '' } as const
  }
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
        <Text dimColor>{TEXT.retry}</Text>
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

async function runPreview($: EngineInterface) {
  const target = settings.target
  const src = (await $.prompt.read()).text.trim()
  const verdict = target ? decide(src, target) : 'skip'
  if (!target || !settings.preview || verdict === 'skip') {
    if ((await $.state.get(DRAFT)).value) await $.state.set(DRAFT, null)
    return
  }
  const held = (await $.state.get(DRAFT)).value
  // A settled answer for this very draft (a translation, or "already in the target") is kept:
  // a pause or a caret move does not ask again.
  if ((held && held.src === src && (held.status === 'done' || held.status === 'same')) || previewInFlight === src) return
  previewInFlight = src
  try {
    // The prompt's gloss may already hold this text (a draft recalled from history).
    const id = glossId(target, src)
    const ref = { ...GLOSS, id }
    const known = (await $.state.get(ref)).value
    if (known?.status === 'done' || known?.status === 'same') {
      await $.state.set(DRAFT, { src, status: known.status, text: known.text } satisfies Draft)
      return
    }
    const prev = held?.status === 'done' ? held.text : ''
    await $.state.set(DRAFT, { src, status: 'pending', text: prev } satisfies Draft)
    const r = await translate($, src, target, verdict === 'ask')
    // Settled answers go to the gloss too, so sending this draft costs no second call.
    if (r.status !== 'error' && !inFlight.has(id)) await $.state.set(ref, r satisfies Gloss)
    // The person may have typed on meanwhile: keep only the answer for the newest draft.
    if ((await $.prompt.read()).text.trim() !== src) return
    if (settings.target?.code !== target.code || !settings.preview) return
    await $.state.set(DRAFT, { src, status: r.status, text: r.text } satisfies Draft)
  } finally {
    if (previewInFlight === src) previewInFlight = undefined
  }
}

function queuePreview($: EngineInterface) {
  previewTimer?.cancel()
  if (!settings.target || !settings.preview) return
  previewTimer = $.clock.after(PREVIEW_DELAY_MS, () => void runPreview($))
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
    if (target && settings.prompts) schedule($, e.text, target)
    await clearPreview($)
    return next(e)
  }).catch(($, e, next) => next(e)) // never block a prompt over a translation

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    if (!settings.prompts || e.props.origin.kind !== 'composer') return row
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
    if (!target || !settings.preview || !d || d.status === 'same' || e.props.hasSurvey) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" gap={1}>
        <Text color={ACCENT} bold size="caption">
          {target.tag}
        </Text>
        <Text dimColor size="caption">
          {TEXT.preview}
        </Text>
        <Box flexShrink={1}>
          {d.status === 'error' ? (
            <Text dimColor>{TEXT.failed}</Text>
          ) : d.text ? (
            <Text color={ACCENT} italic dimColor={d.status === 'pending'}>
              {d.text}
            </Text>
          ) : (
            <Text dimColor>{TEXT.translating}</Text>
          )}
        </Box>
      </Box>
    )
  })
}
