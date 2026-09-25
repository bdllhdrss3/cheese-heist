import {all, easeInOutSine, easeOutBack, linear, spawn, waitFor} from '@revideo/core';
import type {ThreadGenerator} from '@revideo/core';
import {GAITS} from '../characters/Toon';
import {popText, sweat} from '../fx/Fx';
import {attachTo} from '../lib/attach';
import {SET} from '../props/Kitchen';
import {B, until} from '../story/beats';
import type {Stage} from './stage';

/** 20-28s: Pip climbs the table, lifts the cheese... and Whiskers opens one eye. */
export function* shot4(s: Stage): ThreadGenerator {
  const {cam, cat, pip, cheese, fx} = s;
  const top = SET.table.top;

  yield* until('climbStart');
  pip.facing(1);
  pip.x(405);
  spawn(cam.followTo(() => pip.x() + 150, () => pip.y() - 80, 1.35, 0.6));
  pip.setGait(GAITS.climb);
  const climb = B.onTable - B.climbStart - 0.25;
  yield* all(
    pip.armRot[0](-160, 0.1),
    pip.armRot[1](-168, 0.1),
    pip.moving(1, 0.05),
    pip.y(top, climb, linear),
    pip.phase(pip.phase() + Math.round(climb / 0.2), climb, linear),
  );
  pip.moving(0);
  yield* pip.hop(450, top, 0.25, 40);
  pip.armRot[0](15);
  pip.armRot[1](-12);

  yield* until('onTable');
  spawn(pip.squashPop(1.2, 0.8, 0.03, 0.2));
  yield* pip.goTo(598, B.reachCheese - B.onTable, GAITS.tiptoeFast);

  yield* until('reachCheese');
  yield* pip.look(1, 0.4, 0.1);

  yield* until('liftCheese');
  pip.tremble(1);
  yield* all(
    pip.face('wince', 0.1),
    pip.armRot[0](-165, 0.2),
    pip.armRot[1](-172, 0.2),
    pip.sqY(0.85, 0.2),
    attachTo(cheese, s.overPip(), B.cheeseUp - B.liftCheese, easeInOutSine),
  );

  yield* until('cheeseUp');
  pip.tremble(0);
  spawn(pip.squashPop(0.9, 1.15, 0.05, 0.3));
  yield* pip.face('happy', 0.1);

  yield* until('backToEdge');
  yield* pip.goTo(455, B.smug - B.backToEdge, GAITS.carryTiptoe);

  yield* until('smug');
  pip.facing(1);
  yield* all(pip.face('smug', 0.15), pip.look(0, 0.1, 0.15));

  yield* until('catEyeOpen');
  cam.cut(-130, 110, 2.4);
  cat.breath(0);
  s.zzz.on(0);
  yield* all(cat.face('drowsy', 0.12), cat.look(1, -0.6, 0.12));

  yield* until('catGrin');
  yield* cat.face('evilGrin', 0.15);

  yield* until('zoomOutWide');
  spawn(cam.to(150, 0, 1.0, 0.5));

  yield* until('catStand');
  yield* all(
    cat.crouch(0, 0.3, easeOutBack),
    cat.headDY(0, 0.3),
    cat.headTilt(0, 0.3),
    cat.armRot[0](-40, 0.3),
    cat.armRot[1](-60, 0.3),
    cat.tailWag(1.5, 0.3),
  );

  yield* until('pipGulp');
  spawn(popText(fx, '!', s.head(pip), 0.4, 80));
  spawn(sweat(fx, s.head(pip), -1));
  yield* pip.face('scared', 0.1);
  yield* waitFor(0.1);
}
