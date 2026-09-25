import {all, chain, easeInOutCubic, spawn, waitFor} from '@revideo/core';
import type {ThreadGenerator} from '@revideo/core';
import {SET} from '../props/Kitchen';
import {B, DURATION, until} from '../story/beats';
import {FLOOR_Y} from '../theme/palette';
import type {Stage} from './stage';

/** 50-60s: Pip munches the cheese in his doorway, waves, draws the curtain. Iris out. */
export function* shot7(s: Stage): ThreadGenerator {
  const {cam, pip, cheese, curtain, kitchen, hud} = s;

  yield* until('cutToEnding');
  cam.cut(-700, 200, 2.0);
  kitchen.holeEyes(0);
  pip.opacity(1);
  pip.scale(1);
  pip.position([SET.holeX + 22, FLOOR_Y]);
  pip.facing(1);
  pip.crouch(0.6);
  pip.setFace('happy');
  pip.armRot[0](-80);
  pip.armRot[1](-70);
  cheese.opacity(1);
  cheese.rotation(0);
  cheese.scale(0.75);
  cheese.position(() => pip.position().add([pip.facing() * 40, -30]));
  curtain.opacity(1);

  const bites = Math.round((B.munchEnd - B.munchStart) / 0.3) + 1;
  for (let i = 0; i < bites; i++) {
    yield* until(B.munchStart + i * 0.3);
    spawn(chain(pip.chew(0.9, 0.08), pip.chew(0, 0.12)));
    spawn(cheese.scale(Math.max(0.05, 0.75 - (i + 1) * (0.7 / bites)), 0.1));
  }
  yield* waitFor(0.1);
  yield* cheese.opacity(0, 0.1);

  yield* until('yum');
  yield* all(pip.face('happy', 0.1), pip.sqX(1.12, 0.2), pip.armRot[0](-20, 0.15), pip.armRot[1](-10, 0.15));
  for (let i = 0; i < 2; i++) yield* pip.armRot[0](-40, 0.1).to(-20, 0.1);

  yield* until('wave');
  yield* all(pip.look(0, 0.1, 0.1), pip.armRot[0](-160, 0.15));
  spawn(pip.blinkOnce());
  for (let i = 0; i < 3; i++) yield* pip.armRot[0](-120, 0.14).to(-160, 0.14);

  yield* until('curtain');
  yield* all(pip.crouch(0, 0.2), pip.sqX(1, 0.2), pip.armRot[0](-150, 0.2));
  yield* curtain.closed(1, 0.6, easeInOutCubic);

  yield* until('irisStart');
  yield* hud.irisTo(cam.toScreen([SET.holeX, FLOOR_Y - SET.holeH / 2]), B.theEnd - B.irisStart - 0.05);

  yield* until('theEnd');
  yield* hud.showEnd();
  yield* until(DURATION);
}
