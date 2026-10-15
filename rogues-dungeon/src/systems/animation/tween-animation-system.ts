export type TweenEasing = (progress: number) => number;

export const easeOutCubic: TweenEasing = (progress) => 1 - (1 - progress) ** 3;

export interface TweenScheduler {
  now(): number;
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(handle: number): void;
}

const browserScheduler: TweenScheduler = {
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
};

export interface NumberTween {
  from: number;
  to: number;
  duration: number;
  easing?: TweenEasing;
  onUpdate(value: number): void;
  onComplete?(): void;
}

/** A cancellable, browser-frame numeric tween with no UI dependencies. */
export class TweenAnimationSystem {
  constructor(private readonly scheduler: TweenScheduler = browserScheduler) {}

  tween({ from, to, duration, easing = easeOutCubic, onUpdate, onComplete }: NumberTween) {
    let frame: number | null = null;
    let cancelled = false;
    const start = this.scheduler.now();
    const finish = () => {
      onUpdate(to);
      onComplete?.();
    };
    if (duration <= 0 || from === to) {
      finish();
      return () => { cancelled = true; };
    }
    const step = () => {
      if (cancelled) return;
      const progress = Math.min(1, Math.max(0, (this.scheduler.now() - start) / duration));
      onUpdate(from + (to - from) * easing(progress));
      if (progress === 1) {
        frame = null;
        onComplete?.();
      } else frame = this.scheduler.requestFrame(step);
    };
    onUpdate(from);
    frame = this.scheduler.requestFrame(step);
    return () => {
      cancelled = true;
      if (frame !== null) this.scheduler.cancelFrame(frame);
    };
  }
}
