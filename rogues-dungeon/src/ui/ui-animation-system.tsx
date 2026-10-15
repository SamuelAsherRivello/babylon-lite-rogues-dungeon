import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TweenAnimationSystem, easeOutCubic } from "../systems/animation/tween-animation-system.ts";

export type UiAnimationKind = "status-controls" | "status-summary" | "info-primary" | "info-secondary";

export interface UiMotion {
  x?: number;
  y?: number;
  opacity?: number;
  depth?: number;
}

export type UiMotionStyle = CSSProperties;

const uiTweenSystem = new TweenAnimationSystem();
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const complete = (motion: UiMotion): Required<UiMotion> => ({ x: motion.x ?? 0, y: motion.y ?? 0, opacity: motion.opacity ?? 1, depth: motion.depth ?? 0 });
const toStyle = (motion: Required<UiMotion>): UiMotionStyle => ({ transform: `translate3d(${motion.x}%, ${motion.y}%, 0)`, opacity: motion.opacity, zIndex: motion.depth });

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
  const targetKey = `${targetMotion.x},${targetMotion.y},${targetMotion.opacity},${targetMotion.depth}`;

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
        const value: Required<UiMotion> = {
          x: from.x + (next.x - from.x) * progress,
          y: from.y + (next.y - from.y) * progress,
          opacity: from.opacity + (next.opacity - from.opacity) * progress,
          depth: next.depth,
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
  // targetKey deliberately compares the four UI animation values rather than object identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, duration]);

  return style;
}
