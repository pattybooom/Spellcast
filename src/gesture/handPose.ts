import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type HandControlPose = 'fist' | 'open'

export type IndexContactPose = 'touching' | 'apart'

function distance3D(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0))
}

function fingerExtended(landmarks: NormalizedLandmark[], mcp: number, pip: number, tip: number): boolean {
  return distance3D(landmarks[0], landmarks[tip]) > distance3D(landmarks[0], landmarks[pip]) * 1.12
    && distance3D(landmarks[mcp], landmarks[tip]) > distance3D(landmarks[mcp], landmarks[pip]) * 1.18
}

function fingerCurled(landmarks: NormalizedLandmark[], mcp: number, pip: number, tip: number): boolean {
  return distance3D(landmarks[0], landmarks[tip]) < distance3D(landmarks[0], landmarks[pip]) * 1.2
    && distance3D(landmarks[mcp], landmarks[tip]) < distance3D(landmarks[mcp], landmarks[pip]) * 1.65
}

/** Recognizes only clear open-palm and fist poses for lamp power control. */
export function detectHandControlPose(landmarks: NormalizedLandmark[]): HandControlPose | null {
  if (landmarks.length < 21) return null

  const fingers = [
    [5, 6, 8],
    [9, 10, 12],
    [13, 14, 16],
    [17, 18, 20]
  ] as const
  if (fingers.every(([mcp, pip, tip]) => fingerExtended(landmarks, mcp, pip, tip))) return 'open'
  if (fingers.every(([mcp, pip, tip]) => fingerCurled(landmarks, mcp, pip, tip))) return 'fist'
  return null
}

/** Detects deliberate contact between the two index fingertips, scaled to palm width. */
export function detectIndexFingerContact(
  first: NormalizedLandmark[],
  second: NormalizedLandmark[]
): IndexContactPose | null {
  if (first.length < 21 || second.length < 21) return null
  const palmWidth = (distance3D(first[5], first[17]) + distance3D(second[5], second[17])) / 2
  if (palmWidth < 0.001) return null
  const fingertipDistance = Math.hypot(first[8].x - second[8].x, first[8].y - second[8].y) / palmWidth
  if (fingertipDistance <= 0.28) return 'touching'
  if (fingertipDistance >= 0.48) return 'apart'
  return null
}

/** Palm center used for vertical hand-height control. */
export function getPalmCenterY(landmarks: NormalizedLandmark[]): number | null {
  if (landmarks.length < 21) return null
  return (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5
}

/** Palm center horizontal position in MediaPipe's source image coordinates. */
export function getPalmCenterX(landmarks: NormalizedLandmark[]): number | null {
  if (landmarks.length < 21) return null
  return (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5
}
