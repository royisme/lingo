# Lingo

[English](README.md) | **简体中文** | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Español](README.es.md)

<p align="center">
  <img src="docs/images/hero.gif" alt="Lingo 把 Claude Code 的对话翻译成法语、西班牙语、德语、日语、韩语、中文、葡萄牙语、俄语和越南语" width="880">
</p>

<p align="center"><b>边写代码，边学外语。</b><br>
English · Français · Español · Deutsch · Português · 日本語 · 한국어 · 简体中文 · 繁體中文 · Русский · Tiếng Việt</p>

你每天都在 Claude Code 里读读写写好几个小时。Lingo 是一个 Claude Code 插件，它把这些时间变成语言练习，练的全是你真正关心的技术句子：

- **读。** 每条提示词和每段回复下面，都有一段你所学语言的译文，逐段对照。
- **写。** 用母语输入，发送前就能看到目标语言的版本，关键词附带讲解。直接用目标语言写，则会得到更地道的改写，理由用你的母语说明。
- **记。** 你用过的词会自动变成生词卡，按间隔重复安排复习。

11 种语言任选一种来学，讲解可以用其余任意一种。发给 Claude 的内容一个字都不会改，Lingo 只是在旁边多加几行。

## 安装

在 Claude Code 里：

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

或者在 shell 里：

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

然后打开 `/config`，找到 **Lingo**，设置 **Target language**（你在学的语言）和 **Native language**（你的母语）。终端、桌面端、VS Code 和移动端都能用。

## 怎么学

### 读：每条消息，都有你所学语言的版本

<img src="docs/images/read.png" alt="Claude Code 的一条回复，每个段落下方都有日语译文" width="880">

每条提示词和回复下面都有一行斜体译文，并标明语言。长回复会逐段翻译，每段译文紧跟在对应的段落下面；代码块、路径和命令原样保留。译文默认折叠（`▸ Translate`），你不点开，就不会翻译，也不会花一分钱。点一下语言标签（`FR`、`JA`、`ZH`……）就能当场切换语言。

### 写：用母语起草，用目标语言发出

<img src="docs/images/write.png" alt="预览栏：中文草稿翻译成英文并列出关键词；英文草稿给出修改建议，用中文解释原因" width="880">

输入时停顿一下，提示框上方就会出现预览：

- **用母语写的草稿**会显示译文，外加最多五个值得学的词，每个都用你的母语写了简短说明。按 `u` 把译文放进输入框，直接发送。
- **用目标语言写的草稿**会在有更自然说法时给出改写，每处改动都用你的母语解释：`"It look" → "It looks"  主语是单数`。按 `u` 采用，也可以自己改。

### 记：用过的词，自动变成生词卡

<img src="docs/images/remember.png" alt="/lingo review 复习界面：一个单词、它出自的句子、释义，以及四个评分选项" width="880">

发送预览过的草稿时，其中的关键词会存入词库，每种所学语言一个词库。不会多调用一次模型，这些词直接取自预览。运行 `/lingo review`，给每张卡打分：`1` Again，`2` Hard，`3` Good，`4` Easy。卡片按间隔重复的节奏再次出现（一直答 Good 的话，依次是 2、5、13、33 天后）。每张卡都带着它出自的那句话，让你在语境里记住单词。

## 一个插件，任意语言组合

11 种语言，任意搭配都行。几个例子：

| 你的母语 | 你在学 | 你能得到什么 |
| --- | --- | --- |
| 简体中文 | English | Claude 的中文回复下面是英文译文；你的中文草稿先预览成英文；语法讲解用中文 |
| English | 日本語 | 每条消息下面都有日语，逐段对照；单词说明用英语 |
| Español | English | 自己写英文，错在哪里用西班牙语讲给你听 |
| 한국어 | 日本語 | 韩语回复下面读日语；生词卡附韩语释义 |
| Français | Deutsch | 每条提示词和回复下面都是德语，说明用法语 |

想换随时换：点一下标签、运行 `/lingo de`，或者去 `/config` 里改。

## 命令

| 命令 | 作用 |
| --- | --- |
| `/lingo fr` · `/lingo ja` · `/lingo zh-TW` … | 切换你在学的语言 |
| `/lingo off` | 关闭 Lingo |
| `/lingo show` | 展开最新一条回复的译文（适用于无法点击行的终端） |
| `/lingo review` | 复习到期的生词卡 |
| `/lingo words` | 查看你的词库：总词数、到期、新词、最近十个 |
| `/lingo forget <word>` | 删除一张卡 |

在对话记录里，你还可以点语言标签打开选择器（切换语言、隐藏这一行或关闭 Lingo），点 `Translation failed · Retry` 重试，点已展开的译文把它折叠起来。

## 设置

都在 `/config` 的 **Lingo** 下：

| 设置 | 默认值 | 作用 |
| --- | --- | --- |
| **Target language** | `English` | 你在学的语言：`English`、`Français`、`Español`、`Deutsch`、`Português`、`日本語`、`한국어`、`简体中文`、`繁體中文`、`Русский`、`Tiếng Việt` 或 `Off` |
| **Native language** | `简体中文` | 你的母语：单词说明和讲解都用它来写。选项相同，但没有 `Off` |
| **Preview while typing** | `true` | 在提示框上方实时显示草稿的译文和关键词。按 `u` 放进输入框 |
| **Suggest fixes while typing** | `true` | 草稿本身已是目标语言时，给出更自然的改写，并用你的母语解释。按 `u` 放进输入框 |
| **Translate my prompts** | `true` | 在你发送的每条提示词下面显示译文 |
| **Translate Claude's replies** | `true` | 在 Claude 的每段文字回复下面显示译文 |
| **Fold translations** | `true` | 每段译文默认折叠为 `▸ Translate`：没点开就不翻译，也不花钱。关闭后，提示词在发送时翻译，每轮的最终回复也会翻译 |
| **Save words as flashcards** | `true` | 发送（或按 `u`）预览过的草稿时，保存其中的关键词，供 `/lingo review` 使用 |
| **Provider** | `Claude` | `Claude`（通过 Claude Code，用你自己的账号）或 `OpenAI-compatible`（见下文） |
| **Translation model** | `haiku` | 别名或完整 ID（`claude-haiku-4-5`），或你的服务商的模型名。如果你用不了 `haiku`，请填完整 ID |
| **Provider URL** | `http://localhost:11434/v1` | 选 `OpenAI-compatible` 时：API 的基础地址，以 `/v1` 结尾 |
| **Provider API key** | 空 | 选 `OpenAI-compatible` 时：服务商的密钥（本地 Ollama 不需要）。以明文保存在 `settings.json` 里 |

## 哪些内容会被跳过

- **已经是目标语言的文字。** 你在学英语，消息本身就是英文，那就什么都不显示。对于共用字母表的语言（比如英语和法语），Lingo 能在本地判断就在本地判断，拿不准时才问模型。
- **代码、路径和 URL。** 只有 `` `getUserById` `` 或一个代码块的消息，会直接跳过，不调用模型。正文里的行内代码、文件路径、斜杠命令和参数都原样保留。

## 费用与隐私

默认情况下，每次翻译就是通过 Claude Code 自己的 API 对 Claude 的 `haiku` 模型发起一次很短的调用：用的是你本来就在用的账号和计费，没有任何外部翻译服务。折叠的译文在点开之前不花钱；长回复也只算一次调用；生词卡完全不调用模型。一条普通消息的花费不到一美分。

### 免费和本地模型（OpenAI-compatible）

Lingo 也可以用任何兼容 OpenAI chat-completions API 的端点来翻译，包括免费的、完全本地运行的。把 **Provider** 设为 `OpenAI-compatible`，**Provider URL** 填 API 基础地址，**Translation model** 填服务商的模型名。需要密钥的服务，把密钥填进 **Provider API key**。

| 服务商 | Provider URL | Translation model（示例） |
| --- | --- | --- |
| Ollama（本地，无需密钥） | `http://localhost:11434/v1` | `gemma4:cloud`（推荐） |
| LM Studio（本地，无需密钥） | `http://localhost:1234/v1` | 已加载模型的名称 |
| OpenRouter | `https://openrouter.ai/api/v1` | 任意 `:free` 模型 |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

请求走的是 Claude Code 自己的网络层，因此会遵循你所在组织的 web-fetch 策略。使用这类服务商时，消息会发往你设置的端点，适用它自己的定价和隐私条款。推理模型的 `<think>` 块会从译文里去掉。

## 设计

各项设计决策（译文行、语言标签及其菜单、预览栏、分段视图、生词卡、设置、颜色和文案）见 [docs/DESIGN.md](docs/DESIGN.md)。

## 开发

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## 许可证

[MIT](LICENSE)
