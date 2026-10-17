import type { GameEvent } from "./types.ts";
import { createDamageParticles, type ParticleEffect } from "../systems/animation/particle-effects-system.ts";

export function projectDamageParticles(events: (Pick<GameEvent, "type" | "facts"> & Partial<GameEvent>)[]): ParticleEffect[] {
  return events.flatMap((event) => {
    const facts = event.facts ?? {};
    // A player's Health decrease is the single source of truth for player damage,
    // regardless of whether it came from combat, a trap, or a future hazard.
    if (event.type === "resource.changed" && facts.resource === "health" && facts.current! < facts.previous! && facts.position) return createDamageParticles(facts.position).map((effect) => ({ ...effect, targetId: "player" }));
    if (event.type === "combat.hit" && facts.targetId !== "player" && facts.damage! > 0 && facts.targetPosition) return createDamageParticles(facts.targetPosition).map((effect) => ({ ...effect, targetId: facts.targetId }));
    if (event.type === "crate.opened" && facts.position) return createDamageParticles(facts.position).map((effect) => ({ ...effect, targetId: facts.id }));
    return [];
  });
}
