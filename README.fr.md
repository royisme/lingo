# Lingo

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | **Français** | [Español](README.es.md)

Apprenez une langue tout en codant. Lingo affiche discrètement une traduction sous chaque prompt et chaque réponse dans la langue que vous apprenez, et prévisualise votre brouillon pendant votre saisie.

```
You
  帮我看一下为什么登录接口会超时

  EN  Look into why the login endpoint is timing out.
```

Ce que vous envoyez réellement à Claude n'est jamais modifié — Lingo ajoute simplement une ligne en dessous.

## Installation

Dans Claude Code :

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

Ou depuis votre terminal :

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

Fonctionne sur Terminal, Desktop, VS Code et Mobile.

## Choisir votre langue

Ouvrez `/config` et cherchez **Lingo** :

| Paramètre | Défaut | Description |
| --- | --- | --- |
| **Target language** | `English` | `English`, `Français`, `Español`, `Deutsch`, `Português`, `日本語`, `한국어`, `简体中文`, `繁體中文`, `Русский`, `Tiếng Việt` ou `Off` |
| **Preview while typing** | `true` | Affiche une traduction en direct au-dessus de la zone de saisie après une brève pause |
| **Translate my prompts** | `true` | Affiche une traduction sous chaque prompt que vous envoyez |
| **Translate Claude's replies** | `true` | Affiche une traduction sous chacune des réponses textuelles de Claude |

Ou changez à tout moment sans ouvrir `/config` :

- **Cliquez sur le badge de langue** (`EN`, `FR`, `日本語`…) à côté de n'importe quelle traduction pour ouvrir un menu intégré — changez de langue, masquez cette ligne ou désactivez Lingo.
- **Cliquez sur une ligne en échec** (`Translation failed · Retry`) pour relancer la traduction.
- **Exécutez `/lingo`** : `/lingo fr`, `/lingo ja`, `/lingo zh-TW`, `/lingo off`.

## Ce qui est ignoré

- **Déjà dans la langue cible.** Si vous apprenez l'anglais et qu'un message est déjà en anglais, rien n'est affiché. Pour les langues qui partagent le même alphabet (comme l'anglais et le français), Lingo vérifie localement quand il le peut et interroge le modèle en cas de doute.
- **Code, chemins et URL.** Un message composé uniquement de `` `getUserById` `` ou d'un bloc de code est ignoré sans appeler le modèle. Dans le texte, le code en ligne, les chemins de fichiers et les options restent intacts.

## Coût et confidentialité

Chaque traduction consiste en un court appel au modèle `haiku` de Claude via l'API `$.model.complete` intégrée à Claude Code — le même compte et la même facturation que vous utilisez déjà, sans service de traduction externe ni permissions réseau. Un message typique coûte une fraction de centime ; les messages déjà dans votre langue cible ne coûtent généralement rien.

## Développement

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## Licence

[MIT](LICENSE)
