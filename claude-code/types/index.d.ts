/** One translation, keyed by a hash of target language + source text. `same`: already in the target. */
export type Gloss = { status: 'pending' | 'done' | 'same' | 'error'; text: string }

/** Live preview of the draft in the prompt box. */
export type Draft = { src: string; status: 'pending' | 'done' | 'error'; text: string }

declare module 'claude-code' {
  interface PluginState {
    lingo: {
      gloss: StateFamily<Gloss | null>
      draft: Draft | null
      /** Whether a message's language-tag menu is open, by message (requestId). */
      menu: StateFamily<boolean>
      /** Translations the person hid, by gloss id. */
      hidden: StateFamily<boolean>
    }
  }
}
