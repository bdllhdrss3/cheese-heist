import {Node} from '@revideo/2d';
import type {View2D} from '@revideo/2d';
import {loop, spawn, Vector2, waitFor} from '@revideo/core';
import {Cat} from '../characters/Cat';
import {Mouse} from '../characters/Mouse';
import type {Toon} from '../characters/Toon';
import {DizzyStars, SpeedLines, Zzz} from '../fx/Fx';
import {Hud} from '../fx/Hud';
import {Camera, makeClock} from '../lib/camera';
import {Cheese, Curtain, FryingPan, Mousetrap} from '../props/Items';
import {Kitchen, SET} from '../props/Kitchen';
import {FLOOR_Y} from '../theme/palette';

export type Orientation = 'landscape' | 'portrait';

export interface Stage {
  view: View2D;
  world: Node;
  fx: Node;
  hud: Hud;
  cam: Camera;
  clock: () => number;
  kitchen: Kitchen;
  cat: Cat;
  pip: Mouse;
  pipPeek: Mouse;
  cheese: Cheese;
  trap: Mousetrap;
  bait: Cheese;
  pan: FryingPan;
  curtain: Curtain;
  zzz: Zzz;
  dizzy: DizzyStars;
  pipSpeed: SpeedLines;
  catSpeed: SpeedLines;
  /** Point above Pip's head where carried props sit. */
  overPip: (lift?: number) => () => Vector2;
  /** World-space head-top anchor of a character (for fx). */
  head: (t: Toon) => () => Vector2;
  peekHead: () => Vector2;
}

export function buildStage(view: View2D, orientation: Orientation): Stage {
  const [viewW, viewH] = orientation === 'portrait' ? [1080, 1920] : [1920, 1080];
  const [clock, tick] = makeClock();
  spawn(tick);

  const world = new Node({});
  view.add(world);
  const cam = new Camera(world, viewW, viewH);

  const kitchen = new Kitchen({clock});
  world.add(kitchen);

  const trap = new Mousetrap({x: -680, y: FLOOR_Y, scale: 0});
  world.add(trap);
  const bait = new Cheese({opacity: 0});
  trap.bait.add(bait);

  const cat = new Cat({clock, x: SET.rugX, y: FLOOR_Y});
  world.add(cat);

  const pip = new Mouse({clock, x: SET.holeX, y: FLOOR_Y, opacity: 0});
  world.add(pip);

  const pipPeek = new Mouse({clock, x: -130, y: SET.holeH / 2});
  pipPeek.crouch(0.5);
  kitchen.holeClip.add(pipPeek);

  const cheese = new Cheese({x: SET.cheeseX, y: SET.table.top});
  world.add(cheese);

  const pan = new FryingPan({scale: 0});
  world.add(pan);

  const curtain = new Curtain({x: SET.holeX, y: FLOOR_Y - SET.holeH - 6, width: SET.holeW + 6, height: SET.holeH, opacity: 0});
  world.add(curtain);

  const fx = new Node({});
  world.add(fx);

  const hud = new Hud({viewW, viewH});
  view.add(hud);

  const zzz = new Zzz({clock, x: 30, y: 10});
  cat.fxAnchor.add(zzz);
  const dizzy = new DizzyStars({clock, rx: 110, ry: 28, y: 40});
  dizzy.rotation(() => -cat.rotation());
  cat.fxAnchor.add(dizzy);

  const pipSpeed = new SpeedLines({clock, spread: 150, length: 90});
  pipSpeed.dir(() => pip.facing());
  pip.add(pipSpeed);
  const catSpeed = new SpeedLines({clock, spread: 380, length: 180});
  catSpeed.dir(() => cat.facing());
  cat.add(catSpeed);

  const overPip = (lift = 135) => () => pip.position().add([pip.facing() * 8, -lift]);
  const head = (t: Toon) => () => t.position().add(t.fxAnchor.position());
  const peekHead = () => new Vector2(SET.holeX + pipPeek.x(), FLOOR_Y).add(pipPeek.fxAnchor.position());

  // Idle blinking keeps the characters alive between actions.
  spawn(
    loop(function* () {
      yield* waitFor(2.7);
      yield* pip.blinkOnce();
      yield* waitFor(0.6);
      yield* cat.blinkOnce();
    }),
  );

  return {view, world, fx, hud, cam, clock, kitchen, cat, pip, pipPeek, cheese, trap, bait, pan, curtain, zzz, dizzy, pipSpeed, catSpeed, overPip, head, peekHead};
}
