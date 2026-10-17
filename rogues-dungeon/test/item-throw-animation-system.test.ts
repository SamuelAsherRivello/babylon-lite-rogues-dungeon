import assert from "node:assert/strict";
import test from "node:test";
import { ITEM_THROW_DURATION_MS, itemThrowExpired, itemThrowPosition, throwItems } from "../src/systems/animation/item-throw-animation-system.ts";

test("throwItems launches every supplied item from one origin and preserves its destination", () => {
  const throws = throwItems({ x: 4, y: 5 }, [
    { id: "chest-gold-1", kind: "gold", destination: { x: 3, y: 4 } },
    { id: "crate-gold-1", kind: "gold", destination: { x: 5, y: 6 } },
  ], 100);

  assert.deepEqual(throws.map(({ id, kind, origin, destination }) => ({ id, kind, origin, destination })), [
    { id: "chest-gold-1", kind: "gold", origin: { x: 4, y: 5 }, destination: { x: 3, y: 4 } },
    { id: "crate-gold-1", kind: "gold", origin: { x: 4, y: 5 }, destination: { x: 5, y: 6 } },
  ]);
  assert.deepEqual(itemThrowPosition(throws[0]!, 100), { x: 4, y: 5 });
  assert.deepEqual(itemThrowPosition(throws[0]!, 100 + ITEM_THROW_DURATION_MS), { x: 3, y: 4 });
  assert.equal(itemThrowExpired(throws[0]!, 100 + ITEM_THROW_DURATION_MS - 1), false);
  assert.equal(itemThrowExpired(throws[0]!, 100 + ITEM_THROW_DURATION_MS), true);
});
