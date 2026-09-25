import {Circle, Line, Node, Path, Rect, Txt} from '@revideo/2d';
import type {NodeProps} from '@revideo/2d';
import {
  all,
  createSignal,
  easeInCubic,
  easeOutBack,
  easeOutCubic,
  linear,
  Vector2,
  waitFor,
} from '@revideo/core';
import type {ThreadGenerator} from '@revideo/core';
import {C} from '../theme/palette';

export const FONT = "'Arial Black', 'Impact', 'Segoe UI Black', sans-serif";

export function starPoints(r1: number, r2: number, n = 5): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/** Radial impact burst of stars + an optional comic word. */
export function* impact(layer: Node, at: [number, number], size = 1, word?: string): ThreadGenerator {
  const g = new Node({position: at, scale: 0});
  layer.add(g);
  g.add(<Line points={starPoints(150, 70, 10)} closed fill={C.white} stroke={C.outline} lineWidth={6} lineJoin={'round'} />);
  g.add(<Line points={starPoints(110, 55, 10)} closed fill={C.star} />);
  const bits: Line[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const b = (<Line position={[Math.cos(a) * 40, Math.sin(a) * 40]} points={starPoints(22, 10)} closed fill={C.star} stroke={C.outline} lineWidth={3} />) as Line;
    g.add(b);
    bits.push(b);
  }
  let txt: Txt | undefined;
  if (word) {
    txt = (<Txt text={word} fontFamily={FONT} fontSize={72} fill={C.red} stroke={C.outline} lineWidth={8} strokeFirst rotation={-8} />) as Txt;
    g.add(txt);
  }
  yield* g.scale(size, 0.12, easeOutBack);
  yield* all(
    ...bits.map((b, i) => {
      const a = (i / 7) * Math.PI * 2;
      return all(b.position(new Vector2(Math.cos(a) * 230, Math.sin(a) * 230), 0.5, easeOutCubic), b.opacity(0, 0.5, easeInCubic));
    }),
    g.rotation(10, 0.5),
    waitFor(0.25),
  );
  yield* g.opacity(0, 0.2);
  g.remove();
}

/** Pops a comic word (e.g. "!" or "?") above an anchor. */
export function* popText(layer: Node, text: string, at: () => Vector2, hold = 0.6, size = 90, color = C.star): ThreadGenerator {
  const t = (<Txt text={text} position={at} fontFamily={FONT} fontSize={size} fill={color} stroke={C.outline} lineWidth={8} strokeFirst scale={0} />) as Txt;
  layer.add(t);
  yield* t.scale(1, 0.18, easeOutBack);
  yield* waitFor(hold);
  yield* t.scale(0, 0.12);
  t.remove();
}

/** Stars circling a head. Visible while `on` is 1. */
export class DizzyStars extends Node {
  public readonly on = createSignal(0);

  public constructor(props: NodeProps & {clock: () => number; rx: number; ry: number}) {
    super(props);
    for (let i = 0; i < 4; i++) {
      this.add(
        <Line
          points={starPoints(18, 8)}
          closed
          fill={C.star}
          stroke={C.outline}
          lineWidth={3}
          position={() => {
            const a = props.clock() * 5 + (i / 4) * Math.PI * 2;
            return new Vector2(Math.cos(a) * props.rx, Math.sin(a) * props.ry);
          }}
          scale={() => this.on() * (0.8 + 0.3 * Math.sin(props.clock() * 5 + i))}
        />,
      );
    }
  }
}

/** Drifting Z's for snoring. */
export class Zzz extends Node {
  public readonly on = createSignal(0);

  public constructor(props: NodeProps & {clock: () => number}) {
    super(props);
    for (let i = 0; i < 3; i++) {
      const cyc = () => ((props.clock() / 2.4 + i / 3) % 1);
      this.add(
        <Txt
          text={'Z'}
          fontFamily={FONT}
          fontSize={40 + i * 8}
          fill={C.white}
          stroke={C.outline}
          lineWidth={5}
          strokeFirst
          position={() => new Vector2(30 + cyc() * 70 + Math.sin(cyc() * 8) * 10, -cyc() * 150)}
          opacity={() => this.on() * Math.sin(cyc() * Math.PI)}
        />,
      );
    }
  }
}

/** Horizontal speed streaks trailing a runner (place as sibling, position follows runner). */
export class SpeedLines extends Node {
  public readonly on = createSignal(0);
  public readonly dir = createSignal(1);

  public constructor(props: NodeProps & {clock: () => number; spread: number; length: number}) {
    super(props);
    for (let i = 0; i < 5; i++) {
      const y = -((i + 0.5) / 5) * props.spread;
      this.add(
        <Line
          points={() => {
            const j = (props.clock() * 7 + i * 0.37) % 1;
            const x0 = -this.dir() * (40 + j * 30);
            return [[x0, y], [x0 - this.dir() * props.length * (0.6 + 0.4 * ((i * 7) % 3) / 2), y]];
          }}
          stroke={C.white}
          lineWidth={6}
          lineCap={'round'}
          opacity={() => this.on() * 0.85}
        />,
      );
    }
  }
}

/** Dust puffs at a point (landings, skids, dives). */
export function* dust(layer: Node, at: [number, number], n = 5, size = 60): ThreadGenerator {
  const puffs: Circle[] = [];
  for (let i = 0; i < n; i++) {
    const c = (<Circle position={at} size={size * 0.3} fill={'#efe3d0'} stroke={C.outline} lineWidth={3} opacity={0.95} />) as Circle;
    layer.add(c);
    puffs.push(c);
  }
  yield* all(
    ...puffs.map((c, i) => {
      const a = Math.PI + (i / (n - 1 || 1)) * Math.PI;
      const target = new Vector2(at[0] + Math.cos(a) * size * 1.3, at[1] + Math.sin(a) * size * 0.6);
      return all(c.position(target, 0.45, easeOutCubic), c.size(size * (0.8 + (i % 2) * 0.4), 0.45, easeOutCubic), c.opacity(0, 0.45, easeInCubic));
    }),
  );
  puffs.forEach(c => c.remove());
}

/** A sweat drop that pops beside a head and slides down. */
export function* sweat(layer: Node, at: () => Vector2, side = 1): ThreadGenerator {
  const d = (
    <Path
      data={'M 0 -18 C 10 -4 14 4 14 10 C 14 18 7 24 0 24 C -7 24 -14 18 -14 10 C -14 4 -10 -4 0 -18 Z'}
      fill={'#8fd3ff'}
      stroke={C.outline}
      lineWidth={3}
      position={() => at().add([side * 40, 0])}
      scale={0}
    />
  ) as Path;
  layer.add(d);
  yield* d.scale(1, 0.12, easeOutBack);
  const off = createSignal(0);
  d.position(() => at().add([side * 40, off()]));
  yield* all(off(40, 0.6, easeInCubic), d.opacity(0, 0.6, easeInCubic));
  d.remove();
}

/** Lightbulb idea above a head. */
export function* lightbulb(layer: Node, at: () => Vector2, hold = 0.7): ThreadGenerator {
  const g = new Node({position: () => at().add([0, -70]), scale: 0});
  layer.add(g);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(<Line points={[[Math.cos(a) * 58, Math.sin(a) * 58], [Math.cos(a) * 80, Math.sin(a) * 80]]} stroke={C.star} lineWidth={7} lineCap={'round'} />);
  }
  g.add(<Circle size={80} fill={'#fff27a'} stroke={C.outline} lineWidth={5} />);
  g.add(<Rect y={48} width={34} height={22} radius={4} fill={C.metal} stroke={C.outline} lineWidth={4} />);
  yield* g.scale(1, 0.2, easeOutBack);
  yield* waitFor(hold);
  yield* g.scale(0, 0.15);
  g.remove();
}

/** A quick white star glint (sly idea / sparkle). */
export function* twinkle(layer: Node, at: () => Vector2, size = 1): ThreadGenerator {
  const s = (<Line points={starPoints(34, 8, 4)} closed fill={C.white} stroke={C.outline} lineWidth={2} position={at} scale={0} />) as Line;
  layer.add(s);
  yield* all(s.scale(size, 0.15, easeOutBack), s.rotation(45, 0.3));
  yield* all(s.scale(0, 0.15), s.rotation(90, 0.15));
  s.remove();
}

/** Hearts floating up (love-struck). */
export function* hearts(layer: Node, at: () => Vector2, n = 3): ThreadGenerator {
  const list: Path[] = [];
  for (let i = 0; i < n; i++) {
    const p = (
      <Path
        data={'M 0 10 C -24 -8 -14 -26 0 -12 C 14 -26 24 -8 0 10 Z'}
        fill={C.heart}
        stroke={C.outline}
        lineWidth={3}
        position={at}
        scale={0}
      />
    ) as Path;
    layer.add(p);
    list.push(p);
  }
  yield* all(
    ...list.map((p, i) => {
      const off = createSignal(0);
      const base = at();
      p.position(() => base.add([(i - (n - 1) / 2) * 40 + Math.sin(off() / 20) * 10, -off()]));
      return all(
        p.scale(1.1, 0.25, easeOutBack),
        off(160 + i * 20, 1.2, linear),
        p.opacity(0, 1.2, easeInCubic),
      );
    }),
  );
  list.forEach(p => p.remove());
}
