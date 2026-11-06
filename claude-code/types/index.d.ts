/** One translation, keyed by a hash of target language + source text. `same`: already in the target. */
export type Gloss = { status: 'pending' | 'done' | 'same' | 'error'; text: string }

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
}

declare module 'claude-code' {
  interface PluginState {
    lingo: {
      gloss: StateFamily<Gloss | null>
      draft: Draft | null
      /** Whether a gloss's language-tag menu is open, by message and gloss (`requestId:glossId`). */
      menu: StateFamily<boolean>
      /** Translations the person hid, by gloss id. */
      hidden: StateFamily<boolean>
    }
  }
}
