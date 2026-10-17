import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type HandControlPose = 'fist' | 'open'

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

/** Palm center used for vertical hand-height control. */
export function getPalmCenterY(landmarks: NormalizedLandmark[]): number | null {
  if (landmarks.length < 21) return null
  return (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5
}
