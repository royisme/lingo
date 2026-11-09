// Flashcards: pure logic, host-agnostic like lang.ts (no `$`, no engine imports).
import { LANGUAGES, hash, type Code, type Word } from './lang'

/** One saved word and its schedule (SM-2, Anki flavour). */
export type Card = {
  /** `hash(normWord(word))`; the dedupe key inside a deck. */
  id: string
  /** Target language, at most 60 characters. */
  word: string
  /** Native language, at most 120 characters. */
  note: string
  /** The translated sentence the word came from, at most 200 characters. */
  ctx?: string
  /** Language the note is written in. */
  native: Code
  /** ms at capture. */
  added: number
  /** ms; equals `added` until first rated. */
  due: number
  /** Days; 0 = new or relearning. */
  ivl: number
  /** Starts 2.5, never below 1.3, kept to 2 decimals. */
  ease: number
  /** Ratings so far; 0 = new. */
  reps: number
  lapses: number
}

/** Again, Hard, Good, Easy. */
export type Grade = 1 | 2 | 3 | 4

export const DAY = 86_400_000
export const MAX_CARDS = 500
export const SESSION_MAX = 20
export const NEW_MAX = 10

const RELEARN_MS = 600_000
const LEEWAY_MS = 4 * 3_600_000
const MIN_EASE = 1.3
const START_EASE = 2.5
const MAX_IVL = 365
const MAX_WORD = 60
const MAX_NOTE = 120
const MAX_CTX = 200
const BAD_CHARS = /[⟦`/\\{}<>=_$]/

/** The comparison form of a word: width-folded, trimmed, lower case, single spaces. */
export function normWord(w: string): string {
  return w.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Whether a word and its note make a card worth keeping. */
export function cardable(word: string, note: string): boolean {
  const w = word.trim()
  const n = note.trim()
  if (!w || !n) return false
  if (w.length > MAX_WORD || BAD_CHARS.test(w)) return false
  return normWord(w) !== normWord(n)
}

function cut(s: string, max: number): string {
  if (s.length <= max) return s
  let t = s.slice(0, max)
  const last = t.charCodeAt(t.length - 1)
  if (last >= 0xd800 && last <= 0xdbff) t = t.slice(0, -1)
  return t
}

function clip(s: string): string {
  return s.length <= MAX_CTX ? s : cut(s, MAX_CTX - 2) + ' …'
}

/**
 * Adds cards for words not yet in the deck; returns a new deck and how many cards were created.
 * A known word keeps its schedule, note and context, except that a different `native` refreshes
 * `note` and `native`. Over `MAX_CARDS`, the largest `ivl` goes first, ties by oldest `added`,
 * never a card added in this call.
 */
export function addWords(
  deck: readonly Card[],
  words: readonly Word[],
  ctx: string,
  native: Code,
  now: number,
): { deck: Card[]; added: number } {
  const out = deck.slice()
  const fresh = new Set<string>()
  const context = clip(ctx.trim())
  for (const x of words) {
    if (!cardable(x.word, x.note)) continue
    const word = x.word.trim()
    const note = cut(x.note.trim(), MAX_NOTE)
    const id = hash(normWord(word))
    const at = out.findIndex((c) => c.id === id)
    if (at >= 0) {
      const old = out[at]!
      if (!fresh.has(id) && old.native !== native) out[at] = { ...old, note, native }
      continue
    }
    fresh.add(id)
    const card: Card = { id, word, note, native, added: now, due: now, ivl: 0, ease: START_EASE, reps: 0, lapses: 0 }
    if (context) card.ctx = context
    out.push(card)
  }
  const excess = out.length - MAX_CARDS
  if (excess > 0) {
    const gone = new Set(
      out
        .filter((c) => !fresh.has(c.id))
        .sort((a, b) => b.ivl - a.ivl || a.added - b.added)
        .slice(0, excess)
        .map((c) => c.id),
    )
    return { deck: out.filter((c) => !gone.has(c.id)), added: fresh.size }
  }
  return { deck: out, added: fresh.size }
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** A new card after a rating; never mutates. `reps` goes up on every grade. */
export function rate(card: Card, g: Grade, now: number): Card {
  let { ivl, ease, lapses } = card
  const reps = card.reps + 1
  let again = false
  if (ivl === 0) {
    if (g === 1) again = true
    else if (g === 2) ivl = 1
    else if (g === 3) ivl = 2
    else {
      ivl = 4
      ease += 0.15
    }
  } else if (g === 1) {
    again = true
    ivl = 0
    ease -= 0.2
    lapses += 1
  } else if (g === 2) {
    ivl = Math.max(ivl + 1, Math.round(ivl * 1.2))
    ease -= 0.15
  } else if (g === 3) {
    ivl = Math.max(ivl + 1, Math.round(ivl * ease))
  } else {
    ivl = Math.max(ivl + 1, Math.round(ivl * ease * 1.3))
    ease += 0.15
  }
  ivl = Math.min(ivl, MAX_IVL)
  ease = Math.max(MIN_EASE, round2(ease))
  const due = again || ivl < 1 ? now + RELEARN_MS : now + ivl * DAY
  return { ...card, ivl, ease, reps, lapses, due }
}

/** Whether a card belongs in a review now: new, or due within 4 hours (so a daily habit is not missed by minutes). */
export function isDue(card: Card, now: number): boolean {
  return card.reps === 0 || card.due <= now + LEEWAY_MS
}

/** Due cards, most overdue first (up to `SESSION_MAX`), then new cards, newest first (up to `NEW_MAX`). */
export function pickSession(cards: readonly Card[], now: number): Card[] {
  const due = cards
    .filter((c) => c.reps > 0 && isDue(c, now))
    .sort((a, b) => a.due - b.due)
    .slice(0, SESSION_MAX)
  const room = Math.min(NEW_MAX, SESSION_MAX - due.length)
  const fresh = cards
    .filter((c) => c.reps === 0)
    .sort((a, b) => b.added - a.added)
    .slice(0, room)
  return [...due, ...fresh]
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** A deck from stored JSON: tolerant; anything of the wrong shape is dropped, numbers are clamped. */
export function readDeck(raw: unknown): Card[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Card[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const { word, note, native, ctx } = o
    if (typeof word !== 'string' || typeof note !== 'string') continue
    if (!LANGUAGES.some((l) => l.code === native)) continue
    if (!isNum(o.added) || !isNum(o.due) || !isNum(o.ivl) || !isNum(o.ease) || !isNum(o.reps) || !isNum(o.lapses)) continue
    const w = cut(word.trim(), MAX_WORD)
    const n = cut(note.trim(), MAX_NOTE)
    if (!w || !n) continue
    const id = hash(normWord(w))
    if (seen.has(id)) continue
    seen.add(id)
    const card: Card = {
      id,
      word: w,
      note: n,
      native: native as Code,
      added: o.added,
      due: o.due,
      ivl: clamp(Math.round(o.ivl), 0, MAX_IVL),
      ease: Math.max(MIN_EASE, round2(o.ease)),
      reps: Math.max(0, Math.floor(o.reps)),
      lapses: Math.max(0, Math.floor(o.lapses)),
    }
    if (typeof ctx === 'string' && ctx.trim()) card.ctx = clip(ctx.trim())
    out.push(card)
  }
  return out
}

/** The deck without the card for `word` (matched by `normWord`). */
export function removeWord(deck: readonly Card[], word: string): { deck: Card[]; removed: boolean } {
  const id = hash(normWord(word))
  const rest = deck.filter((c) => c.id !== id)
  return { deck: rest, removed: rest.length < deck.length }
}

/** Counts for a report: all cards, reviewed cards due, new cards, and when the next reviewed card falls due. */
export function deckStats(
  deck: readonly Card[],
  now: number,
): { total: number; due: number; fresh: number; nextDue?: number } {
  let due = 0
  let fresh = 0
  let nextDue: number | undefined
  for (const c of deck) {
    if (c.reps === 0) fresh++
    else if (isDue(c, now)) due++
    else if (nextDue === undefined || c.due < nextDue) nextDue = c.due
  }
  const stats: { total: number; due: number; fresh: number; nextDue?: number } = { total: deck.length, due, fresh }
  if (nextDue !== undefined) stats.nextDue = nextDue
  return stats
}

/** A span as `10m`, `3h` or `2d`. */
export function fmtInterval(ms: number): string {
  if (ms < 3_600_000) return `${Math.max(1, Math.round(ms / 60_000))}m`
  if (ms < DAY) return `${Math.round(ms / 3_600_000)}h`
  return `${Math.round(ms / DAY)}d`
}
