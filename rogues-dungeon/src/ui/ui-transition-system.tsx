import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TweenAnimationSystem, easeOutCubic, type TweenEasing } from "../systems/animation/tween-animation-system.ts";

export type UiAnimationKind = "status-controls" | "status-summary" | "info-primary" | "info-secondary" | "info-primary-tab" | "info-secondary-tab" | "game-view" | "enemy-tooltip" | "main-menu" | "settings-menu";

export interface UiMotion {
  x?: number;
  xOffsetRem?: number;
  xOffsetPx?: number;
  y?: number;
  opacity?: number;
  scale?: number;
  depth?: number;
  leftPercent?: number;
  leftOffsetRem?: number;
  widthPercent?: number;
}

interface CompletedUiMotion {
  x: number;
  xOffsetRem?: number;
  xOffsetPx?: number;
  y: number;
  opacity: number;
  scale: number;
  depth: number;
  leftPercent?: number;
  leftOffsetRem?: number;
  widthPercent?: number;
}

export type UiMotionStyle = CSSProperties;
export type UiIrisPhase = "open" | "closing" | "closed" | "opening";

export const defaultIrisTransition = Object.freeze({ durationMs: 350 });

const uiTweenSystem = new TweenAnimationSystem();
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const complete = (motion: UiMotion): CompletedUiMotion => ({ x: motion.x ?? 0, xOffsetRem: motion.xOffsetRem, xOffsetPx: motion.xOffsetPx, y: motion.y ?? 0, opacity: motion.opacity ?? 1, scale: motion.scale ?? 1, depth: motion.depth ?? 0, leftPercent: motion.leftPercent, leftOffsetRem: motion.leftOffsetRem, widthPercent: motion.widthPercent });
const toStyle = (motion: CompletedUiMotion): UiMotionStyle => ({ transform: `translate3d(calc(${motion.x}% + ${motion.xOffsetRem ?? 0}rem + ${motion.xOffsetPx ?? 0}px), ${motion.y}%, 0)`, opacity: motion.opacity, scale: motion.scale, zIndex: motion.depth, ...(motion.leftPercent === undefined ? {} : { left: `calc(${motion.leftPercent}% + ${motion.leftOffsetRem ?? 0}rem)` }), ...(motion.widthPercent === undefined ? {} : { width: `${motion.widthPercent}%` }) });

/**
 * Applies tweening to the vocabulary shared by the in-viewport UI: horizontal
 * or vertical position, opacity, and explicit stacking depth. New targets
 * cancel the in-flight tween and continue from its current visual value.
 */
export function useUiMotion(_kind: UiAnimationKind, target: UiMotion, duration = 250, easing: TweenEasing = easeOutCubic): UiMotionStyle {
  const targetMotion = complete(target);
  const current = useRef(targetMotion);
  const cancel = useRef<(() => void) | null>(null);
  const [style, setStyle] = useState(() => toStyle(targetMotion));
  const targetKey = `${targetMotion.x},${targetMotion.xOffsetRem},${targetMotion.xOffsetPx},${targetMotion.y},${targetMotion.opacity},${targetMotion.scale},${targetMotion.depth},${targetMotion.leftPercent},${targetMotion.leftOffsetRem},${targetMotion.widthPercent}`;

  useEffect(() => {
    const next = complete(target);
    cancel.current?.();
    const from = current.current;
    // Depth changes immediately so an entering panel can travel behind its peer.
    current.current = { ...from, depth: next.depth };
    if (reduceMotion()) {
      current.current = next;
      setStyle(toStyle(next));
      return undefined;
    }
    const started = performance.now();
    const stop = uiTweenSystem.tween({
      from: 0,
      to: 1,
      duration,
      easing,
      onUpdate(progress) {
        const value: CompletedUiMotion = {
          x: from.x + (next.x - from.x) * progress,
          xOffsetRem: next.xOffsetRem === undefined ? undefined : (from.xOffsetRem ?? next.xOffsetRem) + (next.xOffsetRem - (from.xOffsetRem ?? next.xOffsetRem)) * progress,
          xOffsetPx: next.xOffsetPx === undefined ? undefined : (from.xOffsetPx ?? next.xOffsetPx) + (next.xOffsetPx - (from.xOffsetPx ?? next.xOffsetPx)) * progress,
          y: from.y + (next.y - from.y) * progress,
          opacity: from.opacity + (next.opacity - from.opacity) * progress,
          scale: from.scale + (next.scale - from.scale) * progress,
          depth: next.depth,
          leftPercent: next.leftPercent === undefined ? undefined : (from.leftPercent ?? next.leftPercent) + (next.leftPercent - (from.leftPercent ?? next.leftPercent)) * progress,
          leftOffsetRem: next.leftOffsetRem === undefined ? undefined : (from.leftOffsetRem ?? next.leftOffsetRem) + (next.leftOffsetRem - (from.leftOffsetRem ?? next.leftOffsetRem)) * progress,
          widthPercent: next.widthPercent === undefined ? undefined : (from.widthPercent ?? next.widthPercent) + (next.widthPercent - (from.widthPercent ?? next.widthPercent)) * progress,
        };
        current.current = value;
        setStyle(toStyle(value));
      },
      onComplete() { current.current = next; },
    });
    cancel.current = stop;
    return () => {
      stop();
      if (performance.now() === started) current.current = from;
    };
  // targetKey deliberately compares UI animation values rather than object identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, duration, easing]);

  return style;
}

/** Cover then reveal a UI region through a centered circular iris. */
export function UiIrisTransition({ phase, label = "Loading world", onPhaseComplete }: { phase: UiIrisPhase; label?: string; onPhaseComplete?(phase: UiIrisPhase): void }) {
  useEffect(() => {
    if (phase !== "closing" && phase !== "opening") return undefined;
    const delay = reduceMotion() ? 0 : defaultIrisTransition.durationMs;
    const timer = window.setTimeout(() => onPhaseComplete?.(phase), delay);
    return () => window.clearTimeout(timer);
  }, [onPhaseComplete, phase]);
  const covered = phase === "closing" || phase === "closed";
  return <div className={`ui_iris_transition ui_iris_transition--${phase}`} style={{ "--ui-transition-duration": `${defaultIrisTransition.durationMs}ms` } as CSSProperties} aria-live="polite" aria-busy={covered}>{covered && <span>{label}</span>}</div>;
}
