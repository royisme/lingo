/** One translation, keyed by a hash of target language + source text. `same`: already in the target. */
export type Gloss = {
  status: 'pending' | 'done' | 'same' | 'error'
  text: string
  /** With `error`: why, in a few words. */
  why?: string
  /** With `error`: the failure may pass (a rate limit), so the row is tried again once by itself. */
  passing?: boolean
  /** With `done`, a paragraph-aligned translation: `text` is `parts` translations joined by a blank line
   *  (none contains one), for a source that had `of` prose segments. `parts < of`: cut at the token cap. */
  parts?: number
  of?: number
}

/**
 * Live preview of the draft in the prompt box. `done`: a translation; `fix`: a better version of a
 * draft already in the target; `same`: already in the target and fine, nothing is drawn.
 * `kind`: `polish` when the draft was checked as the target language (absent: a translation).
 */
export type Draft = {
  src: string
  status: 'pending' | 'done' | 'fix' | 'same' | 'error'
  text: string
  kind?: 'translate' | 'polish'
  /** With `fix`: the whole better version for the prompt box, its code, commands and mentions as written. Absent when they could not all be kept: no Use then. */
  fix?: string
  /** With `fix`: up to 3 changes, each with a short reason in the native language. */
  items?: { wrong: string; right: string; reason: string }[]
  /** With `done`: up to 5 words of the translation worth learning, each with a short note in the native language. */
  words?: { word: string; note: string }[]
  /** With `error`: why, in a few words. */
  why?: string
}

/** A language code, as in hooks/lang.ts (the contract is self-contained, so it is repeated here). */
export type Code = 'en' | 'fr' | 'es' | 'de' | 'pt' | 'ja' | 'ko' | 'zh-CN' | 'zh-TW' | 'ru' | 'vi'

/** A saved word and its schedule, as in hooks/cards.ts. */
export type Card = {
  id: string
  word: string
  note: string
  ctx?: string
  native: Code
  added: number
  due: number
  ivl: number
  ease: number
  reps: number
  lapses: number
}

/** The running flashcard review: the session's queue (a card graded Again is appended again), the position, whether the answer shows, and how many ratings so far. */
export type Review = { target: Code; queue: Card[]; pos: number; shown: boolean; rated: number } | null

declare module 'claude-code' {
  interface PluginState {
    lingo: {
      gloss: StateFamily<Gloss | null>
      draft: Draft | null
      /** Whether a gloss's language-tag menu is open, by message and gloss (`requestId:glossId`). */
      menu: StateFamily<boolean>
      /** Translations the person hid, by gloss id. */
      hidden: StateFamily<boolean>
      /** Calls are cooling down after a rate limit: waiting rows say so. */
      limited: boolean
      /** Whether a folded translation was opened, by message and gloss (`requestId:glossId`). */
      shown: StateFamily<boolean>
      /** Words saved as flashcards from a sent prompt, by gloss id (the mark `+N words` on its row). */
      saved: StateFamily<number>
      /** The running flashcard review (`/lingo review`); the pane draws from it alone. */
      review: Review
    }
  }
}
