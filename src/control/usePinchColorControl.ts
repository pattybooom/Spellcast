import { useEffect, useRef, type MutableRefObject } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { getPinchStrength, isPinching, PINCH_RELEASE_THRESHOLD, PINCH_STABILITY_MS, DOUBLE_PINCH_WINDOW_MS } from '../gesture/pinchGesture'
import { playPinchSelectDing } from '../audio/ding'

/** Changes the selected lamp's color once per thumb-index pinch by the selecting hand. */
export function usePinchColorControl(
  resultsRef: MutableRefObject<HandLandmarkerResult | null>,
  enabled: boolean,
  selected: boolean,
  hue: number,
  onHueChange: (value: number) => void
) {
  const inputRef = useRef({ selected, hue, onHueChange })
  inputRef.current = { selected, hue, onHueChange }

  useEffect(() => {
    if (!enabled) return

    let frame = 0
    let pinchingSince = 0
    let pinchLatched = false
    let firstPinchAt = 0
    let waitingForSecondPinch = false

    const update = (now: number) => {
      const input = inputRef.current
      const result = resultsRef.current
      const hands = result?.landmarks ?? []
      const handIndex = result?.handedness.findIndex(categories => categories[0]?.categoryName === 'Left') ?? -1
      const landmarks = input.selected && handIndex >= 0 ? hands[handIndex] : undefined
      const strength = landmarks ? getPinchStrength(landmarks) : null

      if (!input.selected || strength === null) {
        pinchingSince = 0
        pinchLatched = false
        firstPinchAt = 0
        waitingForSecondPinch = false
      } else if (isPinching(strength, pinchLatched)) {
        if (!pinchingSince) pinchingSince = now
        if (!pinchLatched && now - pinchingSince >= PINCH_STABILITY_MS) {
          if (waitingForSecondPinch && now - firstPinchAt <= DOUBLE_PINCH_WINDOW_MS) {
            const nextHue = (input.hue + 45) % 360
            playPinchSelectDing()
            input.onHueChange(nextHue)
            waitingForSecondPinch = false
            firstPinchAt = 0
          } else {
            waitingForSecondPinch = true
            firstPinchAt = now
          }
          pinchLatched = true
        }
      } else {
        pinchingSince = 0
        if (strength === null || strength >= PINCH_RELEASE_THRESHOLD) pinchLatched = false
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
