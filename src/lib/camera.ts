import {Node} from '@revideo/2d';
import {
  all,
  createSignal,
  easeInOutCubic,
  linear,
  loop,
  Vector2,
  waitFor,
} from '@revideo/core';
import type {SimpleSignal, ThreadGenerator, TimingFunction} from '@revideo/core';
import {WORLD_H, WORLD_W} from '../theme/palette';

/**
 * World is authored in 1920x1080 units. The camera scales the world so its height
 * fills the viewport, then clamps the focus point so we never see past the set.
 */
export class Camera {
  public readonly focusX = createSignal(0);
  public readonly focusY = createSignal(0);
  public readonly zoom = createSignal(1);
  public readonly shakeX = createSignal(0);
  public readonly shakeY = createSignal(0);
  public readonly base: number;

  public constructor(
    public readonly world: Node,
    public readonly viewW: number,
    public readonly viewH: number,
  ) {
    this.base = viewH / WORLD_H;
    world.scale(() => this.scale());
    world.position(() => {
      const s = this.scale();
      return new Vector2(
        -this.clampedX() * s + this.shakeX(),
        -this.clampedY() * s + this.shakeY(),
      );
    });
  }

  public get portrait() {
    return this.viewH > this.viewW;
  }

  public scale() {
    return this.base * this.zoom();
  }

  public clampedX() {
    const half = Math.max(0, WORLD_W / 2 - this.viewW / (2 * this.scale()));
    return Math.max(-half, Math.min(half, this.focusX()));
  }

  public clampedY() {
    const half = Math.max(0, WORLD_H / 2 - this.viewH / (2 * this.scale()));
    return Math.max(-half, Math.min(half, this.focusY()));
  }

  public toScreen(p: [number, number]): Vector2 {
    const s = this.scale();
    return new Vector2((p[0] - this.clampedX()) * s, (p[1] - this.clampedY()) * s);
  }

  public cut(x: number, y: number, zoom: number) {
    this.focusX(x);
    this.focusY(y);
    this.zoom(zoom);
  }

  public *to(
    x: number,
    y: number,
    zoom: number,
    dur: number,
    ease: TimingFunction = easeInOutCubic,
  ): ThreadGenerator {
    yield* all(
      this.focusX(x, dur, ease),
      this.focusY(y, dur, ease),
      this.zoom(zoom, dur, ease),
    );
  }

  /** Continuously track a signal (e.g. a character's x) until the next cut/to. */
  public follow(x: () => number, y?: () => number) {
    this.focusX(x);
    if (y) this.focusY(y);
  }

  /** Blend from the current focus into tracking computed targets. */
  public *followTo(
    x: () => number,
    y: () => number,
    zoom: number,
    dur: number,
    ease: TimingFunction = easeInOutCubic,
  ): ThreadGenerator {
    const x0 = this.focusX();
    const y0 = this.focusY();
    const b = createSignal(0);
    this.focusX(() => x0 + (x() - x0) * b());
    this.focusY(() => y0 + (y() - y0) * b());
    yield* all(b(1, dur, ease), this.zoom(zoom, dur, ease));
    this.focusX(x);
    this.focusY(y);
  }

  /** Freeze the current (possibly followed) focus so the next tween starts from it. */
  public release() {
    this.focusX(this.focusX());
    this.focusY(this.focusY());
  }

  public *shake(strength: number, dur: number): ThreadGenerator {
    const steps = Math.max(1, Math.round(dur * 30));
    for (let i = 0; i < steps; i++) {
      const k = strength * (1 - i / steps);
      this.shakeX(Math.sin(i * 12.9898) * k);
      this.shakeY(Math.cos(i * 78.233) * k);
      yield* waitFor(dur / steps);
    }
    this.shakeX(0);
    this.shakeY(0);
  }
}

/** A global clock signal (seconds) that drives idle loops: tails, pendulum, stars. */
export function makeClock(): [SimpleSignal<number, void>, ThreadGenerator] {
  const t = createSignal(0);
  return [t, loop(() => t(t() + 1, 1, linear))];
}
