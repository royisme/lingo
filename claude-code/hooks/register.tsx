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
  worthPreview,
} from './lang'
import type { Language } from './lang'

// ---- settings (from /config; a change there reloads this module) -----------

type Settings = {
  target: Language | undefined
  /** The model that translates: an alias (`haiku`) or a full id (`claude-haiku-4-5`). */
  model: string
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
    model: String(options.translationModel ?? '').trim() || 'haiku',
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
const LIMITED = { plugin: 'lingo', key: 'limited' } as const
const draft = atom(DRAFT, null)

const ACCENT = 'suggestion'
/** Quiet time before a draft is previewed: every edit or caret move starts it over (an IME pause is long). */
const PREVIEW_DELAY_MS = 1500
const MAX_TOKENS = 4096
/**
 * Calls start at least `gap` apart, whoever makes them (glosses, the preview). The gap adapts to
 * the account: it doubles on each rate limit (up to MAX_GAP_MS) and shrinks by GAP_STEP_MS on each
 * success, back to MIN_GAP_MS, so Lingo settles under whatever per-minute limit the account has.
 */
const MIN_GAP_MS = 1000
const MAX_GAP_MS = 10000
const GAP_STEP_MS = 500
/** After a rate limit or an overload every call waits this long, doubling up to COOLDOWN_MAX_MS. */
const COOLDOWN_MS = 5000
const COOLDOWN_MAX_MS = 60000
/** A call that would wait longer than this for its turn fails at once (Retry), instead of hanging. */
const MAX_WAIT_MS = 15000
const ATTEMPTS = 3
/** Translations kept across sessions, so a resumed transcript is not translated again. */
const STORED_GLOSSES = 500
const STORE_INDEX = 'gloss-index'
/** Glosses translated at once; the rest wait (a resumed session draws its whole history). */
const MAX_PARALLEL = 2

const TEXT = {
  translating: 'Translating…',
  waiting: 'Rate limited · waiting…',
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
/** Failed glosses this module has tried itself: its own failures, and earlier loads' tried once more. */
const autoRetried = new Set<string>()
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

/** `passing`: the failure may pass (a rate limit, an overload, a dropped call), so a later try may work. */
type Asked = { ok: true; text: string; outputTokens: number } | { ok: false; why: string; passing: boolean }

/** Points at the /config row when the model itself looks like the trouble. */
function modelHint(model: string): string {
  return `model "${model}" unavailable; set Lingo · Translation model in /config`
}

// ---- model choice: the cheap Haiku, and Haiku 4.5 when the account limits it ---------------

/**
 * Plugin calls go out as side queries (`$.model.complete` is a `hook_prompt` request of class
 * `auxiliary`), and some accounts rate-limit those on Haiku 5.5 while serving them on Haiku 4.5.
 * With the default `haiku`, two rate limits in a row move translation to Haiku 4.5 (ten times
 * the price) for FALLBACK_MS, then Haiku 5.5 is tried again. A model named in /config is kept.
 */
const DEFAULT_MODEL = 'haiku'
const FALLBACK_MODEL = 'claude-haiku-4-5'
const FALLBACK_MS = 30 * 60_000
let limitedInARow = 0
let fallbackUntil = 0
let fallbackToldOnce = false

async function currentModel($: EngineInterface): Promise<string> {
  if (settings.model !== DEFAULT_MODEL) return settings.model
  return fallbackUntil > (await $.clock.now()) ? FALLBACK_MODEL : DEFAULT_MODEL
}

/** Moves to FALLBACK_MODEL for a while; the cooldown was the other model's, so it is cleared. */
async function fallBack($: EngineInterface) {
  const now = await $.clock.now()
  fallbackUntil = now + FALLBACK_MS
  limitedInARow = 0
  cooldown = 0
  gap = MIN_GAP_MS
  nextStart = now
  await showLimited($, false)
  $.ui.log(`Lingo: ${DEFAULT_MODEL} is rate-limited as a side query; translating with ${FALLBACK_MODEL} for 30 min`, { to: 'debug' })
  if (!fallbackToldOnce) {
    fallbackToldOnce = true
    $.ui.toast(`Lingo: Haiku 5.5 is rate-limited for plugins on this account; using Haiku 4.5 for now`)
  }
}

/**
 * One completion at the lowest effort, tried again when the failure may pass (a rate limit, an
 * overload, a 5xx, a dropped connection, a call cut off). A failure says why in a few words,
 * drawn on the failed line and written to the debug log.
 */

// Module variables: a reload starts the pacing over, which at worst sends one call early.
let nextStart = 0
let cooldown = 0
let gap = MIN_GAP_MS

/**
 * Waits for this call's slot: `gap` after the last one, and past any cooldown.
 * Resolves 0 once it is this call's turn, or, without waiting, how long it would have to wait
 * when that is past MAX_WAIT_MS.
 */
async function waitTurn($: EngineInterface): Promise<number> {
  const now = await $.clock.now()
  const at = Math.max(now, nextStart)
  if (at - now > MAX_WAIT_MS) return at - now
  nextStart = at + gap
  if (at > now) await $.clock.sleep(at - now)
  return 0
}

/**
 * The account's usage windows that are nearly spent (`five_hour`, `seven_day`, a gateway's
 * spend limit), for a rate-limit line: tells a spent plan from calls that came too fast.
 */
async function accountWindows($: EngineInterface): Promise<string> {
  try {
    const hot = (await $.session.usage()).rateLimits
      .filter(w => w.percentUsed >= 80)
      .sort((a, b) => b.percentUsed - a.percentUsed)
    const w = hot[0]
    if (!w) return ''
    const at = w.resetsAt ? new Date(w.resetsAt) : undefined
    const resets =
      at && !Number.isNaN(at.getTime())
        ? `, resets ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
        : ''
    return `; ${w.kind} ${w.percentUsed}%${resets}`
  } catch {
    return ''
  }
}

let limitedShown = false

/** Whether waiting rows say "Rate limited · waiting…" rather than "Translating…". */
async function showLimited($: EngineInterface, on: boolean) {
  if (limitedShown === on) return
  limitedShown = on
  await $.state.set(LIMITED, on)
}

/** A rate limit or an overload: every call waits, longer each time until one goes through. */
async function backOff($: EngineInterface) {
  cooldown = cooldown ? Math.min(cooldown * 2, COOLDOWN_MAX_MS) : COOLDOWN_MS
  gap = Math.min(gap * 2, MAX_GAP_MS)
  nextStart = Math.max(nextStart, (await $.clock.now()) + cooldown)
  await showLimited($, true)
}

async function ask($: EngineInterface, system: string, prompt: string): Promise<Asked> {
  let why = ''
  let passing = false
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const wait = await waitTurn($)
    if (wait) {
      why = `rate limited; paused ${Math.ceil(wait / 1000)} s`
      passing = true
      break
    }
    const model = await currentModel($)
    let r
    try {
      // `low` is the least thinking a plugin can ask for: Haiku 5.5 cannot turn thinking off and
      // runs adaptive thinking at `medium` unless told; a model without effort (Haiku 4.5) drops it.
      r = await $.model.complete({ model, system, prompt, maxTokens: MAX_TOKENS, effort: 'low', timeoutMs: 30000 })
    } catch (err) {
      // The engine would not send it (a model not allowed, a setting): asking again changes nothing.
      why = `${modelHint(model)}: ${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`
      break
    }
    if (r.isAnswered) {
      limitedInARow = 0
      cooldown = 0
      gap = Math.max(MIN_GAP_MS, gap - GAP_STEP_MS)
      await showLimited($, false)
      return { ok: true, text: r.text, outputTokens: r.usage.output_tokens }
    }
    if (r.reason === 'api-error') {
      const { error, status } = r
      // An alias may name a model this account or gateway does not serve (haiku 5.5 where only 4.5 is).
      const badModel = error === 'model_not_found' || status === 404 || (status === 400 && error === 'invalid_request')
      why = status === null ? 'no connection' : badModel ? `${modelHint(model)} (${error} ${status})` : `${error} ${status}`
      const limited = status === 429 || status === 529 || error === 'rate_limit' || error === 'overloaded'
      const rateLimited = status === 429 || error === 'rate_limit'
      if (rateLimited) why += await accountWindows($)
      passing = limited || status === null || status >= 500
      if (rateLimited && model === DEFAULT_MODEL && ++limitedInARow >= 2) await fallBack($)
      else if (limited) await backOff($)
      else {
        await showLimited($, false)
        if (!passing) break
      }
    } else if (r.reason === 'aborted') {
      why = 'timed out or cut off' // the 30 s limit, or the plugin reloaded mid-call
      passing = true
    } else {
      why = 'empty reply'
      passing = false
      break
    }
  }
  $.ui.log(`Lingo: translation failed (${why})`, { to: 'debug' })
  return { ok: false, why, passing }
}

// ---- translations kept across sessions ($.store) --------------------------

/** A settled translation from an earlier session, if one was kept. */
async function storedGloss($: EngineInterface, id: string): Promise<Gloss | undefined> {
  try {
    const v = (await $.store.get(`g:${id}`)) as Gloss | undefined
    return v && (v.status === 'done' || v.status === 'same') ? { status: v.status, text: String(v.text ?? '') } : undefined
  } catch {
    return undefined
  }
}

let storeChain: Promise<void> = Promise.resolve()

/** Keeps a settled translation, the newest STORED_GLOSSES of them; writes one at a time. */
function keepGloss($: EngineInterface, id: string, gloss: Gloss) {
  if (gloss.status !== 'done' && gloss.status !== 'same') return
  storeChain = storeChain
    .then(async () => {
      const index = ((await $.store.get(STORE_INDEX)) as string[] | undefined) ?? []
      const next = [...index.filter(k => k !== id), id]
      await $.store.set(`g:${id}`, { status: gloss.status, text: gloss.text })
      for (const old of next.splice(0, Math.max(0, next.length - STORED_GLOSSES))) await $.store.delete(`g:${old}`)
      await $.store.set(STORE_INDEX, next)
    })
    .catch(() => undefined) // a full or failing store only costs a translation later
}

async function translate($: EngineInterface, text: string, target: Language, allowSame: boolean) {
  const sent = shield(text)
  const a = await ask($, systemPrompt(target, allowSame), sent.text)
  if (!a.ok) return { status: 'error', text: '', why: a.why, passing: a.passing } as const
  const out = a.text.trim()
  if (allowSame && out === SAME) return { status: 'same', text: '' } as const
  const cut = a.outputTokens >= MAX_TOKENS ? ' …' : '' // stopped at the cap
  return { status: 'done', text: plain(unshieldForDisplay(out, sent.kept)) + cut } as const
}

/** A draft the developer wrote in the target language: SAME, or a better version (FIX). */
async function polish($: EngineInterface, text: string, target: Language, mayTranslate: boolean) {
  const sent = shield(text)
  const a = await ask($, polishPrompt(target, mayTranslate), sent.text)
  if (!a.ok) return { status: 'error', text: '', why: a.why, passing: a.passing } as const
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
    const kept = await storedGloss($, id)
    if (kept) {
      await $.state.set(ref, kept)
      return
    }
    await $.state.set(ref, { status: 'pending', text: '' } satisfies Gloss)
    const gloss: Gloss = await translate($, text, target, allowSame)
    // This module has tried it now: no try by itself on the next draw (that is for earlier loads' failures).
    if (gloss.status === 'error') autoRetried.add(id)
    await $.state.set(ref, gloss)
    keepGloss($, id, gloss)
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
  // A row that failed on something passing (a rate limit) is tried once more by this module, paced.
  const retry = value?.status === 'error' && value.passing === true && !autoRetried.has(id)
  if (retry) autoRetried.add(id)
  if (!value || (value.status === 'pending' && !inFlight.has(id)) || retry) schedule($, text, target)
  if (value?.status === 'same') return row
  if ((await $.state.get({ ...HIDDEN, id })).value) return row
  // One menu per gloss, so a row whose text (and gloss) changes never shows a stale menu.
  const menuId = `${e.requestId}:${id}`
  const isOpen = (await $.state.get({ ...MENU, id: menuId })).value ?? false
  const limited = value?.status === 'error' || value?.status === 'done' ? false : ((await $.state.get(LIMITED)).value ?? false)

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
      <Text dimColor>{limited ? TEXT.waiting : TEXT.translating}</Text>
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
  if (isCommand(src) || !worthPreview(src)) return undefined
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
    const known = (await $.state.get(ref)).value ?? (await storedGloss($, id))
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
    let r: { status: 'done' | 'fix' | 'same' | 'error'; text: string; fix?: string; why?: string; passing?: boolean }
    try {
      r = kind === 'translate' ? await translate($, src, target, mode === 'ask') : await polish($, src, target, mayTranslate)
    } finally {
      if (previewGloss === id) previewGloss = undefined
    }
    // Settled answers go to the gloss too, so sending this draft costs no second call;
    // an error goes there only when the sent prompt was waiting on it (it shows Retry).
    // A fix means the draft is in the target: its gloss is `same`.
    const gloss: Gloss = r.status === 'fix' ? { status: 'same', text: '' } : { status: r.status, text: r.text, why: r.why, passing: r.passing }
    const waited = awaitingPreview.delete(id)
    if ((gloss.status !== 'error' || waited) && !inFlight.has(id)) {
      if (gloss.status === 'error') autoRetried.add(id)
      await $.state.set(ref, gloss)
      keepGloss($, id, gloss)
    }
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
    const limited = d.status === 'pending' && ((await $.state.get(LIMITED)).value ?? false)
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
            <Text dimColor>{limited ? TEXT.waiting : TEXT.translating}</Text>
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
