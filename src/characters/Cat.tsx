import {C} from '../theme/palette';
import {Toon} from './Toon';
import type {ToonProps, ToonSpec} from './Toon';

export const CAT_SPEC: ToonSpec = {
  scale: 1,
  fur: C.catFur,
  belly: C.catBelly,
  inner: C.catInner,
  gaitScale: 1,
  body: {x: 0, y: -150, w: 170, h: 200},
  bellyPatch: {x: 14, y: -140, w: 105, h: 140},
  head: {x: 10, y: -300, w: 200, h: 172},
  muzzle: {x: 22, y: 36, w: 118, h: 66},
  eyes: {y: -8, xs: [-34, 44], w: 54, h: 68, pupil: 12},
  brow: {len: 40, width: 7, gap: 14},
  nose: {x: 24, y: 14, w: 24, h: 16},
  mouth: {x: 24, y: 42, w: 14},
  ears: 'cat',
  arm: {len: 100, width: 24, shoulders: [[40, -210], [-34, -205]], paw: 32},
  leg: {hips: [[-32, -80], [34, -80]], width: 26, foot: {w: 70, h: 28}},
  tail: {base: [-70, -100], width: 22, color: C.catFur, up: [[-150, -150], [-178, -240], [-128, -300]], floorLen: 180, wag: 18},
  whiskers: {at: [24, 30], len: 70},
  outline: 6,
};

/** Whiskers the cat. */
export class Cat extends Toon {
  public constructor(props: ToonProps) {
    super(CAT_SPEC, props);
  }
}
