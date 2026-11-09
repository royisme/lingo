import { expect, test } from 'claude-code/testing'

import {
  DAY,
  MAX_CARDS,
  NEW_MAX,
  SESSION_MAX,
  addWords,
  cardable,
  deckStats,
  fmtInterval,
  isDue,
  normWord,
  pickSession,
  rate,
  readDeck,
  removeWord,
  type Card,
} from './cards'
import { hash } from './lang'

const NOW = 1_700_000_000_000
const H = 3_600_000

function card(over: Partial<Card> = {}): Card {
  const word = over.word ?? 'flaky'
  return {
    id: hash(normWord(word)),
    word,
    note: '不稳定的',
    native: 'zh-CN',
    added: NOW,
    due: NOW,
    ivl: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    ...over,
  }
}

test('rate: Good four times from new gives 2, 5, 13, 33 days at ease 2.5', () => {
  let c = card()
  const seen: number[] = []
  for (let i = 0; i < 4; i++) {
    c = rate(c, 3, NOW)
    seen.push(c.ivl)
    expect(c.ease).toBe(2.5)
    expect(c.due).toBe(NOW + c.ivl * DAY)
    expect(c.reps).toBe(i + 1)
  }
  expect(seen).toEqual([2, 5, 13, 33])
})

test('rate: Hard and Easy at ivl 5', () => {
  const c = card({ ivl: 5, reps: 2 })
  const hard = rate(c, 2, NOW)
  expect(hard.ivl).toBe(6)
  expect(hard.ease).toBe(2.35)
  const easy = rate(c, 4, NOW)
  expect(easy.ivl).toBe(16)
  expect(easy.ease).toBe(2.65)
  expect(easy.due).toBe(NOW + 16 * DAY)
})

test('rate: Easy always lands past Good, even where a short interval rounds them together', () => {
  for (const ivl of [1, 2, 3]) {
    for (const ease of [1.3, 2.5]) {
      const c = card({ ivl, ease, reps: 2 })
      expect(rate(c, 4, NOW).ivl).toBeGreaterThan(rate(c, 3, NOW).ivl)
    }
  }
  expect(rate(card({ ivl: 1, reps: 1 }), 4, NOW).ivl).toBe(4) // Good gives 3
})

test('rate: Again at ivl 13 relearns in 10 minutes, then Good gives 2 days', () => {
  const c = card({ ivl: 13, reps: 3 })
  const lost = rate(c, 1, NOW)
  expect(lost.ivl).toBe(0)
  expect(lost.ease).toBe(2.3)
  expect(lost.lapses).toBe(1)
  expect(lost.due).toBe(NOW + 600_000)
  expect(lost.reps).toBe(4)
  expect(rate(lost, 3, NOW).ivl).toBe(2)
})

test('rate: the new-card column', () => {
  const c = card()
  const again = rate(c, 1, NOW)
  expect([again.ivl, again.ease, again.lapses, again.due, again.reps]).toEqual([0, 2.5, 0, NOW + 600_000, 1])
  expect(rate(c, 2, NOW).ivl).toBe(1)
  expect(rate(c, 3, NOW).ivl).toBe(2)
  const easy = rate(c, 4, NOW)
  expect([easy.ivl, easy.ease]).toEqual([4, 2.65])
})

test('rate: ease floor 1.3, ivl cap 365, ease kept to 2 decimals', () => {
  let c = card({ ivl: 10, ease: 1.35, reps: 5 })
  c = rate(c, 2, NOW)
  expect(c.ease).toBe(1.3)
  expect(rate(card({ ivl: 10, ease: 1.3, reps: 5 }), 1, NOW).ease).toBe(1.3)
  const big = rate(card({ ivl: 300, ease: 2.5, reps: 9 }), 4, NOW)
  expect(big.ivl).toBe(365)
  expect(big.due).toBe(NOW + 365 * DAY)
  let e = card({ ivl: 3, ease: 2.5, reps: 1 })
  for (let i = 0; i < 7; i++) e = rate(e, i % 2 ? 2 : 4, NOW)
  expect(e.ease).toBe(Math.round(e.ease * 100) / 100)
})

test('rate: never mutates its input', () => {
  const c = card({ ivl: 5, reps: 2 })
  const snap = JSON.stringify(c)
  Object.freeze(c)
  for (const g of [1, 2, 3, 4] as const) rate(c, g, NOW)
  expect(JSON.stringify(c)).toBe(snap)
})

test('normWord folds case, width and spaces', () => {
  expect(normWord('  Time   OUT ')).toBe('time out')
  expect(normWord('ＡＢＣ')).toBe('abc')
})

test('cardable: rejections', () => {
  expect(cardable('flaky', '不稳定的')).toBe(true)
  expect(cardable('flaky', '')).toBe(false)
  expect(cardable('flaky', '   ')).toBe(false)
  expect(cardable('a'.repeat(61), 'x')).toBe(false)
  expect(cardable('a'.repeat(60), 'x')).toBe(true)
  for (const ch of ['⟦', '`', '/', '\\', '{', '}', '<', '>', '=', '_', '$']) {
    expect(cardable(`a${ch}b`, 'note')).toBe(false)
  }
  expect(cardable('Timeout', ' timeout ')).toBe(false)
  expect(cardable('ＡＢ', 'ab')).toBe(false)
})

test('addWords: creates new cards, truncates note and ctx', () => {
  const deck: Card[] = []
  const ctx = 'c'.repeat(300)
  const r = addWords(deck, [{ word: ' Flaky ', note: 'n'.repeat(200) }, { word: 'bad_word', note: 'x' }], ctx, 'zh-CN', NOW)
  expect(r.added).toBe(1)
  expect(deck).toEqual([])
  const c = r.deck[0]!
  expect(c.word).toBe('Flaky')
  expect(c.id).toBe(hash('flaky'))
  expect(c.note.length).toBe(120)
  expect(c.ctx!.length).toBe(200)
  expect(c.ctx!.endsWith(' …')).toBe(true)
  expect(c).toMatchObject({ native: 'zh-CN', added: NOW, due: NOW, ivl: 0, ease: 2.5, reps: 0, lapses: 0 })
  expect(addWords([], [{ word: 'a', note: 'b' }], 'short', 'en', NOW).deck[0]!.ctx).toBe('short')
})

test('addWords: dedupes by case, width and spaces, keeping schedule, note and ctx', () => {
  const old = card({ word: 'time out', ctx: 'old ctx', reps: 3, ivl: 5, due: NOW + 5 * DAY })
  const r = addWords([old], [{ word: 'ＴＩＭＥ   Out', note: 'other' }, { word: 'time out', note: 'again' }], 'new ctx', 'zh-CN', NOW + 1)
  expect(r.added).toBe(0)
  expect(r.deck).toEqual([old])
  const twice = addWords([], [{ word: 'Flaky', note: 'a' }, { word: 'flaky', note: 'b' }], '', 'en', NOW)
  expect(twice.added).toBe(1)
  expect(twice.deck[0]!.note).toBe('a')
  expect(twice.deck[0]!.ctx).toBeUndefined()
})

test('addWords: a different native refreshes note and native only', () => {
  const old = card({ ctx: 'old ctx', reps: 3, ivl: 5, due: NOW + 5 * DAY })
  const r = addWords([old], [{ word: 'Flaky', note: 'instable' }], 'new ctx', 'fr', NOW + 1)
  expect(r.added).toBe(0)
  expect(r.deck[0]).toEqual({ ...old, note: 'instable', native: 'fr' })
  expect(old.native).toBe('zh-CN')
})

test('addWords: caps at MAX_CARDS, evicting largest ivl then oldest added, never a new card', () => {
  const deck: Card[] = []
  for (let i = 0; i < MAX_CARDS; i++) deck.push(card({ word: `w${i}`, added: i, ivl: i < 2 ? 100 : 1, reps: 1 }))
  // w0 and w1 share the largest ivl; the older one (w0) goes first.
  const r = addWords(deck, [{ word: 'fresh', note: 'n' }], '', 'en', NOW)
  expect(r.added).toBe(1)
  expect(r.deck.length).toBe(MAX_CARDS)
  expect(r.deck.some((c) => c.word === 'w0')).toBe(false)
  expect(r.deck.some((c) => c.word === 'w1')).toBe(true)
  expect(r.deck.some((c) => c.word === 'fresh')).toBe(true)
  // Ties on ivl: the oldest added goes.
  const flat = deck.map((c) => ({ ...c, ivl: 1 }))
  const r2 = addWords(flat, [{ word: 'fresh', note: 'n' }], '', 'en', NOW)
  expect(r2.deck.some((c) => c.word === 'w0')).toBe(false)
  expect(r2.deck.some((c) => c.word === 'w1')).toBe(true)
  // A new card is kept even when it would rank first (ivl 0 added last never outranks, so force a tie by age).
  const old = deck.map((c) => ({ ...c, ivl: 0, added: NOW + 10 }))
  const r3 = addWords(old, [{ word: 'fresh', note: 'n' }], '', 'en', NOW)
  expect(r3.deck.some((c) => c.word === 'fresh')).toBe(true)
  expect(r3.deck.length).toBe(MAX_CARDS)
})

test('isDue: new cards always, reviewed cards with a 4 hour leeway', () => {
  expect(isDue(card({ reps: 0, due: NOW + 99 * DAY }), NOW)).toBe(true)
  const c = card({ reps: 2, ivl: 1, due: NOW + 4 * H })
  expect(isDue(c, NOW)).toBe(true)
  expect(isDue({ ...c, due: NOW + 4 * H + 1 }, NOW)).toBe(false)
  expect(isDue({ ...c, due: NOW - DAY }, NOW)).toBe(true)
})

test('pickSession: most overdue first, then newest new cards, both capped', () => {
  const due = Array.from({ length: 25 }, (_, i) => card({ word: `d${i}`, reps: 1, ivl: 1, due: NOW - (i + 1) * H }))
  const fresh = Array.from({ length: 15 }, (_, i) => card({ word: `n${i}`, added: i }))
  const notDue = card({ word: 'later', reps: 1, ivl: 9, due: NOW + 9 * DAY })
  const s = pickSession([...fresh, notDue, ...due], NOW)
  expect(s.length).toBe(SESSION_MAX)
  expect(s.slice(0, 20).map((c) => c.word)).toEqual(Array.from({ length: 20 }, (_, i) => `d${24 - i}`))
  // 20 due cards fill the session: no room for new ones.
  expect(s.some((c) => c.reps === 0)).toBe(false)

  const few = pickSession([...fresh, notDue, ...due.slice(0, 5)], NOW)
  expect(few.map((c) => c.word)).toEqual([
    'd4', 'd3', 'd2', 'd1', 'd0',
    ...Array.from({ length: NEW_MAX }, (_, i) => `n${14 - i}`),
  ])
  const room = pickSession([...fresh, ...due.slice(0, 15)], NOW)
  expect(room.length).toBe(20)
  expect(room.filter((c) => c.reps === 0).length).toBe(5)
  expect(pickSession([], NOW)).toEqual([])
})

test('readDeck: junk in, tolerant out', () => {
  expect(readDeck(undefined)).toEqual([])
  expect(readDeck('x')).toEqual([])
  expect(readDeck({})).toEqual([])
  const good = card({ ctx: 'hi', reps: 2, ivl: 3 })
  const out = readDeck([
    good,
    null,
    7,
    'x',
    { word: 'a' },
    { ...good, word: 'b', id: 'x', note: 5 },
    { ...good, word: 'c', native: 'xx' },
    { ...good, word: 'd', ease: 'high' },
    { ...good, word: 'e', ease: NaN },
    { ...good, word: 'f', note: '  ' },
    { ...good }, // duplicate id
    { ...good, word: 'Over', ease: 0.2, ivl: 9999, reps: -3, lapses: -1 },
    { ...good, word: 'Neg', ivl: -4 },
  ])
  expect(out.map((c) => c.word)).toEqual(['flaky', 'Over', 'Neg'])
  expect(out[0]).toEqual(good)
  expect(out[1]).toMatchObject({ ease: 1.3, ivl: 365, reps: 0, lapses: 0, id: hash('over') })
  expect(out[2]!.ivl).toBe(0)
})

test('removeWord: matches by normalized word and does not mutate', () => {
  const deck = [card({ word: 'Time Out' }), card({ word: 'flaky' })]
  const hit = removeWord(deck, '  time  OUT')
  expect(hit.removed).toBe(true)
  expect(hit.deck.map((c) => c.word)).toEqual(['flaky'])
  expect(deck.length).toBe(2)
  const miss = removeWord(deck, 'nope')
  expect(miss.removed).toBe(false)
  expect(miss.deck).toEqual(deck)
})

test('deckStats: counts and the next due time', () => {
  expect(deckStats([], NOW)).toEqual({ total: 0, due: 0, fresh: 0 })
  const deck = [
    card({ word: 'a' }),
    card({ word: 'b' }),
    card({ word: 'c', reps: 1, ivl: 1, due: NOW - H }),
    card({ word: 'd', reps: 1, ivl: 3, due: NOW + 3 * DAY }),
    card({ word: 'e', reps: 1, ivl: 2, due: NOW + 2 * DAY }),
  ]
  expect(deckStats(deck, NOW)).toEqual({ total: 5, due: 1, fresh: 2, nextDue: NOW + 2 * DAY })
  expect(deckStats(deck.slice(0, 3), NOW).nextDue).toBeUndefined()
})

test('fmtInterval: minutes, hours, days', () => {
  expect(fmtInterval(600_000)).toBe('10m')
  expect(fmtInterval(0)).toBe('1m')
  expect(fmtInterval(3 * H)).toBe('3h')
  expect(fmtInterval(2 * DAY)).toBe('2d')
  expect(fmtInterval(36 * H)).toBe('2d')
})
