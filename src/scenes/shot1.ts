import type {ThreadGenerator} from '@revideo/core';
import {until} from '../story/beats';
import {SET} from '../props/Kitchen';
import type {Stage} from './stage';

/** 0-6s: title card over the sleeping night kitchen, then the cheese glints. */
export function* shot1(s: Stage): ThreadGenerator {
  const {cat, cam, hud, cheese, zzz} = s;
  cat.crouch(1);
  cat.setFace('asleep');
  cat.headDY(30);
  cat.headTilt(14);
  cat.breath(1);
  cat.armRot[0](6);
  cat.armRot[1](-6);
  cat.tailWag(0.3);
  zzz.on(1);
  cam.cut(0, 0, 1);

  yield* until('titleIn');
  yield* hud.showTitle(3.0);

  yield* until('panToCheese');
  yield* cam.to(SET.cheeseX - 20, -60, 1.8, 0.8);

  yield* until('cheeseSparkle');
  yield* cheese.shine(1, 0.15).to(0, 0.4);
}
