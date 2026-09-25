import {all, spawn, waitFor} from '@revideo/core';
import type {ThreadGenerator} from '@revideo/core';
import {GAITS} from '../characters/Toon';
import {popText, sweat} from '../fx/Fx';
import {B, until} from '../story/beats';
import type {Stage} from './stage';

/** 12-20s: Pip tiptoes past sleeping Whiskers, a floorboard creaks, close call, then scurries to the table. */
export function* shot3(s: Stage): ThreadGenerator {
  const {cam, cat, pip, fx, zzz} = s;

  yield* until('wideRoom');
  yield* cam.followTo(() => pip.x() + 100, () => 0, 1.0, 0.8);

  yield* until('creak');
  pip.setFace('scared');
  spawn(pip.stretchUp(0.08));
  spawn(popText(fx, '!', s.head(pip), 0.8, 90));
  spawn(cam.followTo(() => -110, () => 150, 1.6, 0.25));

  yield* until('earTwitch');
  zzz.on(0);
  spawn(cat.twitchEar());
  yield* all(cat.face('drowsy', 0.15), cat.look(0.9, 0.5, 0.15));
  spawn(sweat(fx, s.head(pip), -1));
  yield* waitFor(0.7);
  yield* cat.face('asleep', 0.3);

  yield* until('catSettles');
  zzz.on(1);

  yield* until('relief');
  pip.sqY(1);
  pip.sqX(1);
  yield* all(pip.face('relieved', 0.12), pip.armRot[0](-150, 0.12));
  yield* pip.armRot[0](-80, 0.15).to(15, 0.1);

  yield* until('tiptoeResume');
  pip.setFace('sneaky');
  spawn(cam.followTo(() => pip.x() + 60, () => 0, 1.0, 0.5));
  yield* pip.goTo(400, B.reachTable - B.tiptoeResume, GAITS.tiptoeFast);

  yield* until('reachTable');
  yield* all(pip.face('happy', 0.1), pip.look(0.4, -1, 0.1));
}
