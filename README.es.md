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
| **Translate my prompts** | `true` | Muestra una traducción debajo de cada prompt que envías |
| **Translate Claude's replies** | `true` | Muestra una traducción debajo de cada respuesta de texto de Claude |

O cambia en cualquier momento sin abrir `/config`:

- **Haz clic en la etiqueta de idioma** (`EN`, `FR`, `日本語`…) junto a cualquier traducción para abrir un selector integrado — cambia de idioma, oculta esa línea o desactiva Lingo.
- **Haz clic en una línea fallida** (`Translation failed · Retry`) para reintentar la traducción.
- **Ejecuta `/lingo`**: `/lingo fr`, `/lingo ja`, `/lingo zh-TW`, `/lingo off`.

## Qué se omite

- **Ya está en tu idioma de destino.** Si estás aprendiendo inglés y un mensaje ya está en inglés, no se muestra nada. Para idiomas que comparten alfabeto (por ejemplo, inglés y francés), Lingo lo comprueba localmente cuando puede y consulta al modelo cuando no está seguro.
- **Código, rutas y URL.** Un mensaje que sea solo `` `getUserById` `` o un bloque de código se omite sin llamar al modelo. Dentro del texto, el código en línea, las rutas de archivos y los flags permanecen intactos.

## Coste y privacidad

Cada traducción es una llamada breve al modelo `haiku` de Claude a través de la propia API `$.model.complete` de Claude Code — la misma cuenta y facturación que ya utilizas, sin servicios de traducción externos ni permisos de red. Un mensaje típico cuesta una fracción de centavo; los mensajes que ya están en tu idioma de destino no cuestan nada en la mayoría de los casos.

## Desarrollo

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## Licencia

[MIT](LICENSE)
