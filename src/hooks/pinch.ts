export const PINCH_START_THRESHOLD = 0.045;
export const PINCH_RELEASE_THRESHOLD = 0.07;

export function getPinchState(
  wasPinching: boolean,
  normalizedPinchDistance: number | null,
) {
  if (normalizedPinchDistance === null) {
    return false;
  }

  return wasPinching
    ? normalizedPinchDistance <= PINCH_RELEASE_THRESHOLD
    : normalizedPinchDistance < PINCH_START_THRESHOLD;
}
