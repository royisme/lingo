# Lingo

[English](README.md) | [简体中文](README.zh-CN.md) | **繁體中文** | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Español](README.es.md)

<p align="center">
  <img src="docs/images/hero.gif" alt="Lingo 將 Claude Code 的對話翻譯成法文、西班牙文、德文、日文、韓文、中文、葡萄牙文、俄文與越南文" width="880">
</p>

<p align="center"><b>邊寫程式，邊學外語。</b><br>
English · Français · Español · Deutsch · Português · 日本語 · 한국어 · 简体中文 · 繁體中文 · Русский · Tiếng Việt</p>

你每天都要花好幾個小時和 Claude Code 讀寫。Lingo 是一個 Claude Code 外掛，它把這些時間變成語言練習，練的全是你真正在意的技術句子：

- **讀。** 每則提示詞和每段回覆下方，都有一段你所學語言的譯文，逐段對照。
- **寫。** 用母語輸入，送出前就能看到目標語言的版本，關鍵字附帶說明。直接用目標語言寫，則會得到更道地的改寫，理由用你的母語說明。
- **記。** 你用過的字詞會自動變成單字卡，依間隔重複安排複習。

11 種語言任你挑著學，說明可以用其餘任一種語言。你送給 Claude 的內容一個字都不會改，Lingo 只是在旁邊多加幾行。

## 安裝

在 Claude Code 裡：

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

或是在 shell 裡：

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

接著開啟 `/config`，找到 **Lingo**，設定 **Target language**（你正在學的語言）和 **Native language**（你的母語）。終端機、桌面版、VS Code 和行動裝置都能用。

## 怎麼學

### 讀：每則訊息，都有你所學語言的版本

<img src="docs/images/read.png" alt="Claude Code 的一則回覆，每個段落下方都有日文譯文" width="880">

每則提示詞和回覆下方都有一行斜體譯文，並標明語言。較長的回覆會逐段翻譯，每段譯文緊接在對應的段落下方；程式碼區塊、路徑和指令則維持原樣。譯文預設摺疊（`▸ Translate`），你不點開，就不會翻譯，也不會花一毛錢。點一下語言標籤（`FR`、`JA`、`ZH`……）就能當場切換語言。

### 寫：用母語起草，用目標語言送出

<img src="docs/images/write.png" alt="預覽列：中文草稿翻成英文並列出關鍵字；英文草稿提出修改建議，並用中文說明原因" width="880">

輸入時停一下，提示框上方就會出現預覽：

- **用母語寫的草稿**會顯示譯文，另外最多列出五個值得學的字詞，每個都用你的母語寫了簡短說明。按 `u` 把譯文放進輸入框，直接送出。
- **用目標語言寫的草稿**在有更自然的說法時會給出改寫，每處修改都用你的母語說明：`"It look" → "It looks"  主詞是單數`。按 `u` 採用，也可以自己改。

### 記：用過的字詞，自動變成單字卡

<img src="docs/images/remember.png" alt="/lingo review 複習畫面：一個單字、它出自的句子、字義，以及四個評分選項" width="880">

送出預覽過的草稿時，其中的關鍵字會存進字庫，每種所學語言各有一個字庫。不會多呼叫一次模型，這些字詞直接取自預覽。執行 `/lingo review`，為每張卡評分：`1` Again，`2` Hard，`3` Good，`4` Easy。卡片會依間隔重複的節奏再次出現（一直答 Good 的話，依序是 2、5、13、33 天後）。每張卡都附有它出自的那個句子，讓你在語境中記住單字。

## 一個外掛，任意語言組合

11 種語言，任意搭配都行。幾個例子：

| 你的母語 | 你正在學 | 你能得到什麼 |
| --- | --- | --- |
| 繁體中文 | English | Claude 的中文回覆下方是英文譯文；你的中文草稿先預覽成英文；文法說明用中文 |
| English | 日本語 | 每則訊息下方都有日文，逐段對照；單字說明用英文 |
| Español | English | 自己寫英文，錯在哪裡用西班牙文講給你聽 |
| 한국어 | 日本語 | 在韓文回覆下方讀日文；單字卡附韓文釋義 |
| Français | Deutsch | 每則提示詞和回覆下方都是德文，說明用法文 |

想換隨時換：點一下標籤、執行 `/lingo de`，或是到 `/config` 裡修改。

## 指令

| 指令 | 作用 |
| --- | --- |
| `/lingo fr` · `/lingo ja` · `/lingo zh-TW` … | 切換你正在學的語言 |
| `/lingo off` | 關閉 Lingo |
| `/lingo show` | 展開最新一則回覆的譯文（適用於無法點擊列的終端機） |
| `/lingo review` | 複習到期的單字卡 |
| `/lingo words` | 查看你的字庫：總字數、到期、新字、最近十個 |
| `/lingo forget <word>` | 刪除一張卡 |

在對話記錄中，你還可以點語言標籤開啟選單（切換語言、隱藏這一行，或關閉 Lingo），點 `Translation failed · Retry` 重試，點已展開的譯文將它摺疊起來。

## 設定

全都在 `/config` 的 **Lingo** 底下：

| 設定 | 預設值 | 作用 |
| --- | --- | --- |
| **Target language** | `English` | 你正在學的語言：`English`、`Français`、`Español`、`Deutsch`、`Português`、`日本語`、`한국어`、`简体中文`、`繁體中文`、`Русский`、`Tiếng Việt` 或 `Off` |
| **Native language** | `简体中文` | 你的母語：單字說明和解釋都用它來寫。選項相同，但沒有 `Off` |
| **Preview while typing** | `true` | 在提示框上方即時顯示草稿的譯文和關鍵字。按 `u` 放進輸入框 |
| **Suggest fixes while typing** | `true` | 草稿本身已是目標語言時，提供更自然的改寫，並用你的母語說明。按 `u` 放進輸入框 |
| **Translate my prompts** | `true` | 在你送出的每則提示詞下方顯示譯文 |
| **Translate Claude's replies** | `true` | 在 Claude 的每段文字回覆下方顯示譯文 |
| **Fold translations** | `true` | 每段譯文預設摺疊為 `▸ Translate`：沒點開就不翻譯，也不花錢。關閉後，提示詞會在送出時翻譯，每一輪的最終回覆也會翻譯 |
| **Save words as flashcards** | `true` | 送出（或按 `u`）預覽過的草稿時，儲存其中的關鍵字，供 `/lingo review` 使用 |
| **Provider** | `Claude` | `Claude`（透過 Claude Code，使用你自己的帳號）或 `OpenAI-compatible`（見下文） |
| **Translation model** | `haiku` | 別名或完整 ID（`claude-haiku-4-5`），或你的服務供應商的模型名稱。如果你無法使用 `haiku`，請填完整 ID |
| **Provider URL** | `http://localhost:11434/v1` | 選 `OpenAI-compatible` 時：API 的基礎網址，以 `/v1` 結尾 |
| **Provider API key** | 空白 | 選 `OpenAI-compatible` 時：服務供應商的金鑰（本機 Ollama 不需要）。以明文儲存在 `settings.json` 裡 |

## 哪些內容會被略過

- **已經是目標語言的文字。** 你在學英文，訊息本身就是英文，那就什麼都不顯示。對於共用字母的語言（例如英文和法文），Lingo 能在本機判斷就在本機判斷，沒把握時才詢問模型。
- **程式碼、路徑和 URL。** 只有 `` `getUserById` `` 或一個程式碼區塊的訊息，會直接略過，不呼叫模型。內文裡的行內程式碼、檔案路徑、斜線指令和參數都維持原樣。

## 費用與隱私

預設情況下，每次翻譯就是透過 Claude Code 自己的 API，對 Claude 的 `haiku` 模型發出一次很短的呼叫：用的是你本來就在用的帳號和計費，沒有任何外部翻譯服務。摺疊的譯文在點開之前不花錢；較長的回覆也只算一次呼叫；單字卡完全不呼叫模型。一則一般訊息的花費不到一美分。

### 免費與本機模型（OpenAI-compatible）

Lingo 也能用任何相容 OpenAI chat-completions API 的端點來翻譯，包括免費的、完全在本機執行的。把 **Provider** 設為 `OpenAI-compatible`，**Provider URL** 填 API 基礎網址，**Translation model** 填服務供應商的模型名稱。需要金鑰的服務，把金鑰填進 **Provider API key**。

| 服務供應商 | Provider URL | Translation model（範例） |
| --- | --- | --- |
| Ollama（本機，無需金鑰） | `http://localhost:11434/v1` | `gemma4:cloud`（推薦） |
| LM Studio（本機，無需金鑰） | `http://localhost:1234/v1` | 已載入模型的名稱 |
| OpenRouter | `https://openrouter.ai/api/v1` | 任一 `:free` 模型 |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

請求走的是 Claude Code 自己的網路層，因此會遵循你所屬組織的 web-fetch 政策。使用這類服務供應商時，訊息會送往你設定的端點，適用它自己的定價與隱私條款。推理模型的 `<think>` 區塊會從譯文中移除。

## 設計

各項設計決策（註解行、語言標籤及其選單、預覽列、分段檢視、單字卡、設定、顏色和文案）都記錄在 [docs/DESIGN.md](docs/DESIGN.md)。

## 開發

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## 授權

[MIT](LICENSE)
