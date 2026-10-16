import { TweenAnimationSystem, type TweenScheduler } from "./tween-animation-system.ts";

export const PLAYER_TAKE_DAMAGE_ANIMATION = "player-take-damage";
const PLAYER_TAKE_DAMAGE_DURATION_MS = 100;
const PLAYER_TAKE_DAMAGE_PEAK_SCALE = 1.01;

export interface CameraTransform {
  positionPx: [number, number];
  scale: number;
}

export interface CameraAnimationTarget {
  transform: CameraTransform;
  render(): void;
}

/**
 * Animates the shared camera-parent transform. Applying this transform to every
 * world layer keeps terrain, actors, particles, and props in one game view.
 */
export class CameraAnimationSystem {
  private cancelCurrent: (() => void) | null = null;

  constructor(private readonly tweenSystem = new TweenAnimationSystem()) {}

  play(animation: typeof PLAYER_TAKE_DAMAGE_ANIMATION, target: CameraAnimationTarget) {
    if (animation === PLAYER_TAKE_DAMAGE_ANIMATION) this.playerTakeDamage(target);
  }

  private playerTakeDamage(target: CameraAnimationTarget) {
    this.cancel();
    const baseScale = target.transform.scale;
    const animate = (from: number, to: number, onComplete?: () => void) => {
      this.cancelCurrent = this.tweenSystem.tween({
        from,
        to,
        duration: PLAYER_TAKE_DAMAGE_DURATION_MS / 2,
        onUpdate: (scale) => {
          target.transform.scale = scale;
          target.render();
        },
        onComplete,
      });
    };
    animate(baseScale, baseScale * PLAYER_TAKE_DAMAGE_PEAK_SCALE, () => animate(baseScale * PLAYER_TAKE_DAMAGE_PEAK_SCALE, baseScale));
  }

  cancel() {
    this.cancelCurrent?.();
    this.cancelCurrent = null;
  }

  dispose() { this.cancel(); }
}

export type { TweenScheduler };
