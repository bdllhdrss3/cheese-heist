import {Circle, Line, Node, Path, Rect, Spline} from '@revideo/2d';
import type {NodeProps, SplineProps} from '@revideo/2d';
import {
  all,
  createSignal,
  easeInOutSine,
  easeOutBack,
  easeOutCubic,
  linear,
  spawn,
  tween,
  Vector2,
  waitFor,
} from '@revideo/core';
import type {PossibleVector2, SimpleSignal, ThreadGenerator} from '@revideo/core';
import {C} from '../theme/palette';

type P = [number, number];
type Sig = SimpleSignal<number, void>;

export interface Gait {
  period: number;
  stride: number;
  lift: number;
  bob: number;
  swing: number;
  lean: number;
  arms?: [number, number];
}

export const GAITS: Record<'walk' | 'tiptoe' | 'tiptoeFast' | 'run' | 'sneak' | 'carryTiptoe' | 'carryRun' | 'climb', Gait> = {
  walk: {period: 0.3, stride: 26, lift: 14, bob: 8, swing: 28, lean: 3},
  tiptoe: {period: 0.4, stride: 30, lift: 34, bob: 16, swing: 6, lean: -4, arms: [-70, -80]},
  tiptoeFast: {period: 0.2, stride: 30, lift: 28, bob: 12, swing: 6, lean: 6, arms: [-70, -80]},
  sneak: {period: 0.2, stride: 26, lift: 22, bob: 8, swing: 8, lean: 10, arms: [-60, -75]},
  run: {period: 0.12, stride: 46, lift: 26, bob: 14, swing: 70, lean: 14},
  carryTiptoe: {period: 0.2, stride: 30, lift: 26, bob: 10, swing: 4, lean: 0, arms: [-165, -172]},
  carryRun: {period: 0.12, stride: 46, lift: 26, bob: 12, swing: 6, lean: 8, arms: [-165, -172]},
  climb: {period: 0.2, stride: 2, lift: 18, bob: 6, swing: 35, lean: 0, arms: [-160, -168]},
};

export type FaceName =
  | 'neutral'
  | 'happy'
  | 'asleep'
  | 'sneaky'
  | 'evilGrin'
  | 'shocked'
  | 'scared'
  | 'angry'
  | 'dizzy'
  | 'love'
  | 'relieved'
  | 'smug'
  | 'drowsy'
  | 'wince';

interface Face {
  lid: number;
  curve: number;
  open: number;
  grin: number;
  browTilt: number;
  browLift: number;
  pupil: number;
  huge: number;
  heart: number;
  xeye: number;
}

const FACES: Record<FaceName, Face> = {
  neutral: {lid: 0.1, curve: 6, open: 0, grin: 0, browTilt: 0, browLift: 0, pupil: 1, huge: 0, heart: 0, xeye: 0},
  happy: {lid: 0, curve: 16, open: 0, grin: 0, browTilt: -4, browLift: -6, pupil: 1, huge: 0, heart: 0, xeye: 0},
  asleep: {lid: 1, curve: 3, open: 0, grin: 0, browTilt: 0, browLift: 2, pupil: 1, huge: 0, heart: 0, xeye: 0},
  sneaky: {lid: 0.45, curve: 10, open: 0, grin: 0, browTilt: 16, browLift: 0, pupil: 0.9, huge: 0, heart: 0, xeye: 0},
  evilGrin: {lid: 0.35, curve: 0, open: 0, grin: 1, browTilt: 24, browLift: 2, pupil: 0.8, huge: 0, heart: 0, xeye: 0},
  shocked: {lid: 0, curve: 0, open: 0.9, grin: 0, browTilt: -6, browLift: -18, pupil: 0.45, huge: 1, heart: 0, xeye: 0},
  scared: {lid: 0, curve: -10, open: 0, grin: 0, browTilt: -18, browLift: -10, pupil: 0.6, huge: 0.6, heart: 0, xeye: 0},
  angry: {lid: 0.3, curve: -12, open: 0, grin: 0, browTilt: 28, browLift: 4, pupil: 0.8, huge: 0, heart: 0, xeye: 0},
  dizzy: {lid: 0, curve: -4, open: 0.3, grin: 0, browTilt: -8, browLift: -4, pupil: 1, huge: 0, heart: 0, xeye: 1},
  love: {lid: 0, curve: 18, open: 0.2, grin: 0, browTilt: -6, browLift: -8, pupil: 1, huge: 0, heart: 1, xeye: 0},
  relieved: {lid: 0.65, curve: 12, open: 0, grin: 0, browTilt: -10, browLift: -2, pupil: 1, huge: 0, heart: 0, xeye: 0},
  smug: {lid: 0.5, curve: 0, open: 0, grin: 0.7, browTilt: 8, browLift: -2, pupil: 0.9, huge: 0, heart: 0, xeye: 0},
  drowsy: {lid: 0.6, curve: 2, open: 0, grin: 0, browTilt: 4, browLift: 2, pupil: 1, huge: 0, heart: 0, xeye: 0},
  wince: {lid: 0.85, curve: -14, open: 0.2, grin: 0, browTilt: -16, browLift: -4, pupil: 1, huge: 0, heart: 0, xeye: 0},
};

export interface ToonSpec {
  scale: number;
  fur: string;
  belly: string;
  inner: string;
  gaitScale: number;
  body: {x: number; y: number; w: number; h: number};
  bellyPatch: {x: number; y: number; w: number; h: number};
  head: {x: number; y: number; w: number; h: number};
  muzzle: {x: number; y: number; w: number; h: number};
  eyes: {y: number; xs: [number, number]; w: number; h: number; pupil: number};
  brow: {len: number; width: number; gap: number};
  nose: {x: number; y: number; w: number; h: number};
  mouth: {x: number; y: number; w: number};
  ears: 'cat' | 'mouse';
  arm: {len: number; width: number; shoulders: [P, P]; paw: number};
  leg: {hips: [P, P]; width: number; foot: {w: number; h: number}};
  tail: {base: P; width: number; color: string; up: P[]; floorLen: number; wag: number};
  whiskers: {at: P; len: number};
  outline: number;
}

export interface ToonProps extends NodeProps {
  clock: () => number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Spline whose points are computed; set after construction since the ctor only checks static arrays. */
export function dynSpline(props: SplineProps, pts: () => PossibleVector2[]) {
  const spline = new Spline({...props, points: [[0, 0], [1, 1]]});
  spline.points(pts);
  return spline;
}

export class Toon extends Node {
  public readonly phase = createSignal(0);
  public readonly moving = createSignal(0);
  public readonly facing = createSignal(1);
  public readonly lean = createSignal(0);
  public readonly crouch = createSignal(0);
  public readonly breath = createSignal(0);
  public readonly sqX = createSignal(1);
  public readonly sqY = createSignal(1);
  public readonly headTilt = createSignal(0);
  public readonly headDY = createSignal(0);
  public readonly lookX = createSignal(0.3);
  public readonly lookY = createSignal(0);
  public readonly blink = createSignal(0);
  public readonly earTwitch = createSignal(0);
  public readonly tailDown = createSignal(0);
  public readonly tailWag = createSignal(1);
  public readonly tremble = createSignal(0);
  public readonly armRot: [Sig, Sig] = [createSignal(15), createSignal(-12)];
  public readonly armSwingOn = createSignal(1);
  public readonly chew = createSignal(0);

  private readonly f: Record<keyof Face, Sig> = {
    lid: createSignal(0.1),
    curve: createSignal(6),
    open: createSignal(0),
    grin: createSignal(0),
    browTilt: createSignal(0),
    browLift: createSignal(0),
    pupil: createSignal(1),
    huge: createSignal(0),
    heart: createSignal(0),
    xeye: createSignal(0),
  };

  private readonly gStride = createSignal(0);
  private readonly gLift = createSignal(0);
  private readonly gBob = createSignal(0);
  private readonly gSwing = createSignal(0);

  public readonly frontPaw = new Node({});
  public readonly backPaw = new Node({});
  public readonly tailTip = new Node({});
  public readonly fxAnchor = new Node({});
  public readonly clock: () => number;

  public constructor(public readonly spec: ToonSpec, props: ToonProps) {
    super(props);
    this.clock = props.clock;
    this.build();
  }

  // ------------------------------------------------------------ geometry
  private bobY() {
    return -this.gBob() * this.moving() * Math.abs(Math.sin(this.phase() * Math.PI));
  }

  private crouchY() {
    return 1 - 0.28 * this.crouch();
  }

  private footPos(i: number): Vector2 {
    const s = this.spec;
    const p = this.phase() * Math.PI + i * Math.PI;
    const m = this.moving();
    const hip = s.leg.hips[i];
    const x = hip[0] + this.gStride() * m * Math.cos(p);
    const y = -this.gLift() * m * Math.max(0, Math.sin(p));
    return new Vector2(x, y - s.leg.foot.h / 2);
  }

  private tailPoints(): Vector2[] {
    const s = this.spec.tail;
    const t = this.clock();
    const base = new Vector2(s.base[0], s.base[1] + this.bobY() * 0.6);
    const down = this.tailDown();
    const pts: Vector2[] = [base];
    const n = s.up.length;
    for (let k = 0; k < n; k++) {
      const u = s.up[k];
      const wag = s.wag * this.tailWag() * Math.sin(t * Math.PI * 1.3 + k * 0.9) * (k + 1) / n;
      const upPt = new Vector2(u[0] + wag, u[1] + this.bobY() * 0.6);
      const f = (k + 1) / n;
      const lying = new Vector2(s.base[0] - s.floorLen * f, lerp(s.base[1], -s.width / 2, Math.min(1, f * 2)));
      pts.push(new Vector2(lerp(upPt.x, lying.x, down), lerp(upPt.y, lying.y, down)));
    }
    return pts;
  }

  private build() {
    const s = this.spec;
    const O = C.outline;
    const ow = s.outline;

    const flip = new Node({
      scale: () => new Vector2(this.facing() * s.scale, s.scale),
    });
    const squash = new Node({
      scale: () =>
        new Vector2(
          this.sqX() * (1 + 0.06 * this.crouch()),
          this.sqY() * this.crouchY() * (1 + this.breath() * 0.035 * Math.sin(this.clock() * Math.PI * 2 / 2.4)),
        ),
      x: () => this.tremble() * Math.sin(this.clock() * 90),
    });
    this.add(flip);
    flip.add(squash);

    // tail (outline stroke under colored stroke)
    squash.add(
      dynSpline(
        {smoothness: 0.45, lineWidth: s.tail.width + ow * 2, stroke: O, lineCap: 'round'},
        () => this.tailPoints(),
      ),
    );
    squash.add(
      dynSpline(
        {smoothness: 0.45, lineWidth: s.tail.width, stroke: s.tail.color, lineCap: 'round'},
        () => this.tailPoints(),
      ),
    );
    this.tailTip.position(() => {
      const pts = this.tailPoints();
      return pts[pts.length - 1];
    });
    squash.add(this.tailTip);

    // legs + feet (stay grounded while the body bobs)
    for (const i of [0, 1]) {
      const hip = s.leg.hips[i];
      const hipPos = () => new Vector2(hip[0], hip[1] + this.bobY());
      squash.add(
        <Line
          points={() => [hipPos(), this.footPos(i)]}
          lineWidth={s.leg.width + ow * 2}
          stroke={O}
          lineCap={'round'}
        />,
      );
      squash.add(
        <Line
          points={() => [hipPos(), this.footPos(i)]}
          lineWidth={s.leg.width}
          stroke={i === 0 ? darken(s.fur) : s.fur}
          lineCap={'round'}
        />,
      );
      squash.add(
        <Circle
          position={() => this.footPos(i).add([s.leg.foot.w * 0.18, 0])}
          width={s.leg.foot.w}
          height={s.leg.foot.h}
          fill={i === 0 ? darken(s.fur) : s.fur}
          stroke={O}
          lineWidth={ow}
        />,
      );
    }

    const bodyRig = new Node({
      y: () => this.bobY(),
      rotation: () => this.lean(),
    });
    squash.add(bodyRig);

    // back arm
    bodyRig.add(this.makeArm(1, this.backPaw, darken(s.fur)));

    // torso
    bodyRig.add(
      <Circle x={s.body.x} y={s.body.y} width={s.body.w} height={s.body.h} fill={s.fur} stroke={O} lineWidth={ow} />,
    );
    bodyRig.add(
      <Circle x={s.bellyPatch.x} y={s.bellyPatch.y} width={s.bellyPatch.w} height={s.bellyPatch.h} fill={s.belly} />,
    );

    // head
    const head = new Node({
      x: s.head.x,
      y: () => s.head.y + this.headDY(),
      rotation: () => this.headTilt(),
    });
    bodyRig.add(head);
    this.buildHead(head);

    // front arm
    bodyRig.add(this.makeArm(0, this.frontPaw, s.fur));

    // fx anchor lives outside the flip so text/stars never mirror
    this.fxAnchor.position(() => {
      const sc = s.scale;
      return new Vector2(
        this.facing() * sc * s.head.x * this.sqX(),
        sc * (s.head.y - s.head.h / 2 + this.headDY() + this.bobY()) * this.sqY() * this.crouchY(),
      );
    });
    this.add(this.fxAnchor);
  }

  private makeArm(i: number, paw: Node, color: string) {
    const s = this.spec;
    const sh = s.arm.shoulders[i];
    const pivot = new Node({
      x: sh[0],
      y: sh[1],
      rotation: () => {
        const p = this.phase() * Math.PI + (1 - i) * Math.PI;
        return this.armRot[i]() + this.gSwing() * this.moving() * this.armSwingOn() * Math.cos(p);
      },
    });
    pivot.add(
      <Line points={[[0, 0], [0, s.arm.len]]} lineWidth={s.arm.width + s.outline * 2} stroke={C.outline} lineCap={'round'} />,
    );
    pivot.add(<Line points={[[0, 0], [0, s.arm.len]]} lineWidth={s.arm.width} stroke={color} lineCap={'round'} />);
    pivot.add(<Circle y={s.arm.len} size={s.arm.paw} fill={color} stroke={C.outline} lineWidth={s.outline} />);
    paw.y(s.arm.len);
    pivot.add(paw);
    return pivot;
  }

  private buildHead(head: Node) {
    const s = this.spec;
    const O = C.outline;
    const ow = s.outline;
    const f = this.f;

    if (s.ears === 'cat') {
      const ear = (dx: number, twitch: boolean) => {
        const n = new Node({
          x: dx,
          y: -s.head.h * 0.32,
          rotation: () => (twitch ? this.earTwitch() * 18 : 0) + (dx < 0 ? -12 : 12),
        });
        const w = s.head.w * 0.22;
        const h = s.head.h * 0.5;
        n.add(<Line points={[[-w, 0], [0, -h], [w, 0]]} closed fill={s.fur} stroke={O} lineWidth={ow} lineJoin={'round'} />);
        n.add(<Line points={[[-w * 0.55, -h * 0.08], [0, -h * 0.72], [w * 0.55, -h * 0.08]]} closed fill={s.inner} lineJoin={'round'} />);
        return n;
      };
      head.add(ear(-s.head.w * 0.28, false));
      head.add(ear(s.head.w * 0.3, true));
    } else {
      const ear = (dx: number, twitch: boolean) => {
        const n = new Node({
          x: dx,
          y: -s.head.h * 0.42,
          rotation: () => (twitch ? this.earTwitch() * 14 : 0),
        });
        const r = s.head.w * 0.72;
        n.add(<Circle size={r} fill={s.fur} stroke={O} lineWidth={ow} />);
        n.add(<Circle size={r * 0.62} fill={s.inner} />);
        return n;
      };
      head.add(ear(-s.head.w * 0.42, false));
      head.add(ear(s.head.w * 0.36, true));
    }

    head.add(<Circle width={s.head.w} height={s.head.h} fill={s.fur} stroke={O} lineWidth={ow} />);
    head.add(<Circle x={s.muzzle.x} y={s.muzzle.y} width={s.muzzle.w} height={s.muzzle.h} fill={s.belly} />);

    // eyes
    s.eyes.xs.forEach((ex, i) => {
      const eye = new Node({
        x: ex,
        y: s.eyes.y,
        scale: () => 1 + 0.35 * f.huge(),
      });
      head.add(eye);
      const w = s.eyes.w;
      const h = s.eyes.h;
      const lidAmt = () => Math.max(f.lid(), this.blink());
      const white = (
        <Circle
          width={w}
          height={h}
          fill={C.eyeWhite}
          stroke={O}
          lineWidth={ow * 0.8}
          clip
          opacity={() => 1 - Math.min(1, f.heart() + f.xeye())}
        />
      ) as Circle;
      eye.add(white);
      const maxX = w * 0.22;
      const maxY = h * 0.22;
      const pr = () => s.eyes.pupil * f.pupil();
      white.add(
        <Circle
          x={() => this.lookX() * maxX}
          y={() => this.lookY() * maxY}
          size={() => pr() * 2}
          fill={C.pupil}
        />,
      );
      white.add(
        <Circle
          x={() => this.lookX() * maxX + pr() * 0.35}
          y={() => this.lookY() * maxY - pr() * 0.4}
          size={() => pr() * 0.7}
          fill={C.white}
        />,
      );
      white.add(
        <Rect
          y={-h / 2 - 2}
          offset={[0, -1]}
          width={w + 6}
          height={() => (h + 6) * lidAmt()}
          fill={s.fur}
          stroke={O}
          lineWidth={ow * 0.8}
          opacity={() => (lidAmt() > 0.02 ? 1 : 0)}
        />,
      );
      eye.add(
        <Path
          data={'M 0 10 C -24 -8 -14 -26 0 -12 C 14 -26 24 -8 0 10 Z'}
          fill={C.heart}
          stroke={O}
          lineWidth={2}
          scale={() => (w / 34) * (1 + 0.12 * Math.sin(this.clock() * 14))}
          opacity={() => f.heart()}
        />,
      );
      const xs = w * 0.32;
      eye.add(<Line points={[[-xs, -xs], [xs, xs]]} stroke={O} lineWidth={ow} lineCap={'round'} opacity={() => f.xeye()} />);
      eye.add(<Line points={[[-xs, xs], [xs, -xs]]} stroke={O} lineWidth={ow} lineCap={'round'} opacity={() => f.xeye()} />);

      const dir = i === 0 ? 1 : -1;
      head.add(
        <Line
          x={ex}
          y={() => s.eyes.y - h / 2 - s.brow.gap + f.browLift() - f.huge() * 10}
          points={[[-s.brow.len / 2, 0], [s.brow.len / 2, 0]]}
          rotation={() => dir * f.browTilt()}
          stroke={O}
          lineWidth={s.brow.width}
          lineCap={'round'}
        />,
      );
    });

    // mouth variants
    const mw = s.mouth.w;
    const openVis = () => Math.max(f.open(), this.chew());
    head.add(
      dynSpline(
        {
          x: s.mouth.x,
          y: s.mouth.y,
          smoothness: 0.5,
          stroke: O,
          lineWidth: ow * 0.9,
          lineCap: 'round',
          opacity: () => (openVis() > 0.05 || f.grin() > 0.05 ? 0 : 1),
        },
        () => [[-mw, 0], [0, f.curve()], [mw, 0]],
      ),
    );
    const mouthOpen = (
      <Circle
        x={s.mouth.x}
        y={() => s.mouth.y + openVis() * mw * 0.5}
        width={mw * 1.7}
        height={() => Math.max(1, openVis() * mw * 2.2)}
        fill={'#6b1d2a'}
        stroke={O}
        lineWidth={ow * 0.8}
        clip
        opacity={() => (openVis() > 0.05 ? 1 : 0)}
      />
    ) as Circle;
    mouthOpen.add(<Circle y={() => openVis() * mw * 0.8} width={mw * 1.3} height={mw * 1.1} fill={'#f07a8a'} />);
    head.add(mouthOpen);
    const grin = (
      <Circle
        x={s.mouth.x}
        y={s.mouth.y - 2}
        width={mw * 3.4}
        height={() => Math.max(1, f.grin() * mw * 2)}
        startAngle={0}
        endAngle={180}
        closed
        fill={C.white}
        stroke={O}
        lineWidth={ow * 0.8}
        opacity={() => (f.grin() > 0.05 ? 1 : 0)}
      />
    ) as Circle;
    head.add(grin);
    head.add(
      <Line
        x={s.mouth.x}
        y={() => s.mouth.y - 2 + f.grin() * mw * 0.45}
        points={[[-mw * 1.5, 0], [mw * 1.5, 0]]}
        stroke={O}
        lineWidth={2}
        opacity={() => (f.grin() > 0.05 ? 1 : 0)}
      />,
    );

    head.add(<Circle x={s.nose.x} y={s.nose.y} width={s.nose.w} height={s.nose.h} fill={C.nose} stroke={O} lineWidth={ow * 0.6} />);

    const wa = s.whiskers.at;
    const wl = s.whiskers.len;
    for (const [dy, ang] of [[-6, -10], [4, 4], [14, 16]] as const) {
      const rad = (ang * Math.PI) / 180;
      head.add(
        <Line
          points={[[wa[0] + wl * 0.1, wa[1] + dy], [wa[0] + wl * Math.cos(rad), wa[1] + dy + wl * Math.sin(rad)]]}
          stroke={O}
          lineWidth={2.5}
          lineCap={'round'}
        />,
      );
      head.add(
        <Line
          points={[[wa[0] - wl * 0.75, wa[1] + dy], [wa[0] - wl * 0.75 - wl * 0.8 * Math.cos(rad), wa[1] + dy + wl * 0.8 * Math.sin(rad)]]}
          stroke={O}
          lineWidth={2.5}
          lineCap={'round'}
        />,
      );
    }
  }

  // ------------------------------------------------------------ actions
  public setFace(name: FaceName) {
    const target = FACES[name];
    for (const k of Object.keys(target) as (keyof Face)[]) this.f[k](target[k]);
  }

  public *face(name: FaceName, dur = 0.12): ThreadGenerator {
    const target = FACES[name];
    yield* all(...(Object.keys(target) as (keyof Face)[]).map(k => this.f[k](target[k], dur)));
  }

  public *blinkOnce(): ThreadGenerator {
    yield* this.blink(1, 0.06);
    yield* this.blink(0, 0.08);
  }

  public *look(x: number, y: number, dur = 0.12): ThreadGenerator {
    yield* all(this.lookX(x, dur), this.lookY(y, dur));
  }

  public setGait(g: Gait) {
    const k = this.spec.gaitScale;
    this.gStride(g.stride * k);
    this.gLift(g.lift * k);
    this.gBob(g.bob * k);
    this.gSwing(g.swing);
  }

  /** Moves to world x over `dur` seconds with a gait cycle locked to the gait period. */
  public *goTo(x: number, dur: number, g: Gait, faceDir = true): ThreadGenerator {
    this.setGait(g);
    if (faceDir) this.facing(x >= this.x() ? 1 : -1);
    const arms = g.arms;
    const startArms = [this.armRot[0](), this.armRot[1]()];
    const steps = Math.max(1, Math.round(dur / g.period));
    this.phase(Math.round(this.phase()));
    yield* all(
      this.moving(1, 0.06),
      this.lean(g.lean, 0.1),
      arms ? all(this.armRot[0](arms[0], 0.1), this.armRot[1](arms[1], 0.1)) : waitFor(0),
      this.x(x, dur, linear),
      this.phase(this.phase() + steps, dur, linear),
    );
    this.moving(0);
    if (arms) {
      this.armRot[0](startArms[0]);
      this.armRot[1](startArms[1]);
    }
    spawn(this.lean(0, 0.1));
  }

  /** Parabolic hop to (x, y). */
  public *hop(x: number, y: number, dur: number, height: number): ThreadGenerator {
    const x0 = this.x();
    const y0 = this.y();
    yield* tween(dur, v => {
      this.x(lerp(x0, x, v));
      this.y(lerp(y0, y, v) - height * 4 * v * (1 - v));
    });
  }

  /** Squash then spring back (landing/impact). */
  public *squashPop(sx: number, sy: number, hold = 0.06, back = 0.35): ThreadGenerator {
    this.sqX(sx);
    this.sqY(sy);
    yield* waitFor(hold);
    yield* all(this.sqX(1, back, easeOutBack), this.sqY(1, back, easeOutBack));
  }

  public *stretchUp(dur = 0.12): ThreadGenerator {
    yield* all(this.sqX(0.8, dur, easeOutCubic), this.sqY(1.25, dur, easeOutCubic));
  }

  public *twitchEar(): ThreadGenerator {
    for (let i = 0; i < 3; i++) {
      yield* this.earTwitch(1, 0.05, easeInOutSine);
      yield* this.earTwitch(0, 0.07, easeInOutSine);
    }
  }
}

function darken(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.82);
  const g = Math.round(((n >> 8) & 255) * 0.82);
  const b = Math.round((n & 255) * 0.82);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
