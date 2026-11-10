import React from 'react'
import { Backdrop, LangStrip } from './Hero'
import { ClaudeLine, Dim, Gloss, PromptBox, Terminal, UserLine } from './Terminal'
import { C, MONO } from './theme'

/** Eyebrow, title and one line of copy above an image's terminal. */
const Heading: React.FC<{ eyebrow: string; title: React.ReactNode; sub: string; top?: number }> = ({ eyebrow, title, sub, top = 40 }) => (
  <div style={{ position: 'absolute', top, width: '100%', textAlign: 'center' }}>
    <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: 4, color: C.accent, fontWeight: 700 }}>{eyebrow}</div>
    <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -0.8, marginTop: 8 }}>{title}</div>
    <div style={{ fontSize: 20, color: C.dim, marginTop: 8 }}>{sub}</div>
  </div>
)

const Center: React.FC<{ top: number; children: React.ReactNode }> = ({ top, children }) => (
  <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>{children}</div>
)

/** A paragraph of the reply drawn under the first one: source, then its translation. */
const Para: React.FC<{ children: React.ReactNode; tag: string; gloss: React.ReactNode }> = ({ children, tag, gloss }) => (
  <div style={{ paddingLeft: 26, marginTop: 16 }}>
    {children}
    <Gloss tag={tag} style={{ paddingLeft: 0 }}>
      {gloss}
    </Gloss>
  </div>
)

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ paddingLeft: 26, marginTop: 16 }}>
    <div style={{ background: '#161a26', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 14px', color: '#c3e88d' }}>{children}</div>
  </div>
)

/** Read: an English speaker learning Japanese; each paragraph's translation sits under it. */
export const Read: React.FC = () => (
  <Backdrop>
    <Heading eyebrow="READ" title={<>Every paragraph, <span style={{ color: C.accent }}>translated right under it</span></>} sub="Code stays as it is. Click the tag to switch language, or fold it away." />
    <Center top={196}>
      <Terminal width={1120} fontSize={18}>
        <UserLine>Why do logins hang at peak hours?</UserLine>
        <Gloss tag="JA">ピーク時にログインが固まるのはなぜ？</Gloss>
        <div style={{ height: 20 }} />
        <ClaudeLine>The login handler waits for a database connection, but the pool runs dry under load.</ClaudeLine>
        <Gloss tag="JA">ログインハンドラーはデータベース接続を待っていますが、負荷がかかるとプールが枯渇します。</Gloss>
        <Para
          tag="JA"
          gloss={
            <>
              - プールサイズを 10 から 30 に増やす。
              <br />- 5 秒の取得タイムアウトを追加する。
            </>
          }
        >
          - Raise the pool size from 10 to 30.
          <br />- Add a 5-second acquire timeout.
        </Para>
        <Code>pool = create_pool(size=30, acquire_timeout=5)</Code>
        <Para tag="JA" gloss="これでリクエストはハングせず、すぐに失敗するようになります。">
          Requests now fail fast instead of hanging.
        </Para>
      </Terminal>
    </Center>
  </Backdrop>
)

/** A band above the prompt box: tag, label, the text, Use; dim rows under it. */
const Band: React.FC<{ label: string; text: string; rows: React.ReactNode[] }> = ({ label, text, rows }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <span style={{ color: C.accent, fontWeight: 700 }}>EN</span>
      <span style={{ color: C.dim }}>{label}</span>
      <span style={{ color: C.accent, fontStyle: 'italic', flex: 1 }}>{text}</span>
      <span style={{ color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '0 8px', fontSize: '0.9em' }}>
        <span style={{ color: C.dim }}>u:</span> Use
      </span>
    </div>
    {rows.map((r, i) => (
      <Dim key={i} style={{ paddingLeft: 0, marginTop: 2 }}>
        {r}
      </Dim>
    ))}
  </div>
)

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ width: 1120, fontSize: 19, color: C.dim, marginBottom: -10 }}>{children}</div>
)

/** Write: a Chinese speaker learning English; a live translation with key words, and a polish with reasons. */
export const Write: React.FC = () => (
  <Backdrop>
    <Heading eyebrow="WRITE" title={<>Type in your language, <span style={{ color: C.accent }}>send it in the new one</span></>} sub="A live preview while you type: key words and fixes explained in your own language. Press u to use it." />
    <Center top={196}>
      <Label>
        <b style={{ color: C.text }}>Draft in your language</b> → the translation, with the words worth learning
      </Label>
      <Terminal width={1120} fontSize={18} title="claude · target English · native 简体中文">
        <Band
          label="Preview"
          text="Add a retry with exponential backoff to the upload function."
          rows={['retry — 重试 · exponential backoff — 指数退避 · upload function — 上传函数']}
        />
        <PromptBox>给上传函数加一个指数退避的重试</PromptBox>
      </Terminal>
      <Label>
        <b style={{ color: C.text }}>Draft in the language you're learning</b> → a better version, and why
      </Label>
      <Terminal width={1120} fontSize={18} title="claude · target English · native 简体中文">
        <Band
          label="Better"
          text="It looks like the cache isn't cleared when the user logs out."
          rows={[
            <>"It look" → "It looks"  主语是单数，动词加 s</>,
            <>"the cache are not" → "the cache isn't"  cache 是单数</>,
            <>"user logout" → "the user logs out"  logout 是名词，动词用 log out</>,
          ]}
        />
        <PromptBox>It look like the cache are not cleared when user logout</PromptBox>
      </Terminal>
    </Center>
  </Backdrop>
)

/** Remember: the review pane, as drawn in the terminal. */
export const Remember: React.FC = () => (
  <Backdrop>
    <Heading eyebrow="REMEMBER" title={<>The words you used <span style={{ color: C.accent }}>become flashcards</span></>} sub="Saved as you send. Spaced repetition with /lingo review, no extra model call." />
    <Center top={196}>
      <Terminal width={900} fontSize={19} title="claude · /lingo review">
        <UserLine>/lingo review</UserLine>
        <Dim style={{ paddingLeft: 26 }}>⎿ Lingo: reviewing 12 words.</Dim>
        <div style={{ borderLeft: `2px solid ${C.border}`, marginTop: 18, paddingLeft: 22 }}>
          <Dim>3 / 12 · EN</Dim>
          <div style={{ color: C.accent, fontWeight: 700, fontSize: 24 }}>connection pool</div>
          <div style={{ color: C.accent, fontStyle: 'italic' }}>Why does the database connection pool keep running out?</div>
          <div style={{ marginTop: 14 }}>连接池</div>
          <div style={{ marginTop: 14, display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            {[
              ['1', 'Again', '10m'],
              ['2', 'Hard', '1d'],
              ['3', 'Good', '2d'],
              ['4', 'Easy', '4d'],
            ].map(([k, l, d]) => (
              <span key={k} style={k === '3' ? { background: C.accentSoft, borderRadius: 6, padding: '0 8px', margin: '0 -8px' } : undefined}>
                <span style={{ color: C.dim }}>{k}:</span> {l} <span style={{ color: C.dim }}>{d}</span>
              </span>
            ))}
            <span style={{ color: C.dim }}>x: Remove</span>
          </div>
        </div>
      </Terminal>
    </Center>
  </Backdrop>
)

/** The repository's social preview (1280×640). */
export const Social: React.FC = () => (
  <Backdrop>
    <div style={{ position: 'absolute', left: 70, top: 70, width: 600 }}>
      <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: C.accent, fontWeight: 700 }}>LINGO · CLAUDE CODE PLUGIN</div>
      <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05, marginTop: 16 }}>
        Learn a language
        <br />
        <span style={{ color: C.accent }}>while you code.</span>
      </div>
      <div style={{ fontSize: 22, color: C.dim, marginTop: 20, lineHeight: 1.45 }}>
        Translations under every prompt and reply, a live preview while you type, and flashcards from the words you use.
      </div>
      <div style={{ marginTop: 34, fontFamily: MONO }}>
        <LangStrip active="FR" size={15} align="flex-start" />
      </div>
    </div>
    <div style={{ position: 'absolute', right: 60, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
      <Terminal width={520} fontSize={17}>
        <UserLine>Why is the build so slow?</UserLine>
        <Gloss tag="FR">Pourquoi le build est-il si lent ?</Gloss>
        <div style={{ height: 16 }} />
        <ClaudeLine>Most of the time goes into type-checking unchanged files.</ClaudeLine>
        <Gloss tag="FR">La plupart du temps passe à vérifier les types de fichiers inchangés.</Gloss>
        <Gloss tag="JA" style={{ marginTop: 16, opacity: 0.55 }}>
          時間の大半は、変更のないファイルの型チェックに使われています。
        </Gloss>
        <Gloss tag="ES" style={{ opacity: 0.35 }}>
          La mayor parte del tiempo se va en comprobar tipos de archivos sin cambios.
        </Gloss>
      </Terminal>
    </div>
  </Backdrop>
)
