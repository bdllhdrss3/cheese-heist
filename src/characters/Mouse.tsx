import {C} from '../theme/palette';
import {Toon} from './Toon';
import type {ToonProps, ToonSpec} from './Toon';

export const MOUSE_SPEC: ToonSpec = {
  scale: 0.95,
  fur: C.mouseFur,
  belly: C.mouseBelly,
  inner: C.mouseInner,
  gaitScale: 0.38,
  body: {x: 0, y: -48, w: 66, h: 74},
  bellyPatch: {x: 6, y: -44, w: 40, h: 50},
  head: {x: 6, y: -112, w: 90, h: 80},
  muzzle: {x: 26, y: 12, w: 46, h: 30},
  eyes: {y: -8, xs: [-12, 20], w: 22, h: 28, pupil: 6},
  brow: {len: 14, width: 3.5, gap: 6},
  nose: {x: 48, y: 8, w: 13, h: 11},
  mouth: {x: 28, y: 22, w: 6},
  ears: 'mouse',
  arm: {len: 34, width: 9, shoulders: [[16, -72], [-12, -70]], paw: 13},
  leg: {hips: [[-12, -24], [14, -24]], width: 9, foot: {w: 28, h: 11}},
  tail: {base: [-28, -30], width: 6, color: C.mouseTail, up: [[-70, -18], [-110, -50], [-140, -34]], floorLen: 120, wag: 10},
  whiskers: {at: [44, 12], len: 28},
  outline: 3.5,
};

/** Pip the mouse. */
export class Mouse extends Toon {
  public constructor(props: ToonProps) {
    super(MOUSE_SPEC, props);
  }
}
