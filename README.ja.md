# Lingo

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | **日本語** | [한국어](README.ko.md) | [Français](README.fr.md) | [Español](README.es.md)

<p align="center">
  <img src="docs/images/hero.gif" alt="Lingo が Claude Code の会話をフランス語、スペイン語、ドイツ語、日本語、韓国語、中国語、ポルトガル語、ロシア語、ベトナム語に翻訳している様子" width="880">
</p>

<p align="center"><b>コードを書きながら、語学を身につける。</b><br>
English · Français · Español · Deutsch · Português · 日本語 · 한국어 · 简体中文 · 繁體中文 · Русский · Tiếng Việt</p>

Claude Code とのやり取りで、毎日何時間も読み書きしていませんか。Claude Code プラグインの Lingo は、その時間を語学の練習に変えます。題材は、あなたが本当に気になる技術の文章そのものです。

- **読む。** プロンプトにも返信にも、段落ごとに学習中の言語の訳が付きます。
- **書く。** 母語で打てば、送信前に学習中の言語での表現が見られ、キーワードの解説も付きます。学習中の言語で自分で書けば、より自然な言い回しを提案し、理由は母語で説明します。
- **覚える。** 使った単語は単語カードになり、間隔反復のスケジュールで復習できます。

学べる言語は 11 言語、解説はそれ以外のどの言語でも選べます。Claude に送る内容は一切変わりません。Lingo は周りに行を足すだけです。

## インストール

Claude Code の中で:

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

シェルからなら:

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

そのあと `/config` を開き、**Lingo** を探して、**Target language**(学習中の言語)と **Native language**(あなたの母語)を設定します。ターミナル、デスクトップ、VS Code、モバイルで使えます。

## 学び方

### 読む: すべてのメッセージが、学習中の言語で

<img src="docs/images/read.png" alt="各段落の下に日本語訳が付いた Claude Code の返信" width="880">

プロンプトにも返信にも、その下に言語タグ付きの斜体の訳が付きます。長い返信は段落ごとに訳され、それぞれの訳は対応する段落のすぐ下に並びます。コードブロック、パス、コマンドはそのままです。訳は最初は折りたたまれていて(`▸ Translate`)、開くまでは翻訳もされず、料金もかかりません。タグ(`FR`、`JA`、`ZH` など)をクリックすれば、その場で言語を切り替えられます。

### 書く: 母語で書いて、学習中の言語で送る

<img src="docs/images/write.png" alt="プレビューバンド: 中国語の下書きを英語に翻訳してキーワードを表示、英語の下書きには修正点を中国語で解説" width="880">

入力の手を止めると、プロンプト欄の上にプレビューが現れます。

- **母語で書いた下書き**には訳が表示され、覚えておきたい単語が最大 5 つ、それぞれ母語の短い解説付きで並びます。`u` を押すと訳が入力欄に入り、そのまま送信できます。
- **学習中の言語で書いた下書き**には、より自然な言い回しがあれば提案が出て、変更点ごとに母語で理由が付きます: `"It look" → "It looks"  主語が三人称単数`。`u` で採用するか、自分で直しましょう。

### 覚える: 使った単語が、単語カードになる

<img src="docs/images/remember.png" alt="/lingo review の画面: 単語、その単語が出てきた文、意味、4 段階の評価" width="880">

プレビューした下書きを送信すると、そのキーワードがデッキに入ります。デッキは学習する言語ごとに 1 つです。モデルを追加で呼び出すことはありません。単語はプレビューからそのまま取られます。`/lingo review` を実行して、カードごとに評価します: `1` Again、`2` Hard、`3` Good、`4` Easy。カードは間隔反復のスケジュールで戻ってきます(Good を押し続けると 2 日、5 日、13 日、33 日後)。どのカードにも出典の文が付いているので、単語を文脈ごと覚えられます。

## 1 つのプラグインで、どんな言語の組み合わせにも

11 言語のどの組み合わせでも使えます。例を挙げます。

| あなたの母語 | 学習中の言語 | できること |
| --- | --- | --- |
| 日本語 | English | Claude の日本語の返信の下に英語が付く。日本語の下書きは英語でプレビュー。文法メモは日本語 |
| English | 日本語 | すべてのメッセージの下に日本語が段落ごとに付く。単語メモは英語 |
| Español | English | 自分で英語を書けば、修正の理由をスペイン語で説明 |
| 한국어 | 日本語 | 韓国語の返信の下で日本語を読める。単語カードには韓国語のメモ |
| Français | Deutsch | すべてのプロンプトと返信の下にドイツ語、メモはフランス語 |

切り替えはいつでも: タグをクリックするか、`/lingo de` を実行するか、`/config` で変更します。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `/lingo fr` · `/lingo ja` · `/lingo zh-TW` … | 学習中の言語を切り替える |
| `/lingo off` | Lingo をオフにする |
| `/lingo show` | 最新の返信の訳を開く(行をクリックできないターミナル向け) |
| `/lingo review` | 復習の時期が来た単語カードを復習する |
| `/lingo words` | デッキを表示する: 単語数、復習待ち、新規、直近 10 件 |
| `/lingo forget <word>` | カードを削除する |

トランスクリプト上では、言語タグをクリックしてピッカーを開いたり(言語の切り替え、その行を隠す、Lingo をオフにする)、`Translation failed · Retry` をクリックして再試行したり、開いた訳をクリックして折りたたんだりもできます。

## 設定

すべて `/config` の **Lingo** にあります。

| 設定 | 既定値 | 内容 |
| --- | --- | --- |
| **Target language** | `English` | 学習中の言語: `English`、`Français`、`Español`、`Deutsch`、`Português`、`日本語`、`한국어`、`简体中文`、`繁體中文`、`Русский`、`Tiếng Việt`、または `Off` |
| **Native language** | `简体中文` | あなたの母語。単語メモや解説はこの言語で書かれます。選択肢は同じで、`Off` はありません |
| **Preview while typing** | `true` | 下書きの訳とキーワードを、プロンプト欄の上にリアルタイムで表示します。`u` で入力欄に入ります |
| **Suggest fixes while typing** | `true` | 下書きがすでに学習中の言語なら、より自然な言い回しを母語の解説付きで提案します。`u` で入力欄に入ります |
| **Translate my prompts** | `true` | 送信した各プロンプトの下に訳を表示します |
| **Translate Claude's replies** | `true` | Claude の各テキスト返信の下に訳を表示します |
| **Fold translations** | `true` | 訳は最初 `▸ Translate` の状態で折りたたまれ、開くまで翻訳も課金もされません。オフにすると、プロンプトは送信時に、各ターンの最終返信も翻訳されます |
| **Save words as flashcards** | `true` | プレビューした下書きを送信したとき(または `u` を押したとき)にキーワードを保存し、`/lingo review` で使えるようにします |
| **Provider** | `Claude` | `Claude`(Claude Code 経由で、あなたのアカウントを使用)または `OpenAI-compatible`(下記参照) |
| **Translation model** | `haiku` | エイリアスまたは完全な ID(`claude-haiku-4-5`)、もしくはプロバイダーのモデル名。`haiku` が使えない場合は完全な ID を指定してください |
| **Provider URL** | `http://localhost:11434/v1` | `OpenAI-compatible` のとき: API のベース URL。末尾は `/v1` |
| **Provider API key** | 空 | `OpenAI-compatible` のとき: プロバイダーのキー(ローカルの Ollama では不要)。`settings.json` に平文で保存されます |

## 対象外になるもの

- **すでに学習中の言語になっているテキスト。** 英語を学んでいて、メッセージが英語なら、何も表示されません。英語とフランス語のように文字体系を共有する言語では、Lingo はできるだけローカルで判定し、自信がないときだけモデルに尋ねます。
- **コード、パス、URL。** `` `getUserById` `` だけ、またはコードブロックだけのメッセージは、モデルを呼ばずにスキップされます。文章の中のインラインコード、ファイルパス、スラッシュコマンド、フラグは、書かれたままの形で残ります。

## コストとプライバシー

既定では、翻訳 1 回につき、Claude Code 自身の API 経由で Claude の `haiku` モデルに短いリクエストを 1 回送ります。いつものアカウントと課金のままで、外部の翻訳サービスは使いません。折りたたまれた訳は開くまで無料、長い返信でも呼び出しは 1 回、単語カードはモデルを一切呼びません。一般的なメッセージ 1 件のコストは 1 セントにも満たない程度です。

### 無料・ローカルのモデル(OpenAI-compatible)

OpenAI の chat-completions API に対応していれば、無料のものや完全にローカルなものを含め、どんなエンドポイントでも翻訳に使えます。**Provider** を `OpenAI-compatible` にし、**Provider URL** に API のベース URL を、**Translation model** にプロバイダーのモデル名を設定します。キーが必要なサービスは、**Provider API key** にキーを入れてください。

| プロバイダー | Provider URL | Translation model(例) |
| --- | --- | --- |
| Ollama(ローカル、キー不要) | `http://localhost:11434/v1` | `gemma4:cloud`(推奨) |
| LM Studio(ローカル、キー不要) | `http://localhost:1234/v1` | ロード済みモデルの名前 |
| OpenRouter | `https://openrouter.ai/api/v1` | `:free` のモデル |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

リクエストは Claude Code 自身のネットワーク層を通るため、組織の web-fetch ポリシーが適用されます。こうしたプロバイダーを使うと、メッセージは設定したエンドポイントに送られ、そのプロバイダーの料金とプライバシーの規約が適用されます。推論モデルの `<think>` ブロックは、訳から取り除かれます。

## デザイン

デザイン上の判断(注釈行、言語タグとそのメニュー、プレビューバンド、段落ビュー、単語カード、設定、色、文言)は [docs/DESIGN.md](docs/DESIGN.md)

## 開発

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## ライセンス

[MIT](LICENSE)
