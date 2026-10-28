# Third-party notice: /brag (MIT)

The director engine in this folder is a port of the method of the open-source **/brag** skill
(https://github.com/latent-spaces/brag, commit 069432c), whose skills, references and prompts it adapts.

```
MIT License

Copyright (c) 2026 Shunit Haviv Hakimi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Bundled assets

- `assets/sfx/` — sound effects from /brag's library: Kenney (https://kenney.nl/) packs and the
  "Keyboard Soundpack #1" by unicae_games (opengameart.org), all **CC0** (public domain). `sfx-analysis.md`
  is /brag's analysis of them (MIT).
- /brag's bundled music ("Happy Beats / Business Moves" by ende.app) is **not** included: its licence is not
  cleared for commercial use. Director videos use Prand's own synthesized music
  (`lib/live-engine/worker/steps/music.ts`).
- Hyperframes (Apache-2.0) is not used: the composition is rendered by Prand's own Playwright + ffmpeg renderer.
