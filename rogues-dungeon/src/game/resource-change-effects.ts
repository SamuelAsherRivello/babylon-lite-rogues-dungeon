import type { GameEvent } from "./types.ts";

export const resourceChangeEffectDurationMs = 350;
export type ResourceChangeEffectColor = "health-loss" | "health-gain" | "mana";
export interface ResourceChangeEffect {
  readonly id: string;
  readonly color: ResourceChangeEffectColor;
  readonly duration: number;
}

export function projectResourceChangeEffects(events: readonly Pick<GameEvent, "eventId" | "facts" | "outcome" | "type">[]): ResourceChangeEffect[] {
  return events.flatMap<ResourceChangeEffect>((event) => {
    if (event.type !== "resource.changed" || event.outcome === "rejected" || !event.eventId) return [];
    const { current, previous, resource } = event.facts;
    if (typeof current !== "number" || typeof previous !== "number" || current === previous) return [];
    if (resource === "health") return [{ id: event.eventId, color: current > previous ? "health-gain" : "health-loss", duration: resourceChangeEffectDurationMs }];
    if (resource === "mana") return [{ id: event.eventId, color: "mana", duration: resourceChangeEffectDurationMs }];
    return [];
  });
}

export function removeResourceChangeEffect(effects: readonly ResourceChangeEffect[], id: string) {
  return effects.filter((effect) => effect.id !== id);
}
