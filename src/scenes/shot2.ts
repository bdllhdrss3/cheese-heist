import {all, easeOutBack, spawn, waitFor} from '@revideo/core';
import type {ThreadGenerator} from '@revideo/core';
import {GAITS} from '../characters/Toon';
import {hearts} from '../fx/Fx';
import {SET} from '../props/Kitchen';
import {B, until} from '../story/beats';
import {FLOOR_Y} from '../theme/palette';
import type {Stage} from './stage';

/** 6-12s: Pip peeks out of his hole, sniffs, falls in love with the cheese, starts tiptoeing. */
export function* shot2(s: Stage): ThreadGenerator {
  const {cam, pip, pipPeek, fx} = s;

  yield* until('cutToHole');
  cam.cut(-700, 170, 1.9);

  yield* until('peek');
  yield* pipPeek.x(-6, 0.25, easeOutBack);
  yield* pipPeek.look(-0.9, 0, 0.1);
  yield* waitFor(0.15);
  yield* pipPeek.look(0.9, 0, 0.1);

  for (let i = 0; i < 3; i++) {
    yield* until(B.sniff + i * 0.3);
    yield* all(pipPeek.headDY(-5, 0.08), pipPeek.headTilt(-10, 0.08));
    yield* all(pipPeek.headDY(0, 0.12), pipPeek.headTilt(0, 0.12));
  }

  yield* until('seeCheese');
  yield* all(pipPeek.look(1, -0.7, 0.08), pipPeek.face('love', 0.1), pipPeek.stretchUp(0.1));
  spawn(hearts(fx, s.peekHead, 3));
  yield* pipPeek.squashPop(1.1, 0.9, 0.05, 0.3);
  yield* waitFor(0.5);
  yield* pipPeek.face('sneaky', 0.2);

  yield* until('stepOut');
  pip.position([SET.holeX + pipPeek.x(), FLOOR_Y]);
  pip.setFace('sneaky');
  pip.facing(1);
  pip.crouch(0.5);
  pip.opacity(1);
  pipPeek.opacity(0);
  spawn(pip.crouch(0, 0.3));
  spawn(cam.followTo(() => pip.x() + 60, () => 150, 1.4, 1.2));
  yield* pip.goTo(-735, 0.4, GAITS.tiptoe);

  yield* until('tiptoeStart');
  spawn(pip.goTo(-80, B.creak - B.tiptoeStart, GAITS.tiptoe));
}
