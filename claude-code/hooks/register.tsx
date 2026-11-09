import { atom, read } from 'claude-code'
import type { EngineInterface, HttpInit, HttpResponse, PluginOptions, Register, RenderElement, RenderInput } from 'claude-code'

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
  looksLikeCode,
  parseFeedback,
  plain,
  polishPrompt,
  previewPrompt,
  shield,
  systemPrompt,
  unshieldExact,
  unshieldForDisplay,
  unwrapAnswer,
  wrapForModel,
  worthPreview,
} from './lang'
import type { Item, Language, Word } from './lang'
import { addWords, readDeck } from './cards'
import { chatRequest, hostOf, readChat } from './openai'
import type { Attempt } from './openai'

// ---- settings (from /config; a change there reloads this module) -----------

type Settings = {
  target: Language | undefined
  /** The person's own language: explanations and word notes are written in it. */
  native: Language
  /** Who translates: Claude through Claude Code, or any OpenAI-compatible endpoint (Ollama, OpenRouter, ...). */
  provider: 'claude' | 'openai'
  /** The model that translates: an alias (`haiku`), a full id, or the provider's model name (`qwen2.5:7b`). */
  model: string
  /** With `openai`: the API base (`http://localhost:11434/v1`) and its key (none for a local Ollama). */
  baseUrl: string
  apiKey: string
  preview: boolean
  polish: boolean
  /** Translations start folded and are translated only when opened (no call until then). */
  fold: boolean
  prompts: boolean
  replies: boolean
  /** Save the key words of a translation preview as flashcards when it is sent or used. */
  saveWords: boolean
}

const NATIVE_DEFAULT = findLanguage('简体中文')!
const CONFIG_KEY = 'lingo.targetLanguage'
const OPENAI_COMPATIBLE = 'OpenAI-compatible'
const OLLAMA_URL = 'http://localhost:11434/v1'
const CALL_TIMEOUT_MS = 30000

function readSettings(options: PluginOptions): Settings {
  const bool = (v: unknown) => v !== false && v !== 'false'
  return {
    target: findLanguage(String(options.targetLanguage ?? 'English')),
    native: findLanguage(String(options.nativeLanguage ?? '')) ?? NATIVE_DEFAULT,
    provider: String(options.provider ?? '') === OPENAI_COMPATIBLE ? 'openai' : 'claude',
    model: String(options.translationModel ?? '').trim() || 'haiku',
    baseUrl: String(options.providerBaseUrl ?? '').trim() || OLLAMA_URL,
    apiKey: String(options.providerApiKey ?? ''),
    preview: bool(options.previewWhileTyping),
    polish: bool(options.polishWhileTyping),
    fold: bool(options.foldTranslations),
    prompts: bool(options.translatePrompts),
    replies: bool(options.translateReplies),
    saveWords: bool(options.saveWords),
  }
}

let settings: Settings = readSettings({})

// ---- state -----------------------------------------------------------------

const GLOSS = { plugin: 'lingo', key: 'gloss' } as const
const DRAFT = { plugin: 'lingo', key: 'draft' } as const
const MENU = { plugin: 'lingo', key: 'menu' } as const
const HIDDEN = { plugin: 'lingo', key: 'hidden' } as const
const LIMITED = { plugin: 'lingo', key: 'limited' } as const
const SHOWN = { plugin: 'lingo', key: 'shown' } as const
/** Words saved as flashcards from a sent prompt, by gloss id: the dim `· +N words` on its row. */
const SAVED = { plugin: 'lingo', key: 'saved' } as const
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
/** Cache version 2: translations cached before 0.4.1 may hold the model's reasoning, so the old `g:` keys are never read. */
const GLOSS_KEY = 'g2:'
const STORE_INDEX = 'gloss-index-2'
const OLD_GLOSS_KEY = 'g:'
const OLD_STORE_INDEX = 'gloss-index'
/** Glosses translated at once; the rest wait (a resumed session draws its whole history). */
const MAX_PARALLEL = 2

const TEXT = {
  translating: 'Translating…',
  waiting: 'Rate limited · waiting…',
  unfold: '▸ Translate',
  unfoldKept: '▸ Show translation',
  failed: 'Translation failed',
  retry: 'Translation failed · Retry',
  preview: 'Preview',
  better: 'Better',
  use: 'Use',
  hide: 'Hide this translation',
  off: 'Turn off Lingo',
  settings: 'Settings…',
}

const ARGUMENT_HINT = ['show', ...LANGUAGES.map(l => l.code), 'off'].join(' | ')

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
type Asked = { ok: true; text: string; cut: boolean } | { ok: false; why: string; passing: boolean }

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

/** One call through Claude Code's own client (`$.model.complete`). */
async function viaClaude($: EngineInterface, system: string, prompt: string): Promise<Attempt> {
  const model = await currentModel($)
  let r
  try {
    // `low` is the least thinking a plugin can ask for: Haiku 5.5 cannot turn thinking off and
    // runs adaptive thinking at `medium` unless told; a model without effort (Haiku 4.5) drops it.
    r = await $.model.complete({ model, system, prompt, maxTokens: MAX_TOKENS, effort: 'low', timeoutMs: CALL_TIMEOUT_MS })
  } catch (err) {
    // The engine would not send it (a model not allowed, a setting): asking again changes nothing.
    const why = `${modelHint(model)}: ${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`
    return { ok: false, why, limited: false, passing: false }
  }
  if (r.isAnswered) {
    limitedInARow = 0
    return { ok: true, text: r.text, cut: r.usage.output_tokens >= MAX_TOKENS }
  }
  if (r.reason === 'api-error') {
    const { error, status } = r
    // An alias may name a model this account or gateway does not serve (haiku 5.5 where only 4.5 is).
    const badModel = error === 'model_not_found' || status === 404 || (status === 400 && error === 'invalid_request')
    let why = status === null ? 'no connection' : badModel ? `${modelHint(model)} (${error} ${status})` : `${error} ${status}`
    const limited = status === 429 || status === 529 || error === 'rate_limit' || error === 'overloaded'
    const rateLimited = status === 429 || error === 'rate_limit'
    if (rateLimited) why += await accountWindows($)
    if (rateLimited && model === DEFAULT_MODEL && ++limitedInARow >= 2) {
      await fallBack($)
      return { ok: false, why, limited: false, passing: true } // the next try goes to the fallback model at once
    }
    return { ok: false, why, limited, passing: limited || status === null || status >= 500 }
  }
  if (r.reason === 'aborted') return { ok: false, why: 'timed out or cut off', limited: false, passing: true }
  return { ok: false, why: 'empty reply', limited: false, passing: false }
}

/** `$.http.fetch` has no time limit of its own: give up waiting after `ms`. */
async function fetchWithin($: EngineInterface, url: string, init: HttpInit, ms: number): Promise<HttpResponse | 'timeout'> {
  const stop = new AbortController()
  const late = $.clock.sleep(ms, { signal: stop.signal }).then(
    () => 'timeout' as const,
    () => 'timeout' as const,
  )
  try {
    return await Promise.race([$.http.fetch(url, init), late])
  } finally {
    stop.abort()
  }
}

/** One call to an OpenAI-compatible endpoint (`POST <base>/chat/completions`). */
async function viaOpenAI($: EngineInterface, system: string, prompt: string): Promise<Attempt> {
  if (settings.model === 'haiku')
    return { ok: false, why: "set Lingo · Translation model to your provider's model name", limited: false, passing: false }
  const req = chatRequest(settings.baseUrl, settings.apiKey, settings.model, system, prompt, MAX_TOKENS)
  let res
  try {
    res = await fetchWithin($, req.url, req.init, CALL_TIMEOUT_MS)
  } catch {
    // The engine's message repeats the URL; the host says enough. Ollama not running is the usual cause.
    return { ok: false, why: `no connection to ${hostOf(req.url)}; is it running?`, limited: false, passing: true }
  }
  if (res === 'timeout') return { ok: false, why: 'timed out', limited: false, passing: true }
  return readChat(res.status, res.text)
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
    const a = settings.provider === 'openai' ? await viaOpenAI($, system, prompt) : await viaClaude($, system, prompt)
    if (a.ok) {
      cooldown = 0
      gap = Math.max(MIN_GAP_MS, gap - GAP_STEP_MS)
      await showLimited($, false)
      return a
    }
    why = a.why
    passing = a.passing
    if (a.limited) await backOff($)
    else {
      await showLimited($, false)
      if (!a.passing) break
    }
  }
  $.ui.log(`Lingo: translation failed (${why})`, { to: 'debug' })
  return { ok: false, why, passing }
}

// ---- translations kept across sessions ($.store) --------------------------

/** A settled translation from an earlier session, if one was kept. */
async function storedGloss($: EngineInterface, id: string): Promise<Gloss | undefined> {
  try {
    const v = (await $.store.get(`${GLOSS_KEY}${id}`)) as Gloss | undefined
    return v && (v.status === 'done' || v.status === 'same') ? { status: v.status, text: String(v.text ?? '') } : undefined
  } catch {
    return undefined
  }
}

/** Once, best effort: frees the space of the version 1 cache (its entries and index); every error is ignored. */
async function dropOldGlosses($: EngineInterface) {
  try {
    const index = (await $.store.get(OLD_STORE_INDEX)) as string[] | undefined
    if (!Array.isArray(index)) return
    for (const id of index) await $.store.delete(`${OLD_GLOSS_KEY}${id}`)
    await $.store.delete(OLD_STORE_INDEX)
  } catch {
    // a failing store only leaves the old entries where they are
  }
}

let storeChain: Promise<void> = Promise.resolve()
let storeFullLogged = false

/** How many of the oldest cached translations a full store gives up to make room. */
const EVICT_GLOSSES = 100

/**
 * Sets a store key; when the store rejects it (4 MiB for the whole plugin), deletes the EVICT_GLOSSES oldest
 * translation-cache entries (front of the index), writes the shortened index and retries the set once.
 * Never throws: when the retry fails too it logs once per load and resolves false (true when the value was kept).
 * The eviction's own index write is a plain set, so it cannot evict again.
 * Writers must call it from `storeChain` (see keepGloss), so evictions and other writes never interleave.
 */
async function storeSet($: EngineInterface, key: string, value: unknown): Promise<boolean> {
  try {
    await $.store.set(key, value)
    return true
  } catch {
    // full (or failing): make room below
  }
  let retry = value
  try {
    const index = (await $.store.get(STORE_INDEX)) as string[] | undefined
    if (Array.isArray(index) && index.length > 0) {
      const dropped = index.slice(0, EVICT_GLOSSES)
      for (const id of dropped) await $.store.delete(`${GLOSS_KEY}${id}`)
      await $.store.set(STORE_INDEX, index.slice(EVICT_GLOSSES))
      // an index being written must not name what was just deleted
      if (key === STORE_INDEX && Array.isArray(value)) retry = value.filter(id => !dropped.includes(id))
    }
    await $.store.set(key, retry)
    return true
  } catch {
    if (!storeFullLogged) {
      storeFullLogged = true
      $.ui.log(`Lingo: store full; could not save ${key}`, { to: 'debug' })
    }
    return false
  }
}

/** Keeps a settled translation, the newest STORED_GLOSSES of them; writes one at a time. */
function keepGloss($: EngineInterface, id: string, gloss: Gloss) {
  if (gloss.status !== 'done' && gloss.status !== 'same') return
  storeChain = storeChain
    .then(async () => {
      if (!(await storeSet($, `${GLOSS_KEY}${id}`, { status: gloss.status, text: gloss.text }))) return
      // read after the entry write: a full store may have just shortened the index
      const index = ((await $.store.get(STORE_INDEX)) as string[] | undefined) ?? []
      const next = [...index.filter(k => k !== id), id]
      for (const old of next.splice(0, Math.max(0, next.length - STORED_GLOSSES))) await $.store.delete(`${GLOSS_KEY}${old}`)
      await storeSet($, STORE_INDEX, next)
    })
    .catch(() => undefined) // a failing store only costs a translation later
}

/** The store key that tells the one-time toast was raised. */
const TOLD_KEY = 'cards-told'
const deckKey = (target: Language) => `cards1:${target.code}`
const savedLabel = (n: number) => `+${n} ${n === 1 ? 'word' : 'words'}`

/**
 * Saves a translation's key words as flashcards in the background (a prompt is never delayed, a failing
 * store never blocks one), on the translation cache's chain and through `storeSet`. Only after the deck
 * was written, and only when a card was created, the mark is set for the gloss id and, once ever, a toast
 * says where the cards went. A failed write: one debug line, no mark.
 */
function captureWords($: EngineInterface, target: Language, words: Word[], ctx: string, id: string) {
  const job = async () => {
    try {
      const key = deckKey(target)
      const old = readDeck(await $.store.get(key))
      const { deck, added } = addWords(old, words, ctx, settings.native.code, await $.clock.now())
      if (added === 0 && JSON.stringify(deck) === JSON.stringify(old)) return
      if (!(await storeSet($, key, deck))) {
        $.ui.log('Lingo: could not save words as flashcards', { to: 'debug' })
        return
      }
      if (added === 0) return
      await $.state.set({ ...SAVED, id }, added)
      if (!(await $.store.get(TOLD_KEY))) {
        await storeSet($, TOLD_KEY, true)
        $.ui.toast(`Lingo: saved ${savedLabel(added).slice(1)} as flashcards · /lingo review`)
      }
    } catch (err) {
      $.ui.log(`Lingo: could not save words as flashcards (${err instanceof Error ? err.message : String(err)})`, { to: 'debug' })
    }
  }
  storeChain = storeChain.then(job).catch(() => undefined)
}

async function translate($: EngineInterface, text: string, target: Language, allowSame: boolean) {
  const sent = shield(text)
  const a = await ask($, systemPrompt(target, allowSame), wrapForModel(sent.text))
  if (!a.ok) return { status: 'error', text: '', why: a.why, passing: a.passing } as const
  const out = unwrapAnswer(a.text)
  if (allowSame && out === SAME) return { status: 'same', text: '' } as const
  const cut = a.cut ? ' …' : '' // stopped at the cap
  return { status: 'done', text: plain(unshieldForDisplay(out, sent.kept)) + cut } as const
}

/** What the preview asks for a draft: the translation or the polish, and the learning detail with it. */
type PreviewResult =
  | { status: 'done' | 'fix' | 'same'; text: string; fix?: string; items?: Item[]; words?: Word[] }
  | { status: 'error'; text: string; why: string; passing: boolean }

/** A translation of a draft with a few words worth learning; falls back to plain text when the reply is not JSON. */
async function previewTranslate($: EngineInterface, text: string, target: Language, allowSame: boolean): Promise<PreviewResult> {
  const sent = shield(text)
  const a = await ask($, previewPrompt(target, settings.native, allowSame), wrapForModel(sent.text))
  if (!a.ok) return { status: 'error', text: '', why: a.why, passing: a.passing }
  const out = unwrapAnswer(a.text)
  const cut = a.cut ? ' …' : '' // stopped at the cap
  // What Use puts in the box: the translation with code, commands and mentions as written, never a cut one.
  const replacement = (raw: string) => (a.cut || hasChip(text) ? undefined : unshieldExact(raw, sent.kept))
  const f = parseFeedback(out)
  if (!f) {
    if (allowSame && out === SAME) return { status: 'same', text: '' }
    return { status: 'done', text: plain(unshieldForDisplay(out, sent.kept)) + cut, fix: replacement(out) }
  }
  if (f.mode === 'same' && allowSame) return { status: 'same', text: '' }
  if (f.mode !== 'translate') return { status: 'error', text: '', why: 'unexpected reply', passing: false }
  return {
    status: 'done',
    text: plain(unshieldForDisplay(f.text, sent.kept)) + cut,
    fix: replacement(f.text),
    words: f.words.map(w => ({ word: unshieldForDisplay(w.word, sent.kept), note: w.note })),
  }
}

/** A draft the developer wrote in the target language: same, or a better version (fix) with its changes explained. */
async function polish($: EngineInterface, text: string, target: Language, mayTranslate: boolean): Promise<PreviewResult> {
  const sent = shield(text)
  const a = await ask($, polishPrompt(target, settings.native, mayTranslate), wrapForModel(sent.text))
  if (!a.ok) return { status: 'error', text: '', why: a.why, passing: a.passing }
  const out = unwrapAnswer(a.text)
  const f = parseFeedback(out)
  let fixed: string
  let items: Item[] | undefined
  if (f) {
    if (f.mode === 'same') return { status: 'same', text: '' }
    if (f.mode === 'translate') {
      if (!mayTranslate) return { status: 'same', text: '' }
      return {
        status: 'done',
        text: plain(unshieldForDisplay(f.text, sent.kept)),
        words: f.words.map(w => ({ word: unshieldForDisplay(w.word, sent.kept), note: w.note })),
      }
    }
    fixed = f.text
    items = f.items.map(i => ({
      wrong: unshieldForDisplay(i.wrong, sent.kept),
      right: unshieldForDisplay(i.right, sent.kept),
      reason: i.reason,
    }))
  } else {
    if (out === SAME) return { status: 'same', text: '' }
    const marked = out.startsWith(FIX)
    if (!marked && mayTranslate) return { status: 'done', text: plain(unshieldForDisplay(out, sent.kept)) }
    fixed = (marked ? out.slice(FIX.length) : out).trim()
  }
  // A fix keeps the draft's own marks (backticks, emphasis): it may replace the draft.
  if (!fixed || fixed === sent.text) return { status: 'same', text: '' }
  // Use is offered only when every command, mention and code block comes back as written.
  const whole = hasChip(text) ? undefined : unshieldExact(fixed, sent.kept)
  return { status: 'fix', text: unshieldForDisplay(fixed, sent.kept), fix: whole, items }
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

/** Opens a folded translation: translates it now, or shows the one already kept. */
async function unfold($: EngineInterface, rowId: string, text: string, target: Language) {
  await $.state.set({ ...SHOWN, id: rowId }, true)
  schedule($, text, target)
}

async function fold($: EngineInterface, rowId: string) {
  await $.state.set({ ...SHOWN, id: rowId }, false)
}

/** The newest reply drawn, for `/lingo show` where a row's buttons cannot be clicked (a terminal's main screen). */
let lastReply: { requestId: string; text: string } | undefined

async function openSettings($: EngineInterface, menuId: string) {
  await $.state.set({ ...MENU, id: menuId }, false)
  await $.prompt.fill({ text: '/config' })
}

// ---- drawing ---------------------------------------------------------------

/** `· +2 words` for a prompt whose key words were saved as flashcards; read-only (it is drawn in a render). */
async function savedMark($: EngineInterface, id: string): Promise<string | undefined> {
  const n = (await $.state.get({ ...SAVED, id })).value ?? 0
  return n > 0 ? `· ${savedLabel(n)}` : undefined
}

/** A row that draws no gloss (a prompt already in the target, as after Use) still carries the mark. */
async function savedRow($: EngineInterface, e: RenderInput, row: RenderElement, id: string): Promise<RenderElement> {
  const mark = await savedMark($, id)
  if (!mark) return row
  const { Box, Text } = $.ui.resolve(e)
  return (
    <Box flexDirection="column">
      {row}
      <Box paddingLeft={2} marginTop={1}>
        <Text dimColor>{mark}</Text>
      </Box>
    </Box>
  )
}

/** The message row with a gloss under it: language tag + italic translation, and the tag's menu. */
async function glossRow($: EngineInterface, e: RenderInput, row: RenderElement, text: string): Promise<RenderElement> {
  const target = settings.target
  if (!target) return row
  const id = glossId(target, text)
  const verdict = decide(text, target)
  if (verdict === 'skip') return savedRow($, e, row, id)

  // One menu (and one fold) per gloss, so a row whose text changes never shows a stale one.
  const menuId = `${e.requestId}:${id}`
  const kept = (await $.state.get({ ...GLOSS, id })).value
  // Folded, and with folding off a reply too (one call per turn: the turn's final reply is opened
  // when the turn completes): closed until opened, unless its translation is already kept.
  const closed = settings.fold || e.component === 'AssistantMessage'
  const shown =
    !closed || ((await $.state.get({ ...SHOWN, id: menuId })).value ?? false) || (!settings.fold && kept?.status === 'done')
  // A row that failed on something passing (a rate limit) under an earlier load, perhaps another
  // provider, is tried once more by this module, and drawn as translating, not as the old failure.
  const retry = shown && kept?.status === 'error' && kept.passing === true && !autoRetried.has(id)
  if (retry) autoRetried.add(id)
  if (shown && (!kept || (kept.status === 'pending' && !inFlight.has(id)) || retry)) schedule($, text, target)
  const value = retry ? undefined : kept
  // Already in the target: nothing to offer, unless the person opened it (then it says so).
  if (value?.status === 'same' && !(settings.fold && shown)) return savedRow($, e, row, id)
  if ((await $.state.get({ ...HIDDEN, id })).value) return savedRow($, e, row, id)
  const isOpen = (await $.state.get({ ...MENU, id: menuId })).value ?? false
  const limited = value?.status === 'error' || value?.status === 'done' ? false : ((await $.state.get(LIMITED)).value ?? false)

  const { Box, Button, Text } = $.ui.resolve(e)
  const framed = e.surface !== 'terminal'
  const mark = await savedMark($, id)

  const tag = (
    <Button key="lingo-tag" plain onPress={() => void toggleMenu($, menuId)}>
      <Text color={ACCENT} bold size="caption">
        {target.tag}
      </Text>
    </Button>
  )

  const body = !shown ? (
    // Folded: one control and no call. A translation already kept (a preview) opens for free.
    <Button key="lingo-unfold" plain onPress={() => void unfold($, menuId, text, target)}>
      <Text dimColor>{value?.status === 'done' ? TEXT.unfoldKept : TEXT.unfold}</Text>
    </Button>
  ) : value?.status === 'done' ? (
    settings.fold ? (
      <Button key="lingo-fold" plain onPress={() => void fold($, menuId)}>
        <Text color={ACCENT} italic>
          {value.text}
        </Text>
      </Button>
    ) : (
      <Text color={ACCENT} italic>
        {value.text}
      </Text>
    )
  ) : value?.status === 'same' ? (
    <Text dimColor>{`Already in ${target.option}`}</Text>
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
        {mark && <Text dimColor>{mark}</Text>}
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
  if (isCommand(src) || !worthPreview(src) || looksLikeCode(src)) return undefined
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
    let r: PreviewResult
    try {
      r = kind === 'translate' ? await previewTranslate($, src, target, mode === 'ask') : await polish($, src, target, mayTranslate)
    } finally {
      if (previewGloss === id) previewGloss = undefined
    }
    // Settled answers go to the gloss too, so sending this draft costs no second call;
    // an error goes there only when the sent prompt was waiting on it (it shows Retry).
    // A fix means the draft is in the target: its gloss is `same`.
    const gloss: Gloss =
      r.status === 'fix'
        ? { status: 'same', text: '' }
        : r.status === 'error'
          ? { status: 'error', text: '', why: r.why, passing: r.passing }
          : { status: r.status, text: r.text }
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
    await $.state.set(DRAFT, {
      src,
      status: r.status,
      text: r.text,
      kind: answerKind,
      ...(r.status === 'error' ? { why: r.why } : { fix: r.fix, items: r.items, words: r.words }),
    } satisfies Draft)
  } finally {
    if (previewInFlight === src) previewInFlight = undefined
  }
}

function queuePreview($: EngineInterface) {
  previewTimer?.cancel()
  if (!settings.target || !(settings.preview || settings.polish)) return
  previewTimer = $.clock.after(PREVIEW_DELAY_MS, () => void runPreview($))
}

/** Puts the better version or the translation in the prompt box, code, commands and mentions as written; it is not checked again. */
async function useFix($: EngineInterface, text: string) {
  previewTimer?.cancel()
  // A translation's words are saved now: the text sent next is the translation, not this draft's source,
  // so the submit rule would not see them. The draft turns to `same` below, which keeps submit from saving them again.
  const d = (await $.state.get(DRAFT)).value
  const target = settings.target
  if (settings.saveWords && target && d?.status === 'done' && d.kind === 'translate' && d.words?.length) {
    captureWords($, target, d.words, d.text, glossId(target, text))
  }
  await $.state.set(DRAFT, { src: text.trim(), status: 'same', text: '', kind: 'polish' } satisfies Draft)
  await $.prompt.fill({ text })
}

async function clearPreview($: EngineInterface) {
  previewTimer?.cancel()
  previewTimer = undefined
  previewInFlight = undefined
  if ((await $.state.get(DRAFT)).value) await $.state.set(DRAFT, null)
}

/**
 * Polling for the final reply's row after `turn.complete` (it can come before the row is drawn).
 * A newer turn's `turn.start` bumps `turnToken` and cancels the timer, so an older turn stops looking.
 */
let turnToken = 0
let pollTimer: { cancel: () => void } | undefined
const POLL_MS = 100
const POLL_TRIES = 20

/** The answer a turn ended with against a reply's text: equal, or the answer is the last block of a longer reply (or the reverse). */
function sameReply(a: string, b: string): boolean {
  const x = a.trim()
  const y = b.trim()
  return x !== '' && y !== '' && (x === y || x.endsWith(y) || y.endsWith(x))
}

async function openLatest($: EngineInterface, reply: { requestId: string; text: string }, target: Language) {
  await unfold($, `${reply.requestId}:${glossId(target, reply.text)}`, reply.text, target)
}

/** `/lingo show`: opens and translates the newest reply, for surfaces where its row cannot be clicked. */
async function showLatest($: EngineInterface): Promise<{ text: string }> {
  const target = settings.target
  if (!target) return { text: 'Lingo is off. Turn it on with /lingo en (or another language).' }
  if (!lastReply) return { text: 'Lingo: no reply to translate yet.' }
  if (decide(lastReply.text, target) === 'skip') return { text: `Lingo: the latest reply needs no translation into ${target.option}.` }
  await openLatest($, lastReply, target)
  return { text: 'Lingo: translating the latest reply.' }
}

// ---- hooks -----------------------------------------------------------------

export const register: Register = (on, options) => {
  settings = readSettings(options)

  on('session.start', async ($, e, next) => {
    // A reload (a /config change, such as switching the provider) starts the pacing over; a
    // "rate limited" mark left by the code before it would show on rows this code never limited.
    await $.state.set(LIMITED, false)
    await $.command.register({
      name: 'lingo',
      description: 'Translate the latest reply (/lingo show) or switch the language: /lingo fr, /lingo ja, /lingo off',
      argumentHint: ARGUMENT_HINT,
    })
    void dropOldGlosses($)
    return next(e)
  })

  on('command.run', { command: 'lingo' }, async ($, e) => {
    const arg = String(e.args ?? '').trim()
    if (arg.toLowerCase() === 'show') return showLatest($)
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

  // With folding off, a reply costs one call per turn: the final one, translated as the turn ends.
  // An interrupted or failed turn, a subagent's turn and a turn with no closing text open nothing.
  on('turn.start', async ($, e, next) => {
    if (!e.agentId) {
      turnToken++
      pollTimer?.cancel()
      pollTimer = undefined
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const target = settings.target
    if (target && !settings.fold && settings.replies && !e.agentId && e.reason === 'answer' && e.answer) {
      // The answer names the final reply. Its row may not be drawn yet (`lastReply` can still be an
      // earlier block): look again for a moment. A render hook must not write state, so the opening
      // is done here, with this hook's `$`.
      const answer = e.answer
      const token = ++turnToken
      pollTimer?.cancel()
      let tries = 0
      const tick = () => {
        if (token !== turnToken) return
        if (lastReply && sameReply(lastReply.text, answer)) {
          pollTimer = undefined
          void openLatest($, lastReply, target).catch(() => undefined)
        } else if (++tries < POLL_TRIES) pollTimer = $.clock.after(POLL_MS, tick)
        else pollTimer = undefined
      }
      if (lastReply && sameReply(lastReply.text, answer)) await openLatest($, lastReply, target)
      else pollTimer = $.clock.after(POLL_MS, tick)
    }
    return next(e)
  }).catch(($, e, next) => next(e)) // never block a turn's end over a translation

  // Start translating a prompt the moment it is sent, so its row finds it ready.
  on('prompt.submit', async ($, e, next) => {
    const target = settings.target
    if (target && settings.prompts && !settings.fold && !isCommand(e.text)) schedule($, e.text, target)
    // The words of a previewed translation, when that very draft is sent (the mark goes on the sent prompt's row).
    const d = (await $.state.get(DRAFT)).value
    if (
      settings.saveWords && target && e.origin?.kind === 'composer' && !isCommand(e.text) &&
      d?.status === 'done' && d.words?.length && d.src === e.text.trim()
    ) {
      captureWords($, target, d.words, d.text, glossId(target, e.text))
    }
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
    lastReply = { requestId: e.requestId, text: e.props.text }
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
    const whole = d.status === 'fix' || d.status === 'done' ? d.fix : undefined
    // Detail rows under the first, dim: what was wrong for a fix, the words to learn for a translation.
    const details: string[] = []
    if (d.status === 'fix' || d.status === 'done' || d.status === 'pending') {
      if (polishing) {
        for (const i of d.items ?? []) details.push(`"${i.wrong}" → "${i.right}"${i.reason ? `  ${i.reason}` : ''}`)
      } else if (d.words?.length) {
        details.push(d.words.map(w => (w.note ? `${w.word} — ${w.note}` : w.word)).join(' · '))
      }
    }
    // The first row always stays; the others fit what the band may take, the last ones dropped.
    const rows = details.slice(0, Math.max(0, e.props.maxRows - 1))
    const first = (
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
    if (rows.length === 0) return first
    return (
      <Box flexDirection="column">
        {first}
        {rows.map((line, i) => (
          <Text key={`lingo-detail-${i}`} dimColor wrap="truncate-end">
            {line}
          </Text>
        ))}
      </Box>
    )
  })
}
