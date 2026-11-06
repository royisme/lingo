import { expect, mock, test } from 'claude-code/testing'

import { chatRequest, chatUrl, readChat, stripThinking } from './openai'

const OLLAMA = { provider: 'OpenAI-compatible', translationModel: 'qwen2.5:7b' }
const userRow = (text: string, requestId: string) =>
  ({
    plugin: 'lingo',
    surface: 'desktop',
    component: 'UserMessage',
    requestId,
    props: { text, origin: { kind: 'composer' }, isExpanded: true },
  }) as any

function engineRow(on: any) {
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine row</Text>
  })
}

const reply = (content: string, finish = 'stop') =>
  JSON.stringify({ choices: [{ message: { role: 'assistant', content }, finish_reason: finish }] })

test('chatRequest and readChat speak the chat-completions shape', () => {
  expect(chatUrl('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1/chat/completions')
  const req = chatRequest('https://openrouter.ai/api/v1', ' sk-1 ', 'm', 'SYS', 'hi', 4096)
  expect(req.url).toBe('https://openrouter.ai/api/v1/chat/completions')
  expect(req.init.headers.authorization).toBe('Bearer sk-1')
  expect(JSON.parse(req.init.body)).toEqual({
    model: 'm',
    messages: [
      { role: 'system', content: 'SYS' },
      { role: 'user', content: 'hi' },
    ],
    max_tokens: 4096,
    temperature: 0.2,
    stream: false,
  })
  expect(chatRequest('http://localhost:11434/v1', '', 'm', 's', 'p', 1).init.headers.authorization).toBeUndefined()

  expect(readChat(200, reply('Hello.'))).toEqual({ ok: true, text: 'Hello.', cut: false })
  expect(readChat(200, reply('Long', 'length'))).toEqual({ ok: true, text: 'Long', cut: true })
  expect(readChat(200, reply('<think>hmm, the user wants…</think>\nNow you'))).toEqual({ ok: true, text: 'Now you', cut: false })
  expect(stripThinking('<think>never closed')).toBe('')
  expect(readChat(200, '<html>')).toMatchObject({ ok: false, passing: false })
  expect(readChat(429, '{"error":{"message":"slow down"}}')).toEqual({
    ok: false,
    why: 'rate_limit 429: slow down',
    limited: true,
    passing: true,
  })
  expect(readChat(404, '{"error":"model \'qwen9\' not found"}')).toMatchObject({
    ok: false,
    why: "not found 404: model 'qwen9' not found; check Lingo · Provider URL and Translation model",
    passing: false,
  })
  expect(readChat(401, '')).toMatchObject({ ok: false, passing: false })
  expect(readChat(503, '')).toMatchObject({ ok: false, limited: true, passing: true })
})

test('an OpenAI-compatible provider translates through $.http.fetch', { options: OLLAMA } as any, async ($, on) => {
  const clock = mock.clock(on)
  const sent: Array<{ url: string; body: any }> = []
  let completes = 0
  on('model.complete', () => {
    completes++
    return { value: { isAnswered: true, text: 'x', usage: {} } }
  })
  on('http.fetch', (_: any, e: any) => {
    sent.push({ url: e.url, body: JSON.parse(e.init.body) })
    return { value: { status: 200, ok: true, headers: {}, text: reply('Look into the login timeout.') } }
  })
  engineRow(on)
  const ui = await $.ui.mount(userRow('帮我看一下登录超时', 'm-oai'))
  await clock.settle()
  expect(completes).toBe(0)
  expect(sent.length).toBe(1)
  expect(sent[0]!.url).toBe('http://localhost:11434/v1/chat/completions')
  expect(sent[0]!.body.model).toBe('qwen2.5:7b')
  expect(sent[0]!.body.messages[1].content).toBe('帮我看一下登录超时')
  expect((await ui.find({ type: 'Text', text: /login timeout/ }))?.text).toBe('Look into the login timeout.')
  await ui.unmount()
})

test('a provider rate limit cools down and tries again', { options: OLLAMA } as any, async ($, on) => {
  const clock = mock.clock(on)
  let calls = 0
  on('http.fetch', () => {
    calls++
    return calls === 1
      ? { value: { status: 429, ok: false, headers: {}, text: '{"error":{"message":"slow down"}}' } }
      : { value: { status: 200, ok: true, headers: {}, text: reply('Check the logs.') } }
  })
  engineRow(on)
  const ui = await $.ui.mount(userRow('看一下日志', 'm-oai-429'))
  await clock.settle()
  expect(calls).toBe(1)
  await clock.advance(6000)
  await clock.settle()
  expect(calls).toBe(2)
  expect((await ui.find({ type: 'Text', text: /Check the logs/ }))?.text).toBe('Check the logs.')
  await ui.unmount()
})

test('Ollama not running: the failed line names the host', { options: OLLAMA } as any, async ($, on) => {
  const clock = mock.clock(on)
  on('http.fetch', () => {
    throw new Error('connection refused')
  })
  engineRow(on)
  const ui = await $.ui.mount(userRow('看一下日志', 'm-oai-down'))
  for (let i = 0; i < 4; i++) {
    await clock.settle()
    await clock.advance(31000)
  }
  await clock.settle()
  expect((await ui.find({ type: 'Text', text: /failed/ }))?.text).toBe('Translation failed (no connection to localhost:11434; is it running?) · Retry')
  await ui.unmount()
})

test('the Claude default model name is not sent to another provider', { options: { provider: 'OpenAI-compatible' } } as any, async ($, on) => {
  const clock = mock.clock(on)
  let calls = 0
  on('http.fetch', () => {
    calls++
    return { value: { status: 200, ok: true, headers: {}, text: reply('x') } }
  })
  engineRow(on)
  const ui = await $.ui.mount(userRow('看一下日志', 'm-oai-nomodel'))
  await clock.settle()
  expect(calls).toBe(0)
  expect((await ui.find({ type: 'Text', text: /failed/ }))?.text).toBe(
    "Translation failed (set Lingo · Translation model to your provider's model name) · Retry",
  )
  await ui.unmount()
})

test('the API key goes as a Bearer token', { options: { ...OLLAMA, providerBaseUrl: 'https://openrouter.ai/api/v1', providerApiKey: 'sk-test' } } as any, async ($, on) => {
  const clock = mock.clock(on)
  const auth: string[] = []
  on('http.fetch', (_: any, e: any) => {
    auth.push(e.init.headers.authorization)
    return { value: { status: 200, ok: true, headers: {}, text: reply('Check the logs.') } }
  })
  engineRow(on)
  const ui = await $.ui.mount(userRow('看一下日志', 'm-oai-key'))
  await clock.settle()
  expect(auth).toEqual(['Bearer sk-test'])
  await ui.unmount()
})
