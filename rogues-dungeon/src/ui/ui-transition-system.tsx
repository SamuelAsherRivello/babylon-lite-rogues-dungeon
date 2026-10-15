import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TweenAnimationSystem, easeOutCubic } from "../systems/animation/tween-animation-system.ts";

export type UiAnimationKind = "status-controls" | "status-summary" | "info-primary" | "info-secondary" | "info-primary-tab" | "info-secondary-tab" | "game-view";

export interface UiMotion {
  x?: number;
  y?: number;
  opacity?: number;
  depth?: number;
  leftPercent?: number;
  leftOffsetRem?: number;
  widthPercent?: number;
}

interface CompletedUiMotion {
  x: number;
  y: number;
  opacity: number;
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
const complete = (motion: UiMotion): CompletedUiMotion => ({ x: motion.x ?? 0, y: motion.y ?? 0, opacity: motion.opacity ?? 1, depth: motion.depth ?? 0, leftPercent: motion.leftPercent, leftOffsetRem: motion.leftOffsetRem, widthPercent: motion.widthPercent });
const toStyle = (motion: CompletedUiMotion): UiMotionStyle => ({ transform: `translate3d(${motion.x}%, ${motion.y}%, 0)`, opacity: motion.opacity, zIndex: motion.depth, ...(motion.leftPercent === undefined ? {} : { left: `calc(${motion.leftPercent}% + ${motion.leftOffsetRem ?? 0}rem)` }), ...(motion.widthPercent === undefined ? {} : { width: `${motion.widthPercent}%` }) });

/**
 * Applies tweening to the vocabulary shared by the in-viewport UI: horizontal
 * or vertical position, opacity, and explicit stacking depth. New targets
 * cancel the in-flight tween and continue from its current visual value.
 */
export function useUiMotion(_kind: UiAnimationKind, target: UiMotion, duration = 250): UiMotionStyle {
  const targetMotion = complete(target);
  const current = useRef(targetMotion);
  const cancel = useRef<(() => void) | null>(null);
  const [style, setStyle] = useState(() => toStyle(targetMotion));
  const targetKey = `${targetMotion.x},${targetMotion.y},${targetMotion.opacity},${targetMotion.depth},${targetMotion.leftPercent},${targetMotion.leftOffsetRem},${targetMotion.widthPercent}`;

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
      easing: easeOutCubic,
      onUpdate(progress) {
        const value: CompletedUiMotion = {
          x: from.x + (next.x - from.x) * progress,
          y: from.y + (next.y - from.y) * progress,
          opacity: from.opacity + (next.opacity - from.opacity) * progress,
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
  }, [targetKey, duration]);

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
  return <div className={`ui_iris_transition ui_iris_transition--${phase}`} style={{ "--ui-transition-duration": `${defaultIrisTransition.durationMs}ms` }} aria-live="polite" aria-busy={covered}>{covered && <span>{label}</span>}</div>;
}
