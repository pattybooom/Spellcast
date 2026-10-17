import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export const PINCH_THRESHOLD = 0.48
export const PINCH_RELEASE_THRESHOLD = 0.62
export const PINCH_STABILITY_MS = 45
export const DOUBLE_PINCH_WINDOW_MS = 600

function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0))
}

/** Pinch strength scaled to the hand so it works at different camera distances. */
export function getPinchStrength(landmarks: NormalizedLandmark[]): number | null {
  if (landmarks.length < 21) return null
  const palmWidth = distance(landmarks[5], landmarks[17])
  if (palmWidth < 0.001) return null
  return distance(landmarks[4], landmarks[8]) / palmWidth
}

/** Shared hysteresis state used by selection locks and double-pinch actions. */
export function isPinching(strength: number | null, wasPinching: boolean): boolean {
  if (strength === null) return false
  return wasPinching ? strength < PINCH_RELEASE_THRESHOLD : strength <= PINCH_THRESHOLD
}
