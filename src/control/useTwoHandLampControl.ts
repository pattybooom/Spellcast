import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { detectHandControlPose, getPalmCenterY, type HandControlPose } from '../gesture/handPose'
import { playLevelTone } from '../audio/ding'

const POSE_STABILITY_MS = 120
const HEIGHT_STEP_STABILITY_MS = 100
const HEIGHT_STEP = 0.045

type HandControlStatus = HandControlPose | 'raise' | 'lower' | null

/** Uses hand 2 for power gestures and raises/lowers brightness in 20% steps. */
export function useTwoHandLampControl(
  resultsRef: MutableRefObject<HandLandmarkerResult | null>,
  enabled: boolean,
  selected: boolean,
  selectorHandIndex: number | null,
  selectorHandedness: string | null,
  brightness: number,
  onBrightnessChange: (value: number) => void,
  onPowerChange: (on: boolean) => void
) {
  const [controlStatus, setControlStatus] = useState<HandControlStatus>(null)
  const inputRef = useRef({ selected, selectorHandIndex, selectorHandedness, brightness, onBrightnessChange, onPowerChange })
  inputRef.current = { selected, selectorHandIndex, selectorHandedness, brightness, onBrightnessChange, onPowerChange }

  useEffect(() => {
    if (!enabled) {
      setControlStatus(null)
      return
    }

    let frame = 0
    let candidatePose: HandControlPose | null = null
    let candidatePoseSince = 0
    let commandedPose: HandControlPose | null = null
    let smoothedY: number | null = null
    let heightAnchorY: number | null = null
    let movement: -1 | 1 | null = null
    let movementSince = 0

    const update = (now: number) => {
      const input = inputRef.current
      const result = resultsRef.current
      const hands = result?.landmarks ?? []
      const handednessIndex = input.selectorHandedness
        ? result?.handedness.findIndex(categories => categories[0]?.categoryName === input.selectorHandedness) ?? -1
        : -1
      const selectorIndex = handednessIndex >= 0 ? handednessIndex : input.selectorHandedness ? -1 : input.selectorHandIndex ?? -1
      const controllerIndex = hands.length === 2 && selectorIndex >= 0 ? 1 - selectorIndex : -1
      const landmarks = input.selected && controllerIndex >= 0 ? hands[controllerIndex] : undefined

      if (!landmarks) {
        candidatePose = null
        candidatePoseSince = 0
        commandedPose = null
        smoothedY = null
        heightAnchorY = null
        movement = null
        movementSince = 0
        setControlStatus(null)
      } else {
        const pose = detectHandControlPose(landmarks)
        if (pose) {
          if (pose !== candidatePose) {
            candidatePose = pose
            candidatePoseSince = now
          } else if (now - candidatePoseSince >= POSE_STABILITY_MS && pose !== commandedPose) {
            commandedPose = pose
            setControlStatus(pose)
            input.onPowerChange(pose === 'open')
            if (pose === 'fist') playLevelTone(0)
          }
        } else {
          candidatePose = null
          candidatePoseSince = 0
        }

        const palmY = getPalmCenterY(landmarks)
        if (palmY !== null) {
          smoothedY = smoothedY === null ? palmY : smoothedY + (palmY - smoothedY) * 0.28
          if (heightAnchorY === null) heightAnchorY = smoothedY

          // Keep a clenched fist reserved for OFF instead of changing brightness.
          if (pose === 'fist') {
            heightAnchorY = smoothedY
            movement = null
            movementSince = 0
          } else {
            const delta = heightAnchorY - smoothedY
            const nextMovement: -1 | 1 | null = delta >= HEIGHT_STEP ? 1 : delta <= -HEIGHT_STEP ? -1 : null
            if (nextMovement === null) {
              movement = null
              movementSince = 0
            } else if (movement !== nextMovement) {
              movement = nextMovement
              movementSince = now
            } else if (now - movementSince >= HEIGHT_STEP_STABILITY_MS) {
              const nextBrightness = Math.max(20, Math.min(100, Math.round(input.brightness + movement * 20)))
              heightAnchorY = smoothedY
              movement = null
              movementSince = 0
              if (nextBrightness !== input.brightness) {
                setControlStatus(nextBrightness > input.brightness ? 'raise' : 'lower')
                playLevelTone(Math.round(nextBrightness / 20))
                input.onPowerChange(true)
                input.onBrightnessChange(nextBrightness)
              }
            }
          }
        }
      }

      frame = requestAnimationFrame(update)
    }

    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [enabled, resultsRef])

  return controlStatus
}
