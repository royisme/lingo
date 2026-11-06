# Lingo

[English](README.md) | [简体中文](README.zh-CN.md) | **繁體中文** | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | [Español](README.es.md)

邊寫程式邊學外語。Lingo 會在每則提問與回覆下方安靜地顯示你正在學習的目標語言譯文，並在你輸入時即時預覽草稿翻譯。

```
You
  幫我看一下為什麼登入 API 會逾時

  EN  Look into why the login endpoint is timing out.
```

你實際發送給 Claude 的內容永遠不會被修改——Lingo 只是在訊息下方額外加上一行譯文。

## 安裝

在 Claude Code 中執行：

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

或在終端機 Shell 中執行：

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

支援 Terminal、Desktop、VS Code 與 Mobile 全平台。

## 選擇目標語言

開啟 `/config` 並找到 **Lingo**：

| 設定項目 | 預設值 | 說明 |
| --- | --- | --- |
| **Target language** | `English` | `English`、`Français`、`Español`、`Deutsch`、`Português`、`日本語`、`한국어`、`简体中文`、`繁體中文`、`Русский`、`Tiếng Việt` 或 `Off` |
| **Preview while typing** | `true` | 輸入停頓片刻後，在輸入框上方即時顯示草稿譯文 |
| **Suggest fixes while typing** | `true` | 草稿已經是你在學的語言時，在輸入框上方給出更自然的寫法；點 **Use** 直接取代草稿 |
| **Translate my prompts** | `true` | 在你發送的每則提問下方顯示譯文 |
| **Translate Claude's replies** | `true` | 在 Claude 的每則文字回覆下方顯示譯文 |
| **Fold translations** | `true` | 每則譯文預設摺疊為 `▸ Translate`，點開之前不翻譯、也不產生費用。關閉則每則訊息出現時自動翻譯 |
| **Translation model** | `haiku` | 負責翻譯的模型：別名或完整 id（如 `claude-haiku-4-5`，或閘道提供的模型名稱）。`haiku` 在你的帳號或閘道上無法使用時，填完整 id |

你也可以隨時切換，無需開啟 `/config`：

- **點擊語言標籤**：點擊任一譯文旁的語言標籤（`EN`、`FR`、`日本語` 等）即可展開內嵌選單——切換語言、隱藏該行譯文或關閉 Lingo。
- **點擊失敗重試**：若翻譯失敗，點擊 `Translation failed · Retry` 即可重新翻譯。
- **執行 `/lingo` 指令**：例如 `/lingo fr`、`/lingo ja`、`/lingo zh-TW`、`/lingo off`。
- **展開摺疊的譯文**：點訊息下方的 `▸ Translate`；終端機裡點不了時，執行 `/lingo show` 翻譯最近一則回覆。點已展開的譯文可以再摺疊。

## 自動略過的內容

- **已經是目標語言的訊息**：例如你正在學習英語，而訊息本身已經是英文時，不會顯示多餘譯文。對於共用拉丁字母的語言（如英語與法語），Lingo 會優先在本地判斷，無法確定時才交由模型識別。
- **純程式碼、路徑與網址**：僅包含 `` `getUserById` `` 或程式碼區塊的訊息會直接略過，不呼叫模型。在一般文字中，行內程式碼、檔案路徑與命令列參數皆會原樣保留。

## 費用與隱私

每次翻譯皆透過 Claude Code 內建的 `$.model.complete` API 進行一次簡短的 `haiku` 模型呼叫——直接使用你現有的 Claude 帳號與計費，不依賴任何外部翻譯服務，也不需要額外網路權限。單則訊息成本極低，且已是目標語言的訊息在多數情況下完全不消耗額度。

## 開發與測試

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## 授權條款

[MIT](LICENSE)
