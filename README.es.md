# Lingo

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | **Español**

<p align="center">
  <img src="docs/images/hero.gif" alt="Lingo traduce una conversación de Claude Code al francés, español, alemán, japonés, coreano, chino, portugués, ruso y vietnamita" width="880">
</p>

<p align="center"><b>Aprende un idioma mientras programas.</b><br>
English · Français · Español · Deutsch · Português · 日本語 · 한국어 · 简体中文 · 繁體中文 · Русский · Tiếng Việt</p>

Ya pasas horas al día leyendo y escribiendo con Claude Code. Lingo, un plugin de Claude Code, convierte esas horas en práctica de idiomas, con frases técnicas reales que de verdad te interesan:

- **Lee.** Bajo cada prompt y cada respuesta aparece una traducción al idioma que estás aprendiendo, párrafo por párrafo.
- **Escribe.** Escribe en tu idioma y mira cómo queda en el idioma que aprendes antes de enviarlo, con las palabras clave explicadas. Escribe tú mismo en ese idioma y recibe una versión más natural, con los motivos en tu idioma.
- **Recuerda.** Las palabras que usaste se convierten en tarjetas de estudio, programadas con repetición espaciada.

Aprende cualquiera de los 11 idiomas, con explicaciones en cualquier otro. Lo que le envías a Claude nunca se modifica: Lingo solo añade líneas a su alrededor.

## Instalación

Dentro de Claude Code:

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

O desde tu shell:

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

Después abre `/config`, busca **Lingo** y configura **Target language** (el idioma que aprendes) y **Native language** (el tuyo). Funciona en la terminal, en Desktop, en VS Code y en el móvil.

## Cómo aprendes

### Lee: cada mensaje, en el idioma que aprendes

<img src="docs/images/read.png" alt="Una respuesta de Claude Code con una traducción al japonés bajo cada párrafo" width="880">

Cada prompt y cada respuesta recibe debajo una traducción en cursiva, con una etiqueta de idioma. Una respuesta larga se traduce párrafo por párrafo, de modo que cada traducción queda justo debajo del párrafo al que pertenece; los bloques de código, las rutas y los comandos se quedan como están. Las traducciones empiezan plegadas (`▸ Translate`), así que no se traduce nada ni se paga nada hasta que abres una. Haz clic en la etiqueta (`FR`, `JA`, `ZH`…) para cambiar de idioma al instante.

### Escribe: teclea en tu idioma, envía en el que aprendes

<img src="docs/images/write.png" alt="La banda de vista previa: un borrador en chino traducido al inglés con palabras clave, y un borrador en inglés con correcciones explicadas en chino" width="880">

Haz una pausa mientras escribes y encima del cuadro del prompt aparece una vista previa:

- **Un borrador en tu propio idioma** muestra su traducción, más hasta cinco palabras que vale la pena aprender, cada una con una nota breve en tu idioma. Pulsa `u` para poner la traducción en el cuadro y enviarla.
- **Un borrador en el idioma que aprendes** recibe una versión más natural cuando existe, con cada cambio explicado en tu idioma: `"It look" → "It looks"  sujeto en singular`. Pulsa `u` para usarla, o corrígelo tú mismo.

### Recuerda: las palabras que usaste se vuelven tarjetas de estudio

<img src="docs/images/remember.png" alt="El panel /lingo review: una palabra, la frase de la que viene, su significado y las cuatro valoraciones" width="880">

Cuando envías un borrador con vista previa, sus palabras clave pasan a un mazo, uno por cada idioma que aprendes. No hay ninguna llamada extra al modelo: las palabras salen de la vista previa. Ejecuta `/lingo review` y valora cada tarjeta: `1` Again, `2` Hard, `3` Good, `4` Easy. Las tarjetas vuelven según un calendario de repetición espaciada (a los 2, 5, 13 y 33 días si sigues respondiendo Good). Cada tarjeta muestra la frase de la que salió, así que aprendes la palabra en contexto.

## Un plugin, cualquier par de idiomas

Funciona cualquier combinación de los 11 idiomas. Algunos ejemplos:

| Hablas | Estás aprendiendo | Lo que obtienes |
| --- | --- | --- |
| Español | English | Escribe en inglés tú mismo y recibe correcciones explicadas en español |
| 简体中文 | English | Inglés bajo las respuestas de Claude en chino; tus borradores en chino con vista previa en inglés; notas de gramática en chino |
| English | 日本語 | Japonés bajo cada mensaje, párrafo por párrafo; notas de vocabulario en inglés |
| 한국어 | 日本語 | Lee japonés bajo respuestas en coreano; tarjetas de estudio con notas en coreano |
| Français | Deutsch | Alemán bajo cada prompt y cada respuesta, con notas en francés |

Cámbialo cuando quieras: haz clic en una etiqueta, ejecuta `/lingo de` o modifícalo en `/config`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `/lingo fr` · `/lingo ja` · `/lingo zh-TW` … | Cambia el idioma que aprendes |
| `/lingo off` | Desactiva Lingo |
| `/lingo show` | Abre la traducción de la última respuesta (para una terminal donde no se puede hacer clic en las filas) |
| `/lingo review` | Repasa las tarjetas que toca revisar |
| `/lingo words` | Muestra tu mazo: palabras, pendientes, nuevas y las diez últimas |
| `/lingo forget <word>` | Elimina una tarjeta |

En la transcripción también puedes hacer clic en la etiqueta de idioma para abrir un selector (cambiar de idioma, ocultar esa línea o desactivar Lingo), hacer clic en `Translation failed · Retry` para reintentar, y hacer clic en una traducción abierta para plegarla.

## Ajustes

Todo está en `/config`, dentro de **Lingo**:

| Ajuste | Valor por defecto | Qué hace |
| --- | --- | --- |
| **Target language** | `English` | El idioma que aprendes: `English`, `Français`, `Español`, `Deutsch`, `Português`, `日本語`, `한국어`, `简体中文`, `繁體中文`, `Русский`, `Tiếng Việt` u `Off` |
| **Native language** | `简体中文` | Tu propio idioma: las notas de vocabulario y las explicaciones se escriben en él. Mismas opciones, sin `Off` |
| **Preview while typing** | `true` | Muestra en vivo la traducción de tu borrador sobre el cuadro del prompt, con las palabras clave. `u` la pone en el cuadro |
| **Suggest fixes while typing** | `true` | Cuando tu borrador ya está en el idioma que aprendes, sugiere una versión más natural, explicada en tu idioma. `u` la pone en el cuadro |
| **Translate my prompts** | `true` | Muestra una traducción bajo cada prompt que envías |
| **Translate Claude's replies** | `true` | Muestra una traducción bajo cada respuesta de texto de Claude |
| **Fold translations** | `true` | Cada traducción empieza plegada como `▸ Translate`: no se traduce nada, ni se paga, hasta que la abres. Desactívalo para traducir los prompts al enviarlos, y la respuesta final de cada turno |
| **Save words as flashcards** | `true` | Guarda las palabras clave de un borrador con vista previa al enviarlo (o al pulsar `u`), para `/lingo review` |
| **Provider** | `Claude` | `Claude` (a través de Claude Code, con tu cuenta) u `OpenAI-compatible` (ver más abajo) |
| **Translation model** | `haiku` | Un alias o un id completo (`claude-haiku-4-5`), o el nombre de modelo de tu proveedor. Indica un id completo si `haiku` no está disponible para ti |
| **Provider URL** | `http://localhost:11434/v1` | Con `OpenAI-compatible`: la base de la API, terminada en `/v1` |
| **Provider API key** | vacío | Con `OpenAI-compatible`: la clave del proveedor (ninguna para un Ollama local). Se guarda en texto plano en `settings.json` |

## Qué se omite

- **El texto que ya está en el idioma que aprendes.** Si aprendes inglés y un mensaje está en inglés, no se muestra nada. En idiomas que comparten alfabeto (por ejemplo, inglés y francés), Lingo lo comprueba en local cuando puede y consulta al modelo cuando no está seguro.
- **Código, rutas y URL.** Un mensaje que es solo `` `getUserById` `` o un bloque de código se omite sin llamar al modelo. Dentro de un texto, el código en línea, las rutas de archivos, los comandos con barra y las opciones se conservan exactamente como están escritos.

## Coste y privacidad

Por defecto, cada traducción es una llamada corta al modelo `haiku` de Claude a través de la propia API de Claude Code: la misma cuenta y la misma facturación que ya usas, sin ningún servicio de traducción externo. Las traducciones plegadas no cuestan nada hasta que las abres; una respuesta larga sigue siendo una sola llamada; las tarjetas de estudio nunca llaman al modelo. Un mensaje típico cuesta una fracción de céntimo.

### Modelos gratuitos y locales (OpenAI-compatible)

Lingo también puede traducir con cualquier endpoint que hable la API chat-completions de OpenAI, incluidos los gratuitos y los totalmente locales. Pon **Provider** en `OpenAI-compatible`, **Provider URL** en la base de la API y **Translation model** en el nombre de modelo del proveedor. Un servicio que necesite clave la recibe en **Provider API key**.

| Proveedor | Provider URL | Translation model (ejemplo) |
| --- | --- | --- |
| Ollama (local, sin clave) | `http://localhost:11434/v1` | `gemma4:cloud` (recomendado) |
| LM Studio (local, sin clave) | `http://localhost:1234/v1` | el nombre del modelo cargado |
| OpenRouter | `https://openrouter.ai/api/v1` | un modelo `:free` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

Las peticiones pasan por la propia capa de red de Claude Code, así que se aplica la política de web-fetch de tu organización. Con un proveedor así, los mensajes van al endpoint que configures, y se aplican sus propios precios y condiciones de privacidad. El bloque `<think>` de un modelo de razonamiento se descarta de la traducción.

## Diseño

Las decisiones de diseño (la glosa, la etiqueta de idioma y su menú, la banda de vista previa, la vista por párrafos, las tarjetas de estudio, los ajustes, los colores y los textos) están en [docs/DESIGN.md](docs/DESIGN.md). Las imágenes de arriba se hacen con [Remotion](https://www.remotion.dev) a partir de [promo/](promo/).

## Desarrollo

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## Licencia

[MIT](LICENSE)
