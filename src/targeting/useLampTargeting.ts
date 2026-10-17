import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { detectPointingGesture } from '../gesture/pointingGesture'
import { detectHandControlPose } from '../gesture/handPose'
import { getPinchStrength, isPinching } from '../gesture/pinchGesture'
import { projectToPreview, type ScreenPoint } from '../tracking/projection'
import type { NormalizedBox, PointingRay } from './rayTargeting'
import { makePointingRay, rayIntersectsBox } from './rayTargeting'

export type LampTargetingState = {
  ray: PointingRay | null
  pointing: boolean
  aiming: boolean
  targeted: boolean
  targetDevice: 'lamp' | 'speaker' | null
  targetEntry: number
  selectorHandIndex: number | null
  selectorHandedness: string | null
  dwellProgress: number
  width: number
  height: number
}

const INITIAL: LampTargetingState = {
  ray: null, pointing: false, aiming: false, targeted: false, targetDevice: null, targetEntry: 0, selectorHandIndex: null, selectorHandedness: null, dwellProgress: 0, width: 0, height: 0
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
  targetBoxes: { lamp: NormalizedBox | null; speaker: NormalizedBox | null }
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
    let dwellDevice: 'lamp' | 'speaker' | null = null
    let lastHitAt = 0
    let selectorPinchActive = false
    let previousSelectorPinchActive = false
    let targeted = false
    let targetDevice: 'lamp' | 'speaker' | null = null
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

      const selectedHand = targeted && handIndexes.length > 0 ? hands[handIndexes[0]] : undefined
      const pinchStrength = selectedHand ? getPinchStrength(selectedHand) : null
      previousSelectorPinchActive = selectorPinchActive
      selectorPinchActive = isPinching(pinchStrength, selectorPinchActive)
      if (previousSelectorPinchActive && !selectorPinchActive) lastHitAt = now

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
        const hitDevice = (['lamp', 'speaker'] as const).find(device => {
          const box = targetBoxes[device]
          return box && rayIntersectsBox(candidateRay, box, rect.width, rect.height)
        })
        if (hitDevice) {
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
      const aimingDevice = ray ? (['lamp', 'speaker'] as const).find(device => {
        const box = targetBoxes[device]
        return box && rayIntersectsBox(ray, box, rect.width, rect.height)
      }) ?? null : null
      const aiming = Boolean(aimingDevice)

      if (aiming) {
        lastHitAt = now
        if (!dwellStartedAt || dwellDevice !== aimingDevice) {
          dwellStartedAt = now
          dwellDevice = aimingDevice
        }
        if (now - dwellStartedAt >= 300 && targetDevice !== aimingDevice) {
          targeted = true
          targetDevice = aimingDevice
          selectorHandIndex = candidateHandIndex
          selectorHandedness = candidateHandIndex === null
            ? null
            : result?.handedness[candidateHandIndex]?.[0]?.categoryName ?? null
          targetEntryRef.current += 1
        }
      } else {
        dwellStartedAt = 0
        dwellDevice = null
        if (selectorPinchActive && targeted) {
          // Pinching locks the selected target; start the 700 ms grace period on release.
          lastHitAt = now
        } else if (targeted && now - lastHitAt > 700) {
          targeted = false
          targetDevice = null
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
          targetDevice,
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
  }, [enabled, targetBoxes, resultsRef, videoRef, viewportRef])

  return state
}
