# Changelog

All notable changes to the Lingo plugin for Claude Code are documented in this file.

## [0.1.0] - 2026-11-06

### Added
- **11 Target Languages**: Translate into `English`, `Français`, `Español`, `Deutsch`, `Português`, `日本語`, `한국어`, `简体中文`, `繁體中文`, `Русский`, or `Tiếng Việt` (`Off` to disable).
- **Prompt & Reply Glosses**: Displays a quiet translation and language tag (`EN`, `FR`, `日本語`, etc.) under each prompt and Claude reply across Terminal, Desktop, VS Code, and Mobile.
- **Live Draft Preview**: Translates your draft above the prompt box after a brief typing pause (`600ms`), with in-flight deduplication and race-condition guards.
- **Interactive Tag Menu & `/lingo` Command**: Click any language tag to switch target language, hide a single translation, or turn Lingo off; or run `/lingo <code|off>` and `/config`.
- **Click-to-Retry on Error**: Failed message translations show an interactive `Translation failed · Retry` button to re-run the translation.
- **Local Script & Language Detection**: Skips code blocks, inline code, file paths, flags, and messages already in the target language locally whenever possible, calling Claude's built-in `haiku` model alias via `$.model.complete` only when needed.
