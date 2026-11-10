# Changelog

All notable changes to the Lingo plugin for Claude Code are documented in this file.

## [0.5.1] - 2026-11-10

### Changed
- A long reply (3 or more paragraphs, or 2 in a long text) is translated paragraph by paragraph in one call, so each paragraph's translation can later be drawn under it. Its code blocks are not sent. A model that cannot answer in that shape is asked for a whole translation instead, and after three misses in a row, for the rest of the session. For now the translation still shows as one block, a blank line between paragraphs.

## [0.5.0] - 2026-11-09

### Added
- **Vocabulary flashcards** (0.4.4 to 0.4.7): the key words of a translation preview are saved when you send or use that draft, with no extra model call; `/lingo review` opens a pane that schedules them with SM-2 style spacing; `/lingo words` and `/lingo forget <word>` manage the deck; the `Save words as flashcards` row in `/config` turns saving off. See the README.

### Fixed
- In the review pane, Easy is always at least a day past Good; at short intervals both once gave the same day.

## [0.4.7] - 2026-11-09

### Added
- **`/lingo review`**: opens a pane that quizzes the saved words (up to 20 per session, at most 10 new): the word and its sentence, then `s` shows the note and `1` to `4` grade it (Again, Hard, Good, Easy, with the next interval); `x` removes the card; Enter shows the note, then grades Good. Every grade is saved as it is made; the pane closes itself after the last card.

### Fixed
- `/lingo words` names the language by its tag (`ZH`), not its code (`ZH-CN`).

## [0.4.6] - 2026-11-09

### Added
- **`/lingo words` and `/lingo forget <word>`**: `/lingo words` reports the saved deck in one line (words, due, new, the latest ten); `/lingo forget <word>` removes a card (case, width and spacing do not matter).

## [0.4.5] - 2026-11-09

### Added
- **Words saved as flashcards**: the key words of a translation preview (the ones listed under it) are saved to a deck per target language when you send that draft, or when you press `u: Use` on it, so one-key translating saves them too. Nothing is saved for drafts you abandon, for polish suggestions, or before the preview has settled; a word already in the deck is kept as it is. No extra model call. The sent prompt's row shows a dim `· +N words`, and the first save raises one toast. New `/config` row `Lingo · Save words as flashcards` (on by default); turning it off stops saving only.

## [0.4.4] - 2026-11-09

### Fixed
- **A full store no longer stops translations being kept**: `$.store` holds 4 MiB for the whole plugin, and once it was full every save failed silently, for good. Now a rejected save frees the 100 oldest cached translations and tries once more; if that fails too, it gives up with one line in the debug log.

## [0.4.3] - 2026-11-09

### Added
- **Use on a translation**: when the preview band translates a draft, `u: Use` puts the translation in the prompt box, so you send (and Claude answers in) the target language. Code, commands, mentions and URLs come back exactly as written. Not offered when a marker was lost, the translation was cut, the draft holds a pasted chip, or the preview came from the cache. The filled text is not previewed or polished again.

## [0.4.2] - 2026-11-09

### Fixed
- **Broken translations cached before 0.4.1 are no longer reused**: when the model took the text as instructions, its own reasoning was kept as the translation and shown again in later sessions. The cache now uses new keys (`g2:`, `gloss-index-2`), so old entries are never read, and the old entries are deleted once at session start (best effort).

## [0.4.1] - 2026-11-09

### Changed
- **One translation per turn with folding off**: with `Lingo · Fold translations` off, only the final reply of a turn is translated (when the turn completes). The text Claude writes between tool calls shows `▸ Translate` and costs nothing until opened; one already translated still shows its translation. Prompts are still translated as they are sent. Folded mode and `/lingo show` are unchanged.

## [0.4.0] - 2026-11-09

### Added
- **Native language setting** (`Lingo · Native language`, default 简体中文): explanations and word notes are written in it.
- **Structured feedback in the preview band**: a draft already in the target language shows what was changed, one dim row per change (`"wrong" → "right"  reason`, at most 3); a translated draft shows up to 5 key words with short notes (`word — note · word — note`). The band fits `maxRows`, the first row always kept. A model that does not answer JSON (a small local one) falls back to the plain preview. Glosses under sent messages are unchanged.

## [0.3.3] - 2026-11-09

### Changed
- **Code-like drafts are not previewed**: a draft that is mostly code (a stack trace, JSON, shell lines) gets no preview and no polish call, so it costs no model request. Glosses under sent messages are unchanged.

## [0.3.2] - 2026-11-09

### Fixed
- **Provider API key is a `/config` row**: it was a secure option, so it never showed in `/config`. It is now set there like the other provider rows (stored in plain text in `settings.json`).

## [0.3.1] - 2026-11-07

### Fixed
- **No "rate limited" flash after switching provider**: a load (a `/config` change) clears the mark an earlier load left, and a row that failed under the earlier load is drawn as translating while it is tried again, not as the old failure.

### Changed
- READMEs recommend `gemma4:cloud` on Ollama.

## [0.3.0] - 2026-11-06

### Added
- **OpenAI-compatible providers**: translate with a local Ollama or LM Studio, OpenRouter, Groq or any endpoint that speaks the chat-completions API. New `/config` rows `Lingo · Provider` and `Lingo · Provider URL`; the API key is a secure option (`claude plugin configure lingo`). Pacing, cooldown, retries and failure messages work the same as with Claude; a reasoning model's `<think>` block is dropped.

## [0.2.6] - 2026-11-06

### Changed
- **Translations start folded** (new `/config` row `Lingo · Fold translations`, on by default): each message shows `EN ▸ Translate` and nothing is translated, or paid for, until you open it. A translation already made (by the preview, or in an earlier session) opens as `▸ Show translation` with no call. Click an open translation to fold it. `/lingo show` translates the latest reply, for a terminal whose rows can't be clicked. Sending a prompt no longer translates it in advance. Turn the row off for the old behaviour.

## [0.2.5] - 2026-11-06

### Changed
- **Lowest thinking effort**: every translation asks for `effort: low`. Haiku 5.5 cannot turn thinking off and otherwise thinks at `medium`.
- **Haiku 4.5 when Haiku 5.5 is rate-limited for plugins**: plugin calls are side queries, which some accounts rate-limit on Haiku 5.5 while serving Haiku 4.5. With the default model, two rate limits in a row switch translation to Haiku 4.5 for 30 minutes (one toast says so), then Haiku 5.5 is tried again. Haiku 4.5 costs 10x as much per token, so Haiku 5.5 stays the default. A model you name in `/config` is always kept.

## [0.2.4] - 2026-11-06

### Fixed
- **Pace adapts to the account's limit**: the gap between calls doubles on each rate limit (1 s up to 10 s) and shrinks back by 0.5 s on each success. An account whose haiku limit is lower than one call a second no longer keeps hitting 429.
- **Rate-limit lines name a spent usage window**: `Translation failed (rate_limit 429; five_hour 100%, resets 18:30)` when a plan window is 80 % used or more.

## [0.2.3] - 2026-11-06

### Fixed
- **Stuck `Translating…` under a lasting rate limit**: the 0.2.2 cooldown let rows wait minutes with no sign. Now a call that would wait over 15 s fails at once (`Translation failed (rate limited; paused N s) · Retry`), a row fails within about 15 s at most, and rows waiting on a cooldown say `Rate limited · waiting…`.
- A row's own fresh failure no longer triggers the once-only automatic retry meant for failures from before a reload.

## [0.2.2] - 2026-11-06

### Fixed
- **Fewer rate limits (429)**:
  - Translations are kept across sessions (the newest 500), so restarting or resuming no longer re-translates the whole transcript.
  - Calls start at least 1 s apart; a rate limit or overload pauses all calls for 5 s, doubling up to 60 s.
  - A failure that may pass is tried up to 3 times, and a row that failed on one is retried once by itself after an update or reload.
- **Preview waits for typing to settle**: 1.5 s of quiet (was 600 ms), so pauses while choosing IME candidates no longer fire a call each; drafts under 4 CJK characters or 12 letters are not previewed.

## [0.2.1] - 2026-11-06

### Fixed
- **Failed translations say why**: `Translation failed (rate_limit 429)`, `(no connection)`, `(timed out or cut off)`, `(refused: …)`, on the gloss line and the preview band, and in the debug log.
- **Translation model is a setting**: new `/config` row `Lingo · Translation model` (default `haiku`). The `haiku` alias may name a version your account or gateway doesn't serve (Haiku 5.5 where only 4.5 is); set a full id such as `claude-haiku-4-5` or your gateway's model name. A failure that points at the model says so and names the row.
- **Passing failures are retried once by themselves** (rate limit, overload, 5xx, dropped connection, a call cut off by a reload) after 1.5 s.

## [0.2.0] - 2026-11-06

### Added
- **Suggest fixes while typing**: when your draft is already in the language you're learning, the band above the prompt box shows a more natural version (`EN Better …`); **Use** (or `u` once the band has focus: ctrl+x tab in the terminal) puts it in the box, your code, commands and mentions kept. A natural draft shows nothing. New `/config` row `Lingo · Suggest fixes while typing` (on by default).

### Changed
- Slash commands and shell lines (`/…`, `!…`) get no preview and no gloss.
- **Commands, skills and mentions are never translated or rewritten**: code, URLs, `/commands`, `/plugin:skill` and `@mentions` inside a message go to the model as `⟦n⟧` markers and come back exactly as written. **Use** is offered only when every one of them survives.

## [0.1.1] - 2026-11-06

### Fixed
- **No double translation of a sent prompt**: the live preview's answer is stored as that text's gloss, and a prompt sent while its preview is still translating waits for that request, so a previewed draft costs one model call, not two.
- **Drafts already in the target language** are asked about once; pausing or moving the caret no longer re-asks the model.
- **Stuck `Translating…`**: a gloss left pending by a module reload (e.g. a `/config` change mid-request) is translated again.
- **Markdown in glosses**: translations are plain text; leftover `#`, `**` and backticks are stripped.

### Changed
- **Code blocks are not sent** to the model: each fenced block is replaced by a `[code]` line, cutting tokens on code-heavy replies.
- **Token cap raised to 4096**; a gloss that hits it ends with ` …` instead of stopping silently.
- **At most 2 glosses translate at once** (a resumed session no longer fires one request per message); waiting glosses start newest first.
- Tag menus are keyed per gloss, not per message.

## [0.1.0] - 2026-11-06

### Added
- **11 Target Languages**: Translate into `English`, `Français`, `Español`, `Deutsch`, `Português`, `日本語`, `한국어`, `简体中文`, `繁體中文`, `Русский`, or `Tiếng Việt` (`Off` to disable).
- **Prompt & Reply Glosses**: Displays a quiet translation and language tag (`EN`, `FR`, `日本語`, etc.) under each prompt and Claude reply across Terminal, Desktop, VS Code, and Mobile.
- **Live Draft Preview**: Translates your draft above the prompt box after a brief typing pause (`600ms`), with in-flight deduplication and race-condition guards.
- **Interactive Tag Menu & `/lingo` Command**: Click any language tag to switch target language, hide a single translation, or turn Lingo off; or run `/lingo <code|off>` and `/config`.
- **Click-to-Retry on Error**: Failed message translations show an interactive `Translation failed · Retry` button to re-run the translation.
- **Local Script & Language Detection**: Skips code blocks, inline code, file paths, flags, and messages already in the target language locally whenever possible, calling Claude's built-in `haiku` model alias via `$.model.complete` only when needed.
