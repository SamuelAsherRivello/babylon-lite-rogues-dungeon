import type { Campaign, GameEvent, Quest, QuestItemId } from "../../game/types.ts";
import { createGameSession as createCoreGameSession } from "../procedural/world-procedural-system.ts";

const QUEST_ITEMS = [
  { id: "walk-through-stairs", title: "Walk through the stairs" },
  { id: "collect-health-potion", title: "Collect a Health Potion" },
  { id: "collect-coin", title: "Collect a coin" },
] as const;

export function createMyFirstQuest(): Quest {
  return { id: "my-first-quest", title: "My First Quest", items: QUEST_ITEMS.map((item) => ({ ...item, complete: false })), activeItemId: "walk-through-stairs" };
}

function itemIds(value: unknown): QuestItemId[] {
  return Array.isArray(value) ? value.map((item) => typeof item === "object" && item !== null ? (item as { id?: unknown }).id : null).filter((id): id is QuestItemId => QUEST_ITEMS.some((item) => item.id === id)) : [];
}

export function normalizeQuest(value: unknown): Quest {
  const source = value && typeof value === "object" ? value as Partial<Quest> : null;
  const completed = new Set(itemIds(source?.items).filter((id) => (source?.items as Quest["items"] | undefined)?.find((item) => item.id === id)?.complete === true));
  const items = QUEST_ITEMS.map((item) => ({ ...item, complete: completed.has(item.id) }));
  const requested = source?.activeItemId;
  const activeItemId = items.some((item) => !item.complete && item.id === requested) ? requested! : items.find((item) => !item.complete)?.id ?? null;
  return { id: "my-first-quest", title: "My First Quest", items, activeItemId };
}

export function currentQuest(campaign: Campaign): Quest { return normalizeQuest(campaign.quest); }

function matches(itemId: QuestItemId, event: GameEvent) {
  if (itemId === "walk-through-stairs") return event.type === "realm.entered";
  if (itemId === "collect-health-potion") return event.type === "item.collected" && (event.facts.resource === "health" || event.facts.name === "Health Potion" || event.facts.item === "Health Potion");
  return event.type === "item.collected" && event.facts.destination === "gold";
}

export function projectQuestEvents(campaign: Campaign, events: readonly GameEvent[]) {
  const quest = currentQuest(campaign);
  for (const event of events) {
    const item = quest.items.find((candidate) => !candidate.complete && matches(candidate.id, event));
    if (!item) continue;
    const wasActive = quest.activeItemId === item.id;
    item.complete = true;
    if (wasActive) quest.activeItemId = quest.items.find((candidate) => !candidate.complete)?.id ?? null;
  }
  campaign.quest = quest;
  return quest;
}

export function attachQuestSubscriber(session: { subscribe(listener: (result: { state: Campaign; events: GameEvent[]; accepted: boolean }) => void): () => void }) {
  return session.subscribe((result) => { if (result.accepted) projectQuestEvents(result.state, result.events); });
}

export function createQuestGameSession(initial: Campaign, options: Parameters<typeof createCoreGameSession>[1] = {}) {
  const session = createCoreGameSession(initial, options);
  attachQuestSubscriber(session);
  return session;
}
