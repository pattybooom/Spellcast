import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

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
