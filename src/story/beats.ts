import {useTime, waitFor} from '@revideo/core';
import type {ThreadGenerator} from '@revideo/core';
import story from './shotlist.json';

export type BeatName = keyof typeof story.beats;

export const B = story.beats as Record<BeatName, number>;
export const SHOTS = story.shots;
export const DURATION = story.duration;

/** Waits until an absolute timeline time (seconds) so visuals stay locked to shotlist.json. */
export function* until(t: number | BeatName): ThreadGenerator {
  const target = typeof t === 'number' ? t : B[t];
  const now = useTime();
  if (target - now > 1e-4) {
    yield* waitFor(target - now);
  } else if (now - target > 1 / 24) {
    console.warn(`[timeline] running ${(now - target).toFixed(2)}s late for ${t}`);
  }
}

/** Seconds between two beats. */
export function span(from: BeatName, to: BeatName): number {
  return B[to] - B[from];
}
