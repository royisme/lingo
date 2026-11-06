# Lingo

**Learn a language while you code with Claude Code.**

You keep prompting in the language you think in. Lingo writes the same message in the language you're learning, right under it — for your prompts, for Claude's replies, and live while you type. Your conversation with Claude is never changed: translations are display-only.

```
> 帮我看一下为什么登录接口在高并发下会超时，先别改代码。
  EN  Can you look into why the login endpoint times out under high concurrency?
      Don't change any code yet.

⏺ Grep(pattern: "max_pool_size")
  ⎿  Found 3 files

⏺ 问题出在数据库连接池：最大连接数是 10，而压测时有 200 个并发请求在排队。
  EN  The problem is the database connection pool: it allows at most 10
      connections, while 200 concurrent requests are queuing for one.
```

## What it does

- **Your prompts.** When you send a prompt that isn't in your target language, its translation appears under it.
- **Claude's replies.** Each text block of a reply is translated the same way. Tool calls, tool output and code are never translated.
- **Preview while you type.** Pause for a moment and the translation of your draft shows above the prompt box, so you can read how to say it before you send it.
- **Clearly not Claude.** Every translation carries a language tag (`EN`, `FR`, …), is set in italics, and uses your theme's accent color, so it never reads as part of Claude's answer. It follows your Claude Code theme, light or dark, in the terminal and the desktop app.
- **Quick switch.** Click the language tag to switch language, hide one translation, or turn Lingo off.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install lingo --marketplace royisme/lingo
```

Answer `y` to add the marketplace, then pick a scope (User installs it for every project).

From a shell:

```
claude plugin install lingo --marketplace royisme/lingo
```

In the desktop app: click **+** next to the prompt box → **Plugins** → **Add marketplace** with `royisme/lingo`, then **Add plugin**.

## Configure

Open `/config` and scroll to the **Lingo** rows:

| Setting | Default | What it does |
| --- | --- | --- |
| Target language | English | The language you're learning. `Off` turns Lingo off. |
| Preview while typing | On | Shows a translation of your draft above the prompt box. |
| Translate my prompts | On | Shows translations under your own messages. |
| Translate Claude's replies | On | Shows translations under Claude's text. |

Shortcut: `/lingo fr` switches the target language, `/lingo off` turns translations off.

Target languages: English, Français, Español, Deutsch, Português, 日本語, 한국어, 简体中文, 繁體中文, Русский, Tiếng Việt. Any source language works: Lingo translates whatever isn't already in your target language and leaves the rest alone.

## How translation works

Lingo asks Claude Haiku for each translation, through your own Claude Code session — no extra account, API key or service. It keeps Markdown, code, file paths, identifiers and numbers as they are, and translates each message only once.

**Cost.** Haiku 5.5 is priced at $0.10 per million input tokens and $0.50 per million output tokens. A heavy day — a hundred prompts with previews, and their replies — comes to roughly 0.5 million tokens, about **$0.10–0.15 a day** at API prices. On a subscription plan the calls count toward your plan's usage like the rest of your session.

**Privacy.** Text goes only where your session already sends it: to Claude, through your Claude Code session's own connection. Lingo stores your chosen settings and nothing else.

## Limitations

- Translations are machine-made. Use them as a reference, not as a source of truth.
- Very short messages (a word or two) may not be detected reliably and are left untranslated.
- The live preview needs a prompt box that reports typing; where a surface doesn't, translations under messages still work.

## Development

The Claude Code mod lives in [`claude-code/`](claude-code); the marketplace file at the repository root points to it.

```
claude plugin validate claude-code   # what the engine will load, and anything it would refuse
claude plugin test claude-code       # the mod's tests, on every surface
claude --plugin-dir claude-code      # run it from this folder; edits reload as you save
```

## License

MIT
