# Lingo

**English** | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Español](README.es.md)

Learn a language while you code. Lingo shows a quiet translation under each prompt and reply in the language you are learning, and previews your draft as you type.

```
You
  Look into why the login endpoint is timing out

  FR  Regarde pourquoi l'endpoint de connexion expire.
```

What you actually send to Claude is never changed — Lingo only adds the line underneath.

## Install

Inside Claude Code:

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

Or from your shell:

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

Works on Terminal, Desktop, VS Code and Mobile.

## Pick your language

Open `/config` and look for **Lingo**:

| Setting | Default | What it does |
| --- | --- | --- |
| **Target language** | `English` | `English`, `Français`, `Español`, `Deutsch`, `Português`, `日本語`, `한국어`, `简体中文`, `繁體中文`, `Русский`, `Tiếng Việt`, or `Off` |
| **Preview while typing** | `true` | Show a live translation above the prompt box after a brief pause |
| **Suggest fixes while typing** | `true` | When your draft is already in the language you're learning, suggest a more natural version above the prompt box; **Use** puts it in the box |
| **Translate my prompts** | `true` | Show a translation under each prompt you send |
| **Translate Claude's replies** | `true` | Show a translation under each of Claude's text replies |
| **Provider** | `Claude` | `Claude` (through Claude Code, your account) or `OpenAI-compatible` (see below) |
| **Provider URL** | `http://localhost:11434/v1` | With `OpenAI-compatible`: the API base, ending in `/v1` |
| **Translation model** | `haiku` | The model that translates: an alias or a full id (`claude-haiku-4-5`, or your gateway's model name). Set a full id if `haiku` isn't available to you |

Or switch at any time without opening `/config`:

- **Click the language tag** (`EN`, `FR`, `日本語`…) next to any translation to open an inline picker — switch language, hide that line, or turn Lingo off.
- **Click a failed line** (`Translation failed · Retry`) to retry the translation.
- **Run `/lingo`**: `/lingo fr`, `/lingo ja`, `/lingo zh-TW`, `/lingo off`.

## What gets skipped

- **Already in your target language.** If you're learning English and a message is already in English, nothing is shown. For languages that share an alphabet (say, English and French), Lingo checks locally when it can and asks the model when it isn't sure.
- **Code, paths and URLs.** A message that's just `` `getUserById` `` or a fenced code block is skipped without calling the model. Inside prose, inline code, file paths and flags stay untouched.

## Other providers (OpenAI-compatible)

Lingo can translate with any endpoint that speaks the OpenAI chat-completions API: a local **Ollama** or **LM Studio**, **OpenRouter**, **Groq**, and many more. Set **Provider** to `OpenAI-compatible`, **Provider URL** to the API base, and **Translation model** to the provider's model name.

| Provider | Provider URL | Translation model (example) |
| --- | --- | --- |
| Ollama (local, no key) | `http://localhost:11434/v1` | `qwen2.5:7b` |
| LM Studio (local, no key) | `http://localhost:1234/v1` | the loaded model's name |
| OpenRouter | `https://openrouter.ai/api/v1` | a `:free` model |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

An API key is kept in secure storage, not in `/config`. Set it from your terminal:

```sh
echo '{"providerApiKey":"sk-..."}' | claude plugin configure lingo --values-stdin
```

Requests go through Claude Code's own network layer (`$.http.fetch`), so your organization's web-fetch policy applies. A reasoning model's `<think>` block is dropped from the translation.

## Cost & privacy

Each translation is one short call to Claude's `haiku` model through Claude Code's own `$.model.complete` API — the same account and billing you already use, with no external translation service and no network permissions. A typical message costs a fraction of a cent; messages already in your target language cost nothing in most cases. With an OpenAI-compatible provider, messages go to the endpoint you set instead, and its own pricing and privacy terms apply.

## Design

The design decisions — the gloss, the language tag and its menu, the preview band, settings, colors and copy — are in [docs/DESIGN.md](docs/DESIGN.md).

## Development

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## License

[MIT](LICENSE)
