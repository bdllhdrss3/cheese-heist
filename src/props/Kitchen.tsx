import {Circle, Gradient, Line, Node, Rect} from '@revideo/2d';
import type {NodeProps} from '@revideo/2d';
import {createSignal} from '@revideo/core';
import {C, FLOOR_Y} from '../theme/palette';

export const SET = {
  cupboardX: -870,
  holeX: -770,
  holeW: 124,
  holeH: 160,
  rugX: -150,
  table: {left: 400, right: 840, top: -40, legs: [430, 810] as [number, number]},
  cheeseX: 660,
  clock: {x: -360, y: -290},
  window: {x: 250, y: -250, w: 360, h: 300},
  lampX: 620,
};

export interface KitchenProps extends NodeProps {
  clock: () => number;
}

export class Kitchen extends Node {
  public readonly holeEyes = createSignal(0);
  public readonly holeEyesLook = createSignal(0);
  public readonly holeClip: Rect;
  public readonly lampGlow = createSignal(0.25);

  public constructor(props: KitchenProps) {
    super(props);
    const O = C.outline;
    const t = props.clock;

    // wall + wallpaper stripes
    this.add(<Rect y={(-540 + FLOOR_Y) / 2} width={1920} height={540 + FLOOR_Y} fill={C.wall} />);
    for (let x = -960; x < 960; x += 96) {
      this.add(<Rect x={x + 24} y={(-540 + 80) / 2} width={30} height={540 + 80} fill={C.wallStripe} />);
    }
    // wainscot panels
    this.add(<Rect y={(80 + 272) / 2} width={1920} height={192} fill={C.wainscot} />);
    this.add(<Line points={[[-960, 80], [960, 80]]} stroke={C.baseboard} lineWidth={10} />);
    for (let x = -900; x < 960; x += 180) {
      this.add(<Rect x={x + 60} y={176} width={140} height={140} radius={8} stroke={C.wainscotLine} lineWidth={5} />);
    }
    this.add(<Rect y={286} width={1920} height={28} fill={C.baseboard} />);

    // floor planks
    this.add(<Rect y={(FLOOR_Y + 540) / 2} width={1920} height={540 - FLOOR_Y} fill={C.floor} />);
    [340, 400, 470].forEach((y, i) => {
      this.add(<Line points={[[-960, y], [960, y]]} stroke={C.floorLine} lineWidth={4} />);
      for (let x = -960 + (i % 2) * 150; x < 960; x += 300) {
        const y0 = i === 0 ? FLOOR_Y : [340, 400][i - 1];
        this.add(<Line points={[[x, y0], [x, y]]} stroke={C.floorLine} lineWidth={3} />);
      }
    });
    this.add(<Line points={[[-960, FLOOR_Y], [960, FLOOR_Y]]} stroke={O} lineWidth={5} />);

    // window with night sky
    const w = SET.window;
    this.add(<Rect x={w.x} y={w.y} width={w.w + 36} height={w.h + 36} radius={10} fill={C.frame} stroke={O} lineWidth={6} />);
    const sky = (<Rect x={w.x} y={w.y} width={w.w} height={w.h} fill={C.night} clip />) as Rect;
    this.add(sky);
    sky.add(<Circle x={80} y={-60} size={110} fill={C.moon} shadowColor={C.moon} shadowBlur={40} />);
    sky.add(<Circle x={108} y={-78} size={96} fill={C.night} />);
    [[-120, -90], [-60, 40], [-140, 80], [20, -110], [140, 60], [-20, 100]].forEach(([sx, sy], i) => {
      sky.add(
        <Circle x={sx} y={sy} size={() => 7 + 3 * Math.sin(t() * 3 + i * 1.7)} fill={C.moon} />,
      );
    });
    this.add(<Line points={[[w.x, w.y - w.h / 2], [w.x, w.y + w.h / 2]]} stroke={C.frame} lineWidth={14} />);
    this.add(<Line points={[[w.x - w.w / 2, w.y], [w.x + w.w / 2, w.y]]} stroke={C.frame} lineWidth={14} />);
    this.add(<Rect x={w.x} y={w.y + w.h / 2 + 26} width={w.w + 70} height={20} radius={6} fill={C.frame} stroke={O} lineWidth={5} />);
    // curtains
    for (const dir of [-1, 1]) {
      this.add(
        <Line
          points={[
            [w.x + dir * (w.w / 2 + 40), w.y - w.h / 2 - 40],
            [w.x + dir * (w.w / 2 - 50), w.y - w.h / 2 - 40],
            [w.x + dir * (w.w / 2 + 10), w.y + 40],
            [w.x + dir * (w.w / 2 + 40), w.y + w.h / 2 + 30],
          ]}
          closed
          fill={C.red}
          stroke={O}
          lineWidth={5}
          lineJoin={'round'}
        />,
      );
    }
    this.add(<Line points={[[w.x - w.w / 2 - 70, w.y - w.h / 2 - 44], [w.x + w.w / 2 + 70, w.y - w.h / 2 - 44]]} stroke={C.woodDark} lineWidth={10} lineCap={'round'} />);
    // moonbeam on the floor
    this.add(
      <Line
        points={[[w.x - w.w / 2 + 30, w.y + w.h / 2], [w.x + w.w / 2 - 30, w.y + w.h / 2], [w.x + 330, FLOOR_Y + 90], [w.x - 110, FLOOR_Y + 90]]}
        closed
        fill={C.moon}
        opacity={0.1}
      />,
    );

    // pendulum clock
    const ck = SET.clock;
    this.add(<Rect x={ck.x} y={ck.y + 40} width={130} height={300} radius={[60, 60, 10, 10]} fill={C.wood} stroke={O} lineWidth={6} />);
    const glass = (<Rect x={ck.x} y={ck.y + 110} width={80} height={130} radius={10} fill={'#3a2418'} stroke={O} lineWidth={4} clip />) as Rect;
    this.add(glass);
    const pend = new Node({y: -65, rotation: () => 16 * Math.cos(Math.PI * t())});
    glass.add(pend);
    pend.add(<Line points={[[0, 0], [0, 95]]} stroke={C.rugTrim} lineWidth={5} />);
    pend.add(<Circle y={98} size={34} fill={C.rugTrim} stroke={O} lineWidth={3} />);
    this.add(<Circle x={ck.x} y={ck.y} size={100} fill={C.frame} stroke={O} lineWidth={6} />);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.add(<Circle x={ck.x + Math.sin(a) * 38} y={ck.y - Math.cos(a) * 38} size={i % 3 === 0 ? 8 : 5} fill={O} />);
    }
    this.add(<Line x={ck.x} y={ck.y} points={[[0, 0], [0, -30]]} rotation={() => t() * 6} stroke={O} lineWidth={4} lineCap={'round'} />);
    this.add(<Line x={ck.x} y={ck.y} points={[[0, 0], [0, -22]]} rotation={() => 300 + t() * 0.5} stroke={O} lineWidth={6} lineCap={'round'} />);

    // hanging lamp over the table with warm glow
    this.add(<Line points={[[SET.lampX, -540], [SET.lampX, -330]]} stroke={O} lineWidth={4} />);
    this.add(
      <Circle
        x={SET.lampX}
        y={-150}
        width={700}
        height={560}
        fill={
          new Gradient({
            type: 'radial',
            fromRadius: 0,
            toRadius: 330,
            stops: [
              {offset: 0, color: '#fff1b8'},
              {offset: 1, color: '#fff1b800'},
            ],
          })
        }
        opacity={() => this.lampGlow() * 2.4}
      />,
    );
    this.add(<Line points={[[SET.lampX - 30, -330], [SET.lampX + 30, -330], [SET.lampX + 80, -270], [SET.lampX - 80, -270]]} closed fill={C.red} stroke={O} lineWidth={5} lineJoin={'round'} />);
    this.add(<Circle x={SET.lampX} y={-266} size={34} fill={'#fff6cf'} stroke={O} lineWidth={3} />);

    // cupboard side panel (the wall Whiskers keeps slamming into)
    const cx = SET.cupboardX;
    this.add(<Rect x={(-960 + cx) / 2} y={(-540 + FLOOR_Y) / 2} width={cx + 960} height={540 + FLOOR_Y} fill={C.cupboard} />);
    this.add(<Line points={[[cx, -540], [cx, FLOOR_Y]]} stroke={O} lineWidth={6} />);
    this.add(<Rect x={cx - 12} y={(-540 + FLOOR_Y) / 2} width={14} height={540 + FLOOR_Y} fill={C.cupboardDark} />);
    for (const y of [-300, -40, 200]) {
      this.add(<Circle x={cx - 40} y={y} size={16} fill={C.rugTrim} stroke={O} lineWidth={3} />);
    }

    // mouse hole
    const hx = SET.holeX;
    const hy = FLOOR_Y - SET.holeH / 2;
    this.add(<Rect x={hx} y={hy + 4} width={SET.holeW + 18} height={SET.holeH + 10} radius={[70, 70, 0, 0]} fill={C.baseboard} />);
    this.holeClip = (<Rect x={hx} y={hy} width={SET.holeW} height={SET.holeH} radius={[62, 62, 0, 0]} fill={C.holeDark} clip />) as Rect;
    this.add(this.holeClip);
    this.add(<Rect x={hx} y={hy} width={SET.holeW} height={SET.holeH} radius={[62, 62, 0, 0]} stroke={O} lineWidth={5} />);
    const eyes = new Node({x: hx, y: hy - 6, opacity: () => this.holeEyes()});
    this.add(eyes);
    for (const ex of [-12, 12]) {
      eyes.add(<Circle x={ex} width={16} height={20} fill={C.white} />);
      eyes.add(<Circle x={() => ex + this.holeEyesLook() * 4} size={8} fill={C.pupil} />);
    }

    // rug
    this.add(<Circle x={SET.rugX} y={FLOOR_Y + 22} width={560} height={74} fill={C.rug} stroke={C.rugTrim} lineWidth={8} />);
    this.add(<Circle x={SET.rugX} y={FLOOR_Y + 22} width={430} height={44} stroke={C.rugTrim} lineWidth={4} lineDash={[14, 10]} />);

    // table
    const tb = SET.table;
    for (const lx of tb.legs) {
      this.add(<Rect x={lx} y={(tb.top + 36 + FLOOR_Y) / 2} width={28} height={FLOOR_Y - tb.top - 36} fill={C.wood} stroke={O} lineWidth={5} />);
    }
    this.add(<Rect x={(tb.left + tb.right) / 2} y={tb.top + 18} width={tb.right - tb.left} height={36} radius={6} fill={C.woodLight} stroke={O} lineWidth={6} />);
    for (let x = tb.left + 10; x < tb.right - 20; x += 60) {
      this.add(<Rect x={x + 25} y={tb.top + 52} width={50} height={34} radius={[0, 0, 25, 25]} fill={x % 120 === 50 ? C.white : C.red} stroke={O} lineWidth={3} />);
    }
  }
}
