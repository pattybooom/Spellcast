import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type NormalizedPoint = { x: number; y: number }
export type PointingGesture = { base: NormalizedPoint; tip: NormalizedPoint; direction: NormalizedPoint }

function distance3D(a: NormalizedLandmark, b: NormalizedLandmark): number {
  // MediaPipe's z is relative depth, in roughly the same scale as normalized x.
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0))
}

/** Recognizes an index-pointing pose independently from any target or device. */
export function detectPointingGesture(landmarks: NormalizedLandmark[]): PointingGesture | null {
  if (landmarks.length < 21) return null

  // Include depth so an extended index still registers when it points toward
  // or away from the camera and has little separation in the 2D image.
  const wristToIndexTip = distance3D(landmarks[0], landmarks[8])
  const wristToIndexPip = distance3D(landmarks[0], landmarks[6])
  const baseToTip = distance3D(landmarks[5], landmarks[8])
  const baseToPip = distance3D(landmarks[5], landmarks[6])
  const indexExtended = wristToIndexTip > wristToIndexPip * 1.08
    && baseToTip > baseToPip * 1.3
    && baseToTip > 0.055

  if (!indexExtended) return null

  const base = { x: landmarks[5].x, y: landmarks[5].y }
  const tip = { x: landmarks[8].x, y: landmarks[8].y }
  const dx = tip.x - base.x
  const dy = tip.y - base.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return null

  return { base, tip, direction: { x: dx / length, y: dy / length } }
}
