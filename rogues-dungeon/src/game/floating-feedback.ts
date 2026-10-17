import type { Feedback, GameEvent } from "./types.ts";
const FEEDBACK_DURATION_MS = 900;

export function projectFloatingFeedback(events: (Pick<GameEvent, "type" | "facts"> & Partial<GameEvent>)[]): Feedback[] {
  return events.flatMap((event) => {
    const facts = event.facts ?? {};
    if (event.type === "resource.changed" && facts.resource === "health" && facts.current !== facts.previous && facts.position) {
      const gained = facts.current! > facts.previous!;
      return [{
        id: event.eventId,
        kind: `player-${facts.attackDirection ?? "damage"}`,
        text: `${gained ? "+" : "−"}${Math.abs(facts.current! - facts.previous!)}`,
        color: gained ? "gain" : "loss",
        x: facts.position.x,
        y: facts.position.y,
        duration: FEEDBACK_DURATION_MS,
      }];
    }
    if (event.type === "combat.hit" && facts.targetPosition && facts.targetId !== "player" && facts.outcome === "MISS") {
      return [{ id: event.eventId, kind: "enemy", text: "MISS", color: "miss", x: facts.targetPosition.x, y: facts.targetPosition.y, duration: FEEDBACK_DURATION_MS }];
    }
    if (event.type === "combat.hit" && facts.targetPosition && facts.targetId !== "player" && facts.damage! > 0) {
      return [{
        id: event.eventId,
        kind: "enemy",
        text: facts.outcome === "CRIT" ? `CRIT ${facts.damage}` : `−${facts.damage}`,
        color: "loss",
        x: facts.targetPosition.x,
        y: facts.targetPosition.y,
        duration: FEEDBACK_DURATION_MS,
      }];
    }
    return [];
  });
}

export function removeFloatingFeedback(feedback: Feedback[], id: string | undefined) {
  return feedback.filter((effect) => effect.id !== id);
}
