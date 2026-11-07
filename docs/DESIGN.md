# Lingo design spec

The visual source of truth is the design canvas **“语言学习 Mod · 译文呈现”** (https://claude.ai/artifact/Dn7nv97PRstnrWMYgiMbSU, private to the owner). This file records the decisions it settled, in the terms the code uses.

## 1. The one rule

A translation must never read as something Claude said. Every translation carries **three** marks at once:

1. a **language tag** (`EN`, `FR`, …) before it;
2. **italic** text;
3. the theme's **accent color** (theme key `suggestion`), never the body text color.

Any one mark alone is not enough; together they make a gloss unmistakable in every theme.

## 2. Chosen direction: A · Interlinear gloss

Rejected alternatives, kept on the canvas for reference:

| Direction | Why not chosen |
| --- | --- |
| B · Side pane | Original and translation far apart; no room on phones or narrow windows. |
| C · Folded tag | Every message costs a click; good only for self-testing. *Since 0.2.6 the gloss row of A starts folded by default (see 3.1, Folded), so no message is translated, or paid for, until it is opened: the cost of a translation for every message mattered more than the click.* |

A wins because reading a sentence next to its translation is what learning needs, and the three marks keep it distinct.

## 3. Components

### 3.1 Gloss row (under a message)

```
<message row as the engine draws it>
  [TAG] Italic translation text in the accent color, wrapping under itself
```

| Property | Value |
| --- | --- |
| Placement | Directly under the message, `marginTop 1`, `paddingLeft 2` (aligns with message text after the bullet) |
| Layout | Row, `gap 1`; tag fixed, text `flexShrink 1` and wraps |
| Text | `italic`, color `suggestion`; plain text (the model is told to write no Markdown, and leftover `#`, `**`, backticks are stripped), ` …` appended when the reply hit the token cap |
| Applies to | `UserMessage` with `origin.kind === 'composer'`; `AssistantMessage` text blocks. Never `isSummary` blocks, tool rows, tool output or code. |
| Hidden when | Target is Off; text is already in the target language (`decide` = skip, or model answers `<<SAME>>`); the person hid this gloss; the matching setting is off. |

States:

**Folded** (default, `lingo.foldTranslations`): the row shows the tag and a plain `Button` (`key="lingo-unfold"`) reading `▸ Translate`, dim; nothing is translated, and sending a prompt translates nothing. When a translation of the text is already kept (a preview made it, or an earlier session), it reads `▸ Show translation` and opens with no call. Pressing it opens the row (by `requestId:glossId`) and translates; the open translation is itself a `Button` (`key="lingo-fold"`) that folds it again. `/lingo show` opens the newest reply, for a terminal whose rows cannot be clicked. A text known to be in the target shows no row while folded; opened, it reads `Already in <language>`. With folding off, the row translates as it appears (the states below).


| State | Shows |
| --- | --- |
| pending | `Translating…` dim |
| done | the translation |
| error | `Translation failed (<why>) · Retry` dim, a plain `Button` (`key="lingo-retry"`); pressing it translates again. `<why>` is a few words: `rate_limit 429`, `no connection`, `timed out or cut off`, `empty reply`, `refused: …` |
| same | nothing (row untouched) |

### 3.2 Language tag

| Surface | Look |
| --- | --- |
| terminal | Bold accent letters, no frame (a terminal border costs three rows) |
| desktop, vscode, mobile | Bold caption-size accent letters inside a `round` border in the accent color, `paddingX 1` |

The tag is a `Button` (`key="lingo-tag"`, `plain`): pressing it opens the tag menu.

Tags: `EN FR ES DE PT JA KO ZH ZH-TW RU VI`.

### 3.3 Tag menu (quick switch)

Opens under the gloss row of the message whose tag was pressed; one menu per message.

```
English ✓   Français   Español   Deutsch   Português   日本語   한국어   简体中文   繁體中文   Русский   Tiếng Việt
Hide this translation   Turn off Lingo   Settings…
```

| Item | Key | Action |
| --- | --- | --- |
| A language | `lingo-lang-<code>` | Sets `/config` row `lingo.targetLanguage`; closes the menu. Current one bold accent with `✓`. |
| Hide this translation | `lingo-hide` | Hides this gloss only (by gloss id). |
| Turn off Lingo | `lingo-off` | Sets the target to `Off`. |
| Settings… | `lingo-settings` | Fills `/config` into the prompt box. Drawn dim. |

Languages are listed by their own names, never translated.

### 3.4 Preview band (above the prompt box)

```
[TAG] Preview  Italic translation of the draft
```

| Property | Value |
| --- | --- |
| Trigger | Typing pause of **1.5 s** (`prompt.edit` / `prompt.change`); every edit or caret move restarts the wait, so an IME pause between words does not fire it. A draft under 4 CJK characters or 12 letters is not previewed |
| Shown when | Preview is on, the draft is not in the target language, no survey is up |
| While re-translating | Previous text stays, dimmed |
| Cleared | On submit, on a cleared box, when the draft becomes target-language |
| Stale answers | Dropped if the draft changed, the target language changed, or the preview was turned off while translating |
| Already in target | Remembered for that draft (`same`): nothing drawn, and no new request on a pause or caret move |
| Shared with the gloss | A settled preview answer is also stored as the gloss of that text, so sending the draft costs no second request; a draft sent while its preview is still out waits for that request (on its error, the gloss shows Retry) |
| Duplicates | One request per distinct draft at a time |
| On error | Shows `Translation failed (<why>)` (no retry button here; typing again retries) |

### 3.5 Polish band (a draft already in the target language)

```
[TAG] Better  Italic better version of the draft   Use
```

| Property | Value |
| --- | --- |
| Trigger | The same typing pause as the preview band, when the draft is already in the target language (`classify` = target), or the model, asked about a same-script draft, answers with `<<FIX>>` |
| Shown when | Suggestions are on and the model returned a better version (`<<FIX>> …`); a natural draft (`<<SAME>>`) shows nothing |
| While checking | Nothing (no `Translating…`); while re-checking after an edit, the previous suggestion stays, dimmed |
| On error | Nothing: a failed suggestion is not worth a line |
| Use | A plain `Button` (`key="lingo-use"`, hotkey `u`; in the terminal the band takes the keyboard with ctrl+x tab): writes the better version into the prompt box (`$.prompt.fill`), with every kept piece (code, commands, skills, mentions, URLs) put back exactly as written. Not offered unless each `⟦n⟧` marker came back exactly once, nor when the draft holds a pasted-text or image chip. The used text is not checked again. |
| Text | The better version keeps the draft's own marks (backticks, emphasis), since it may replace the draft |
| Skipped | Slash commands and shell lines (`/…`, `!…`), as for the preview band and glosses |

## 4. Settings: native `/config` rows

Settings live in Claude Code's own `/config` menu (manifest `userConfig`), so they inherit its theme, keys and focus. No custom settings screen.

| Row label | Key | Kind | Default |
| --- | --- | --- | --- |
| Lingo · Target language | `lingo.targetLanguage` | choice | English |
| Lingo · Preview while typing | `lingo.previewWhileTyping` | boolean | true |
| Lingo · Suggest fixes while typing | `lingo.polishWhileTyping` | boolean | true |
| Lingo · Translate my prompts | `lingo.translatePrompts` | boolean | true |
| Lingo · Translate Claude's replies | `lingo.translateReplies` | boolean | true |
| Lingo · Fold translations | `lingo.foldTranslations` | boolean | true |
| Lingo · Provider | `lingo.provider` | choice: Claude, OpenAI-compatible | Claude |
| Lingo · Translation model | `lingo.translationModel` | text | haiku |
| Lingo · Provider URL | `lingo.providerBaseUrl` | text | http://localhost:11434/v1 |
| Lingo · Provider API key | `lingo.providerApiKey` | text, sensitive (secure storage; not a `/config` row) | empty |

Choice values: `English, Français, Español, Deutsch, Português, 日本語, 한국어, 简体中文, 繁體中文, Русский, Tiếng Việt, Off`.

Shortcut command: `/lingo <code|name|off>` writes the same row. With no argument it reports the current language. `/lingo show` opens and translates the newest reply.

Rejected: a custom `/lingo` settings pane (configuration 2 on the canvas); more to maintain per surface, for no gain over native rows.

## 5. Color

Code uses the theme key `suggestion` only; the surface maps it. The canvas was drawn with these approximations:

| Theme | Background | Body text | Accent (`suggestion`) | Dim |
| --- | --- | --- | --- | --- |
| Terminal dark | `#141414` | `#F2F2F2` | `#B1B9F9` | `#9A9A9A` |
| Terminal light | `#FCFCFC` | `#111111` | `#4A5CE0` | `#666666` |
| Desktop light | `#FAF9F5` | `#1F1E1D` | `#3F51C9` | `#6B6862` |
| Desktop dark | `#262624` | `#EDEBE4` | `#A9B4F5` | `#A6A39A` |

Accent on background meets 4.5:1 in all four. Never hard-code these in the mod.

## 6. Type

The mod cannot choose fonts; it uses the surface's. Emphasis comes only from `italic`, `bold`, `size="caption"` and `dimColor`. (Early canvas directions used a serif for glosses; that was dropped because no surface can draw it.)

## 7. Copy (UI strings)

| Id | English |
| --- | --- |
| translating | Translating… |
| failed | Translation failed |
| retry | Translation failed · Retry |
| preview | Preview |
| better | Better |
| use | Use |
| hide | Hide this translation |
| off | Turn off Lingo |
| settings | Settings… |
| cmd.current | Lingo: translating into {language}. Try /lingo fr, /lingo ja or /lingo off; /config has every setting. |
| cmd.set | Lingo: translating into {language}. |
| cmd.off | Lingo: translations off. |
| cmd.denied | Lingo: couldn't change the language ({reason}). |

UI strings are English in 0.1; localizing them to the person's source language is a later step.

## 8. Language detection (what decides if a gloss appears)

1. Strip code fences, inline code, URLs and file paths (a path is `./x`, `a/b/c`, or `dir/file.ext`; ordinary words joined by one slash, like `and/or`, are kept).
2. Fewer than 2 letters left: skip.
3. Dominant script differs from the target's (Han, Kana, Hangul, Cyrillic, Latin; Han with any Kana counts as Japanese): translate.
4. Latin target and 4 or more non-Latin letters in the text: translate (a mixed message is still worth a gloss).
5. Same Latin script: compare common function words; clearly target: skip; clearly another language: translate; unsure: ask the model.
6. Han target (Simplified vs Traditional): ask the model.
7. Asked, the model answers `<<SAME>>` when the text is already in the target; nothing is shown.

## 10. Providers

| Provider | How a call goes |
| --- | --- |
| Claude (default) | `$.model.complete` with **Translation model** (`haiku`), on the session's own account |
| OpenAI-compatible | `$.http.fetch` `POST <Provider URL>/chat/completions`, `{ model, messages: [system, user], max_tokens, temperature: 0.2, stream: false }`, `Authorization: Bearer <key>` when a key is set; 30 s limit kept by a timer, since the fetch has none |

Both answer the same `Attempt` (`hooks/openai.ts`), so pacing, cooldown, retries, the wait limit and the failure words are shared. OpenAI-compatible mapping: 429 → rate limit (cools down), 503/529 → overload (cools down), other 5xx and no connection → may pass, 401/403 → `unauthorized; set the API key: claude plugin configure lingo`, 404 → `not found; check Lingo · Provider URL and Translation model`, other 4xx → the provider's own message. `finish_reason: length` marks a cut gloss; a `<think>…</think>` block is dropped. The default model `haiku` is never sent to another provider: the row asks for its model name instead. No SDK is bundled: a hooks module imports only its own files and has no global `fetch`, and one non-streaming endpoint is a few dozen lines.

## 9. Cost controls

| Control | Rule |
| --- | --- |
| One gloss per text | Keyed by target + trimmed text; the preview and the sent prompt share it |
| Kept from the model | Fenced code, inline code, URLs, slash commands and skills (`/review`, `/plugin:skill`) and @-mentions go to the model as `⟦n⟧` markers and come back as written; a gloss draws a fenced block as `[code]`. A command or mention counts where no word runs into it (`先用/review看` counts; `and/or`, `./src`, `me@example.com` do not) |
| Token cap | 4096 output tokens per gloss; a gloss that hits it ends with ` …` |
| Concurrency | At most 2 glosses translate at once; waiting ones start newest first (the rows nearest the prompt) |
| Orphans | A gloss left `pending` by a module that reloaded mid-request is translated again when its row is drawn |
| Effort | Every call asks for `effort: low`, the least a plugin can: Haiku 5.5 cannot turn thinking off (Claude Code sends no `thinking` for it, so it runs adaptive thinking, by default at `medium`); Haiku 4.5 runs with thinking disabled and drops the effort |
| Side queries | `$.model.complete` goes out as a side query: query source `hook_prompt`, request class `auxiliary`, never a user turn. Some accounts rate-limit those on Haiku 5.5 while serving Haiku 4.5. With the default `haiku`, two rate limits in a row move translation to `claude-haiku-4-5` (10x the price) for 30 min, with one toast, then Haiku 5.5 is tried again. A model named in /config is kept |
| Model | `haiku` by default, resolved like `--model`; an alias can name a version the account or gateway lacks (Haiku 5.5 where only 4.5 is served), so the model is a `/config` row taking a full id. A failure that points at the model (`model_not_found`, 404, 400 `invalid_request`, a refusal) names the row: `model "<m>" unavailable; set Lingo · Translation model in /config` |
| Pacing | Every call (glosses and the preview) starts at least `gap` after the last. `gap` starts at 1 s, doubles on each rate limit (up to 10 s) and shrinks by 0.5 s on each success, so Lingo settles under the account's own per-minute limit, which a plan does not publish |
| Account windows | A rate-limit line names the account's usage window that is 80 % spent or more (`five_hour 100%, resets 18:30`), from `$.session.usage()`: a spent plan reads differently from calls that came too fast |
| Cooldown | A rate limit or an overload pauses every call for 5 s, doubling up to 60 s, back to none after a success. While it lasts, waiting rows and the band say `Rate limited · waiting…`, not `Translating…`. Each load (`session.start`, run again on a `/config` change such as a provider switch) clears that mark, and a row an earlier load left failed is drawn as translating while it is tried again |
| Wait limit | A call that would wait more than 15 s for its turn fails at once: `Translation failed (rate limited; paused N s) · Retry`. No row waits on a lasting rate limit for long |
| Retries | A failure that may pass (rate limit, overload, 5xx, no connection, cut off) is tried up to 3 times, paced as above; others (an auth error, an empty reply, a refused model) are not. A gloss that failed on one that may pass in an earlier load is tried once more by itself when its row is next drawn; a failure of this load is not. Each failure is written to the debug log as `Lingo: translation failed (<why>)` |
| Kept across sessions | Settled glosses (`done`, `same`) go to `$.store` too, the newest 500, so a resumed or restarted session draws its history without calling the model |
