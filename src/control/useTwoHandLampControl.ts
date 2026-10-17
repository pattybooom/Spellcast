import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { detectHandFingerCount, type HandFingerCount } from '../gesture/handPose'
import { playLevelTone } from '../audio/ding'

const POSE_STABILITY_MS = 120

/** Uses the hand other than the selected pointing hand to set lamp power. */
export function useTwoHandLampControl(
  resultsRef: MutableRefObject<HandLandmarkerResult | null>,
  enabled: boolean,
  selected: boolean,
  selectorHandIndex: number | null,
  selectorHandedness: string | null
) {
  const [controlPose, setControlPose] = useState<HandFingerCount | null>(null)
  const inputRef = useRef({ selected, selectorHandIndex, selectorHandedness })
  inputRef.current = { selected, selectorHandIndex, selectorHandedness }

  useEffect(() => {
    if (!enabled) {
      setControlPose(null)
      return
    }

    let frame = 0
    let candidate: HandFingerCount | null = null
    let candidateSince = 0
    let commandedPose: HandFingerCount | null = null

    const update = (now: number) => {
      const { selected: isSelected, selectorHandIndex: fallbackIndex, selectorHandedness } = inputRef.current
      const result = resultsRef.current
      const hands = result?.landmarks ?? []
      const handednessIndex = selectorHandedness
        ? result?.handedness.findIndex(categories => categories[0]?.categoryName === selectorHandedness) ?? -1
        : -1
      const selectorIndex = handednessIndex >= 0 ? handednessIndex : selectorHandedness ? -1 : fallbackIndex ?? -1
      const controllerIndex = hands.length === 2 && selectorIndex >= 0 ? 1 - selectorIndex : -1
      const pose = isSelected && controllerIndex >= 0 && hands.length > controllerIndex
        ? detectHandFingerCount(hands[controllerIndex])
        : null

      if (!isSelected || selectorIndex < 0) {
        candidate = null
        candidateSince = 0
        commandedPose = null
        setControlPose(null)
      } else if (pose !== null) {
        if (pose !== candidate) {
          candidate = pose
          candidateSince = now
        } else if (now - candidateSince >= POSE_STABILITY_MS && pose !== commandedPose) {
          commandedPose = pose
          setControlPose(pose)
          playLevelTone(pose)
          if (pose === 0) {
            void window.spellcast.setLampPower('OFF')
          } else {
            void window.spellcast.setLampPower('ON')
            void window.spellcast.setLampBrightness(Math.round(pose / 5 * 254))
          }
        }
      } else {
        candidate = null
        candidateSince = 0
        setControlPose(null)
      }

      frame = requestAnimationFrame(update)
    }

    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [enabled, resultsRef])

  return controlPose
}
