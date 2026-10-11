import type { EventFacts, GameEvent, LogEntry } from "./types.ts";
const LOG_RULES: Readonly<Partial<Record<string, (facts: EventFacts) => string>>> = Object.freeze({
  "item.collected": (facts) => `You collect ${facts.name}.`,
  "potion.consumed": (facts) => `You restore ${facts.resource === "health" ? "Health" : "Mana"}.`,
  "equipment.changed": (facts) => facts.item ? `You ${facts.action === "enabled" ? "equip" : facts.action === "returned to inventory" ? "return" : "rearrange"} ${facts.item}.` : "You change your equipment.",
  "ability.used": (facts) => `You use ${facts.title}.`,
  "enemy.defeated": (facts) => `You defeat ${facts.name}.`,
  "realm.entered": (facts) => `You enter Level ${facts.level ?? facts.realm}.`,
  "player.died": () => "You die and return to Level 1.",
  "campaign.save.failed": () => "You cannot save this game.",
});

export function formatLogEvent(event: Pick<GameEvent, "type" | "facts">) { return LOG_RULES[event.type]?.(event.facts) ?? null; }
export function projectLogEvents(currentLog: LogEntry[], events: (Pick<GameEvent, "type" | "facts"> & Partial<GameEvent>)[]): LogEntry[] {
  const known = new Set(currentLog.map((entry) => entry.id));
  const appended = [];
  for (const event of events) {
    const text = formatLogEvent(event);
    if (!text || known.has(event.eventId)) continue;
    known.add(event.eventId); appended.push({ id: event.eventId, text });
  }
  return [...currentLog, ...appended].slice(-200);
}
