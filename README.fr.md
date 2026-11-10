# Lingo

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | **Français** | [Español](README.es.md)

<p align="center">
  <img src="docs/images/hero.gif" alt="Lingo traduit une conversation Claude Code en français, espagnol, allemand, japonais, coréen, chinois, portugais, russe et vietnamien" width="880">
</p>

<p align="center"><b>Apprends une langue en codant.</b><br>
English · Français · Español · Deutsch · Português · 日本語 · 한국어 · 简体中文 · 繁體中文 · Русский · Tiếng Việt</p>

Tu passes déjà des heures chaque jour à lire et à écrire avec Claude Code. Lingo, un plugin Claude Code, transforme ces heures en entraînement linguistique, avec de vraies phrases techniques qui t'intéressent vraiment :

- **Lire.** Une traduction dans la langue que tu apprends s'affiche sous chaque prompt et chaque réponse, paragraphe par paragraphe.
- **Écrire.** Tape dans ta langue et vois le résultat dans la langue que tu apprends avant d'envoyer, avec les mots clés expliqués. Écris directement dans cette langue et obtiens une version plus naturelle, avec les raisons dans ta langue.
- **Retenir.** Les mots que tu as utilisés deviennent des cartes mémoire, planifiées par répétition espacée.

Apprends l'une des 11 langues, avec des explications dans n'importe quelle autre. Ce que tu envoies à Claude n'est jamais modifié : Lingo ajoute seulement des lignes autour.

## Installation

Dans Claude Code :

```
/plugin marketplace add royisme/lingo
/plugin install lingo --marketplace royisme/lingo
```

Ou depuis ton shell :

```sh
claude plugin marketplace add royisme/lingo
claude plugin install lingo --marketplace royisme/lingo
```

Ouvre ensuite `/config`, trouve **Lingo**, puis règle **Target language** (la langue que tu apprends) et **Native language** (la tienne). Fonctionne dans le terminal, sur Desktop, dans VS Code et sur mobile.

## Comment tu apprends

### Lire : chaque message, dans la langue que tu apprends

<img src="docs/images/read.png" alt="Une réponse de Claude Code avec une traduction en japonais sous chaque paragraphe" width="880">

Chaque prompt et chaque réponse reçoit en dessous une traduction en italique, étiquetée avec la langue. Une longue réponse est traduite paragraphe par paragraphe : chaque traduction se place juste sous le paragraphe auquel elle correspond. Les blocs de code, les chemins et les commandes restent tels quels. Les traductions sont repliées au départ (`▸ Translate`) : rien n'est traduit ni facturé tant que tu n'en ouvres pas une. Clique sur l'étiquette (`FR`, `JA`, `ZH`…) pour changer de langue sur-le-champ.

### Écrire : tape dans ta langue, envoie dans celle que tu apprends

<img src="docs/images/write.png" alt="La bande d'aperçu : un brouillon en chinois traduit en anglais avec les mots clés, et un brouillon en anglais avec des corrections expliquées en chinois" width="880">

Fais une pause pendant que tu tapes et un aperçu apparaît au-dessus de la zone de saisie :

- **Un brouillon dans ta langue** s'affiche traduit, avec jusqu'à cinq mots à retenir, chacun accompagné d'une courte note dans ta langue. Appuie sur `u` pour mettre la traduction dans la zone de saisie et l'envoyer.
- **Un brouillon dans la langue que tu apprends** reçoit une version plus naturelle quand il y en a une, chaque changement étant expliqué dans ta langue : `"It look" → "It looks"  sujet au singulier`. Appuie sur `u` pour l'utiliser, ou corrige-le toi-même.

### Retenir : les mots que tu as utilisés deviennent des cartes mémoire

<img src="docs/images/remember.png" alt="Le panneau /lingo review : un mot, la phrase d'où il vient, son sens et les quatre notes" width="880">

Quand tu envoies un brouillon prévisualisé, ses mots clés vont dans un paquet, un par langue apprise. Aucun appel supplémentaire au modèle : les mots viennent de l'aperçu. Lance `/lingo review` et note chaque carte : `1` Again, `2` Hard, `3` Good, `4` Easy. Les cartes reviennent selon un calendrier de répétition espacée (2, 5, 13, 33 jours si tu continues de répondre Good). Chaque carte affiche la phrase d'où elle vient, pour que tu apprennes le mot en contexte.

## Un seul plugin, toutes les paires de langues

Toutes les combinaisons des 11 langues fonctionnent. Quelques exemples :

| Tu parles | Tu apprends | Ce que tu obtiens |
| --- | --- | --- |
| Français | Deutsch | De l'allemand sous chaque prompt et chaque réponse, avec des notes en français |
| 简体中文 | English | De l'anglais sous les réponses de Claude en chinois ; tes brouillons en chinois prévisualisés en anglais ; des notes de grammaire en chinois |
| English | 日本語 | Du japonais sous chaque message, paragraphe par paragraphe ; des notes de vocabulaire en anglais |
| Español | English | Écris en anglais toi-même et obtiens des corrections expliquées en espagnol |
| 한국어 | 日本語 | Lis du japonais sous des réponses en coréen ; des cartes mémoire avec des notes en coréen |

Change quand tu veux : clique sur une étiquette, lance `/lingo de`, ou modifie le réglage dans `/config`.

## Commandes

| Commande | Ce qu'elle fait |
| --- | --- |
| `/lingo fr` · `/lingo ja` · `/lingo zh-TW` … | Change la langue que tu apprends |
| `/lingo off` | Désactive Lingo |
| `/lingo show` | Ouvre la traduction de la dernière réponse (pour un terminal où l'on ne peut pas cliquer sur les lignes) |
| `/lingo review` | Révise les cartes mémoire à revoir |
| `/lingo words` | Affiche ton paquet : mots, à revoir, nouveaux, les dix derniers |
| `/lingo forget <word>` | Supprime une carte |

Dans la transcription, tu peux aussi cliquer sur l'étiquette de langue pour ouvrir un sélecteur (changer de langue, masquer cette ligne ou désactiver Lingo), cliquer sur `Translation failed · Retry` pour réessayer, et cliquer sur une traduction ouverte pour la replier.

## Réglages

Tout se trouve dans `/config`, sous **Lingo** :

| Réglage | Par défaut | Ce qu'il fait |
| --- | --- | --- |
| **Target language** | `English` | La langue que tu apprends : `English`, `Français`, `Español`, `Deutsch`, `Português`, `日本語`, `한국어`, `简体中文`, `繁體中文`, `Русский`, `Tiếng Việt`, ou `Off` |
| **Native language** | `简体中文` | Ta propre langue : les notes de vocabulaire et les explications sont rédigées dans cette langue. Mêmes options, sans `Off` |
| **Preview while typing** | `true` | Affiche en direct la traduction de ton brouillon au-dessus de la zone de saisie, avec les mots clés. `u` la place dans la zone de saisie |
| **Suggest fixes while typing** | `true` | Quand ton brouillon est déjà dans la langue que tu apprends, propose une version plus naturelle, expliquée dans ta langue. `u` la place dans la zone de saisie |
| **Translate my prompts** | `true` | Affiche une traduction sous chaque prompt que tu envoies |
| **Translate Claude's replies** | `true` | Affiche une traduction sous chaque réponse textuelle de Claude |
| **Fold translations** | `true` | Chaque traduction démarre repliée sous la forme `▸ Translate` : rien n'est traduit, ni facturé, tant que tu ne l'ouvres pas. Désactive pour traduire les prompts à l'envoi, ainsi que la réponse finale de chaque tour |
| **Save words as flashcards** | `true` | Enregistre les mots clés d'un brouillon prévisualisé quand tu l'envoies (ou que tu appuies sur `u`), pour `/lingo review` |
| **Provider** | `Claude` | `Claude` (via Claude Code, avec ton compte) ou `OpenAI-compatible` (voir plus bas) |
| **Translation model** | `haiku` | Un alias ou un identifiant complet (`claude-haiku-4-5`), ou le nom de modèle de ton fournisseur. Indique un identifiant complet si `haiku` n'est pas disponible pour toi |
| **Provider URL** | `http://localhost:11434/v1` | Avec `OpenAI-compatible` : la base de l'API, qui se termine par `/v1` |
| **Provider API key** | vide | Avec `OpenAI-compatible` : la clé du fournisseur (aucune pour un Ollama local). Stockée en clair dans `settings.json` |

## Ce qui est ignoré

- **Le texte déjà dans la langue que tu apprends.** Si tu apprends l'anglais et qu'un message est en anglais, rien ne s'affiche. Pour les langues qui partagent un alphabet (l'anglais et le français, par exemple), Lingo vérifie en local quand il le peut et interroge le modèle quand il hésite.
- **Le code, les chemins et les URL.** Un message qui n'est que `` `getUserById` `` ou un bloc de code est ignoré sans appeler le modèle. Dans un texte, le code en ligne, les chemins de fichiers, les commandes slash et les options sont conservés exactement tels quels.

## Coût et confidentialité

Par défaut, chaque traduction est un court appel au modèle `haiku` de Claude, via l'API de Claude Code elle-même : le même compte et la même facturation que d'habitude, sans service de traduction externe. Les traductions repliées ne coûtent rien tant que tu ne les ouvres pas ; une longue réponse reste un seul appel ; les cartes mémoire n'appellent jamais le modèle. Un message typique coûte une fraction de centime.

### Modèles gratuits et locaux (OpenAI-compatible)

Lingo peut aussi traduire avec n'importe quel point d'accès qui parle l'API chat-completions d'OpenAI, y compris des services gratuits et des modèles entièrement locaux. Règle **Provider** sur `OpenAI-compatible`, **Provider URL** sur la base de l'API, et **Translation model** sur le nom de modèle du fournisseur. Un service qui exige une clé la reçoit dans **Provider API key**.

| Fournisseur | Provider URL | Translation model (exemple) |
| --- | --- | --- |
| Ollama (local, sans clé) | `http://localhost:11434/v1` | `gemma4:cloud` (recommandé) |
| LM Studio (local, sans clé) | `http://localhost:1234/v1` | le nom du modèle chargé |
| OpenRouter | `https://openrouter.ai/api/v1` | un modèle `:free` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` |

Les requêtes passent par la couche réseau de Claude Code, donc la politique web-fetch de ton organisation s'applique. Avec un tel fournisseur, les messages partent vers le point d'accès que tu as configuré, et ses propres tarifs et conditions de confidentialité s'appliquent. Le bloc `<think>` d'un modèle de raisonnement est retiré de la traduction.

## Conception

Les choix de conception (la glose, l'étiquette de langue et son menu, la bande d'aperçu, la vue par paragraphe, les cartes mémoire, les réglages, les couleurs et les textes) sont détaillés dans [docs/DESIGN.md](docs/DESIGN.md).

## Développement

```sh
claude plugin validate .
claude plugin validate ./claude-code
claude plugin test ./claude-code
```

## Licence

[MIT](LICENSE)
