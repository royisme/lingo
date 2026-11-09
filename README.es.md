# Lingo

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | **Español**

Aprende un idioma mientras programas. Lingo muestra una traducción discreta debajo de cada prompt y respuesta en el idioma que estás aprendiendo, y previsualiza tu borrador mientras escribes.

```
You
  Revisa por qué el endpoint de inicio de sesión agota el tiempo de espera

  EN  Look into why the login endpoint is timing out.
```

Lo que realmente envías a Claude nunca se modifica — Lingo solo añade la línea debajo.

## Instalación

Dentro de Claude Code:

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

O desde tu terminal:

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

Funciona en Terminal, Desktop, VS Code y Mobile.

## Elige tu idioma

Abre `/config` y busca **Lingo**:

| Ajuste | Por defecto | Qué hace |
| --- | --- | --- |
| **Target language** | `English` | `English`, `Français`, `Español`, `Deutsch`, `Português`, `日本語`, `한국어`, `简体中文`, `繁體中文`, `Русский`, `Tiếng Việt` u `Off` |
| **Preview while typing** | `true` | Muestra una traducción en vivo sobre el cuadro de texto tras una breve pausa |
| **Suggest fixes while typing** | `true` | Si tu borrador ya está en el idioma que aprendes, sugiere una versión más natural sobre el cuadro de texto; **Use** la coloca en el cuadro |
| **Translate my prompts** | `true` | Muestra una traducción debajo de cada prompt que envías |
| **Translate Claude's replies** | `true` | Muestra una traducción debajo de cada respuesta de texto de Claude |
| **Fold translations** | `true` | Cada traducción empieza plegada como `▸ Translate`: no se traduce ni se cobra nada hasta que la abres. Desactívalo para traducir cada mensaje en cuanto aparece |
| **Provider** | `Claude` | `Claude` (a través de Claude Code, tu cuenta) u `OpenAI-compatible` (ver abajo) |
| **Provider URL** | `http://localhost:11434/v1` | Con `OpenAI-compatible`: la base de la API, terminada en `/v1` |
| **Provider API key** | vacío | Con `OpenAI-compatible`: la clave del servicio (ninguna para Ollama en local). Se guarda en texto plano en `settings.json` |
| **Translation model** | `haiku` | El modelo que traduce: un alias o un id completo (`claude-haiku-4-5`, o el nombre del modelo de tu pasarela). Usa un id completo si `haiku` no está disponible para ti |

O cambia en cualquier momento sin abrir `/config`:

- **Haz clic en la etiqueta de idioma** (`EN`, `FR`, `日本語`…) junto a cualquier traducción para abrir un selector integrado — cambia de idioma, oculta esa línea o desactiva Lingo.
- **Haz clic en una línea fallida** (`Translation failed · Retry`) para reintentar la traducción.
- **Ejecuta `/lingo`**: `/lingo fr`, `/lingo ja`, `/lingo zh-TW`, `/lingo off`.
- **Abrir una traducción plegada**: haz clic en `▸ Translate` bajo un mensaje, o ejecuta `/lingo show` para la última respuesta (en un terminal donde las filas no se pueden pulsar). Haz clic en una traducción abierta para plegarla de nuevo.

## Qué se omite

- **Ya está en tu idioma de destino.** Si estás aprendiendo inglés y un mensaje ya está en inglés, no se muestra nada. Para idiomas que comparten alfabeto (por ejemplo, inglés y francés), Lingo lo comprueba localmente cuando puede y consulta al modelo cuando no está seguro.
- **Código, rutas y URL.** Un mensaje que sea solo `` `getUserById` `` o un bloque de código se omite sin llamar al modelo. Dentro del texto, el código en línea, las rutas de archivos y los flags permanecen intactos.

## Otros proveedores (compatibles con OpenAI)

Lingo puede traducir con cualquier servicio que hable la API chat-completions de OpenAI: **Ollama** o **LM Studio** en local, **OpenRouter**, **Groq** y muchos más. Pon **Provider** en `OpenAI-compatible`, **Provider URL** en la base de la API y **Translation model** en el nombre del modelo del servicio; si el servicio pide una clave, va en **Provider API key**.

| Servicio | Provider URL | Translation model (ejemplo) |
| --- | --- | --- |
| Ollama (local, sin clave) | `http://localhost:11434/v1` | `gemma4:cloud` (recomendado) |
| LM Studio (local, sin clave) | `http://localhost:1234/v1` | el nombre del modelo cargado |
| OpenRouter | `https://openrouter.ai/api/v1` | un modelo `:free` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

Las solicitudes pasan por la capa de red de Claude Code (`$.http.fetch`), así que se aplica la política de acceso web de tu organización. El bloque `<think>` de un modelo de razonamiento se elimina de la traducción.

## Coste y privacidad

Cada traducción es una llamada breve al modelo `haiku` de Claude a través de la propia API `$.model.complete` de Claude Code — la misma cuenta y facturación que ya utilizas, sin servicios de traducción externos ni permisos de red. Un mensaje típico cuesta una fracción de centavo; los mensajes que ya están en tu idioma de destino no cuestan nada en la mayoría de los casos. Con un proveedor compatible con OpenAI, los mensajes van al servicio que configures, y se aplican su precio y sus condiciones de privacidad.

## Desarrollo

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## Licencia

[MIT](LICENSE)
