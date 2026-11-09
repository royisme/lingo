# Lingo

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | **日本語** | [한국어](README.ko.md) | [Français](README.fr.md) | [Español](README.es.md)

コーディングしながら語学を身につけましょう。Lingo は、各プロンプトや返信の下に学習中の言語の翻訳を控えめに表示し、入力中の下書きもリアルタイムでプレビューします。

```
You
  ログイン API がタイムアウトする理由を調べて

  EN  Look into why the login endpoint is timing out.
```

Claude に実際に送信されるプロンプトは一切変更されません。Lingo はメッセージの下に翻訳行を添えるだけです。

## インストール

Claude Code 内で実行：

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

またはシェルから実行：

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

Terminal、Desktop、VS Code、Mobile のすべてで動作します。

## 言語の選択

`/config` を開いて **Lingo** を探します：

| 設定項目 | デフォルト | 説明 |
| --- | --- | --- |
| **Target language** | `English` | `English`、`Français`、`Español`、`Deutsch`、`Português`、`日本語`、`한국어`、`简体中文`、`繁體中文`、`Русский`、`Tiếng Việt`、または `Off` |
| **Native language** | `简体中文` | あなたの母語：解説や単語メモはこの言語で書かれます。選択肢は Target language と同じ（`Off` なし） |
| **Preview while typing** | `true` | 入力中に少し手を止めると、プロンプト欄の上にリアルタイム翻訳を表示します。解説は母語で表示します |
| **Suggest fixes while typing** | `true` | 下書きがすでに学習中の言語で書かれているとき、より自然な言い方をプロンプト欄の上に提案します。**Use** で下書きを置き換えます。解説は母語で表示します |
| **Translate my prompts** | `true` | 送信した各プロンプトの下に翻訳を表示します |
| **Translate Claude's replies** | `true` | Claude の各テキスト返信の下に翻訳を表示します |
| **Fold translations** | `true` | 訳文は `▸ Translate` として折りたたまれた状態で始まり、開くまで翻訳も課金もされません。オフにすると、メッセージが表示されるたびに翻訳します |
| **Provider** | `Claude` | `Claude`（Claude Code 経由、あなたのアカウント）または `OpenAI-compatible`（下記参照） |
| **Provider URL** | `http://localhost:11434/v1` | `OpenAI-compatible` のとき：`/v1` で終わる API のベース URL |
| **Provider API key** | 空 | `OpenAI-compatible` のとき：サービスの API キー（ローカルの Ollama は不要）。`settings.json` に平文で保存されます |
| **Translation model** | `haiku` | 翻訳に使うモデル。エイリアスか完全な ID（`claude-haiku-4-5`、またはゲートウェイのモデル名）。`haiku` が使えない環境では完全な ID を指定します |

`/config` を開かずにいつでも切り替えることもできます：

- **言語タグをクリック**：翻訳の横にある言語タグ（`EN`、`FR`、`日本語` など）をクリックするとインラインメニューが開き、言語の切り替え、その行の非表示、または Lingo のオフが行えます。
- **失敗時の再試行**：翻訳に失敗した場合は `Translation failed · Retry` をクリックすると再試行します。
- **`/lingo` コマンドを実行**：`/lingo fr`、`/lingo ja`、`/lingo zh-TW`、`/lingo off`。
- **折りたたまれた訳文を開く**：メッセージの下の `▸ Translate` をクリック。行をクリックできないターミナルでは `/lingo show` で最新の返信を翻訳します。開いた訳文をクリックすると再び折りたたみます。

## スキップされる内容

- **すでにターゲット言語で書かれているメッセージ**：たとえば英語を学習中でメッセージがすでに英語の場合、何も表示されません。同じアルファベットを使う言語間（英語とフランス語など）では、可能な限りローカルで判定し、判断がつかない場合のみモデルに確認します。
- **コード、パス、URL**：`` `getUserById` `` だけのメッセージやコードブロックは、モデルを呼び出さずにスキップされます。文章中のインラインコード、ファイルパス、フラグなどはそのまま保持されます。

## ほかのプロバイダー（OpenAI 互換）

OpenAI の chat-completions API に対応したエンドポイントなら翻訳に使えます。ローカルの **Ollama** や **LM Studio**、**OpenRouter**、**Groq** などです。**Provider** を `OpenAI-compatible` にし、**Provider URL** に API のベース URL、**Translation model** にそのサービスのモデル名を設定します。キーが必要なサービスは **Provider API key** に入力します。

| サービス | Provider URL | Translation model（例） |
| --- | --- | --- |
| Ollama（ローカル、キー不要） | `http://localhost:11434/v1` | `gemma4:cloud`（おすすめ） |
| LM Studio（ローカル、キー不要） | `http://localhost:1234/v1` | 読み込んだモデルの名前 |
| OpenRouter | `https://openrouter.ai/api/v1` | `:free` が付いたモデル |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

リクエストは Claude Code 自身のネットワーク層（`$.http.fetch`）を通るため、組織の Web アクセスポリシーが適用されます。推論モデルの `<think>` 部分は訳文から取り除かれます。

## コストとプライバシー

各翻訳は Claude Code 自身の `$.model.complete` API を通じて Claude の `haiku` モデルを短く呼び出すだけです。既存のアカウントと請求がそのまま使われ、外部の翻訳サービスやネットワーク権限は一切不要です。1メッセージあたりのコストはごくわずかで、すでにターゲット言語で書かれたメッセージは多くの場合コストがかかりません。OpenAI 互換のプロバイダーを使う場合、メッセージは設定したエンドポイントに送られ、そのサービスの料金とプライバシー規約が適用されます。

## 開発

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## ライセンス

[MIT](LICENSE)
