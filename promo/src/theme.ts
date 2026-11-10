import React from 'react'
// Fonts are bundled from @fontsource, so a render needs no network.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/400-italic.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/noto-sans-sc/400.css'
import '@fontsource/noto-sans-sc/700.css'
import '@fontsource/noto-sans-tc/400.css'
import '@fontsource/noto-sans-tc/700.css'
import '@fontsource/noto-sans-jp/400.css'
import '@fontsource/noto-sans-jp/700.css'
import '@fontsource/noto-sans-kr/400.css'
import '@fontsource/noto-sans-kr/700.css'
import { continueRender, delayRender } from 'remotion'

const CJK = '"Noto Sans SC", "Noto Sans TC", "Noto Sans JP", "Noto Sans KR"'
export const MONO = `"JetBrains Mono", ${CJK}, monospace`
export const SANS = `"Inter", ${CJK}, sans-serif`

/** Holds a frame until every font it uses has loaded (the CJK fonts load by unicode range, on use). */
export function useFontsReady() {
  const [handle] = React.useState(() => delayRender('fonts'))
  React.useEffect(() => {
    // one frame for layout to ask for the faces, then wait for them
    requestAnimationFrame(() => void document.fonts.ready.then(() => continueRender(handle)))
  }, [handle])
}

/** Claude Code's dark theme, approximately; ACCENT is its `suggestion` colour, the one Lingo draws in. */
export const C = {
  bgTop: '#0b0e17',
  bgBottom: '#161b30',
  window: '#0f121b',
  bar: '#171b27',
  border: '#2a3045',
  text: '#e8e8ea',
  dim: '#8a8f9c',
  faint: '#5a6070',
  accent: '#b1b9f9',
  accentSoft: 'rgba(177, 185, 249, 0.14)',
  claude: '#d97757',
  userBg: '#1b2030',
}
