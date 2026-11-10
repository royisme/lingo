// Renders every image and the README animation into ../docs/images (needs ffmpeg for the GIF).
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const browser = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'
const out = '../docs/images'
mkdirSync(out, { recursive: true })
mkdirSync('out', { recursive: true })
const remotion = (...args) => execFileSync('npx', ['remotion', ...args, `--browser-executable=${browser}`], { stdio: 'inherit' })

for (const id of process.argv.slice(2).length ? process.argv.slice(2) : ['Social', 'Read', 'Write', 'Remember', 'Hero']) {
  if (id === 'Hero') {
    remotion('render', 'src/index.ts', 'Hero', 'out/hero.mp4', '--crf=18')
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'out/hero.mp4', '-vf',
      'fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
      `${out}/hero.gif`], { stdio: 'inherit' })
  } else {
    remotion('still', 'src/index.ts', id, `${out}/${id.toLowerCase()}.png`, '--scale=1.5')
  }
}
