# Lingo

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | **한국어** | [Français](README.fr.md) | [Español](README.es.md)

코딩하면서 외국어를 배워보세요. Lingo는 각 프롬프트와 답변 아래에 학습 중인 언어의 번역을 조용히 표시하고, 입력하는 동안 초안 번역을 실시간으로 미리 보여줍니다.

```
You
  로그인 API가 왜 타임아웃되는지 확인해 줘

  EN  Look into why the login endpoint is timing out.
```

Claude에게 실제로 전송되는 내용은 절대 변경되지 않습니다. Lingo는 단지 메시지 아래에 번역 한 줄을 덧붙일 뿐입니다.

## 설치

Claude Code 내부에서:

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

또는 셸에서:

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

Terminal, Desktop, VS Code 및 Mobile에서 모두 작동합니다.

## 언어 선택

`/config`를 열고 **Lingo**를 찾으세요:

| 설정 | 기본값 | 설명 |
| --- | --- | --- |
| **Target language** | `English` | `English`, `Français`, `Español`, `Deutsch`, `Português`, `日本語`, `한국어`, `简体中文`, `繁體中文`, `Русский`, `Tiếng Việt`, 또는 `Off` |
| **Preview while typing** | `true` | 입력 중 잠시 멈추면 프롬프트 입력창 위에 실시간 번역 미리보기를 표시합니다 |
| **Suggest fixes while typing** | `true` | 초안이 이미 배우는 언어로 쓰여 있으면 프롬프트 입력창 위에 더 자연스러운 표현을 제안합니다. **Use**를 누르면 초안을 바꿉니다 |
| **Translate my prompts** | `true` | 전송한 각 프롬프트 아래에 번역을 표시합니다 |
| **Translate Claude's replies** | `true` | Claude의 각 텍스트 답변 아래에 번역을 표시합니다 |
| **Provider** | `Claude` | `Claude`(Claude Code를 통해, 내 계정으로) 또는 `OpenAI-compatible`(아래 참고) |
| **Provider URL** | `http://localhost:11434/v1` | `OpenAI-compatible`일 때: `/v1`로 끝나는 API 기본 주소 |
| **Translation model** | `haiku` | 번역에 쓰는 모델: 별칭 또는 전체 ID(`claude-haiku-4-5`, 또는 게이트웨이의 모델 이름). `haiku`를 쓸 수 없는 환경이면 전체 ID를 입력합니다 |

`/config`를 열지 않고도 언제든 전환할 수 있습니다:

- **언어 태그 클릭**: 번역 옆의 언어 태그(`EN`, `FR`, `日本語` 등)를 클릭하면 인라인 선택 메뉴가 열리며, 언어를 변경하거나 해당 줄을 숨기거나 Lingo를 끌 수 있습니다.
- **실패 시 재시도**: 번역에 실패한 줄(`Translation failed · Retry`)을 클릭하면 다시 번역을 시도합니다.
- **`/lingo` 명령어 실행**: `/lingo fr`, `/lingo ja`, `/lingo zh-TW`, `/lingo off`.

## 건너뛰는 항목

- **이미 목표 언어로 작성된 메시지**: 예를 들어 영어를 배우고 있는데 메시지가 이미 영어라면 아무것도 표시되지 않습니다. 알파벳을 공유하는 언어(예: 영어와 프랑스어)의 경우 가능한 한 로컬에서 먼저 판별하고, 확실하지 않을 때만 모델에 확인합니다.
- **코드, 경로 및 URL**: `` `getUserById` ``만 있거나 코드 블록으로만 이루어진 메시지는 모델을 호출하지 않고 건너뜁니다. 문장 안의 인라인 코드, 파일 경로, 플래그도 그대로 유지됩니다.

## 다른 제공자 (OpenAI 호환)

OpenAI chat-completions API를 지원하는 엔드포인트라면 번역에 쓸 수 있습니다. 로컬의 **Ollama**, **LM Studio**, 그리고 **OpenRouter**, **Groq** 등입니다. **Provider**를 `OpenAI-compatible`로, **Provider URL**에 API 기본 주소를, **Translation model**에 그 서비스의 모델 이름을 설정합니다.

| 서비스 | Provider URL | Translation model (예) |
| --- | --- | --- |
| Ollama (로컬, 키 불필요) | `http://localhost:11434/v1` | `qwen2.5:7b` |
| LM Studio (로컬, 키 불필요) | `http://localhost:1234/v1` | 불러온 모델의 이름 |
| OpenRouter | `https://openrouter.ai/api/v1` | `:free`가 붙은 모델 |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

API 키는 `/config`가 아니라 안전한 저장소에 보관됩니다. 터미널에서 설정합니다:

```sh
echo '{"providerApiKey":"sk-..."}' | claude plugin configure lingo --values-stdin
```

요청은 Claude Code 자체 네트워크 계층(`$.http.fetch`)을 거치므로 조직의 웹 접근 정책이 적용됩니다. 추론 모델이 출력한 `<think>` 부분은 번역에서 제외됩니다.

## 비용 및 개인정보 보호

각 번역은 Claude Code 자체의 `$.model.complete` API를 통해 Claude의 `haiku` 모델을 짧게 한 번 호출합니다. 이미 사용 중인 계정과 결제를 그대로 사용하며, 외부 번역 서비스나 별도의 네트워크 권한이 전혀 필요하지 않습니다. 일반적인 메시지 한 건의 비용은 극히 저렴하며, 이미 목표 언어로 된 메시지는 대부분의 경우 비용이 들지 않습니다. OpenAI 호환 제공자를 쓰면 메시지는 설정한 엔드포인트로 전송되며, 그 서비스의 요금과 개인정보 정책이 적용됩니다.

## 개발

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## 라이선스

[MIT](LICENSE)
