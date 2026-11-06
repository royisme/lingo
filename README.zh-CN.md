# Lingo

[English](README.md) | **简体中文** | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Español](README.es.md)

边写代码边学外语。Lingo 会在每条提问和回复下方静默展示你正在学习的目标语言译文，并在你输入时实时预览草稿翻译。

```
You
  帮我看一下为什么登录接口会超时

  EN  Look into why the login endpoint is timing out.
```

你实际发送给 Claude 的内容永远不会被篡改——Lingo 只是在消息下方多展示一行译文。

## 安装

在 Claude Code 中运行：

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

或在终端 Shell 中运行：

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

支持 Terminal、Desktop、VS Code 与 Mobile 全平台。

## 选择目标语言

打开 `/config` 并找到 **Lingo**：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| **Target language** | `English` | `English`、`Français`、`Español`、`Deutsch`、`Português`、`日本語`、`한국어`、`简体中文`、`繁體中文`、`Русский`、`Tiếng Việt` 或 `Off` |
| **Preview while typing** | `true` | 输入停顿片刻后，在输入框上方实时展示草稿译文 |
| **Suggest fixes while typing** | `true` | 草稿已经是你在学的语言时，在输入框上方给出更自然的写法；点 **Use** 直接替换草稿 |
| **Translate my prompts** | `true` | 在你发送的每条提问下方展示译文 |
| **Translate Claude's replies** | `true` | 在 Claude 的每条文本回复下方展示译文 |
| **Fold translations** | `true` | 每条译文默认折叠为 `▸ Translate`，点开之前不翻译、也不产生费用。关掉则每条消息出现时自动翻译 |
| **Provider** | `Claude` | `Claude`（经由 Claude Code，用你的账号）或 `OpenAI-compatible`（见下文） |
| **Provider URL** | `http://localhost:11434/v1` | 选 `OpenAI-compatible` 时：API 地址，以 `/v1` 结尾 |
| **Translation model** | `haiku` | 负责翻译的模型：别名或完整 id（如 `claude-haiku-4-5`，或网关提供的模型名）。`haiku` 在你的账号或网关上不可用时，填完整 id |

你也可以随时切换，无需打开 `/config`：

- **点击语言标签**：点击任意译文旁的语言标签（`EN`、`FR`、`日本語` 等）即可展开内联菜单——切换语言、隐藏当前译文或关闭 Lingo。
- **点击失败重试**：当翻译失败时，点击 `Translation failed · Retry` 即可重新触发翻译。
- **运行 `/lingo` 命令**：例如 `/lingo fr`、`/lingo ja`、`/lingo zh-TW`、`/lingo off`。
- **展开折叠的译文**：点消息下方的 `▸ Translate`；终端里点不了时，运行 `/lingo show` 翻译最近一条回复。点已展开的译文可以再折叠。

## 自动跳过的内容

- **已经是目标语言的消息**：例如你正在学习英语，而消息本身已经是英文时，不会展示多余译文。对于共用拉丁字母的语言（如英语和法语），Lingo 会优先在本地快速判断，不确定时才交由模型识别。
- **纯代码、路径与链接**：仅包含 `` `getUserById` `` 或代码块的消息会直接跳过，不调用模型。在普通文本中，行内代码、文件路径、命令行参数与技术标识符都会原样保留。

## 其他 provider（OpenAI 兼容）

Lingo 可以用任何支持 OpenAI chat-completions 接口的服务来翻译：本地的 **Ollama**、**LM Studio**，以及 **OpenRouter**、**Groq** 等。把 **Provider** 设为 `OpenAI-compatible`，**Provider URL** 填 API 地址，**Translation model** 填该服务的模型名。

| 服务 | Provider URL | Translation model（示例） |
| --- | --- | --- |
| Ollama（本地，无需 key） | `http://localhost:11434/v1` | `qwen2.5:7b` |
| LM Studio（本地，无需 key） | `http://localhost:1234/v1` | 已加载模型的名字 |
| OpenRouter | `https://openrouter.ai/api/v1` | 带 `:free` 后缀的模型 |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

API key 存在系统的安全存储里，不在 `/config` 中显示。在终端里设置：

```sh
echo '{"providerApiKey":"sk-..."}' | claude plugin configure lingo --values-stdin
```

请求经由 Claude Code 自己的网络层（`$.http.fetch`）发出，所在组织的网络访问策略同样适用。推理模型输出的 `<think>` 部分会从译文中去掉。

## 费用与隐私

每次翻译仅通过 Claude Code 内置的 `$.model.complete` 接口发起一次简短的 `haiku` 模型调用——复用你现有的 Claude 账号与计费，不依赖任何第三方外部翻译服务，也不需要额外网络权限。单条消息的成本极低，且本身已经是目标语言的消息通常不产生任何模型调用开销。使用 OpenAI 兼容的 provider 时，消息会发送到你设置的服务，费用和隐私条款以该服务为准。

## 本地开发与验证

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## 开源协议

[MIT](LICENSE)
