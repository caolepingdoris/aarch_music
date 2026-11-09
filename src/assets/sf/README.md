# Soundfont samples

One MP3 per sampled note, laid out as `<General MIDI instrument>/<Note><Octave>.mp3`
(flat note names, e.g. `Eb4.mp3`). Notes are sampled every minor third (C, Eb, Gb, A);
`Tone.Sampler` repitches the notes in between.

- **Soundfont:** FluidR3_GM by Frank Wen, MIT licence.
- **Rendering:** pre-rendered to MP3 by [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts).
- **Refresh / add instruments:** edit `INSTRUMENTS` in `scripts/fetch-soundfont.mjs`, then run
  `node scripts/fetch-soundfont.mjs`.

`src/services/SoundfontService.ts` discovers these files at build time with
`import.meta.glob`, so Vite bundles and fingerprints them. No runtime CDN is needed.
