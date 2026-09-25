import {Circle, Node, Rect, Txt} from '@revideo/2d';
import type {NodeProps} from '@revideo/2d';
import {all, createSignal, easeInCubic, easeInOutCubic, easeOutBack, Vector2, waitFor} from '@revideo/core';
import type {ThreadGenerator} from '@revideo/core';
import {C} from '../theme/palette';
import {FONT} from './Fx';

/** Screen-space overlay (title card, iris wipe, end card). Not affected by the camera. */
export class Hud extends Node {
  public readonly irisSize = createSignal(10000);
  public readonly irisCenter = createSignal(new Vector2(0, 0));
  private readonly k: number;
  private readonly title: Node;
  private readonly endCard: Node;

  public constructor(props: NodeProps & {viewW: number; viewH: number}) {
    super(props);
    const portrait = props.viewH > props.viewW;
    this.k = portrait ? 0.66 : 1;
    const k = this.k;

    this.title = new Node({scale: 0, y: portrait ? -520 : -180});
    this.add(this.title);
    this.title.add(<Rect width={1180 * k} height={380 * k} radius={40 * k} fill={C.red} stroke={C.white} lineWidth={12 * k} rotation={-3} shadowColor={'#0008'} shadowBlur={30} shadowOffset={[0, 14]} />);
    this.title.add(<Txt y={-70 * k} text={'THE CHEESE'} fontFamily={FONT} fontSize={150 * k} fill={C.cheese} stroke={C.outline} lineWidth={14 * k} strokeFirst rotation={-3} />);
    this.title.add(<Txt y={80 * k} text={'HEIST'} fontFamily={FONT} fontSize={170 * k} fill={C.white} stroke={C.outline} lineWidth={14 * k} strokeFirst rotation={-3} />);
    this.title.add(<Txt y={230 * k} text={'starring Whiskers & Pip'} fontFamily={FONT} fontSize={44 * k} fill={C.white} stroke={C.outline} lineWidth={8 * k} strokeFirst />);

    const iris = new Node({cache: true});
    this.add(iris);
    iris.add(<Rect width={props.viewW * 1.2} height={props.viewH * 1.2} fill={C.black} opacity={() => (this.irisSize() > 9000 ? 0 : 1)} />);
    iris.add(<Circle position={() => this.irisCenter()} size={() => this.irisSize()} fill={C.white} compositeOperation={'destination-out'} />);

    this.endCard = new Node({opacity: 0});
    this.add(this.endCard);
    this.endCard.add(<Txt y={-30 * k} text={'THE END'} fontFamily={FONT} fontSize={180 * k} fill={C.cheese} stroke={C.white} lineWidth={10 * k} strokeFirst />);
    this.endCard.add(<Txt y={110 * k} text={'Whiskers & Pip will return!'} fontFamily={FONT} fontSize={48 * k} fill={C.white} />);
  }

  public *showTitle(hold: number): ThreadGenerator {
    yield* this.title.scale(1, 0.5, easeOutBack);
    yield* all(this.title.rotation(2, hold / 2, easeInOutCubic).to(-2, hold / 2, easeInOutCubic));
    yield* all(this.title.scale(0, 0.3, easeInCubic), this.title.opacity(0, 0.3));
  }

  public *irisTo(center: Vector2, dur: number): ThreadGenerator {
    this.irisCenter(center);
    this.irisSize(3200);
    yield* this.irisSize(220, dur * 0.7, easeInOutCubic);
    yield* waitFor(dur * 0.1);
    yield* this.irisSize(0, dur * 0.2, easeInCubic);
  }

  public *showEnd(): ThreadGenerator {
    this.endCard.scale(0.6);
    yield* all(this.endCard.opacity(1, 0.3), this.endCard.scale(1, 0.5, easeOutBack));
  }
}
