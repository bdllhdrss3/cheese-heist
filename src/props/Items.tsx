import {Circle, Line, Node, Rect} from '@revideo/2d';
import type {NodeProps} from '@revideo/2d';
import {createSignal, easeInCubic} from '@revideo/core';
import type {ThreadGenerator} from '@revideo/core';
import {C} from '../theme/palette';
import {starPoints} from '../fx/Fx';

/** Cheese wedge, origin at bottom-center. */
export class Cheese extends Node {
  public readonly shine = createSignal(0);

  public constructor(props: NodeProps) {
    super(props);
    const O = C.outline;
    this.add(<Line points={[[-62, 0], [62, 0], [62, -60], [-62, -18]]} closed fill={C.cheese} stroke={O} lineWidth={5} lineJoin={'round'} />);
    this.add(<Line points={[[-62, -18], [62, -60], [62, -48], [-62, -10]]} closed fill={'#ffe27a'} />);
    for (const [x, y, s] of [[-30, -12, 16], [8, -22, 22], [40, -14, 12], [44, -40, 14], [-4, -6, 9]]) {
      this.add(<Circle x={x} y={y} size={s} fill={C.cheeseDark} />);
    }
    this.add(
      <Line
        x={50}
        y={-70}
        points={starPoints(26, 8, 4)}
        closed
        fill={C.white}
        scale={() => this.shine()}
        rotation={() => this.shine() * 90}
      />,
    );
  }
}

/** Spring mousetrap, origin at bottom-center. `arm` 0 = cocked, 1 = snapped. */
export class Mousetrap extends Node {
  public readonly arm = createSignal(0);
  public readonly bait: Node;

  public constructor(props: NodeProps) {
    super(props);
    const O = C.outline;
    this.add(<Rect y={-11} width={130} height={22} radius={4} fill={'#d3a86b'} stroke={O} lineWidth={4} />);
    this.add(<Line points={[[-40, -22], [40, -22]]} stroke={C.metalDark} lineWidth={4} />);
    this.add(<Rect x={34} y={-26} width={26} height={8} fill={C.metal} stroke={O} lineWidth={2} />);
    this.bait = new Node({x: 36, y: -30, scale: 0.35});
    this.add(this.bait);
    const bar = new Node({y: -22, rotation: () => -180 * this.arm()});
    this.add(bar);
    bar.add(<Line points={[[0, 0], [-56, 0], [-56, -8], [0, -8]]} stroke={C.metal} lineWidth={5} lineJoin={'round'} />);
    this.add(<Circle y={-22} size={12} fill={C.metalDark} stroke={O} lineWidth={2} />);
  }

  public *snapShut(): ThreadGenerator {
    yield* this.arm(1, 0.07, easeInCubic);
  }
}

/** Frying pan, origin at the handle grip. */
export class FryingPan extends Node {
  public constructor(props: NodeProps) {
    super(props);
    const O = C.outline;
    this.add(<Rect y={-50} width={18} height={100} radius={8} fill={C.woodDark} stroke={O} lineWidth={4} />);
    this.add(<Circle y={-150} size={130} fill={C.pan} stroke={O} lineWidth={5} />);
    this.add(<Circle y={-150} size={96} stroke={'#4a4d5a'} lineWidth={8} />);
    this.add(<Circle x={-24} y={-172} width={26} height={14} rotation={-30} fill={'#6d7180'} />);
  }
}

/** Tiny curtain that Pip draws over his mouse hole. `closed` 0..1. */
export class Curtain extends Node {
  public readonly closed = createSignal(0);

  public constructor(props: NodeProps & {width: number; height: number}) {
    super(props);
    const O = C.outline;
    const w = props.width;
    const h = props.height;
    for (const dir of [-1, 1]) {
      this.add(
        <Rect
          x={() => dir * (w / 2 - (w / 4) * this.closed())}
          y={h / 2}
          offset={[0, 0]}
          width={() => 8 + (w / 2) * this.closed()}
          height={h}
          radius={4}
          fill={'#e0527a'}
          stroke={O}
          lineWidth={3}
        />,
      );
      this.add(<Circle x={dir * (w / 2 + 8)} y={2} size={12} fill={C.rugTrim} stroke={O} lineWidth={2} />);
    }
    this.add(<Line points={[[-w / 2 - 12, 0], [w / 2 + 12, 0]]} stroke={C.woodDark} lineWidth={6} lineCap={'round'} />);
  }
}
