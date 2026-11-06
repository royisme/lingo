import { expect, mock, test } from 'claude-code/testing'

import { SAME, decide, findLanguage } from './lang'

const USAGE = {
  input_tokens: 10,
  output_tokens: 10,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
}
const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const
const EN = findLanguage('English')!
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
  expect(decide('Why does the login endpoint time out?', EN)).toBe('skip')
  expect(decide('Pourquoi le serveur est lent avec la base de données ?', EN)).toBe('translate')
  expect(decide('ログインがタイムアウトする理由を調べて', ZH)).toBe('translate')
  expect(decide('帮我看一下登录超时', JA)).toBe('translate')
  expect(decide('看 `getUserById`', EN)).toBe('skip')
  expect(decide('```ts\nconst a = 1\n```', EN)).toBe('skip')
  expect(decide('Run lint again quickly', EN)).toBe('ask')
  expect(decide('请检查一下', ZH)).toBe('ask') // Simplified vs Traditional: the model decides
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
  await clock.advance(300)
  await ($.prompt as any).change({ text: '先别改代码', cursor: 5, origin: { kind: 'engine' } })
  await clock.advance(700)

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
