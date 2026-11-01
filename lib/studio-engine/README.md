# Studio engine (`VIDEO_ENGINE=studio`) — sandbox

A video made the way the MotionGX launch ads were made (`../MotionGX-ads`), for the client's brand, plus the
screenshot-to-code method for the client's screens. Opt-in; the director and live engines are untouched.

Flow (`worker/run.ts`): script (one voiceover line + one title per scene, `worker/script.ts`) → each screen a scene
shows rebuilt as an HTML component from its screenshot + captured text, rendered, compared and fixed once
(`worker/screens.ts`) → one ElevenLabs take cut per line (`worker/voice.ts`, the ads' `vo.mjs`) → scene timing from
the voice, the director's beat-synced music, the ads' scene library on one GSAP timeline, stills at every scene end,
30fps render, voice + ducked music + SFX mix (the ads' `build.mjs`, ported).

`assets/` holds the ads' `stage.css`, `scenes.js` and `gsap.min.js`, copied. `scenes.js` changes only where the
client's brand replaces MotionGX (logo, reveal, price, CTA, watermark) and adds the `screen` scene.

Settings: `VIDEO_ENGINE=studio`, `STUDIO_MODEL` (default `claude-opus-5-5`), `STUDIO_VOICE` (`masry`, or any ElevenLabs voice id;
default: Fathy for Egypt, Ayman for the Gulf, George for English), `DIRECTOR_MAX_USD` (cost cap), `ELEVENLABS_API_KEY`.
Local runner only. Launch config: `dev-studio`.

To remove: delete `lib/studio-engine`, the `studio` lines in `lib/live-engine/{config,protocol}.ts`,
`server/jobs.ts`, `worker/pipeline.ts`, and the `lib/studio-engine/assets/**` line in `eslint.config.mjs`.
