# Design

## Context

See proposal.md for motivation. Campaign state currently has a legacy `objective` string and the Quest card renders placeholder markup. The world resolver emits structured `realm.entered` and `item.collected` events; the session publishes committed results before the React view stores the next campaign.

## Goals / Non-Goals

**Goals:**

- Keep quest state serializable, campaign-owned, and independent of React and world-rule modules.
- Derive completion solely by consuming existing structured game events.
- Give future minimap and hint systems a stable read-only quest query.

**Non-Goals:**

- Multiple simultaneous quests, manual item selection, new quest assignment, map guidance, and quest-specific world-generation changes.
- Replacing the existing event bus or adding quest text to the Log.

## Decisions

### Domain-owned quest data and a pure event projector

Add quest contracts to the serializable game types and create an isolated quest module containing My First Quest’s definition, migration/normalization helpers, an event projector, and a read-only query. The session applies the projector after a committed action result and before autosave subscribers consume the state.

Keeping the logic in React would make save and non-UI callers unreliable. Adding quest checks directly to world action branches would couple every future quest to gameplay code, so it is rejected.

### Match stable structured event facts

The projector recognizes `realm.entered`, Health Potion `item.collected`, and gold `item.collected` events. It reads facts already published by generic systems and does not add quest identity or quest mutation to publishers. A predicate based on rendered text is rejected; matching the event type plus structured item/resource/destination facts is resilient to UI changes.

### Ordered active-item projection

Quest item order is persistent declaration order. Any matching event completes its item; if it was active, the projector selects the first remaining unfinished item, otherwise it retains the current selection. This satisfies concurrent availability without needing a new player input surface.

### Save migration and UI projection

New campaigns receive My First Quest. Save normalization adds it when absent, preserves valid quest state when present, and repairs an invalid active item from item completion state. The Quest card consumes the public query rather than hard-coding labels; CSS supplies visual-only arrow and strike-through states.

## Risks / Trade-offs

- [Risk] Legacy saves can hold malformed quest data → Mitigation: normalize to the known first quest and recompute active state.
- [Risk] Event facts may evolve → Mitigation: centralize predicates in the quest module and test both matching and ignored events.
- [Risk] A quest completion can occur during a transition → Mitigation: project all committed result events before persistence, using their published order.

## Migration Plan

1. Add quest state to newly created campaigns and normalize missing/invalid saved state on load and write.
2. Project event results before autosave so reload cannot lose a completed item.
3. Retain the old `objective` field only for compatibility until its consumers are separately removed.
