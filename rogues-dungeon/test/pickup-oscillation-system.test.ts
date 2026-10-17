import assert from "node:assert/strict";
import test from "node:test";
import { PICKUP_OSCILLATION_AMPLITUDE_PX, PICKUP_OSCILLATION_PERIOD_MS, PICKUP_SHADOW_MINIMUM_WIDTH, pickupOscillationOffset, pickupShadowWidthScale } from "../src/systems/animation/pickup-oscillation-system.ts";

test("oscillates smoothly within the configured vertical amplitude", () => {
  const amplitudePx = PICKUP_OSCILLATION_AMPLITUDE_PX;
  assert.equal(pickupOscillationOffset(0, amplitudePx), 0);
  assert.equal(pickupOscillationOffset(PICKUP_OSCILLATION_PERIOD_MS / 4, amplitudePx), amplitudePx);
  assert.ok(Math.abs(pickupOscillationOffset(PICKUP_OSCILLATION_PERIOD_MS / 2, amplitudePx)) < 0.000001);
  assert.equal(pickupOscillationOffset(PICKUP_OSCILLATION_PERIOD_MS * 3 / 4, amplitudePx), -amplitudePx);
  assert.ok(Math.abs(pickupOscillationOffset(PICKUP_OSCILLATION_PERIOD_MS, amplitudePx)) < 0.000001);
});

test("returns no offset for invalid or disabled oscillation", () => {
  assert.equal(pickupOscillationOffset(100, 0), 0);
  assert.equal(pickupOscillationOffset(100, -3), 0);
  assert.equal(pickupOscillationOffset(Number.NaN, 3), 0);
  assert.equal(pickupOscillationOffset(100, 3, 0), 0);
});

test("narrows the shadow only while the pickup rises", () => {
  assert.equal(pickupShadowWidthScale(0, PICKUP_OSCILLATION_AMPLITUDE_PX), 1);
  assert.equal(pickupShadowWidthScale(PICKUP_OSCILLATION_AMPLITUDE_PX, PICKUP_OSCILLATION_AMPLITUDE_PX), 1);
  assert.equal(pickupShadowWidthScale(-PICKUP_OSCILLATION_AMPLITUDE_PX, PICKUP_OSCILLATION_AMPLITUDE_PX), PICKUP_SHADOW_MINIMUM_WIDTH);
  assert.equal(pickupShadowWidthScale(-PICKUP_OSCILLATION_AMPLITUDE_PX / 2, PICKUP_OSCILLATION_AMPLITUDE_PX), (1 + PICKUP_SHADOW_MINIMUM_WIDTH) / 2);
});
