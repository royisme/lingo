import { expect, mock, test } from 'claude-code/testing'

import {
  CODE,
  FIX,
  SAME,
  classify,
  decide,
  findLanguage,
  hasChip,
  hash,
  isCommand,
  plain,
  prose,
  shield,
  unshieldExact,
  unshieldForDisplay,
} from './lang'

const USAGE = {
  input_tokens: 10,
  output_tokens: 10,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
}
const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const
const EN = findLanguage('English')!
const ES = findLanguage('es')!
const JA = findLanguage('ja')!
const ZH = findLanguage('zh-CN')!

const userRow = (text: string, surface: (typeof SURFACES)[number] = 'desktop', requestId = 'm1') =>
  ({
    plugin: 'lingo',
    surface,
    component: 'UserMessage',
    requestId,
    props: { text, origin: { kind: 'composer' }, isExpanded: true },
  }) as any

const replyRow = (text: string, extra: object = {}) =>
  ({
    plugin: 'lingo',
    surface: 'desktop',
    component: 'AssistantMessage',
    requestId: 'a1',
    props: { text, isFirstOfReply: true, ...extra },
  }) as any

function engineRow(on: any) {
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine row</Text>
  })
}

function answer(on: any, text: string, log: string[] = []) {
  on('model.complete', (_: any, e: any) => {
    log.push(e.prompt)
    return { value: { isAnswered: true, text, usage: USAGE } }
  })
  return log
}

test('decide: scripts are told apart locally; same-script falls back to the model', () => {
  expect(decide('帮我看一下为什么登录接口会超时', EN)).toBe('translate')
  expect(decide('帮我看一下为什么 UserAuthenticationService in the repo 会报错', EN)).toBe('translate')
  expect(decide('Why does the login endpoint time out?', EN)).toBe('skip')
  expect(decide('Pourquoi le serveur est lent avec la base de données ?', EN)).toBe('translate')
  expect(decide('¿Por qué el servidor no responde?', ES)).toBe('skip')
  expect(decide('¿Por qué el servidor no responde?', EN)).toBe('translate')
  expect(decide('ログインがタイムアウトする理由を調べて', ZH)).toBe('translate')
  expect(decide('帮我看一下登录超时', JA)).toBe('translate')
  expect(decide('看 `getUserById`', EN)).toBe('skip')
  expect(decide('```ts\nconst a = 1\n```', EN)).toBe('skip')
  expect(decide('Run lint again quickly', EN)).toBe('ask')
  expect(decide('请检查一下', ZH)).toBe('ask') // Simplified vs Traditional: the model decides

  // R4: prose strips real paths but keeps slash words
  expect(prose('Choose yes/no and/or true/false for input/output')).toContain('and/or')
  expect(prose('Check file (./src/auth/login.ts) and "../config/db.json" or [src/main.rs]')).not.toContain('src/auth/login.ts')
  expect(prose('Check file (./src/auth/login.ts) and "../config/db.json" or [src/main.rs]')).not.toContain('src/main.rs')
})

test('a Chinese prompt gets a gloss with its tag, on every surface, translated once', async ($, on) => {
  const clock = mock.clock(on)
  const asked = answer(on, 'Look into the login timeout.')
  engineRow(on)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount(userRow('帮我看一下登录超时', surface))
    await clock.settle()
    expect(await ui.find({ type: 'Text', text: /engine row/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /login timeout/ }))?.text).toBe('Look into the login timeout.')
    expect((await ui.find({ type: 'Text', text: /^EN$/ }))?.text).toBe('EN')
    await ui.unmount()
  }
  expect(asked.length).toBe(1)
})

test('text already in the target language shows nothing, and asks the model only when unsure', async ($, on) => {
  const clock = mock.clock(on)
  const asked = answer(on, SAME)
  engineRow(on)

  const plain = await $.ui.mount(replyRow('The pool size is 10, so requests queue up.'))
  await clock.settle()
  expect(await plain.find({ type: 'Text', text: /Translat/ })).toBeUndefined()
  await plain.unmount()
  expect(asked.length).toBe(0)

  const unsure = await $.ui.mount(replyRow('Run lint again quickly'))
  await clock.settle()
  expect(asked.length).toBe(1)
  expect(await unsure.find({ type: 'Text', text: /Translat|SAME|EN/ })).toBeUndefined()
  await unsure.unmount()
})

test('summaries are left alone', async ($, on) => {
  mock.clock(on)
  const asked = answer(on, 'x')
  engineRow(on)
  const ui = await $.ui.mount(replyRow('我先看一下连接池配置', { isSummary: true }))
  expect(await ui.find({ type: 'Text', text: /Translat/ })).toBeUndefined()
  await ui.unmount()
  expect(asked.length).toBe(0)
})

test('the tag opens a menu that switches language, hides a gloss, or turns Lingo off', async ($, on) => {
  const clock = mock.clock(on)
  answer(on, 'Look into the login timeout.')
  engineRow(on)
  const sets: Array<{ key: string; value: unknown }> = []
  on('config.set', (_: any, e: any) => {
    sets.push({ key: e.key, value: e.value })
    return { value: e.value }
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount(userRow('帮我看一下登录超时', surface, `m-${surface}`))
    await clock.settle()
    await ui.press({ key: 'lingo-tag' })
    expect(await ui.find({ key: 'lingo-lang-fr' })).toBeDefined()
    await ui.press({ key: 'lingo-lang-fr' })
    expect(await ui.find({ key: 'lingo-lang-fr' })).toBeUndefined() // the menu closed
    await ui.press({ key: 'lingo-tag' })
    await ui.press({ key: 'lingo-off' })
    await ui.unmount()
  }
  expect(sets).toEqual([
    { key: 'lingo.targetLanguage', value: 'Français' },
    { key: 'lingo.targetLanguage', value: 'Off' },
    { key: 'lingo.targetLanguage', value: 'Français' },
    { key: 'lingo.targetLanguage', value: 'Off' },
  ])

  const ui = await $.ui.mount(userRow('帮我看一下登录超时', 'desktop', 'm-hide'))
  await clock.settle()
  await ui.press({ key: 'lingo-tag' })
  await ui.press({ key: 'lingo-hide' })
  expect(await ui.find({ type: 'Text', text: /login timeout/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /engine row/ })).toBeDefined()
  await ui.unmount()
})

test('/lingo fr sets the /config row', async ($, on) => {
  mock.clock(on)
  const sets: unknown[] = []
  on('config.set', (_: any, e: any) => {
    sets.push(e.value)
    return { value: e.value }
  })
  on('command.register', () => ({ value: { command: 'lingo' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true } as any)

  expect(((await $.command.run({ command: 'lingo', args: 'fr' } as any)) as any).text).toBe(
    'Lingo: translating into Français.',
  )
  expect(((await $.command.run({ command: 'lingo', args: 'off' } as any)) as any).text).toBe(
    'Lingo: translations off.',
  )
  expect(sets).toEqual(['Français', 'Off'])
})

test('settings from /config: French target, replies off', { options: { targetLanguage: 'Français', translateReplies: false } } as any, async ($, on) => {
  const clock = mock.clock(on)
  answer(on, 'Regarde le délai.')
  engineRow(on)

  const mine = await $.ui.mount(userRow('看一下超时问题', 'terminal', 'm-fr'))
  await clock.settle()
  expect((await mine.find({ type: 'Text', text: /^FR$/ }))?.text).toBe('FR')
  expect((await mine.find({ type: 'Text', text: /délai/ }))?.text).toBe('Regarde le délai.')
  await mine.unmount()

  const reply = await $.ui.mount(replyRow('问题出在连接池'))
  await clock.settle()
  expect(await reply.find({ type: 'Text', text: /délai|Translat/ })).toBeUndefined()
  await reply.unmount()
})

test('Off turns everything off', { options: { targetLanguage: 'Off' } } as any, async ($, on) => {
  mock.clock(on)
  const asked = answer(on, 'x')
  engineRow(on)
  const ui = await $.ui.mount(userRow('帮我看一下登录超时'))
  expect(await ui.find({ type: 'Text', text: /Translat/ })).toBeUndefined()
  await ui.unmount()
  expect(asked.length).toBe(0)
})

test('the draft preview shows above the prompt after a pause', async ($, on) => {
  const clock = mock.clock(on)
  on('prompt.read', () => ({ value: { text: '先别改代码', cursor: 5 } }))
  answer(on, "Don't change the code yet.")
  engineRow(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))

  await ($.prompt as any).change({ text: '先别改代码', cursor: 5, origin: { kind: 'engine' } })
  await clock.advance(1000)
  await ($.prompt as any).change({ text: '先别改代码', cursor: 5, origin: { kind: 'engine' } })
  await clock.advance(1000) // 2 s since the first edit, 1 s since the last: still waiting
  const early = await $.ui.mount({
    plugin: 'lingo',
    surface: 'desktop',
    component: 'AbovePrompt',
    requestId: 'band-early',
    props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 80 },
  } as any)
  expect(await early.find({ type: 'Text', text: /change the code|Translat/ })).toBeUndefined()
  await early.unmount()
  await clock.advance(600)

  const ui = await $.ui.mount({
    plugin: 'lingo',
    surface: 'desktop',
    component: 'AbovePrompt',
    requestId: 'band',
    props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 80 },
  } as any)
  expect((await ui.find({ type: 'Text', text: /change the code/ }))?.text).toBe("Don't change the code yet.")
  expect((await ui.find({ type: 'Text', text: /^Preview$/ }))?.text).toBe('Preview')
  await ui.unmount()
})

test('translation failure shows retry button and clicking it recovers on success', async ($, on) => {
  const clock = mock.clock(on)
  let shouldFail = true
  let completeCount = 0

  on('model.complete', () => {
    completeCount++
    if (shouldFail) {
      throw new Error('Network error')
    }
    return { value: { isAnswered: true, text: 'Recovered translation.', usage: USAGE } }
  })
  engineRow(on)

  const ui = await $.ui.mount(userRow('帮我看一下报错', 'desktop', 'm-fail'))
  await clock.settle()

  expect(await ui.find({ type: 'Text', text: /Translation failed/ })).toBeDefined()
  expect(await ui.find({ key: 'lingo-retry' })).toBeDefined()
  expect(completeCount).toBe(1)

  shouldFail = false
  await ui.press({ key: 'lingo-retry' })
  await clock.advance(1100) // calls start at least a second apart
  await clock.settle()

  expect(completeCount).toBe(2)
  expect((await ui.find({ type: 'Text', text: /Recovered translation/ }))?.text).toBe('Recovered translation.')
  expect(await ui.find({ key: 'lingo-retry' })).toBeUndefined()
  await ui.unmount()
})

test('model isAnswered false also shows failed and can retry', async ($, on) => {
  const clock = mock.clock(on)
  let attempt = 0
  on('model.complete', () => {
    attempt++
    if (attempt === 1) {
      return { value: { isAnswered: false, text: '', usage: USAGE } }
    }
    return { value: { isAnswered: true, text: 'Second attempt succeeded.', usage: USAGE } }
  })
  engineRow(on)

  const ui = await $.ui.mount(userRow('检查网络连接', 'desktop', 'm-unanswered'))
  await clock.settle()

  expect(await ui.find({ key: 'lingo-retry' })).toBeDefined()
  await ui.press({ key: 'lingo-retry' })
  await clock.advance(1100)
  await clock.settle()

  expect((await ui.find({ type: 'Text', text: /Second attempt succeeded/ }))?.text).toBe('Second attempt succeeded.')
  await ui.unmount()
})

test('text containing <<SAME>> as a substring is not treated as same', async ($, on) => {
  const clock = mock.clock(on)
  const asked = answer(on, 'Run lint again with <<SAME>> token')
  engineRow(on)

  const ui = await $.ui.mount(replyRow('Run lint again quickly'))
  await clock.settle()

  expect(asked.length).toBe(1)
  expect((await ui.find({ type: 'Text', text: /<<SAME>>/ }))?.text).toBe('Run lint again with <<SAME>> token')
  await ui.unmount()
})

test('runPreview does not duplicate requests when a translation for the same src is already pending', async ($, on) => {
  const clock = mock.clock(on)
  let calls = 0
  let finishModel: () => void
  on('prompt.read', () => ({ value: { text: '重复草稿', cursor: 4 } }))
  on('model.complete', () => {
    calls++
    return new Promise(res => {
      finishModel = () => res({ value: { isAnswered: true, text: 'Duplicate draft', usage: USAGE } })
    })
  })
  engineRow(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))

  await ($.prompt as any).change({ text: '重复草稿', cursor: 4, origin: { kind: 'engine' } })
  await clock.advance(1600)

  // Trigger change again with same text
  await ($.prompt as any).change({ text: '重复草稿', cursor: 4, origin: { kind: 'engine' } })
  await clock.advance(1600)

  expect(calls).toBe(1)
  if (finishModel!) finishModel!()
  await clock.settle()
})

test('draft preview drops result if prompt changed while in flight', async ($, on) => {
  const clock = mock.clock(on)
  let finishModel: () => void
  let currentText = '第一版草稿'
  on('prompt.read', () => ({ value: { text: currentText, cursor: 5 } }))
  on('model.complete', () => new Promise(res => {
    finishModel = () => res({ value: { isAnswered: true, text: 'First draft translation', usage: USAGE } })
  }))
  engineRow(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))

  await ($.prompt as any).change({ text: '第一版草稿', cursor: 5, origin: { kind: 'engine' } })
  await clock.advance(1600)

  // User types something else
  currentText = '第二版草稿'
  await ($.prompt as any).change({ text: '第二版草稿', cursor: 5, origin: { kind: 'engine' } })

  if (finishModel!) finishModel!()
  await clock.settle()

  const ui = await $.ui.mount({
    plugin: 'lingo',
    surface: 'desktop',
    component: 'AbovePrompt',
    requestId: 'band-race2',
    props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 80 },
  } as any)
  expect(await ui.find({ type: 'Text', text: /First draft translation/ })).toBeUndefined()
  await ui.unmount()
})

test('shield keeps code, URLs, commands and mentions from the model; plain strips Markdown marks', () => {
  const sent = shield('看这里:\n```ts\nconst pool = createPool({ max: 10 })\n```\n然后重启')
  expect(sent.text).toBe('看这里:\n⟦1⟧\n然后重启')
  expect(unshieldForDisplay(sent.text, sent.kept)).toBe(`看这里:\n${CODE}\n然后重启`)
  expect(shield('未闭合\n```ts\nconst a = 1').text).not.toContain('const a')

  const mixed = shield('先用 /code-review 看一下 @src/auth.ts，再跑 `npm test`，参考 https://x.dev/a。/plugin:skill 也行')
  expect(mixed.kept).toEqual(['/code-review', '@src/auth.ts', '`npm test`', 'https://x.dev/a', '/plugin:skill'])
  expect(mixed.text).toBe('先用 ⟦1⟧ 看一下 ⟦2⟧，再跑 ⟦3⟧，参考 ⟦4⟧。⟦5⟧ 也行')
  expect(shield('Use /review.').kept).toEqual(['/review'])
  expect(shield('See https://x.dev/a, then /lingo fr.').kept).toEqual(['https://x.dev/a', '/lingo'])
  expect(shield('choose yes/no and/or mail me@example.com').kept).toEqual([])
  expect(shield('先用/code-review看一下@src/a.ts的改动').kept).toEqual(['/code-review', '@src/a.ts'])

  expect(unshieldExact('Use ⟦1⟧ on ⟦2⟧', ['/review', '@a.ts'])).toBe('Use /review on @a.ts')
  expect(unshieldExact('Use ⟦1⟧', ['/review', '@a.ts'])).toBeUndefined() // a mention lost
  expect(unshieldExact('Use ⟦1⟧ and ⟦1⟧', ['/review', '@a.ts'])).toBeUndefined() // one doubled
  expect(unshieldExact('Use ⟦3⟧', ['/review'])).toBeUndefined()
  expect(plain('## Cause\n**The pool** is full; see `getUserById`.')).toBe('Cause\nThe pool is full; see getUserById.')
  expect(plain('a * b * c')).toBe('a * b * c')
})

test('a reply with a long code block sends only its prose to the model', async ($, on) => {
  const clock = mock.clock(on)
  const asked = answer(on, 'The problem is the pool config: [code]')
  engineRow(on)
  const text = '问题出在连接池配置:\n```ts\n' + 'const pool = createPool({ max: 10 })\n'.repeat(50) + '```'
  const ui = await $.ui.mount(replyRow(text))
  await clock.settle()
  expect(asked.length).toBe(1)
  expect(asked[0]).not.toContain('createPool')
  expect(asked[0].length).toBeLessThan(40)
  await ui.unmount()
})

test('a reply that hits the token cap is marked as cut', async ($, on) => {
  const clock = mock.clock(on)
  on('model.complete', () => ({
    value: { isAnswered: true, text: 'A very long translation', usage: { ...USAGE, output_tokens: 4096 } },
  }))
  engineRow(on)
  const ui = await $.ui.mount(replyRow('这是一段很长的回复'))
  await clock.settle()
  expect((await ui.find({ type: 'Text', text: /very long/ }))?.text).toBe('A very long translation …')
  await ui.unmount()
})

test('a previewed draft costs no second call once sent', async ($, on) => {
  const clock = mock.clock(on)
  let box = '先别改代码'
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  const asked = answer(on, "Don't change the code yet.")
  engineRow(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  on('prompt.submit', (_: any, e: any) => ({ text: e.text }))

  await ($.prompt as any).change({ text: box, cursor: 5, origin: { kind: 'engine' } })
  await clock.advance(1600)
  box = ''
  await ($.prompt as any).submit({ text: '先别改代码 ', origin: { kind: 'composer' } })
  await clock.settle()
  const ui = await $.ui.mount(userRow('先别改代码', 'desktop', 'm-sent'))
  await clock.settle()
  expect((await ui.find({ type: 'Text', text: /change the code/ }))?.text).toBe("Don't change the code yet.")
  expect(asked.length).toBe(1)
  await ui.unmount()
})

test('a draft already in the target language is asked about once, not on every pause', async ($, on) => {
  const clock = mock.clock(on)
  on('prompt.read', () => ({ value: { text: 'Run lint again quickly', cursor: 3 } }))
  const asked = answer(on, SAME)
  engineRow(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  for (let i = 0; i < 5; i++) {
    await ($.prompt as any).change({ text: 'Run lint again quickly', cursor: i, origin: { kind: 'engine' } })
    await clock.advance(1600)
  }
  expect(asked.length).toBe(1)
  const ui = await $.ui.mount({
    plugin: 'lingo',
    surface: 'desktop',
    component: 'AbovePrompt',
    requestId: 'band-same',
    props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 80 },
  } as any)
  expect(await ui.find({ type: 'Text', text: /Preview|Translat/ })).toBeUndefined()
  await ui.unmount()
})

test('a gloss left pending by a reloaded module is translated again', async ($, on) => {
  const clock = mock.clock(on)
  const asked = answer(on, 'Look into the login timeout.')
  engineRow(on)
  const id = hash('en\u0000帮我看一下登录超时')
  let orphan = true
  on('state.get', (_: any, e: any, next: any) =>
    orphan && e.key === 'gloss' && e.id === id ? { value: { value: { status: 'pending', text: '' }, version: 1 } } : next(e),
  )
  on('state.set', (_: any, e: any, next: any) => {
    if (e.key === 'gloss' && e.id === id) orphan = false
    return next(e)
  })
  const ui = await $.ui.mount(userRow('帮我看一下登录超时', 'desktop', 'm-orphan'))
  await clock.settle()
  await ui.unmount()
  expect(asked.length).toBe(1)
  const again = await $.ui.mount(userRow('帮我看一下登录超时', 'desktop', 'm-orphan'))
  expect((await again.find({ type: 'Text', text: /login timeout/ }))?.text).toBe('Look into the login timeout.')
  await again.unmount()
})

test('at most two glosses translate at once; of those waiting, the newest goes first', async ($, on) => {
  const clock = mock.clock(on)
  const started: string[] = []
  const finish: Array<() => void> = []
  let live = 0
  let peak = 0
  on('model.complete', (_: any, e: any) => {
    started.push(e.prompt)
    live++
    peak = Math.max(peak, live)
    return new Promise(res =>
      finish.push(() => {
        live--
        res({ value: { isAnswered: true, text: `T ${e.prompt}`, usage: USAGE } })
      }),
    )
  })
  engineRow(on)
  const texts = ['第一条消息', '第二条消息', '第三条消息', '第四条消息', '第五条消息']
  const uis = []
  for (const [i, t] of texts.entries()) uis.push(await $.ui.mount(userRow(t, 'desktop', `m-q${i}`)))
  await clock.settle()
  expect(started.length).toBe(1) // the second waits its turn: calls start a second apart
  await clock.advance(1100)
  await clock.settle()
  expect(started.length).toBe(2)
  await clock.advance(5000)
  await clock.settle()
  expect(started.length).toBe(2) // two slots, both busy
  while (finish.length) {
    finish.shift()!()
    await clock.advance(1100)
    await clock.settle()
  }
  expect(started.length).toBe(5)
  expect(peak).toBe(2)
  expect(started).toEqual(['第一条消息', '第二条消息', '第五条消息', '第四条消息', '第三条消息'])
  for (const ui of uis) await ui.unmount()
})


test('a prompt sent while its preview is still translating waits for it: one call', async ($, on) => {
  const clock = mock.clock(on)
  let box = '帮我查一下超时'
  let calls = 0
  const finish: Array<() => void> = []
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  on('model.complete', () => {
    calls++
    return new Promise(res =>
      finish.push(() => res({ value: { isAnswered: true, text: 'Check the timeout for me.', usage: USAGE } })),
    )
  })
  engineRow(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  on('prompt.submit', (_: any, e: any) => ({ text: e.text }))

  await ($.prompt as any).change({ text: box, cursor: 7, origin: { kind: 'engine' } })
  await clock.advance(1600) // the preview's request is out
  box = ''
  await ($.prompt as any).submit({ text: '帮我查一下超时', origin: { kind: 'composer' } })
  const ui = await $.ui.mount(userRow('帮我查一下超时', 'desktop', 'm-race'))
  await clock.settle()
  expect(calls).toBe(1)
  finish.shift()!()
  await clock.settle()
  expect(calls).toBe(1)
  expect((await ui.find({ type: 'Text', text: /timeout for me/ }))?.text).toBe('Check the timeout for me.')
  await ui.unmount()
})

test('if that preview fails, the sent prompt shows Retry', async ($, on) => {
  const clock = mock.clock(on)
  let box = '帮我查一下日志'
  let calls = 0
  const finish: Array<() => void> = []
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  on('model.complete', () => {
    calls++
    if (calls === 1) return new Promise(res => finish.push(() => res({ value: { isAnswered: false, reason: 'empty-reply', usage: USAGE } })))
    return { value: { isAnswered: true, text: 'Check the logs for me.', usage: USAGE } }
  })
  engineRow(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  on('prompt.submit', (_: any, e: any) => ({ text: e.text }))

  await ($.prompt as any).change({ text: box, cursor: 7, origin: { kind: 'engine' } })
  await clock.advance(1600)
  box = ''
  await ($.prompt as any).submit({ text: '帮我查一下日志', origin: { kind: 'composer' } })
  const ui = await $.ui.mount(userRow('帮我查一下日志', 'desktop', 'm-race-fail'))
  await clock.settle()
  finish.shift()!()
  await clock.settle()
  expect(await ui.find({ key: 'lingo-retry' })).toBeDefined()
  await ui.press({ key: 'lingo-retry' })
  await clock.advance(1100)
  await clock.settle()
  expect(calls).toBe(2)
  expect((await ui.find({ type: 'Text', text: /logs for me/ }))?.text).toBe('Check the logs for me.')
  await ui.unmount()
})

// ---- polish: drafts already in the target language ---------------------------

const BAND = {
  plugin: 'lingo',
  surface: 'desktop',
  component: 'AbovePrompt',
  requestId: 'band-polish',
  props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 80 },
} as any

test('classify, isCommand and restoreCode', () => {
  expect(classify('Please help me check why login api is timeout', EN)).toBe('target')
  expect(classify('帮我看一下登录超时', EN)).toBe('other')
  expect(classify('Run lint again quickly', EN)).toBe('unsure')
  expect(classify('`getUserById`', EN)).toBe('empty')
  expect(isCommand('/lingo fr')).toBe(true)
  expect(isCommand('!ls -la')).toBe(true)
  expect(isCommand('why is /tmp full')).toBe(false)

  expect(hasChip('[Pasted text #1 +20 lines] why fail')).toBe(true)
  expect(hasChip('why does [x] fail')).toBe(false)
})

test('a draft in the target language gets a better version, and Use puts it in the box', async ($, on) => {
  const clock = mock.clock(on)
  let box = 'Please help me check why login api is timeout'
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  const systems: string[] = []
  on('model.complete', (_: any, e: any) => {
    systems.push(e.system)
    return { value: { isAnswered: true, text: `${FIX} Please help me check why the login API times out.`, usage: USAGE } }
  })
  const fills: string[] = []
  on('prompt.fill', (_: any, e: any) => {
    fills.push(e.text)
    box = e.text
    return { isFilled: true }
  })
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  engineRow(on)

  await ($.prompt as any).change({ text: box, cursor: box.length, origin: { kind: 'engine' } })
  await clock.advance(1600)
  expect(systems.length).toBe(1)
  expect(systems[0]).toContain('learning English')

  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /^Better$/ }))?.text).toBe('Better')
  expect((await ui.find({ type: 'Text', text: /times out/ }))?.text).toBe('Please help me check why the login API times out.')
  await ui.press({ key: 'lingo-use' })
  await clock.settle()
  expect(fills).toEqual(['Please help me check why the login API times out.'])
  expect(await ui.find({ type: 'Text', text: /Better/ })).toBeUndefined()

  // The box now holds the better version: the change it raises asks nothing more.
  await ($.prompt as any).change({ text: box, cursor: box.length, origin: { kind: 'engine' } })
  await clock.advance(1600)
  expect(systems.length).toBe(1)
  await ui.unmount()
})

test('a natural draft shows nothing, not even while it is checked', async ($, on) => {
  const clock = mock.clock(on)
  const box = 'Why does the login endpoint time out after the deploy?'
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  let finish: () => void = () => {}
  on('model.complete', () => new Promise(res => (finish = () => res({ value: { isAnswered: true, text: SAME, usage: USAGE } }))))
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  engineRow(on)

  await ($.prompt as any).change({ text: box, cursor: box.length, origin: { kind: 'engine' } })
  await clock.advance(1600)
  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /Translat|Better|Preview/ })).toBeUndefined()
  finish()
  await clock.settle()
  expect(await ui.find({ type: 'Text', text: /Translat|Better|Preview/ })).toBeUndefined()
  await ui.unmount()
})

test('a fix keeps the draft code blocks when used', async ($, on) => {
  const clock = mock.clock(on)
  let box = 'why this function is return null:\n```ts\nfunction f() { return null }\n```\nthe test is fail'
  on('prompt.read', () => ({ value: { text: box, cursor: 0 } }))
  const sent: string[] = []
  on('model.complete', (_: any, e: any) => {
    sent.push(e.prompt)
    return { value: { isAnswered: true, text: `${FIX} Why does this function return null?\n⟦1⟧\nThe test fails.`, usage: USAGE } }
  })
  const fills: string[] = []
  on('prompt.fill', (_: any, e: any) => {
    fills.push(e.text)
    box = e.text
    return { isFilled: true }
  })
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  engineRow(on)

  await ($.prompt as any).change({ text: box, cursor: 0, origin: { kind: 'engine' } })
  await clock.advance(1600)
  expect(sent[0]).not.toContain('return null }')
  const ui = await $.ui.mount(BAND)
  await ui.press({ key: 'lingo-use' })
  await clock.settle()
  expect(fills).toEqual(['Why does this function return null?\n```ts\nfunction f() { return null }\n```\nThe test fails.'])
  await ui.unmount()
})

test('suggestions off: a draft in the target language asks nothing', { options: { polishWhileTyping: false } } as any, async ($, on) => {
  const clock = mock.clock(on)
  const box = 'Please help me check why login api is timeout'
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  const asked = answer(on, `${FIX} x`)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  engineRow(on)
  await ($.prompt as any).change({ text: box, cursor: box.length, origin: { kind: 'engine' } })
  await clock.advance(1600)
  expect(asked.length).toBe(0)
})

test('slash commands and shell lines get no preview and no gloss', async ($, on) => {
  const clock = mock.clock(on)
  const box = '/compact 帮我总结一下刚才的讨论'
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  const asked = answer(on, 'x')
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  on('prompt.submit', (_: any, e: any) => ({ text: e.text }))
  engineRow(on)
  await ($.prompt as any).change({ text: box, cursor: box.length, origin: { kind: 'engine' } })
  await clock.advance(1600)
  await ($.prompt as any).submit({ text: box, origin: { kind: 'composer' } })
  const ui = await $.ui.mount(userRow(box, 'desktop', 'm-cmd'))
  await clock.settle()
  expect(asked.length).toBe(0)
  expect(await ui.find({ type: 'Text', text: /Translat/ })).toBeUndefined()
  await ui.unmount()
})

test('a gloss keeps commands and mentions exactly as written', async ($, on) => {
  const clock = mock.clock(on)
  const asked = answer(on, 'First run ⟦1⟧ on ⟦2⟧.')
  engineRow(on)
  const ui = await $.ui.mount(userRow('先用 /code-review 看一下 @src/auth.ts', 'desktop', 'm-cmd-gloss'))
  await clock.settle()
  expect(asked[0]).toBe('先用 ⟦1⟧ 看一下 ⟦2⟧')
  expect((await ui.find({ type: 'Text', text: /First run/ }))?.text).toBe('First run /code-review on @src/auth.ts.')
  await ui.unmount()
})

test('Use puts back commands and mentions as written, and is withheld when the model drops one', async ($, on) => {
  const clock = mock.clock(on)
  let box = 'please use /code-review for check the @src/auth.ts file'
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  let reply = `${FIX} Please use ⟦1⟧ to check the ⟦2⟧ file.`
  const sent: string[] = []
  on('model.complete', (_: any, e: any) => {
    sent.push(e.prompt)
    return { value: { isAnswered: true, text: reply, usage: USAGE } }
  })
  const fills: string[] = []
  on('prompt.fill', (_: any, e: any) => {
    fills.push(e.text)
    box = e.text
    return { isFilled: true }
  })
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  engineRow(on)

  await ($.prompt as any).change({ text: box, cursor: box.length, origin: { kind: 'engine' } })
  await clock.advance(1600)
  expect(sent[0]).toBe('please use ⟦1⟧ for check the ⟦2⟧ file')
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /check the/ }))?.text).toBe('Please use /code-review to check the @src/auth.ts file.')
  await ui.press({ key: 'lingo-use' })
  await clock.settle()
  expect(fills).toEqual(['Please use /code-review to check the @src/auth.ts file.'])
  await ui.unmount()

  // The model drops the mention: the suggestion still reads, but nothing may replace the draft.
  box = 'please use /code-review for check the @src/db.ts file'
  reply = `${FIX} Please use ⟦1⟧ to check the file.`
  await ($.prompt as any).change({ text: box, cursor: box.length, origin: { kind: 'engine' } })
  await clock.advance(1700)
  await clock.settle()
  const again = await $.ui.mount({ ...BAND, requestId: 'band-polish-2' })
  expect((await again.find({ type: 'Text', text: /check the file/ }))?.text).toBe('Please use /code-review to check the file.')
  expect(await again.find({ key: 'lingo-use' })).toBeUndefined()
  await again.unmount()
})

test('a rate limit is retried by itself after a cooldown', async ($, on) => {
  const clock = mock.clock(on)
  let calls = 0
  on('model.complete', () => {
    calls++
    if (calls === 1) return { value: { isAnswered: false, reason: 'api-error', status: 429, error: 'rate_limit', usage: USAGE } }
    return { value: { isAnswered: true, text: 'Check the logs.', usage: USAGE } }
  })
  engineRow(on)
  const ui = await $.ui.mount(userRow('看一下日志', 'desktop', 'm-429'))
  await clock.settle()
  await clock.advance(3000)
  await clock.settle()
  expect(calls).toBe(1) // still cooling down (5 s)
  await clock.advance(3000)
  await clock.settle()
  expect(calls).toBe(2)
  expect((await ui.find({ type: 'Text', text: /Check the logs/ }))?.text).toBe('Check the logs.')
  await ui.unmount()
})

test('a lasting failure is not retried, and the failed line says why', async ($, on) => {
  const clock = mock.clock(on)
  let calls = 0
  on('model.complete', () => {
    calls++
    return { value: { isAnswered: false, reason: 'api-error', status: 401, error: 'authentication_failed', usage: USAGE } }
  })
  engineRow(on)
  const ui = await $.ui.mount(userRow('看一下日志', 'desktop', 'm-401'))
  await clock.settle()
  expect(calls).toBe(1)
  expect((await ui.find({ type: 'Text', text: /failed/ }))?.text).toBe('Translation failed (authentication_failed 401) · Retry')
  await ui.unmount()
})

test('the preview band says why it failed', async ($, on) => {
  const clock = mock.clock(on)
  on('prompt.read', () => ({ value: { text: '你现在在做什么', cursor: 7 } }))
  on('model.complete', () => {
    throw new Error('model haiku is not available')
  })
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  engineRow(on)
  await ($.prompt as any).change({ text: '你现在在做什么', cursor: 7, origin: { kind: 'engine' } })
  await clock.advance(1600)
  await clock.settle()
  const ui = await $.ui.mount({ ...BAND, requestId: 'band-why' })
  expect((await ui.find({ type: 'Text', text: /failed/ }))?.text).toMatch(/^Translation failed \(model "haiku" unavailable; set Lingo · Translation model in \/config: .+\)$/)
  await ui.unmount()
})

test('the translation model comes from /config, and a model the account lacks says where to change it', { options: { translationModel: 'claude-haiku-4-5' } } as any, async ($, on) => {
  const clock = mock.clock(on)
  const models: string[] = []
  on('model.complete', (_: any, e: any) => {
    models.push(e.model)
    return { value: { isAnswered: false, reason: 'api-error', status: 404, error: 'model_not_found', usage: USAGE } }
  })
  engineRow(on)
  const ui = await $.ui.mount(userRow('看一下日志', 'desktop', 'm-model'))
  await clock.settle()
  expect(models).toEqual(['claude-haiku-4-5'])
  expect((await ui.find({ type: 'Text', text: /failed/ }))?.text).toBe(
    'Translation failed (model "claude-haiku-4-5" unavailable; set Lingo · Translation model in /config (model_not_found 404)) · Retry',
  )
  await ui.unmount()
})

test('the translation model defaults to the haiku alias', async ($, on) => {
  const clock = mock.clock(on)
  const models: string[] = []
  on('model.complete', (_: any, e: any) => {
    models.push(e.model)
    return { value: { isAnswered: true, text: 'Check the logs.', usage: USAGE } }
  })
  engineRow(on)
  const ui = await $.ui.mount(userRow('看一下日志', 'desktop', 'm-model-default'))
  await clock.settle()
  expect(models).toEqual(['haiku'])
  await ui.unmount()
})

// ---- pacing and the cross-session cache ----------------------------------------

test('a translation kept from an earlier session is reused: no call', async ($, on) => {
  const clock = mock.clock(on)
  const asked = answer(on, 'x')
  const id = hash('en\u0000帮我看一下登录超时')
  on('store.get', (_: any, e: any) => ({ value: e.key === `g:${id}` ? { status: 'done', text: 'Look into the login timeout.' } : undefined }))
  engineRow(on)
  const ui = await $.ui.mount(userRow('帮我看一下登录超时', 'desktop', 'm-kept'))
  await clock.settle()
  expect(asked.length).toBe(0)
  expect((await ui.find({ type: 'Text', text: /login timeout/ }))?.text).toBe('Look into the login timeout.')
  await ui.unmount()
})

test('a settled translation is kept for later sessions, with an index of the newest', async ($, on) => {
  const clock = mock.clock(on)
  answer(on, 'Look into the login timeout.')
  const store = new Map<string, unknown>()
  on('store.get', (_: any, e: any) => ({ value: store.get(e.key) }))
  on('store.set', (_: any, e: any) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('store.delete', (_: any, e: any) => {
    store.delete(e.key)
    return { value: undefined }
  })
  engineRow(on)
  const ui = await $.ui.mount(userRow('帮我看一下登录超时', 'desktop', 'm-keep'))
  await clock.settle()
  await ui.unmount()
  const id = hash('en\u0000帮我看一下登录超时')
  expect(store.get(`g:${id}`)).toEqual({ status: 'done', text: 'Look into the login timeout.' })
  expect(store.get('gloss-index')).toEqual([id])
})

test('a draft too short to be worth it gets no preview', async ($, on) => {
  const clock = mock.clock(on)
  let box = '你现'
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  const asked = answer(on, 'You now')
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  engineRow(on)
  await ($.prompt as any).change({ text: box, cursor: 2, origin: { kind: 'engine' } })
  await clock.advance(1600)
  expect(asked.length).toBe(0)
  box = '你现在在做什么'
  await ($.prompt as any).change({ text: box, cursor: 7, origin: { kind: 'engine' } })
  await clock.advance(1600)
  await clock.settle()
  expect(asked.length).toBe(1)
})

test('a row that failed on a rate limit (in an earlier load) is tried once more by itself', async ($, on) => {
  const clock = mock.clock(on)
  const asked = answer(on, 'Look into the login timeout.')
  engineRow(on)
  const id = hash('en\u0000帮我看一下登录超时')
  let stale = true
  on('state.get', (_: any, e: any, next: any) =>
    stale && e.key === 'gloss' && e.id === id
      ? { value: { value: { status: 'error', text: '', why: 'rate_limit 429', passing: true }, version: 1 } }
      : next(e),
  )
  on('state.set', (_: any, e: any, next: any) => {
    if (e.key === 'gloss' && e.id === id) stale = false
    return next(e)
  })
  const ui = await $.ui.mount(userRow('帮我看一下登录超时', 'desktop', 'm-auto'))
  await clock.settle()
  await ui.unmount()
  expect(asked.length).toBe(1)
})

test('a lasting failure is not retried by itself', async ($, on) => {
  const clock = mock.clock(on)
  const asked = answer(on, 'x')
  engineRow(on)
  const id = hash('en\u0000帮我看一下登录超时')
  on('state.get', (_: any, e: any, next: any) =>
    e.key === 'gloss' && e.id === id
      ? { value: { value: { status: 'error', text: '', why: 'authentication_failed 401', passing: false }, version: 1 } }
      : next(e),
  )
  const ui = await $.ui.mount(userRow('帮我看一下登录超时', 'desktop', 'm-noauto'))
  await clock.settle()
  expect(asked.length).toBe(0)
  expect(await ui.find({ key: 'lingo-retry' })).toBeDefined()
  await ui.unmount()
})

test('a lasting rate limit: rows say they wait, then fail with Retry within seconds, never hang', async ($, on) => {
  const clock = mock.clock(on)
  let calls = 0
  on('model.complete', () => {
    calls++
    return { value: { isAnswered: false, reason: 'api-error', status: 429, error: 'rate_limit', usage: USAGE } }
  })
  engineRow(on)
  const ui = await $.ui.mount(userRow('看一下日志', 'desktop', 'm-limit'))
  await clock.settle()
  expect((await ui.find({ type: 'Text', text: /waiting|Translat/ }))?.text).toBe('Rate limited · waiting…')
  for (let i = 0; i < 3; i++) {
    await clock.advance(5000) // tries at 0 s, 5 s (after a 5 s cooldown) and 15 s (after 10 s)
    await clock.settle()
  }
  expect(calls).toBe(3)
  expect((await ui.find({ type: 'Text', text: /failed/ }))?.text).toBe('Translation failed (rate_limit 429) · Retry')

  // Cooling down for 20 s now: a new row fails at once instead of joining the wait.
  const late = await $.ui.mount(userRow('再看一下配置', 'desktop', 'm-limit-2'))
  await clock.settle()
  expect(calls).toBe(3)
  expect((await late.find({ type: 'Text', text: /failed/ }))?.text).toMatch(/^Translation failed \(rate limited; paused \d+ s\) · Retry$/)
  await late.unmount()
  await ui.unmount()
})

test('the pace adapts: after rate limits, calls start further apart than the base second', async ($, on) => {
  const clock = mock.clock(on)
  const starts: Array<[string, number]> = []
  let t = 0
  on('model.complete', (_: any, e: any) => {
    starts.push([e.prompt, t])
    return e.prompt === '第一条消息'
      ? { value: { isAnswered: false, reason: 'api-error', status: 429, error: 'rate_limit', usage: USAGE } }
      : { value: { isAnswered: true, text: 'ok', usage: USAGE } }
  })
  engineRow(on)
  const tick = async (n: number) => {
    for (let i = 0; i < n; i++) {
      t += 1000
      await clock.advance(1000)
      await clock.settle()
    }
  }
  const a = await $.ui.mount(userRow('第一条消息', 'desktop', 'm-gap-1'))
  await clock.settle()
  await tick(40) // three 429s: the gap is now 8 s
  const b = await $.ui.mount(userRow('第二条消息', 'desktop', 'm-gap-2'))
  const c = await $.ui.mount(userRow('第三条消息', 'desktop', 'm-gap-3'))
  await clock.settle()
  await tick(12)
  const at = (p: string) => starts.find(([q]) => q === p)?.[1]
  expect(Math.abs(at('第三条消息')! - at('第二条消息')!)).toBeGreaterThanOrEqual(4000)
  for (const ui of [a, b, c]) await ui.unmount()
})

test('a rate limit names the account window that is nearly spent', async ($, on) => {
  const clock = mock.clock(on)
  on('model.complete', () => ({ value: { isAnswered: false, reason: 'api-error', status: 429, error: 'rate_limit', usage: USAGE } }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: {},
      rateLimits: [
        { kind: 'seven_day', percentUsed: 40 },
        { kind: 'five_hour', percentUsed: 100 },
      ],
    },
  }))
  engineRow(on)
  const ui = await $.ui.mount(userRow('看一下日志', 'desktop', 'm-window'))
  for (let i = 0; i < 4; i++) {
    await clock.advance(5000)
    await clock.settle()
  }
  expect((await ui.find({ type: 'Text', text: /failed/ }))?.text).toBe('Translation failed (rate_limit 429; five_hour 100%) · Retry')
  await ui.unmount()
})
