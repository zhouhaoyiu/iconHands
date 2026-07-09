export interface ReleaseGestureState {
  fistMemory: number;
  openTime: number;
  armed: boolean;
}

interface ReleaseGestureSample {
  fist: boolean;
  open: boolean;
  attracting: boolean;
  squeeze: number;
  dtSec: number;
}

export const FIST_MEMORY_SECONDS = 0.65;
export const OPEN_CONFIRM_SECONDS = 0.1;

export function createReleaseGestureState(): ReleaseGestureState {
  return { fistMemory: 0, openTime: 0, armed: false };
}

export function updateReleaseGesture(
  state: ReleaseGestureState,
  sample: ReleaseGestureSample
) {
  if (sample.fist) {
    state.fistMemory = FIST_MEMORY_SECONDS;
    state.openTime = 0;
    if (sample.attracting && sample.squeeze > 0.35) state.armed = true;
    return false;
  }

  state.fistMemory = Math.max(0, state.fistMemory - sample.dtSec);
  state.openTime = sample.open ? state.openTime + sample.dtSec : 0;

  if (
    sample.attracting &&
    state.armed &&
    state.fistMemory > 0 &&
    state.openTime >= OPEN_CONFIRM_SECONDS
  ) {
    state.fistMemory = 0;
    state.openTime = 0;
    state.armed = false;
    return true;
  }

  if (state.fistMemory === 0) state.armed = false;

  return false;
}
