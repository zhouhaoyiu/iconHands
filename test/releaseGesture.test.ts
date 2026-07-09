import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseGestureState,
  updateReleaseGesture,
} from "../src/releaseGesture.ts";

function sample(
  state: ReturnType<typeof createReleaseGestureState>,
  fist: boolean,
  open: boolean,
  dtSec: number,
  squeeze = 1
) {
  return updateReleaseGesture(state, {
    fist,
    open,
    attracting: true,
    squeeze,
    dtSec,
  });
}

test("natural fist-to-open transition releases", () => {
  const state = createReleaseGestureState();
  assert.equal(sample(state, true, false, 0.3), false);
  assert.equal(sample(state, false, false, 0.22, 0.1), false);
  assert.equal(sample(state, false, true, 0.05, 0.05), false);
  assert.equal(sample(state, false, true, 0.05, 0.02), true);
});

test("one-frame open detection does not release", () => {
  const state = createReleaseGestureState();
  sample(state, true, false, 0.3);
  assert.equal(sample(state, false, true, 1 / 30), false);
  assert.equal(sample(state, false, false, 1 / 30), false);
});

test("losing the hand does not release", () => {
  const state = createReleaseGestureState();
  sample(state, true, false, 0.3);
  for (let i = 0; i < 30; i++) {
    assert.equal(sample(state, false, false, 1 / 30), false);
  }
});
