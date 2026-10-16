import assert from "node:assert/strict";
import test from "node:test";
import { generateFloor } from "../src/systems/procedural/world-procedural-system.ts";
import { isWallDecorationCell, trapFrameAt, trapIsDangerous, trapStrikeDamage } from "../src/systems/procedural/world-hazards-system.ts";

test("loops a trap animation once, pauses for three seconds, and leaves only middle frames dangerous", () => {
  assert.equal(trapFrameAt(0), 0);
  assert.equal(trapFrameAt(150), 1);
  assert.equal(trapFrameAt(900), 6);
  assert.equal(trapFrameAt(1_050), 6, "the final frame holds during the pause");
  assert.equal(trapFrameAt(4_049), 6);
  assert.equal(trapFrameAt(4_050), 0, "the cycle restarts after its three-second pause");
  assert.equal(trapIsDangerous(0), false);
  assert.equal(trapIsDangerous(6), false);
  assert.equal(trapIsDangerous(1), true);
  assert.equal(trapStrikeDamage(0, 6), 6);
});

test("distributes wall torches on valid faces and traps on walkable cells", () => {
  for (const seed of [17, 914]) {
    const floor = generateFloor(1, seed, 1);
    assert.ok(floor.decorations!.some((decoration) => decoration.kind === "torch"));
    assert.ok(floor.decorations!.some((decoration) => decoration.kind === "trap"));
    for (const decoration of floor.decorations!) {
      if (decoration.kind === "torch") assert.equal(isWallDecorationCell(floor.map!, decoration), true, `${seed}:${decoration.id} must have a walkable left, right, or bottom neighbor`);
      else assert.equal(floor.cells[decoration.y][decoration.x].walkable, true, `${seed}:${decoration.id} must be walkable so it can hurt the player`);
    }
  }
});

test("adds one extra walkable trap beside the level-one test entrance", () => {
  const floor = generateFloor(1, 17, 1, { level1TestMode: true });
  const traps = floor.decorations!.filter((decoration) => decoration.kind === "trap");
  assert.equal(traps.length, 3);
  assert.ok(traps.some((trap) => Math.abs(trap.x - floor.start.x) <= 2 && Math.abs(trap.y - floor.start.y) <= 1));
});
