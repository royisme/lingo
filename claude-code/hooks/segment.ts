// Paragraph segmentation of a long text and the aligned translation call's prompt and parser.
// Pure: no `$`, no engine.

import type { Gloss } from '../types'
import { DELIMITED, JSON_ONLY, KEEP_PATHS, MARKERS, SAME, prose } from './lang'
import type { Language } from './lang'

/** `src`: the Markdown to draw; `say`: the prose for the model, '' when the chunk has none (code). */
export type Chunk = { src: string; say: string }

export const MAX_PARTS = 40

const FENCE = /^\s*(`{3,}|~{3,})/
const LIST = /^\s*(?:[-*+]|\d+[.)])\s/
const HEADING = /^#{1,6}\s/
const THEMATIC = /^([-*_])(?:\s*\1){2,}$/
const TABLE_SEP = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$/

type Raw = { lines: string[]; fence: boolean }
type Block = { src: string; say: string; keep: boolean }

/** Lines into blocks: a fence is one block (blank lines kept), blank lines elsewhere separate blocks. */
function blocksOf(lines: string[]): Raw[] {
  const out: Raw[] = []
  let cur: string[] = []
  let fence: { ch: string; len: number } | undefined
  const flush = () => {
    if (cur.length) out.push({ lines: cur, fence: false })
    cur = []
  }
  for (const line of lines) {
    if (fence) {
      cur.push(line)
      const t = line.trimStart()
      if (t.startsWith(fence.ch.repeat(fence.len))) {
        out.push({ lines: cur, fence: true })
        cur = []
        fence = undefined
      }
      continue
    }
    const m = FENCE.exec(line)
    if (m) {
      flush()
      cur = [line]
      fence = { ch: m[1][0], len: m[1].length }
    } else if (line.trim() === '') flush()
    else cur.push(line)
  }
  if (cur.length) out.push({ lines: cur, fence: fence !== undefined })
  return out
}

/** What the model reads of a prose block: a table without its separator row, a quote without its `>`. */
function sayOf(lines: string[]): string {
  const table = lines[0].trimStart().startsWith('|') || (lines[1] !== undefined && /^\s*\|?\s*:?-{3,}/.test(lines[1]))
  let out = table ? lines.filter(l => !TABLE_SEP.test(l)) : lines
  if (lines[0].trimStart().startsWith('>')) out = out.map(l => l.replace(/^\s*>\s?/, ''))
  return out.join('\n')
}

const headingOnly = (src: string) => src.split('\n').filter(l => l.trim()).every(l => HEADING.test(l))

/** Splits a text into chunks: each prose block (a paragraph, a list, a table, a quote) closes one, after the code before it. */
export function segment(text: string): Chunk[] {
  const lines = text.trim().split('\n')
  // A list is one block: a list marker or an indented block continues the one before it.
  const raws: Raw[] = []
  for (const b of blocksOf(lines)) {
    const prev = raws[raws.length - 1]
    if (prev && !prev.fence && !b.fence && LIST.test(prev.lines[0]) && (LIST.test(b.lines[0]) || /^(?: {2,}|\t)/.test(b.lines[0]))) {
      prev.lines.push('', ...b.lines)
    } else raws.push(b)
  }
  const blocks: Block[] = raws.map(r => {
    const src = r.lines.join('\n')
    if (r.fence) return { src, say: '', keep: true }
    const say = sayOf(r.lines)
    return { src, say, keep: THEMATIC.test(src.trim()) || !/\p{L}/u.test(prose(say)) }
  })
  // A heading joins the prose block after it; before code it stands alone.
  const joined: Block[] = []
  let head: Block | undefined
  for (let b of blocks) {
    if (head) {
      if (!b.keep) b = { src: `${head.src}\n\n${b.src}`, say: `${head.say}\n${b.say}`, keep: false }
      else joined.push(head)
      head = undefined
    }
    if (!b.keep && headingOnly(b.src)) head = b
    else joined.push(b)
  }
  if (head) joined.push(head)

  const chunks: Chunk[] = []
  let pending: string[] = []
  for (const b of joined) {
    if (b.keep) pending.push(b.src)
    else {
      chunks.push({ src: [...pending, b.src].join('\n\n'), say: b.say })
      pending = []
    }
  }
  if (pending.length) chunks.push({ src: pending.join('\n\n'), say: '' })
  if (chunks.length > MAX_PARTS) {
    const rest = chunks.splice(MAX_PARTS - 1)
    chunks.push({ src: rest.map(c => c.src).join('\n\n'), say: rest.map(c => c.say).filter(Boolean).join('\n\n') })
  }
  return chunks
}

/** How many chunks carry prose for the model. */
export const proseCount = (chunks: readonly Chunk[]) => chunks.filter(c => c.say).length

/** The chunks of a text long enough for a paragraph-aligned translation (3+ prose segments, or 2+ in 600+ characters), else undefined. */
export function alignable(text: string): Chunk[] | undefined {
  const chunks = segment(text)
  const n = proseCount(chunks)
  return n >= 3 || (n >= 2 && text.trim().length >= 600) ? chunks : undefined
}

/** The system prompt for the aligned call: `n` numbered segments in, `{"t":[...]}` out. */
export function alignedPrompt(target: Language, n: number, allowSame: boolean): string {
  return [
    `You translate messages from a conversation between a software developer and a coding assistant into natural, idiomatic ${target.prompt}.`,
    DELIMITED.replace('%DO%', 'translate'),
    `The message is split into ${n} segments; each starts with a line [#k].`,
    `Answer {"t":["<translation of segment 1>", ...]}: "t" holds exactly ${n} strings, item k translating segment [#k]. Never merge, split, drop or reorder segments.`,
    'Each string is plain text without Markdown; use \\n between list items or table rows; do not repeat the [#k] line.',
    MARKERS,
    KEEP_PATHS,
    allowSame ? `If the whole message is already written in ${target.prompt}, answer exactly {"same":true}.` : '',
    JSON_ONLY,
  ]
    .filter(Boolean)
    .join(' ')
}

/** The segments as the model reads them: `[#1]`, the segment, a blank line, `[#2]`, ... */
export function numbered(parts: readonly string[]): string {
  return parts.map((p, i) => `[#${i + 1}]\n${p}`).join('\n\n')
}

export type Aligned =
  | { kind: 'same' }
  | { kind: 'parts'; parts: string[]; cut?: boolean }
  | { kind: 'whole'; text: string }

const JSON_STRING = /\s*,?\s*("(?:[^"\\]|\\.)*")/y

/**
 * Reads the answer to the aligned call. Undefined when it is unusable (broken JSON, empty strings,
 * nothing salvaged): the caller translates the whole text instead. `cut`: the answer stopped at the
 * token cap, so its complete items are kept.
 */
export function parseAligned(raw: string, n: number, cut: boolean, allowSame = false): Aligned | undefined {
  const s = raw
    .trim()
    .replace(/^```(?:json)?[ \t]*\n?/i, '')
    .replace(/\n?```$/, '')
    .trim()
  if (!s) return undefined
  if (allowSame && (s === SAME || /^\{\s*"same"\s*:\s*true\s*\}$/.test(s))) return { kind: 'same' }
  if (s[0] !== '{' && (s[0] !== '[' || /^\[#\d/.test(s))) {
    // a model that ignored the format: its text, without the segment lines
    const text = s.replace(/^\[#\d+\][ \t]*\n?/gm, '').trim()
    return text ? { kind: 'whole', text } : undefined
  }
  let v: unknown
  try {
    v = JSON.parse(s.slice(0, s.lastIndexOf(s[0] === '{' ? '}' : ']') + 1))
  } catch {
    return cut ? salvage(s, n) : undefined
  }
  if (allowSame && v && typeof v === 'object' && !Array.isArray(v) && (v as { same?: unknown }).same === true) return { kind: 'same' }
  const t = Array.isArray(v) ? v : v && typeof v === 'object' ? (v as { t?: unknown }).t : undefined
  if (!Array.isArray(t) || t.length === 0 || !t.every(x => typeof x === 'string')) return undefined
  const items = (t as string[]).map(x => x.trim())
  if (items.length !== n) {
    const text = items.filter(Boolean).join('\n')
    return text ? { kind: 'whole', text } : undefined
  }
  return items.every(Boolean) ? { kind: 'parts', parts: items } : undefined
}

/** The complete string items of a `{"t":[...` answer cut off by the token cap. */
function salvage(s: string, n: number): Aligned | undefined {
  const open = /"t"\s*:\s*\[/.exec(s)
  JSON_STRING.lastIndex = open ? open.index + open[0].length : s[0] === '[' ? 1 : s.length
  const parts: string[] = []
  for (let m = JSON_STRING.exec(s); m && parts.length < n; m = JSON_STRING.exec(s)) {
    let item: string
    try {
      item = String(JSON.parse(m[1])).trim()
    } catch {
      break
    }
    if (!item) break
    parts.push(item)
  }
  return parts.length ? { kind: 'parts', parts, cut: true } : undefined
}

/** Translations as one text, a blank line between them; a part never holds a blank line itself, so `splitParts` can undo it. */
export function joinParts(parts: readonly string[]): string {
  return parts
    .map(p => p.replace(/\n{2,}/g, '\n').trim())
    .filter(Boolean)
    .join('\n\n')
}

/** The translations of an aligned gloss for these chunks, or undefined (draw `gloss.text` whole). */
export function splitParts(gloss: Gloss | null | undefined, chunks: readonly Chunk[]): string[] | undefined {
  if (!gloss || gloss.status !== 'done' || gloss.parts === undefined || gloss.of === undefined) return undefined
  if (gloss.of !== proseCount(chunks) || gloss.parts < 1 || gloss.parts > gloss.of) return undefined
  const parts = gloss.text.split('\n\n')
  return parts.length === gloss.parts ? parts : undefined
}
