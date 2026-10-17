import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type HandControlPose = 'fist' | 'open'
export type HandFingerCount = 0 | 1 | 2 | 3 | 4 | 5

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

function thumbExtended(landmarks: NormalizedLandmark[]): boolean {
  const mcp = landmarks[2]
  const ip = landmarks[3]
  const tip = landmarks[4]
  const first = { x: ip.x - mcp.x, y: ip.y - mcp.y, z: (ip.z ?? 0) - (mcp.z ?? 0) }
  const second = { x: tip.x - ip.x, y: tip.y - ip.y, z: (tip.z ?? 0) - (ip.z ?? 0) }
  const firstLength = Math.hypot(first.x, first.y, first.z)
  const secondLength = Math.hypot(second.x, second.y, second.z)
  if (firstLength === 0 || secondLength === 0) return false

  const alignment = (first.x * second.x + first.y * second.y + first.z * second.z) / (firstLength * secondLength)
  const straightLength = distance3D(mcp, tip)
  return alignment > 0.25 && straightLength > firstLength * 1.5
}

/** Classifies only clear open-palm and fist poses; transitional poses return null. */
export function detectHandControlPose(landmarks: NormalizedLandmark[]): HandControlPose | null {
  const count = detectHandFingerCount(landmarks)
  if (count === 5) return 'open'
  if (count === 0) return 'fist'
  return null
}

/** Counts extended fingers on the control hand; 0 is a fist and 5 is an open palm. */
export function detectHandFingerCount(landmarks: NormalizedLandmark[]): HandFingerCount | null {
  if (landmarks.length < 21) return null

  const fingers = [
    [5, 6, 8],
    [9, 10, 12],
    [13, 14, 16],
    [17, 18, 20]
  ] as const
  const count = fingers.filter(([mcp, pip, tip]) => fingerExtended(landmarks, mcp, pip, tip)).length
  const total = count + Number(thumbExtended(landmarks))

  // Reject partially transitioning poses instead of turning them into a level.
  const curledCount = fingers.filter(([mcp, pip, tip]) => fingerCurled(landmarks, mcp, pip, tip)).length
  if (count !== fingers.length && count !== 0 && count + curledCount !== fingers.length) return null
  return total as HandFingerCount
}
