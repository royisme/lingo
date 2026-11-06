// Host-agnostic language logic: no `$`, no engine. Safe to share with other hosts.

export type Code = 'en' | 'fr' | 'es' | 'de' | 'pt' | 'ja' | 'ko' | 'zh-CN' | 'zh-TW' | 'ru' | 'vi'
type Script = 'latin' | 'han' | 'kana' | 'hangul' | 'cyrillic'

export type Language = {
  code: Code
  /** The option value shown in /config and the chip menu, in the language itself. */
  option: string
  /** The tag drawn before a translation. */
  tag: string
  /** How the model is told which language to write. */
  prompt: string
  script: Script
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en', option: 'English', tag: 'EN', prompt: 'English', script: 'latin' },
  { code: 'fr', option: 'Français', tag: 'FR', prompt: 'French', script: 'latin' },
  { code: 'es', option: 'Español', tag: 'ES', prompt: 'Spanish', script: 'latin' },
  { code: 'de', option: 'Deutsch', tag: 'DE', prompt: 'German', script: 'latin' },
  { code: 'pt', option: 'Português', tag: 'PT', prompt: 'Portuguese', script: 'latin' },
  { code: 'ja', option: '日本語', tag: 'JA', prompt: 'Japanese', script: 'kana' },
  { code: 'ko', option: '한국어', tag: 'KO', prompt: 'Korean', script: 'hangul' },
  { code: 'zh-CN', option: '简体中文', tag: 'ZH', prompt: 'Simplified Chinese', script: 'han' },
  { code: 'zh-TW', option: '繁體中文', tag: 'ZH-TW', prompt: 'Traditional Chinese (Taiwan)', script: 'han' },
  { code: 'ru', option: 'Русский', tag: 'RU', prompt: 'Russian', script: 'cyrillic' },
  { code: 'vi', option: 'Tiếng Việt', tag: 'VI', prompt: 'Vietnamese', script: 'latin' },
]

export const OFF = 'Off'

/** A language by its option, code or tag, any case; undefined for Off or unknown. */
export function findLanguage(name: string | undefined): Language | undefined {
  const n = (name ?? '').trim().toLowerCase()
  if (!n) return undefined
  return LANGUAGES.find(
    l => l.option.toLowerCase() === n || l.code.toLowerCase() === n || l.tag.toLowerCase() === n,
  )
}

/** Prose only: fenced code, inline code, URLs and paths stripped. */
export function prose(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/(?:^|[\s([{"'])(?:\.{0,2}\/[\w./-]+|[\w.-]+\/[\w.-]+\/[\w./-]+|[\w.-]+\/[\w.-]+\.[A-Za-z0-9]{1,10})(?=\s|$|[)\]}"',.;:!?])/g, ' ')
}

function scriptCounts(text: string): Record<Script, number> {
  return {
    han: (text.match(/[㐀-鿿豈-﫿]/g) ?? []).length,
    kana: (text.match(/[぀-ヿ]/g) ?? []).length,
    hangul: (text.match(/[가-힯ᄀ-ᇿ]/g) ?? []).length,
    cyrillic: (text.match(/[Ѐ-ӿ]/g) ?? []).length,
    latin: (text.match(/[A-Za-zÀ-ɏḀ-ỿ]/g) ?? []).length,
  }
}

// A few of the commonest function words per Latin-script language.
const STOPWORDS: Partial<Record<Code, readonly string[]>> = {
  en: ['the', 'and', 'is', 'are', 'to', 'of', 'in', 'it', 'that', 'this', 'with', 'for', 'you', 'can', 'not', 'what', 'why', 'how', 'do', 'be'],
  fr: ['le', 'la', 'les', 'et', 'est', 'un', 'une', 'des', 'du', 'que', 'pour', 'pas', 'dans', 'avec', 'ce', 'je', 'tu', 'vous', 'sur', 'pourquoi'],
  es: ['el', 'la', 'los', 'las', 'y', 'es', 'un', 'una', 'que', 'de', 'para', 'por', 'con', 'no', 'en', 'del', 'se', 'qué', 'como', 'pero'],
  de: ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'zu', 'mit', 'für', 'auf', 'ich', 'du', 'sie', 'es', 'den', 'dem', 'warum', 'wie'],
  pt: ['o', 'a', 'os', 'as', 'e', 'é', 'um', 'uma', 'que', 'de', 'para', 'com', 'não', 'em', 'do', 'da', 'por', 'se', 'porque', 'como'],
  vi: ['là', 'và', 'của', 'có', 'không', 'được', 'cho', 'một', 'này', 'với', 'các', 'những', 'tôi', 'bạn', 'để', 'trong', 'khi', 'thì', 'sao', 'gì'],
}

function stopwordHits(words: readonly string[], code: Code): number {
  const list = STOPWORDS[code]
  if (!list) return 0
  const set = new Set(list)
  return words.filter(w => set.has(w)).length
}

/**
 * What to do with a text for a target language:
 * - `skip`: nothing worth translating, or already in the target language;
 * - `translate`: clearly another language;
 * - `ask`: can't tell locally (same script); the model decides, and may answer SAME.
 */
export function decide(text: string, target: Language): 'skip' | 'translate' | 'ask' {
  const p = prose(text)
  const c = scriptCounts(p)
  const total = c.han + c.kana + c.hangul + c.cyrillic + c.latin
  if (total < 2) return 'skip'

  // CJK characters carry about a word each; Latin and Cyrillic letters about a fifth of one.
  const weight: Record<Script, number> = {
    han: c.han,
    kana: c.kana,
    hangul: c.hangul,
    cyrillic: c.cyrillic / 5,
    latin: c.latin / 5,
  }
  // Japanese is kana plus kanji; treat its han as Japanese when kana is present.
  if (c.kana > 0) {
    weight.kana += weight.han
    weight.han = 0
  }
  const dominant = (Object.keys(weight) as Script[]).reduce((a, b) => (weight[b] > weight[a] ? b : a))
  const share = weight[dominant] / Object.values(weight).reduce((a, b) => a + b, 0)

  if (dominant !== target.script) {
    // Mostly another script; a few CJK words inside an English sentence don't count.
    return share >= 0.5 || weight[target.script] < 2 ? 'translate' : 'skip'
  }
  if (target.script === 'han') return 'ask' // Simplified vs Traditional: the model knows
  if (target.script !== 'latin') return 'skip'

  const nonLatin = c.han + c.kana + c.hangul + c.cyrillic
  if (nonLatin >= 4) return 'translate'

  // Latin vs Latin: compare function words.
  const words = p.toLowerCase().match(/[a-zÀ-ɏḀ-ỿ']+/g) ?? []
  if (words.length < 3) return 'skip'
  const mine = stopwordHits(words, target.code)
  const best = LANGUAGES.filter(l => l.script === 'latin' && l.code !== target.code).reduce(
    (m, l) => Math.max(m, stopwordHits(words, l.code)),
    0,
  )
  if (mine >= 2 && mine >= best) return 'skip'
  if (best >= 2 && best > mine * 1.5) return 'translate'
  return 'ask'
}

/** The model's answer for a text already in the target language. */
export const SAME = '<<SAME>>'

export function systemPrompt(target: Language, allowSame: boolean): string {
  return [
    `You translate messages from a conversation between a software developer and a coding assistant into natural, idiomatic ${target.prompt}.`,
    'Output only the translation: no quotes, notes, or alternatives.',
    'Keep Markdown structure, code, file paths, identifiers, commands and numbers exactly as they are.',
    allowSame
      ? `If the message is already written in ${target.prompt}, output exactly ${SAME} and nothing else.`
      : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** FNV-1a, enough to key a cache. */
export function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36) + s.length.toString(36)
}
