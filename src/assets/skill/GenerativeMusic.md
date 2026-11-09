---
name: generative-music
description: Compose a short, looping, ornamented melody (as MIDI note events) that translates a building's architectural reading (era, region, materials, structural rhythm and silhouette) into music for The Resonant Frame. Use whenever a score must be generated or regenerated from an architectural analysis.
---

# Generative Music: architecture → MIDI

The Resonant Frame turns a structure into a short generative piece. This skill is the
composition brief. The app sends it verbatim to the model as its system instruction,
together with a **composition plan** (JSON) that the app has already derived from the
architectural reading. Follow this brief and the plan exactly, and return only the JSON
described under **Output**.

## What the app decides vs. what you compose

The app has already fixed these from the reading. Treat them as givens and never change them:

| Given (in the plan) | Derived from |
|---|---|
| `era`, `meter`, `barLength`, `tempo`, instruments | Era of the structure (start year) |
| `tonic`, `scale`, `allowedPitches` | Region: a broad musical tradition, an interpretive palette |
| `bars` (4–16) | Repetition count of the dominant structural element: **one bar per bay** |
| `arch[]`: per-bar silhouette value (0–1) and `anchorMidi` | The structure's rise and fall across its façade |
| `density[]`: per-bar suggestion (`sparse` / `medium` / `dense`) | Position on the arch |
| Room / reverb, pad and percussion parts | Building type, materials, era (handled by the app) |

**You compose the lead melody (the riff)**: every note's pitch, duration and ornament.

## Core requirements

1. **Intricate riffs, not plodding lines.** Build each bar from a short rhythmic cell and a
   melodic figure. Never write a phrase of equal note values. Successive bays should vary,
   like related but not identical architectural modules.
2. **Rhythmic vocabulary.** Use only these durations (in sixteenth notes):

   | `dur` | Value |
   |---|---|
   | 1 | 16th |
   | 2 | 8th |
   | 3 | dotted 8th |
   | 4 | quarter |
   | 6 | dotted quarter |

   Use a real mix of them across the piece: dotted figures (3 + 1, 6 + 2), runs of 16ths,
   and longer anchoring values.
3. **Appoggiaturas.** Ornament with appoggiaturas: a grace note that leans into a main note
   and resolves onto it. Only notes with `dur` ≥ 3 can carry one. Always place one on the
   crown (the bar with the highest `arch`) and on the final note. Elsewhere, follow the
   era's ornament rate. Default lean: the scale step above. Art Deco leans from a semitone below.
4. **Silhouette → contour.** Each bar's figure is built around that bar's `anchorMidi`, so
   the melody traces the building's rise and fall. Peak at the crown, lowest at the edges.
5. **Arch → density.** Respect `density[]`. `sparse` uses mostly dotted quarters, quarters and
   dotted-8th/16th pairs. `medium` mixes 8ths and dotted figures. `dense` uses running 16ths
   and broken figures. The first and last bars are sparse.
6. **Bars must add up.** The durations in every bar must sum **exactly** to `barLength`.
   Notes never cross a barline. Return exactly `bars` bars.
7. **Pitch.** Use `allowedPitches` (the scale across the playable range) for main notes.
   Chromatic notes are allowed only as appoggiaturas. Stay within MIDI 55–88.
8. **Cadence.** The last bar ends on a long note on the tonic (any octave in range), with an
   appoggiatura leaning into it.
9. **Loopable.** The piece loops. The final tonic should lead naturally back into bar 1.
10. **Fresh takes.** Each request carries a `variation` id. Treat each request as a new take:
    different cells, figures and ornament placement, still within the rules.

## Era styles

The plan's `era` selects the style. Meter and bar length are already in the plan.

| Era | Meter | Rhythmic character | Melodic figure | Ornament rate |
|---|---|---|---|---|
| `medieval`: Romanesque / early medieval | 6/8 (12) | Notre-Dame rhythmic modes: long–short trochees (4+2), dotted quarters | Stepwise neumes circling the anchor (0, +1, 0, −1, −2, −1) | Low (~15%) |
| `renaissance`: Gothic / Renaissance | 3/4 (12) | Flowing, vocal; dotted-8th pickups into quarters | Imitative line stepping down into each bay | Moderate (~30%) |
| `baroque`: Baroque / Neoclassical | 2/4 (8) | Motoric 16th runs, dotted figures | Broken chords and turns (0, +2, +4, +2, 0, −1) | High (~45%) |
| `industrial`: Industrial / Victorian | 2/4 (8) | Dotted march rhythms (3+1), mechanical repetition | Repeated "piston" notes with leaps of a 4th/5th | Low (~10%) |
| `artdeco`: Early Modern / Art Deco | 2/4 (8) | Syncopation, tresillo 3+3+2, jazz-age push | Ziggurat setbacks stepping upward | Moderate (~35%), chromatic from below |
| `midcentury`: Mid-century / Brutalist | 2/4 (8) | Minimal: one modular cell repeated with small changes | A three-note module, transposed with the anchor | Very low (~5%) |
| `postmodern`: Postmodern / High-tech | 7/8 (14), grouped 2+2+3 | Asymmetric, collage-like | Wide leaps, quotation fragments | Moderate (~25%) |
| `contemporary`: Contemporary / Parametric | 5/8 (10), grouped 3+2 | Asymmetric, fluid | Parametric: intervals widen as the arch rises | Low–moderate (~20%) |

Group notes so they respect the meter's beats: dotted-quarter beats in 6/8, 2+2+3 in 7/8,
3+2 in 5/8.

## Output

Respond with **only** this JSON object. No markdown, no commentary:

```json
{
  "figure": "one line naming the riff idea, e.g. 'tresillo setbacks climbing to a sunburst crown'",
  "bars": [
    { "notes": [ { "midi": 67, "dur": 3, "grace": null }, { "midi": 69, "dur": 1, "grace": null }, { "midi": 71, "dur": 4, "grace": 72 } ] }
  ]
}
```

- `bars.length` equals the plan's `bars`. Each bar's `dur` values sum to `barLength`.
- `midi` is an integer MIDI note number (60 = middle C). `grace` is the appoggiatura's
  MIDI number, or `null`.
- `figure` is shown to the listener. Keep it evocative and under 90 characters.

## How the app uses the result

The app validates every bar. It clamps pitches into range, snaps illegal durations, and
pads or trims a bar that doesn't add up. If a bar is missing or unusable, it substitutes the
local rule-based generator for that bar. It then adds the pad (open fifth on the tonic,
re-voiced about every whole note), percussion on each beat (accent on the downbeat) and the
per-building reverb. It plays the result with soundfont instruments and engraves it with
LilyPond (one bar per bay, appoggiaturas as grace notes). Notes that need no repair
reach the listener exactly as you wrote them.
