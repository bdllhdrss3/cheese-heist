import type {Node} from '@revideo/2d';
import {createSignal, easeInOutCubic, Vector2} from '@revideo/core';
import type {ThreadGenerator, TimingFunction} from '@revideo/core';

/** Smoothly hands a node's position over to a computed target (e.g. "above Pip's head"). */
export function* attachTo(
  node: Node,
  target: () => Vector2,
  dur: number,
  ease: TimingFunction = easeInOutCubic,
): ThreadGenerator {
  const from = node.position();
  const b = createSignal(0);
  node.position(() => Vector2.lerp(from, target(), b()));
  yield* b(1, dur, ease);
  node.position(target);
}
