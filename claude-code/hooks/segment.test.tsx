import { expect, test } from 'claude-code/testing'

import { SAME, findLanguage, shield, shieldParts } from './lang'
import { MAX_PARTS, alignable, alignedPrompt, joinParts, numbered, parseAligned, proseCount, segment, splitParts } from './segment'

const EN = findLanguage('English')!

/** The join property: the chunks' sources give the text back, blank-line runs outside fences collapsed. */
const joined = (t: string) => segment(t).map(c => c.src).join('\n\n')

test('segment: paragraphs are one chunk each', () => {
  const c = segment('First one here.\n\nSecond one here.\n\n\n\nThird one here.')
  expect(c).toEqual([
    { src: 'First one here.', say: 'First one here.' },
    { src: 'Second one here.', say: 'Second one here.' },
    { src: 'Third one here.', say: 'Third one here.' },
  ])
  expect(joined('First one here.\n\nSecond one here.\n\n\n\nThird one here.')).toBe('First one here.\n\nSecond one here.\n\nThird one here.')
})

test('segment: a fence is kept whole, never sent, and precedes the next paragraph', () => {
  const fence = '```ts\nconst a = 1\n\n\nconst b = 2\n```'
  const t = `Before the code.\n\n${fence}\n\nAfter the code.`
  const c = segment(t)
  expect(c.map(x => x.say)).toEqual(['Before the code.', 'After the code.'])
  expect(c[1].src).toBe(`${fence}\n\nAfter the code.`)
  expect(joined(t)).toBe(t)

  const tilde = segment('Intro text.\n\n~~~\nx\n```\ny\n~~~\n\nOutro text.')
  expect(tilde.map(x => x.say)).toEqual(['Intro text.', 'Outro text.'])
  expect(tilde[1].src).toContain('```\ny')

  const nested = segment('- an item\n  ```\n  code\n\n  more\n  ```\n- next item\n\nAfter.')
  expect(nested.map(x => x.say)).toEqual(['- an item', '- next item', 'After.'])
  expect(nested[1].src.startsWith('  ```\n  code\n\n  more\n  ```')).toBe(true)

  const open = segment('Intro text.\n\n```\nnever closed\n\nstill code')
  expect(open.map(x => x.say)).toEqual(['Intro text.', ''])
  expect(open[1].src).toBe('```\nnever closed\n\nstill code')
})

test('segment: a loose list is one chunk', () => {
  const list = '1. First step here\n\n   more about it\n\n2. Second step here\n\n- a bullet'
  const c = segment(`Intro text.\n\n${list}\n\nOutro text.`)
  expect(c.length).toBe(3)
  expect(c[1].say).toBe(list)
  expect(c[1].src).toBe(list)
})

test('segment: a heading joins its paragraph; before a fence it stands alone', () => {
  const c = segment('## Cause\n\nThe pool is full.\n\n## Fix\n\n```sh\nnpm test\n```\n\nDone now.')
  expect(c.map(x => x.say)).toEqual(['## Cause\nThe pool is full.', '## Fix', 'Done now.'])
  expect(c[1].src).toBe('## Fix')
  expect(c[2].src).toBe('```sh\nnpm test\n```\n\nDone now.')
})

test('segment: a table is sent without its separator row, a quote without its marks', () => {
  const c = segment('| name | role |\n| --- | :---: |\n| Ann | lead |\n\n> quoted words here\n> more words')
  expect(c[0].say).toBe('| name | role |\n| Ann | lead |')
  expect(c[0].src).toContain('| --- | :---: |')
  expect(c[1].say).toBe('quoted words here\nmore words')
  expect(c[1].src).toBe('> quoted words here\n> more words')
})

test('segment: blocks with no words are not sent; trailing code is a chunk with no say', () => {
  const c = segment('Some words here.\n\n`npm test`\n\nhttps://example.com/a/b\n\n---\n\nMore words here.\n\n```sh\nls\n```')
  expect(c.map(x => x.say)).toEqual(['Some words here.', 'More words here.', ''])
  expect(c[1].src).toBe('`npm test`\n\nhttps://example.com/a/b\n\n---\n\nMore words here.')
  expect(c[2].src).toBe('```sh\nls\n```')
  expect(proseCount(c)).toBe(2)
})

test('segment: past MAX_PARTS the rest is merged into the last chunk', () => {
  const t = Array.from({ length: 45 }, (_, i) => `Paragraph number ${i + 1}.`).join('\n\n')
  const c = segment(t)
  expect(c.length).toBe(MAX_PARTS)
  expect(c[MAX_PARTS - 1].say).toBe(Array.from({ length: 6 }, (_, i) => `Paragraph number ${i + 40}.`).join('\n\n'))
  expect(joined(t)).toBe(t)
})

test('alignable: 3 prose segments, or 2 in a long text', () => {
  expect(alignable('One short one.\n\nTwo short two.')).toBeUndefined()
  expect(alignable('One short one.\n\nTwo short two.\n\nThree short three.')?.length).toBe(3)
  const long = 'Before.\n\n```\n' + 'x = 1\n'.repeat(120) + '```\n\nAfter.'
  expect(alignable(long)?.length).toBe(2)
  expect(alignable('Just one paragraph. ' + 'word '.repeat(200))).toBeUndefined()
})

test('shieldParts: markers are numbered across the parts with one shared kept', () => {
  const s = shieldParts(['看 `a`', '用 /review'])
  expect(s.parts).toEqual(['看 ⟦1⟧', '用 ⟦2⟧'])
  expect(s.kept).toEqual(['`a`', '/review'])
  expect(shield('看 `a`\n\n\n\n用 /review').text).toBe('看 ⟦1⟧\n\n用 ⟦2⟧')
})

test('alignedPrompt and numbered', () => {
  const p = alignedPrompt(EN, 3, true)
  expect(p).toContain('{"t"')
  expect(p).toContain('exactly 3 strings')
  expect(p).toContain('{"same":true}')
  expect(alignedPrompt(EN, 3, false)).not.toContain('same')
  expect(numbered(['a', 'b'])).toBe('[#1]\na\n\n[#2]\nb')
})

test('parseAligned: every kind of answer', () => {
  const ok = JSON.stringify({ t: ['one', 'two', 'three'] })
  expect(parseAligned(ok, 3, false)).toEqual({ kind: 'parts', parts: ['one', 'two', 'three'] })
  expect(parseAligned('```json\n' + ok + '\n```', 3, false)).toEqual({ kind: 'parts', parts: ['one', 'two', 'three'] })
  expect(parseAligned('["one","two","three"]', 3, false)).toEqual({ kind: 'parts', parts: ['one', 'two', 'three'] })
  // same
  expect(parseAligned('{"same":true}', 3, false, true)).toEqual({ kind: 'same' })
  expect(parseAligned(SAME, 3, false, true)).toEqual({ kind: 'same' })
  expect(parseAligned(SAME, 3, false, false)).toEqual({ kind: 'whole', text: SAME })
  // another length: the translation is kept whole
  expect(parseAligned('{"t":["one","two"]}', 3, false)).toEqual({ kind: 'whole', text: 'one\ntwo' })
  // cut: complete items are salvaged
  expect(parseAligned('{"t":["one","tw\\"o","thr', 3, true)).toEqual({ kind: 'parts', parts: ['one', 'tw"o'], cut: true })
  expect(parseAligned('{"t":["thr', 3, true)).toBeUndefined()
  expect(parseAligned('{"t":["one","two"', 3, false)).toBeUndefined() // broken and not cut
  // not JSON at all: the text, without the segment lines
  expect(parseAligned('[#1]\nfirst\n\n[#2]\nsecond', 2, false)).toEqual({ kind: 'whole', text: 'first\n\nsecond' })
  // unusable
  expect(parseAligned('{"t":["one","","three"]}', 3, false)).toBeUndefined()
  expect(parseAligned('{"t":[1,2,3]}', 3, false)).toBeUndefined()
  expect(parseAligned('{"x":1}', 3, false)).toBeUndefined()
  expect(parseAligned('{"t":[', 3, false)).toBeUndefined()
  expect(parseAligned('', 3, false)).toBeUndefined()
})

test('joinParts and splitParts round-trip; anything else draws whole', () => {
  const chunks = segment('One one one.\n\nTwo two two.\n\nThree three three.')
  const text = joinParts(['uno', 'dos\n\n\ndos bis', ' tres '])
  expect(text).toBe('uno\n\ndos\ndos bis\n\ntres')
  const gloss = { status: 'done', text, parts: 3, of: 3 } as const
  expect(splitParts(gloss, chunks)).toEqual(['uno', 'dos\ndos bis', 'tres'])
  expect(splitParts({ status: 'done', text }, chunks)).toBeUndefined() // an old entry
  expect(splitParts({ ...gloss, of: 4 }, chunks)).toBeUndefined() // the segmentation changed
  expect(splitParts({ ...gloss, parts: 2 }, chunks)).toBeUndefined() // the text splits in another count
  expect(splitParts({ ...gloss, parts: 4 }, chunks)).toBeUndefined()
  expect(splitParts({ status: 'done', text: 'uno\n\ndos', parts: 2, of: 3 }, chunks)).toEqual(['uno', 'dos']) // cut
  expect(splitParts({ ...gloss, status: 'same' }, chunks)).toBeUndefined()
  expect(splitParts(undefined, chunks)).toBeUndefined()
})
