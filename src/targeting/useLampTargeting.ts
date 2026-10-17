import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { detectPointingGesture } from '../gesture/pointingGesture'
import { detectHandControlPose } from '../gesture/handPose'
import { projectToPreview, type ScreenPoint } from '../tracking/projection'
import type { NormalizedBox, PointingRay } from './rayTargeting'
import { makePointingRay, rayIntersectsBox } from './rayTargeting'

export type LampTargetingState = {
  ray: PointingRay | null
  pointing: boolean
  aiming: boolean
  targeted: boolean
  targetEntry: number
  selectorHandIndex: number | null
  selectorHandedness: string | null
  dwellProgress: number
  width: number
  height: number
}

const INITIAL: LampTargetingState = {
  ray: null, pointing: false, aiming: false, targeted: false, targetEntry: 0, selectorHandIndex: null, selectorHandedness: null, dwellProgress: 0, width: 0, height: 0
}

function smoothPoint(previous: ScreenPoint, next: ScreenPoint, amount: number): ScreenPoint {
  return { x: previous.x + (next.x - previous.x) * amount, y: previous.y + (next.y - previous.y) * amount }
}

function smoothRay(previous: PointingRay | null, next: PointingRay | null): PointingRay | null {
  if (!next || !previous) return next
  const amount = 0.48
  const direction = smoothPoint(previous.direction, next.direction, amount)
  const length = Math.hypot(direction.x, direction.y) || 1
  return {
    origin: smoothPoint(previous.origin, next.origin, amount),
    direction: { x: direction.x / length, y: direction.y / length }
  }
}

export function useLampTargeting(
  videoRef: RefObject<HTMLVideoElement>,
  viewportRef: RefObject<SVGSVGElement>,
  resultsRef: MutableRefObject<HandLandmarkerResult | null>,
  enabled: boolean,
  lampBox: NormalizedBox | null
) {
  const [state, setState] = useState(INITIAL)
  const smoothedRayRef = useRef<PointingRay | null>(null)
  const targetEntryRef = useRef(0)

  useEffect(() => {
    const video = videoRef.current
    const viewport = viewportRef.current
    if (!enabled || !video || !viewport) {
      smoothedRayRef.current = null
      setState(INITIAL)
      return
    }

    let frame = 0
    let lastPublish = 0
    let dwellStartedAt = 0
    let lastHitAt = 0
    let targeted = false
    let selectorHandIndex: number | null = null
    let selectorHandedness: string | null = null

    const update = (now: number) => {
      const rect = viewport.getBoundingClientRect()
      const result = resultsRef.current
      let nextRay: PointingRay | null = null
      let candidateHandIndex: number | null = null
      let fallbackRay: PointingRay | null = null
      let fallbackHandIndex: number | null = null
      const hands = result?.landmarks ?? []
      let handIndexes = hands.map((_hand, index) => index)
      if (targeted && selectorHandedness) {
        const stableIndex = result?.handedness.findIndex(categories => categories[0]?.categoryName === selectorHandedness) ?? -1
        handIndexes = stableIndex >= 0 ? [stableIndex] : []
        if (stableIndex >= 0) selectorHandIndex = stableIndex
      } else if (targeted && selectorHandIndex !== null) {
        handIndexes = [selectorHandIndex]
      }

      for (const handIndex of handIndexes) {
        const landmarks = hands[handIndex]
        if (!landmarks) continue
        // An open palm is reserved for hand 2's control gesture, never selection.
        if (detectHandControlPose(landmarks) === 'open') continue
        const gesture = detectPointingGesture(landmarks)
        if (!gesture) continue
        const base = projectToPreview(gesture.base, video, rect.width, rect.height)
        const tip = projectToPreview(gesture.tip, video, rect.width, rect.height)
        const candidateRay = makePointingRay(base, tip)
        if (!candidateRay) continue
        if (!fallbackRay) {
          fallbackRay = candidateRay
          fallbackHandIndex = handIndex
        }
        if (lampBox && rayIntersectsBox(candidateRay, lampBox, rect.width, rect.height)) {
          nextRay = candidateRay
          candidateHandIndex = handIndex
          break
        }
      }

      if (!nextRay) {
        nextRay = fallbackRay
        candidateHandIndex = fallbackHandIndex
      }

      const ray = smoothRay(smoothedRayRef.current, nextRay)
      smoothedRayRef.current = ray
      const aiming = Boolean(ray && lampBox && rayIntersectsBox(ray, lampBox, rect.width, rect.height))

      if (aiming) {
        lastHitAt = now
        if (!dwellStartedAt) dwellStartedAt = now
        if (now - dwellStartedAt >= 300 && !targeted) {
          targeted = true
          selectorHandIndex = candidateHandIndex
          selectorHandedness = candidateHandIndex === null
            ? null
            : result?.handedness[candidateHandIndex]?.[0]?.categoryName ?? null
          targetEntryRef.current += 1
        }
      } else {
        dwellStartedAt = 0
        if (targeted && now - lastHitAt > 700) {
          targeted = false
          selectorHandIndex = null
          selectorHandedness = null
        }
      }

      const dwellProgress = aiming && dwellStartedAt
        ? Math.min(1, (now - dwellStartedAt) / 300)
        : targeted ? 1 : 0

      if (now - lastPublish >= 32) {
        lastPublish = now
        setState({
          ray,
          pointing: Boolean(nextRay),
          aiming,
          targeted,
          targetEntry: targetEntryRef.current,
          selectorHandIndex,
          selectorHandedness,
          dwellProgress,
          width: rect.width,
          height: rect.height
        })
      }
      frame = requestAnimationFrame(update)
    }

    frame = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(frame)
      smoothedRayRef.current = null
    }
  }, [enabled, lampBox, resultsRef, videoRef, viewportRef])

  return state
}
