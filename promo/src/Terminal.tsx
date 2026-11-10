import React from 'react'
import { C, MONO } from './theme'

/** A terminal window: title bar with three dots and a title, then a padded monospace body. */
export const Terminal: React.FC<{ title?: string; width: number; children: React.ReactNode; fontSize?: number; style?: React.CSSProperties }> = ({
  title = 'claude',
  width,
  children,
  fontSize = 19,
  style,
}) => (
  <div
    style={{
      width,
      background: C.window,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02)',
      overflow: 'hidden',
      ...style,
    }}
  >
    <div style={{ height: 38, background: C.bar, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: `1px solid ${C.border}` }}>
      {['#ff5f57', '#febc2e', '#28c840'].map(c => (
        <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c, opacity: 0.85 }} />
      ))}
      <div style={{ flex: 1, textAlign: 'center', color: C.dim, fontFamily: MONO, fontSize: 14, marginRight: 52 }}>{title}</div>
    </div>
    <div style={{ padding: '22px 26px', fontFamily: MONO, fontSize, lineHeight: 1.55, color: C.text }}>{children}</div>
  </div>
)

/** The person's message: `❯ text` on a faint band. */
export const UserLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 12, background: C.userBg, borderRadius: 6, padding: '4px 10px', margin: '0 -10px' }}>
    <span style={{ color: C.dim }}>❯</span>
    <span>{children}</span>
  </div>
)

/** Claude's text: `● text`. */
export const ClaudeLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 12 }}>
    <span style={{ width: 14, flexShrink: 0, display: 'flex', alignItems: 'center', height: '1.55em' }}>
      <span style={{ width: 9, height: 9, borderRadius: 5, background: C.text }} />
    </span>
    <span>{children}</span>
  </div>
)

/** Lingo's gloss: bold accent tag, italic accent text, indented under the message text. */
export const Gloss: React.FC<{ tag: string; children: React.ReactNode; style?: React.CSSProperties; tagStyle?: React.CSSProperties }> = ({
  tag,
  children,
  style,
  tagStyle,
}) => (
  <div style={{ display: 'flex', gap: 12, paddingLeft: 26, marginTop: 12, color: C.accent, ...style }}>
    <span style={{ fontWeight: 700, fontStyle: 'normal', flexShrink: 0, ...tagStyle }}>{tag}</span>
    <span style={{ fontStyle: 'italic' }}>{children}</span>
  </div>
)

/** The prompt box: rules above and below, `❯` and the draft. */
export const PromptBox: React.FC<{ children?: React.ReactNode; caret?: boolean }> = ({ children, caret = true }) => (
  <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px 0', margin: '0 -26px -22px', paddingLeft: 26, paddingRight: 26, borderBottom: 'none' }}>
    <span style={{ color: C.dim, marginRight: 12 }}>❯</span>
    <span>{children}</span>
    {caret && <span style={{ display: 'inline-block', width: 10, height: '1.1em', background: C.text, verticalAlign: 'text-bottom', marginLeft: 2, opacity: 0.8 }} />}
  </div>
)

export const Dim: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ color: C.dim, ...style }}>{children}</div>
)
