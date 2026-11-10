# Lingo

**English** | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Español](README.es.md)

<p align="center">
  <img src="docs/images/hero.gif" alt="Lingo translating a Claude Code conversation into French, Spanish, German, Japanese, Korean, Chinese, Portuguese, Russian and Vietnamese" width="880">
</p>

<p align="center"><b>Learn a language while you code.</b><br>
English · Français · Español · Deutsch · Português · 日本語 · 한국어 · 简体中文 · 繁體中文 · Русский · Tiếng Việt</p>

You already spend hours a day reading and writing with Claude Code. Lingo, a Claude Code plugin, turns those hours into language practice with real, technical sentences you actually care about:

- **Read.** A translation in the language you're learning sits under every prompt and reply, paragraph by paragraph.
- **Write.** Type in your own language and see it in the language you're learning before you send it, with the key words explained. Write in that language yourself and get a more natural version, with the reasons in your own words.
- **Remember.** The words you used become flashcards, scheduled with spaced repetition.

Learn any of 11 languages, with explanations in any other. What you send to Claude is never changed: Lingo only adds lines around it.

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

Then open `/config`, find **Lingo**, and set **Target language** (the one you're learning) and **Native language** (yours). Works on Terminal, Desktop, VS Code and Mobile.

## How you learn

### Read: every message, in the language you're learning

<img src="docs/images/read.png" alt="A Claude Code reply with a Japanese translation under each paragraph" width="880">

Each prompt and reply gets an italic translation underneath, tagged with the language. A long reply is translated paragraph by paragraph, so each translation sits right under the paragraph it belongs to; code blocks, paths and commands stay as they are. Translations start folded (`▸ Translate`), so nothing is translated or paid for until you open one. Click the tag (`FR`, `JA`, `ZH`…) to switch language on the spot.

### Write: type in your language, send it in the new one

<img src="docs/images/write.png" alt="The preview band: a Chinese draft translated to English with key words, and an English draft with corrections explained in Chinese" width="880">

Pause while typing and a preview appears above the prompt box:

- **A draft in your own language** shows its translation, plus up to five words worth learning, each with a short note in your language. Press `u` to put the translation in the box and send it.
- **A draft in the language you're learning** gets a more natural version when one exists, with each change explained in your language: `"It look" → "It looks"  主语是单数`. Press `u` to use it, or fix it yourself.

### Remember: the words you used become flashcards

<img src="docs/images/remember.png" alt="The /lingo review pane: a word, the sentence it came from, its meaning, and the four grades" width="880">

When you send a previewed draft, its key words go into a deck, one for each language you learn. There is no extra model call: the words come from the preview. Run `/lingo review` and grade each card: `1` Again, `2` Hard, `3` Good, `4` Easy. Cards come back on a spaced-repetition schedule (2, 5, 13, 33 days if you keep answering Good). Each card shows the sentence it came from, so you learn the word in context.

## One plugin, any language pair

Every combination of the 11 languages works. A few examples:

| You speak | You're learning | What you get |
| --- | --- | --- |
| 简体中文 | English | English under Claude's Chinese replies; your Chinese drafts previewed in English; grammar notes in Chinese |
| English | 日本語 | Japanese under every message, paragraph by paragraph; word notes in English |
| Español | English | Write English yourself and get corrections explained in Spanish |
| 한국어 | 日本語 | Read Japanese under Korean replies; flashcards with Korean notes |
| Français | Deutsch | German under every prompt and reply, with French notes |

Switch whenever you like: click a tag, run `/lingo de`, or change it in `/config`.

## Commands

| Command | What it does |
| --- | --- |
| `/lingo fr` · `/lingo ja` · `/lingo zh-TW` … | Switch the language you're learning |
| `/lingo off` | Turn Lingo off |
| `/lingo show` | Open the translation of the latest reply (for a terminal where rows can't be clicked) |
| `/lingo review` | Review the flashcards that are due |
| `/lingo words` | Show your deck: words, due, new, the latest ten |
| `/lingo forget <word>` | Remove a card |

In the transcript you can also click the language tag to open a picker (switch language, hide that line, or turn Lingo off), click `Translation failed · Retry` to try again, and click an open translation to fold it.

## Settings

All in `/config`, under **Lingo**:

| Setting | Default | What it does |
| --- | --- | --- |
| **Target language** | `English` | The language you're learning: `English`, `Français`, `Español`, `Deutsch`, `Português`, `日本語`, `한국어`, `简体中文`, `繁體中文`, `Русский`, `Tiếng Việt`, or `Off` |
| **Native language** | `简体中文` | Your own language: word notes and explanations are written in it. Same options, without `Off` |
| **Preview while typing** | `true` | Show a live translation of your draft above the prompt box, with key words. `u` puts it in the box |
| **Suggest fixes while typing** | `true` | When your draft is already in the language you're learning, suggest a more natural version, explained in your language. `u` puts it in the box |
| **Translate my prompts** | `true` | Show a translation under each prompt you send |
| **Translate Claude's replies** | `true` | Show a translation under each of Claude's text replies |
| **Fold translations** | `true` | Each translation starts folded as `▸ Translate`: nothing is translated, or paid for, until you open it. Turn off to translate prompts as they are sent, and each turn's final reply |
| **Save words as flashcards** | `true` | Save the key words of a previewed draft when you send it (or press `u`), for `/lingo review` |
| **Provider** | `Claude` | `Claude` (through Claude Code, your account) or `OpenAI-compatible` (see below) |
| **Translation model** | `haiku` | An alias or a full id (`claude-haiku-4-5`), or your provider's model name. Set a full id if `haiku` isn't available to you |
| **Provider URL** | `http://localhost:11434/v1` | With `OpenAI-compatible`: the API base, ending in `/v1` |
| **Provider API key** | empty | With `OpenAI-compatible`: the provider's key (none for a local Ollama). Stored in plain text in `settings.json` |

## What gets skipped

- **Text already in the language you're learning.** If you're learning English and a message is in English, nothing is shown. For languages that share an alphabet (say, English and French), Lingo checks locally when it can and asks the model when it isn't sure.
- **Code, paths and URLs.** A message that's only `` `getUserById` `` or a code block is skipped without calling the model. Inside prose, inline code, file paths, slash commands and flags are kept exactly as written.

## Cost & privacy

By default each translation is one short call to Claude's `haiku` model through Claude Code's own API: the same account and billing you already use, with no outside translation service. Folded translations cost nothing until you open them; a long reply is still one call; flashcards never call the model. A typical message costs a fraction of a cent.

### Free and local models (OpenAI-compatible)

Lingo can also translate with any endpoint that speaks the OpenAI chat-completions API, including free and fully local ones. Set **Provider** to `OpenAI-compatible`, **Provider URL** to the API base, and **Translation model** to the provider's model name. A service that needs a key takes it in **Provider API key**.

| Provider | Provider URL | Translation model (example) |
| --- | --- | --- |
| Ollama (local, no key) | `http://localhost:11434/v1` | `gemma4:cloud` (recommended) |
| LM Studio (local, no key) | `http://localhost:1234/v1` | the loaded model's name |
| OpenRouter | `https://openrouter.ai/api/v1` | a `:free` model |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

Requests go through Claude Code's own network layer, so your organization's web-fetch policy applies. With such a provider, messages go to the endpoint you set, and its own pricing and privacy terms apply. A reasoning model's `<think>` block is dropped from the translation.

## Design

The design decisions (the gloss, the language tag and its menu, the preview band, the paragraph view, flashcards, settings, colors and copy) are in [docs/DESIGN.md](docs/DESIGN.md).

## Development

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## License

[MIT](LICENSE)
