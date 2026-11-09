// OpenAI-compatible chat completions (OpenAI, OpenRouter, Groq, a local Ollama or LM Studio, ...).
// Host-agnostic: no `$`. register.tsx sends the request with `$.http.fetch` and reads it here.

/** One call's outcome, the same shape whichever provider answered. */
export type Attempt =
  | { ok: true; text: string; cut: boolean }
  /** `limited`: a rate limit or an overload (every call cools down). `passing`: a later try may work. */
  | { ok: false; why: string; limited: boolean; passing: boolean }

export type ChatRequest = {
  url: string
  init: { method: 'POST'; headers: Record<string, string>; body: string }
}

/** `<base>/chat/completions`, the base as given (`http://localhost:11434/v1`), a trailing slash or not. */
export function chatUrl(baseUrl: string): string {
  return `${baseUrl.trim().replace(/\/+$/, '')}/chat/completions`
}

export function chatRequest(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  prompt: string,
  maxTokens: number,
): ChatRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (apiKey.trim()) headers.authorization = `Bearer ${apiKey.trim()}`
  return {
    url: chatUrl(baseUrl),
    init: {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.2,
        stream: false,
      }),
    },
  }
}

/** A reasoning model's thinking (`<think>…</think>`, as qwen3 or deepseek-r1 write it) is not the answer. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim()
}

function errorMessage(body: string): string {
  try {
    const j = JSON.parse(body) as { error?: unknown; message?: unknown }
    const e = j.error
    const msg =
      typeof e === 'string' ? e : e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : j.message
    if (typeof msg === 'string' && msg.trim()) return msg.trim().slice(0, 100)
  } catch {
    // not JSON
  }
  return body.trim().slice(0, 100)
}

/** Reads a chat-completions response: the reply, or why there is none and whether to try again. */
export function readChat(status: number, body: string): Attempt {
  if (status >= 200 && status < 300) {
    let j: { choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }> }
    try {
      j = JSON.parse(body)
    } catch {
      return { ok: false, why: 'not an OpenAI-compatible reply; check Lingo · Provider URL', limited: false, passing: false }
    }
    const choice = j.choices?.[0]
    const content = choice?.message?.content
    const text = typeof content === 'string' ? stripThinking(content) : ''
    if (!text) return { ok: false, why: 'empty reply', limited: false, passing: false }
    return { ok: true, text, cut: choice?.finish_reason === 'length' }
  }
  const msg = errorMessage(body)
  const said = msg ? `: ${msg}` : ''
  if (status === 429) return { ok: false, why: `rate_limit 429${said}`, limited: true, passing: true }
  if (status === 401 || status === 403)
    return { ok: false, why: `unauthorized ${status}; set Lingo · Provider API key in /config`, limited: false, passing: false }
  if (status === 404)
    return { ok: false, why: `not found 404${said}; check Lingo · Provider URL and Translation model`, limited: false, passing: false }
  if (status === 529 || status === 503) return { ok: false, why: `overloaded ${status}${said}`, limited: true, passing: true }
  if (status >= 500) return { ok: false, why: `server error ${status}${said}`, limited: false, passing: true }
  return { ok: false, why: `${status === 400 ? 'bad request' : 'error'} ${status}${said}`, limited: false, passing: false }
}

/** The host of a URL, for a "no connection" line (`localhost:11434`). */
export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
