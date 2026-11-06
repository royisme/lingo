# Changelog

All notable changes to the Lingo plugin for Claude Code are documented in this file.

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
