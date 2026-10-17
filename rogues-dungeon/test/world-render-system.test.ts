import assert from "node:assert/strict";
import test from "node:test";
import { compileStaticWorldPresentation, getVisibleWorldCellBounds, isWorldCellVisible } from "../src/systems/rendering/world-render-system.ts";

test("compiled static presentation is reused for unchanged floor layers", () => {
  const cells = [[{ walkable: true, terrain: "floor" }]] as never;
  const ground = [1];
  const walls = [0];
  const first = compileStaticWorldPresentation(cells, 32, ground, walls);
  const second = compileStaticWorldPresentation(cells, 32, ground, walls);

  assert.strictEqual(second, first);
  assert.strictEqual(second.terrain, first.terrain);
});

test("visible world bounds retain a one-cell sprite margin", () => {
  const bounds = getVisibleWorldCellBounds({ x: 10, y: 10 }, 4, 4);
  assert.equal(isWorldCellVisible({ x: 7, y: 10 }, bounds), true);
  assert.equal(isWorldCellVisible({ x: 6, y: 10 }, bounds), false);
});
