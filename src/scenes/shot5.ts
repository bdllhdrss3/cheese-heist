import {all, easeInCubic, easeOutBack, spawn, waitFor} from '@revideo/core';
import type {ThreadGenerator} from '@revideo/core';
import {GAITS} from '../characters/Toon';
import {dust, impact, lightbulb} from '../fx/Fx';
import {attachTo} from '../lib/attach';
import {SET} from '../props/Kitchen';
import {B, until} from '../story/beats';
import {FLOOR_Y} from '../theme/palette';
import type {Stage} from './stage';

/** 28-40s: the chase. Pounce miss, cheese-stuck-in-hole, and a face-first BONK into the cupboard. */
export function* shot5(s: Stage): ThreadGenerator {
  const {cam, cat, pip, cheese, fx, kitchen, dizzy, pipSpeed, catSpeed} = s;

  yield* until('pipLeap');
  pip.facing(-1);
  spawn(cam.followTo(() => pip.x() - 100, () => 0, 1.0, 0.4));
  spawn(pip.stretchUp(0.1));
  yield* pip.hop(380, FLOOR_Y, B.pipLand - B.pipLeap, 90);

  yield* until('pipLand');
  spawn(pip.squashPop(1.3, 0.7, 0.03, 0.2));
  spawn(dust(fx, [380, FLOOR_Y], 4, 40));
  pipSpeed.on(1);
  pip.setFace('scared');
  spawn(pip.goTo(-700, B.cheeseStuck - B.pipLand, GAITS.carryRun));

  yield* until(B.catPounce - 0.2);
  yield* all(cat.crouch(0.6, 0.18), cat.armRot[0](-90, 0.18), cat.armRot[1](-100, 0.18));

  yield* until('catPounce');
  cat.crouch(0);
  yield* all(cat.hop(150, FLOOR_Y, B.catFlop - B.catPounce, 170), cat.rotation(22, B.catFlop - B.catPounce));

  yield* until('catFlop');
  cat.rotation(0);
  cat.setFace('wince');
  spawn(cam.shake(12, 0.25));
  spawn(dust(fx, [150, FLOOR_Y], 6, 70));
  yield* cat.squashPop(1.45, 0.45, 0.3, 0.2);

  yield* until('catUp');
  cat.facing(-1);
  yield* all(cat.face('angry', 0.1), cat.armRot[0](-40, 0.1), cat.armRot[1](-60, 0.1), cat.squashPop(0.85, 1.15, 0.05, 0.15));

  yield* until('catZip');
  catSpeed.on(1);
  cam.release();
  spawn(cam.followTo(() => cat.x() - 150, () => 0, 1.0, 0.3));
  spawn(cat.goTo(-760, B.catBonk - B.catZip, GAITS.run));

  yield* until('cheeseStuck');
  pipSpeed.on(0);
  pip.setFace('shocked');
  yield* all(pip.x(-735, 0.08), cheese.rotation(-25, 0.08));
  spawn(pip.squashPop(1.25, 0.8, 0.05, 0.2));
  yield* cheese.rotation(0, 0.25, easeOutBack);
  yield* all(
    attachTo(cheese, () => pip.position().add([pip.facing() * 38, -40]), 0.2),
    pip.armRot[0](-80, 0.2),
    pip.armRot[1](-80, 0.2),
    pip.face('scared', 0.1),
  );

  yield* until('pipDive');
  spawn(dust(fx, [SET.holeX + 40, FLOOR_Y], 5, 50));
  yield* all(
    pip.x(SET.holeX - 10, 0.18),
    pip.scale(0.7, 0.18),
    pip.opacity(0, 0.18),
    cheese.opacity(0, 0.18),
    cheese.scale(0.6, 0.18),
  );
  yield* waitFor(0.1);
  kitchen.holeEyesLook(1);
  spawn(kitchen.holeEyes(1, 0.1));

  yield* until('catBonk');
  catSpeed.on(0);
  cat.x(SET.cupboardX + 38);
  cat.sqX(0.35);
  cat.sqY(1.12);
  cat.setFace('shocked');
  cam.release();
  spawn(cam.shake(26, 0.5));
  spawn(impact(fx, [SET.cupboardX + 60, 40], 1.1, 'BONK!'));
  spawn(cam.to(-640, 60, 1.4, 0.25));

  yield* until('ouch');
  yield* cat.face('wince', 0.1);

  yield* until('catFall');
  yield* all(cat.sqX(1, 0.15), cat.x(-760, 0.15));
  yield* all(cat.rotation(90, B.catFloor - B.catFall - 0.15, easeInCubic), cat.y(FLOOR_Y - 85, B.catFloor - B.catFall - 0.15, easeInCubic));

  yield* until('catFloor');
  spawn(cam.shake(10, 0.2));
  spawn(dust(fx, [-560, FLOOR_Y], 6, 70));
  spawn(cat.squashPop(1.08, 0.85, 0.04, 0.25));

  yield* until('dizzyStart');
  cat.setFace('dizzy');
  spawn(dizzy.on(1, 0.2));
  spawn(cam.to(-560, 140, 1.5, 0.8));

  yield* until('catShake');
  spawn(dizzy.on(0, 0.2));
  spawn(cam.to(-600, 120, 1.4, 0.5));
  yield* all(cat.rotation(0, 0.4, easeOutBack), cat.y(FLOOR_Y, 0.4), cat.x(-660, 0.4), cat.crouch(0.6, 0.4), cat.face('neutral', 0.2));
  for (let i = 0; i < 6; i++) yield* cat.headTilt(i % 2 === 0 ? 16 : -16, 0.05);
  yield* cat.headTilt(0, 0.05);

  yield* until('catAngry');
  cat.tremble(0.6);
  yield* all(cat.face('angry', 0.1), cat.armRot[0](-150, 0.15));
  yield* waitFor(0.6);
  cat.tremble(0);

  yield* until('idea');
  spawn(lightbulb(fx, s.head(cat), 0.6));
  yield* all(cat.face('happy', 0.1), cat.armRot[0](-20, 0.15), cat.stretchUp(0.1));
  yield* all(cat.sqX(1, 0.15), cat.sqY(1, 0.15));

  yield* until('sneakyGrin');
  yield* cat.face('evilGrin', 0.12);
  for (let i = 0; i < 3; i++) {
    yield* all(cat.armRot[0](-70, 0.1), cat.armRot[1](-50, 0.1));
    yield* all(cat.armRot[0](-50, 0.1), cat.armRot[1](-70, 0.1));
  }
}
