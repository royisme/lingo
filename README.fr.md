# Lingo

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | **Français** | [Español](README.es.md)

Apprenez une langue tout en codant. Lingo affiche discrètement une traduction sous chaque prompt et chaque réponse dans la langue que vous apprenez, et prévisualise votre brouillon pendant votre saisie.

```
You
  Regarde pourquoi l'endpoint de connexion expire

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
| **Native language** | `简体中文` | Votre langue maternelle : les explications et les notes de vocabulaire sont rédigées dans cette langue. Mêmes options que Target language, sans `Off` |
| **Preview while typing** | `true` | Affiche une traduction en direct au-dessus de la zone de saisie après une brève pause; explications dans votre langue maternelle. **Use** (ou `u`) place la traduction dans la zone de saisie |
| **Suggest fixes while typing** | `true` | Si votre brouillon est déjà dans la langue que vous apprenez, propose une version plus naturelle au-dessus de la zone de saisie ; **Use** la place dans la zone; explications dans votre langue maternelle |
| **Translate my prompts** | `true` | Affiche une traduction sous chaque prompt que vous envoyez |
| **Translate Claude's replies** | `true` | Affiche une traduction sous chacune des réponses textuelles de Claude |
| **Fold translations** | `true` | Chaque traduction commence repliée en `▸ Translate` : rien n'est traduit, ni facturé, tant que vous ne l'ouvrez pas. Désactivez pour traduire les prompts à l'envoi et les réponses une fois par tour (la réponse finale) |
| **Save words as flashcards** | `true` | Enregistre les mots clés listés sous un aperçu, quand vous envoyez ce brouillon (ou appuyez sur **Use**), comme cartes pour `/lingo review`. La désactivation arrête seulement l'enregistrement |
| **Provider** | `Claude` | `Claude` (via Claude Code, votre compte) ou `OpenAI-compatible` (voir plus bas) |
| **Provider URL** | `http://localhost:11434/v1` | Avec `OpenAI-compatible` : la base de l'API, terminée par `/v1` |
| **Provider API key** | vide | Avec `OpenAI-compatible` : la clé du service (aucune pour Ollama en local). Enregistrée en clair dans `settings.json` |
| **Translation model** | `haiku` | Le modèle qui traduit : un alias ou un identifiant complet (`claude-haiku-4-5`, ou le nom du modèle de votre passerelle). Indiquez un identifiant complet si `haiku` ne vous est pas accessible |

Ou changez à tout moment sans ouvrir `/config` :

- **Cliquez sur le badge de langue** (`EN`, `FR`, `日本語`…) à côté de n'importe quelle traduction pour ouvrir un menu intégré — changez de langue, masquez cette ligne ou désactivez Lingo.
- **Cliquez sur une ligne en échec** (`Translation failed · Retry`) pour relancer la traduction.
- **Exécutez `/lingo`** : `/lingo fr`, `/lingo ja`, `/lingo zh-TW`, `/lingo off`.
- **Ouvrir une traduction repliée** : cliquez sur `▸ Translate` sous un message, ou lancez `/lingo show` pour la dernière réponse (dans un terminal où les lignes ne sont pas cliquables). Cliquez sur une traduction ouverte pour la replier.

Une longue réponse (3 paragraphes ou plus) est traduite en un seul appel et affichée paragraphe par paragraphe : la traduction de chaque paragraphe se place juste en dessous de lui, et les blocs de code ne sont jamais envoyés.

## Cartes mémoire

Les mots clés listés sous un aperçu sont enregistrés dans un paquet (un par langue cible) quand vous envoyez ce brouillon ou appuyez sur **Use**. Aucun appel supplémentaire au modèle, et rien n'est enregistré pour un brouillon abandonné. `/lingo review` ouvre un panneau de révision : `s` affiche la note, `1` à `4` notent la carte (Again, Hard, Good, Easy), `x` la supprime, Échap ferme le panneau. Les intervalles suivent une méthode de type SM-2 (Good à répétition donne 2, 5, 13, 33 jours). `/lingo words` résume le paquet ; `/lingo forget <word>` supprime une carte.

## Ce qui est ignoré

- **Déjà dans la langue cible.** Si vous apprenez l'anglais et qu'un message est déjà en anglais, rien n'est affiché. Pour les langues qui partagent le même alphabet (comme l'anglais et le français), Lingo vérifie localement quand il le peut et interroge le modèle en cas de doute.
- **Code, chemins et URL.** Un message composé uniquement de `` `getUserById` `` ou d'un bloc de code est ignoré sans appeler le modèle. Dans le texte, le code en ligne, les chemins de fichiers et les options restent intacts.

## Autres fournisseurs (compatibles OpenAI)

Lingo peut traduire avec tout service qui parle l'API chat-completions d'OpenAI : **Ollama** ou **LM Studio** en local, **OpenRouter**, **Groq** et bien d'autres. Réglez **Provider** sur `OpenAI-compatible`, **Provider URL** sur la base de l'API et **Translation model** sur le nom de modèle du service ; un service qui demande une clé la reçoit dans **Provider API key**.

| Service | Provider URL | Translation model (exemple) |
| --- | --- | --- |
| Ollama (local, sans clé) | `http://localhost:11434/v1` | `gemma4:cloud` (recommandé) |
| LM Studio (local, sans clé) | `http://localhost:1234/v1` | le nom du modèle chargé |
| OpenRouter | `https://openrouter.ai/api/v1` | un modèle `:free` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

Les requêtes passent par la couche réseau de Claude Code (`$.http.fetch`) : la politique d'accès web de votre organisation s'applique. Le bloc `<think>` d'un modèle de raisonnement est retiré de la traduction.

## Coût et confidentialité

Chaque traduction consiste en un court appel au modèle `haiku` de Claude via l'API `$.model.complete` intégrée à Claude Code — le même compte et la même facturation que vous utilisez déjà, sans service de traduction externe ni permissions réseau. Un message typique coûte une fraction de centime ; les messages déjà dans votre langue cible ne coûtent généralement rien. Avec un fournisseur compatible OpenAI, les messages vont au service que vous avez configuré, dont les tarifs et les conditions de confidentialité s'appliquent.

## Développement

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## Licence

[MIT](LICENSE)
