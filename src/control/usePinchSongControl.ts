import { useEffect, useRef, type MutableRefObject } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { getPinchStrength, isPinching, PINCH_RELEASE_THRESHOLD, PINCH_STABILITY_MS, DOUBLE_PINCH_WINDOW_MS } from '../gesture/pinchGesture'

/** Advances Spotify once per left-hand thumb-index pinch while the speaker is selected. */
export function usePinchSongControl(
  resultsRef: MutableRefObject<HandLandmarkerResult | null>,
  enabled: boolean,
  selected: boolean,
  onNext: () => void
) {
  const inputRef = useRef({ selected, onNext })
  inputRef.current = { selected, onNext }
  useEffect(() => {
    if (!enabled) return
    let frame = 0
    let pinchingSince = 0
    let latched = false
    let firstPinchAt = 0
    let waitingForSecondPinch = false
    const update = (now: number) => {
      const input = inputRef.current
      const result = resultsRef.current
      const handIndex = result?.handedness.findIndex(categories => categories[0]?.categoryName === 'Left') ?? -1
      const landmarks = input.selected && handIndex >= 0 ? result?.landmarks[handIndex] : undefined
      const strength = landmarks ? getPinchStrength(landmarks) : null
      if (strength === null || !input.selected) {
        pinchingSince = 0
        latched = false
        firstPinchAt = 0
        waitingForSecondPinch = false
      } else if (isPinching(strength, latched)) {
        if (!pinchingSince) pinchingSince = now
        if (!latched && now - pinchingSince >= PINCH_STABILITY_MS) {
          if (waitingForSecondPinch && now - firstPinchAt <= DOUBLE_PINCH_WINDOW_MS) {
            input.onNext()
            waitingForSecondPinch = false
            firstPinchAt = 0
          } else {
            waitingForSecondPinch = true
            firstPinchAt = now
          }
          latched = true
        }
      } else {
        pinchingSince = 0
        if (strength === null || strength >= PINCH_RELEASE_THRESHOLD) latched = false
      }
      if (waitingForSecondPinch && now - firstPinchAt > DOUBLE_PINCH_WINDOW_MS) {
        waitingForSecondPinch = false
        firstPinchAt = 0
      }
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [enabled, resultsRef])
}
