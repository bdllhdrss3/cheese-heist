import {all, chain, easeInCubic, easeOutBack, easeOutCubic, spawn, Vector2, waitFor} from '@revideo/core';
import type {ThreadGenerator} from '@revideo/core';
import {GAITS} from '../characters/Toon';
import {impact, twinkle} from '../fx/Fx';
import {attachTo} from '../lib/attach';
import {SET} from '../props/Kitchen';
import {B, until} from '../story/beats';
import {FLOOR_Y} from '../theme/palette';
import type {Stage} from './stage';

/** 40-50s: Whiskers sets a trap and lurks with a frying pan. Pip moves the trap under his tail. SNAP! */
export function* shot6(s: Stage): ThreadGenerator {
  const {cam, cat, pip, pipPeek, trap, bait, pan, fx, kitchen, pipSpeed} = s;
  const trapX = -680;
  const lurkX = -460;

  yield* until(40.0);
  trap.arm(1);
  spawn(cam.to(-600, 120, 1.3, 0.6));
  cat.crouch(0);
  yield* cat.goTo(-560, 0.5, GAITS.sneak);
  cat.facing(-1);
  spawn(cat.squashPop(1.1, 0.9, 0.03, 0.15));
  yield* all(cat.crouch(0.8, 0.2), cat.lean(25, 0.2), cat.armRot[0](-50, 0.2));

  yield* until('trapOut');
  trap.position([trapX, FLOOR_Y]);
  yield* trap.scale(1, 0.18, easeOutBack);

  yield* until('trapSet');
  yield* trap.arm(0, 0.12);

  yield* until('baitPlaced');
  bait.scale(0);
  yield* all(bait.opacity(1, 0.1), bait.scale(1, 0.2, easeOutBack));

  yield* until('catBackAway');
  yield* all(cat.lean(0, 0.15), cat.crouch(0.3, 0.15), cat.face('sneaky', 0.15));
  yield* cat.goTo(lurkX, B.panOut - B.catBackAway - 0.5, GAITS.sneak, false);
  yield* all(cat.crouch(0.45, 0.2), cat.tailDown(1, 0.3), cat.tailWag(0.15, 0.3));

  yield* until('panOut');
  pan.reparent(cat.frontPaw);
  pan.position(Vector2.zero);
  pan.rotation(180);
  cat.armSwingOn(0);
  yield* all(pan.scale(1, 0.2, easeOutBack), cat.armRot[0](-150, 0.2), cat.face('evilGrin', 0.15), cat.look(1, 0.2, 0.15));
  yield* waitFor(0.2);
  yield* cat.look(0.3, 0.2, 0.15);
  yield* cat.look(1, 0.2, 0.15);

  yield* until('pipPeek2');
  kitchen.holeEyes(0);
  pipPeek.x(-130);
  pipPeek.opacity(1);
  pipPeek.setFace('neutral');
  pipPeek.look(0.9, 0.7);
  yield* pipPeek.x(-6, 0.25, easeOutBack);
  yield* waitFor(0.1);
  yield* pipPeek.look(1, -0.4, 0.12);

  yield* until('pipGleam');
  spawn(twinkle(fx, () => s.peekHead().add([24, 40]), 0.8));
  yield* pipPeek.face('smug', 0.15);

  yield* until('pipOut2');
  pipPeek.opacity(0);
  pip.scale(1);
  pip.opacity(1);
  pip.position([SET.holeX - 6, FLOOR_Y]);
  pip.setFace('sneaky');
  pip.crouch(0.5);
  spawn(pip.crouch(0, 0.2));
  yield* pip.goTo(trapX - 32, B.trapLift - B.pipOut2 - 0.05, GAITS.tiptoeFast);

  yield* until('trapLift');
  yield* all(pip.armRot[0](-165, 0.1), pip.armRot[1](-172, 0.1), attachTo(trap, s.overPip(125), 0.1));

  yield* until('trapCarry');
  const tailTipX = () => cat.x() + cat.facing() * cat.tailTip.x();
  yield* pip.goTo(tailTipX() - 45, B.trapPlace - B.trapCarry, GAITS.carryTiptoe);

  yield* until('trapPlace');
  yield* all(
    attachTo(trap, () => new Vector2(tailTipX(), FLOOR_Y), 0.15, easeOutCubic),
    pip.armRot[0](15, 0.15),
    pip.armRot[1](-12, 0.15),
    pip.face('smug', 0.1),
  );

  yield* until('snap');
  yield* trap.snapShut();
  trap.reparent(cat.tailTip);
  trap.position([0, 14]);
  cat.setFace('shocked');
  cat.tremble(1);
  spawn(cam.shake(14, 0.3));
  spawn(impact(fx, [tailTipX(), FLOOR_Y - 60], 0.6, 'SNAP!'));
  spawn(cat.stretchUp(0.08));
  pipSpeed.on(1);
  pip.setFace('happy');
  spawn(
    chain(
      pip.goTo(SET.holeX + 30, 0.45, GAITS.run),
      all(pip.opacity(0, 0.1), pip.scale(0.7, 0.1)),
      all(kitchen.holeEyes(1, 0.1), kitchen.holeEyesLook(1, 0.1)),
    ),
  );

  yield* until('launch');
  spawn(cam.to(-460, -220, 1.2, 0.4));
  yield* all(
    cat.tailDown(0, 0.3),
    cat.armRot[0](-170, 0.2),
    cat.armRot[1](-172, 0.2),
    cat.y(-540, 0.4, easeOutCubic),
    cat.rotation(180, 0.4, easeOutCubic),
  );

  yield* until('cling');
  pipSpeed.on(0);
  spawn(cat.squashPop(1.15, 0.85, 0.04, 0.2));
  yield* cat.face('scared', 0.1);

  yield* until('panDrop');
  pan.reparent(fx);
  const r = pan.rotation();
  const flat = r + (((90 - r) % 360) + 360) % 360 + 360;
  yield* all(
    pan.position(new Vector2(pan.x() + 60, FLOOR_Y - 65), B.panClang - B.panDrop, easeInCubic),
    pan.rotation(flat, B.panClang - B.panDrop),
  );

  yield* until('panClang');
  spawn(cam.shake(8, 0.2));
  spawn(impact(fx, [pan.x() + 150, FLOOR_Y - 40], 0.5, 'CLANG!'));
  yield* pan.y(FLOOR_Y - 85, 0.1).to(FLOOR_Y - 65, 0.15, easeInCubic);
}
