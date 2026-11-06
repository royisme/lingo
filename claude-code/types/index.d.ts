/** One translation, keyed by a hash of target language + source text. `same`: already in the target. */
export type Gloss = { status: 'pending' | 'done' | 'same' | 'error'; text: string }

/** Live preview of the draft in the prompt box. `same`: the draft is already in the target; nothing is drawn. */
export type Draft = { src: string; status: 'pending' | 'done' | 'same' | 'error'; text: string }

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
