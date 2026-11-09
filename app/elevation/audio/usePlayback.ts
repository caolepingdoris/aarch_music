import { useCallback, useEffect, useRef, useState } from "react";
import type * as ToneNS from "tone";
import type { Music, NoteEvent } from "../types";
import type { Rack } from "./instruments";

type ToneModule = typeof ToneNS;

type ScheduledItem =
  | { time: number; kind: "lead"; event: NoteEvent }
  | { time: number; kind: "pad"; names: string[]; dur: number }
  | { time: number; kind: "perc"; accent: boolean };

/**
 * Owns the Tone.js transport, the scheduled score and the instrument rack.
 * Tone, the soundfont samples and the mix bus are loaded lazily on first play
 * so nothing touches the Web Audio API during server rendering.
 */
export function usePlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  /** Index of the melody note currently sounding, or -1. */
  const [currentEvent, setCurrentEvent] = useState(-1);

  const toneRef = useRef<ToneModule | null>(null);
  const partRef = useRef<ToneNS.Part<ScheduledItem> | null>(null);
  const rackRef = useRef<Rack | null>(null);
  const disposeRef = useRef<((rack: Rack) => void) | null>(null);
  // Bumped on every play/stop so a slow sample decode can't start a stale score.
  const runRef = useRef(0);

  const stop = useCallback(() => {
    runRef.current++;
    const Tone = toneRef.current;
    if (partRef.current) {
      partRef.current.stop();
      partRef.current.dispose();
      partRef.current = null;
    }
    if (Tone) {
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();
    }
    if (rackRef.current && disposeRef.current) disposeRef.current(rackRef.current);
    rackRef.current = null;
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentEvent(-1);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(
    async (music: Music) => {
      stop();
      const run = runRef.current;
      setIsLoading(true);

      try {
        // Resume the AudioContext as early as possible, while still inside the click.
        const Tone = await import("tone");
        toneRef.current = Tone;
        await Tone.start();

        const { buildInstruments, disposeRack } = await import("./instruments");
        disposeRef.current = disposeRack;
        const rack = await buildInstruments(music);
        if (run !== runRef.current) {
          disposeRack(rack); // stopped or restarted while loading
          return;
        }
        rackRef.current = rack;

        const transport = Tone.getTransport();
        transport.bpm.value = music.palette.tempo;
        const sixteenth = Tone.Time("16n").toSeconds();

        const items: ScheduledItem[] = [
          ...music.events.map((event) => ({ time: event.start * sixteenth, kind: "lead" as const, event })),
          ...music.padHits.map((p) => ({ time: p.start * sixteenth, kind: "pad" as const, names: p.names, dur: p.dur * sixteenth })),
          ...music.percHits.map((p) => ({ time: p.start * sixteenth, kind: "perc" as const, accent: p.accent })),
        ];

        const part = new Tone.Part<ScheduledItem>((time, item) => {
          if (item.kind === "pad") {
            rack.pad.triggerAttackRelease(item.names, item.dur, time, 0.8);
          } else if (item.kind === "perc") {
            rack.perc.triggerAttackRelease(rack.percNote, "16n", time, item.accent ? 1 : 0.55);
          } else {
            const { event } = item;
            const downbeat = event.start % music.meter.barLength === 0;
            let at = time;
            let length = event.dur * sixteenth;
            if (event.grace) {
              // Appoggiatura: on the beat, leaning into the main note, which is delayed by its length.
              const graceLength = event.grace.dur * sixteenth;
              rack.lead.triggerAttackRelease(event.grace.name, graceLength * 0.95, time, 0.9);
              at = time + graceLength;
              length -= graceLength;
            }
            rack.lead.triggerAttackRelease(event.name, length * 0.92, at, downbeat ? 0.9 : 0.72);
            Tone.getDraw().schedule(() => setCurrentEvent(event.index), time);
          }
        }, items);
        part.loop = true;
        part.loopEnd = music.totalLength * sixteenth;
        part.start(0);

        partRef.current = part;
        transport.start();
        setIsPlaying(true);
      } catch (err) {
        if (run === runRef.current) stop();
        throw err;
      } finally {
        if (run === runRef.current) setIsLoading(false);
      }
    },
    [stop]
  );

  return { isPlaying, isLoading, currentEvent, play, stop };
}
