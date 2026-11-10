import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { ClaudeLine, Gloss, PromptBox, Terminal, UserLine } from './Terminal'
import { HERO, LANGS, PROMPT, REPLY } from './langs'
import { C, MONO, SANS, useFontsReady } from './theme'

export const SLOT = 45 // frames each language stays
const FADE = 10

/** The background every image shares: dark gradient with a soft accent glow. */
export const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useFontsReady()
  return <AbsoluteFill
    style={{
      background: `radial-gradient(1000px 500px at 50% 0%, rgba(177,185,249,0.16), transparent 70%), linear-gradient(180deg, ${C.bgTop}, ${C.bgBottom})`,
      fontFamily: SANS,
      color: C.text,
    }}
  >
    {children}
  </AbsoluteFill>
}

/** The 11 languages as chips; `active` (a tag) is lit. */
export const LangStrip: React.FC<{ active?: string; size?: number; glow?: number; align?: 'center' | 'flex-start' }> = ({ active, size = 19, glow = 1, align = 'center' }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: align, gap: Math.round(size * 0.5) }}>
    {LANGS.map(l => {
      const on = l.tag === active
      return (
        <div
          key={l.tag}
          style={{
            fontSize: size,
            padding: `${Math.round(size * 0.35)}px ${Math.round(size * 0.75)}px`,
            borderRadius: 999,
            border: `1px solid ${on ? C.accent : C.border}`,
            background: on ? `rgba(177,185,249,${0.18 * glow})` : 'rgba(255,255,255,0.02)',
            color: on ? C.accent : C.dim,
            fontWeight: on ? 700 : 500,
          }}
        >
          {l.name}
        </div>
      )
    })}
  </div>
)

/** Stacks layers in one grid cell: the cell is as tall as the tallest, so a cross-fade never moves the rows below. */
const Stack: React.FC<{ children: React.ReactNode; minHeight?: number }> = ({ children, minHeight }) => (
  <div style={{ display: 'grid', minHeight }}>{children}</div>
)

/** One conversation; its translation cycles through nine languages, then loops. The English stays put; only the glosses fade. */
export const Hero: React.FC = () => {
  const f = useCurrentFrame()
  const i = Math.floor(f / SLOT) % HERO.length
  const t = f % SLOT
  const next = (i + 1) % HERO.length
  // the last FADE frames of a slot cross-fade into the next language
  const k = interpolate(t, [SLOT - FADE, SLOT], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const shown = k < 0.5 ? HERO[i] : HERO[next]
  const gloss = (pick: (h: (typeof HERO)[number]) => string) => (
    <>
      {[i, next].map(n =>
        n === i || k > 0 ? (
          <div key={n} style={{ gridArea: '1 / 1', opacity: n === i ? Math.max(0, 1 - 2 * k) : Math.max(0, 2 * k - 1), transform: `translateY(${n === i ? -4 * k : 4 * (1 - k)}px)` }}>
            <Gloss tag={HERO[n].tag} style={{ marginTop: 10 }}>
              {pick(HERO[n])}
            </Gloss>
          </div>
        ) : null,
      )}
    </>
  )
  return (
    <Backdrop>
      <div style={{ position: 'absolute', top: 40, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 50, fontWeight: 800, letterSpacing: -1 }}>
          Learn a language <span style={{ color: C.accent }}>while you code</span>
        </div>
        <div style={{ fontSize: 22, color: C.dim, marginTop: 10 }}>Lingo for Claude Code · every prompt and reply, in the language you're learning</div>
      </div>
      <div style={{ position: 'absolute', top: 168, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Terminal width={1100} fontSize={20}>
          <UserLine>{PROMPT}</UserLine>
          <Stack>{gloss(h => h.prompt)}</Stack>
          <div style={{ height: 20 }} />
          <ClaudeLine>{REPLY}</ClaudeLine>
          <Stack minHeight={108}>{gloss(h => h.reply)}</Stack>
          <div style={{ height: 14 }} />
          <PromptBox caret={Math.floor(f / 15) % 2 === 0}>
            <span style={{ color: C.faint }}>/lingo {shown.tag.toLowerCase()}</span>
          </PromptBox>
        </Terminal>
      </div>
      <div style={{ position: 'absolute', bottom: 44, left: 40, right: 40, fontFamily: MONO }}>
        <LangStrip active={shown.tag} size={15} />
      </div>
    </Backdrop>
  )
}
