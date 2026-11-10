# Lingo promo images

The README animation and images, made with [Remotion](https://www.remotion.dev). Not part of the plugin.

| Composition | Output | What it shows |
| --- | --- | --- |
| `Hero` | `docs/images/hero.gif` (and `out/hero.mp4`) | One conversation, its translation cycling through nine languages |
| `Read` | `docs/images/read.png` | The paragraph view (an English speaker learning Japanese) |
| `Write` | `docs/images/write.png` | The preview and polish bands (a Chinese speaker learning English) |
| `Remember` | `docs/images/remember.png` | The `/lingo review` pane |
| `Social` | `docs/images/social.png` | The repository's social preview (1280×640) |

```sh
npm install
npm run studio          # edit with a live preview
npm run render          # all of them
npm run render -- Read  # one
```

Fonts come from `@fontsource`, so a render needs no network. `render.mjs` uses the Chromium at `REMOTION_BROWSER` (default: the Playwright headless shell in `/opt/pw-browsers`) and `ffmpeg` for the GIF. The copy and the translations shown live in `src/langs.ts` and `src/Stills.tsx`; keep them in line with what Lingo really draws (`docs/DESIGN.md`).
