import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { getPalmCenterY } from '../gesture/handPose'

const HEIGHT_STEP = 0.045
const STABILITY_MS = 100

/** Uses the hand opposite the pointing hand to adjust Spotify volume by height. */
export function useSpotifyHandControl(
  resultsRef: MutableRefObject<HandLandmarkerResult | null>,
  enabled: boolean,
  selected: boolean,
  selectorHandIndex: number | null,
  selectorHandedness: string | null,
  volume: number,
  playing: boolean,
  onVolumeChange: (value: number) => void,
  onPause: () => void,
  onResume: () => void
) {
  const [status, setStatus] = useState<'raise' | 'lower' | 'paused' | null>(null)
  const inputRef = useRef({ selected, selectorHandIndex, selectorHandedness, volume, playing, onVolumeChange, onPause, onResume })
  inputRef.current = { selected, selectorHandIndex, selectorHandedness, volume, playing, onVolumeChange, onPause, onResume }

  useEffect(() => {
    if (!enabled) { setStatus(null); return }
    let frame = 0
    let smoothedY: number | null = null
    let anchorY: number | null = null
    let direction: -1 | 1 | null = null
    let directionSince = 0

    const update = (now: number) => {
      const input = inputRef.current
      const result = resultsRef.current
      const hands = result?.landmarks ?? []
      const handedIndex = input.selectorHandedness
        ? result?.handedness.findIndex(categories => categories[0]?.categoryName === input.selectorHandedness) ?? -1
        : -1
      const selectorIndex = handedIndex >= 0 ? handedIndex : input.selectorHandedness ? -1 : input.selectorHandIndex ?? -1
      const controllerIndex = hands.length === 2 && selectorIndex >= 0 ? 1 - selectorIndex : -1
      const landmarks = input.selected && controllerIndex >= 0 ? hands[controllerIndex] : undefined
      const palmY = landmarks ? getPalmCenterY(landmarks) : null

      if (palmY === null) {
        smoothedY = null
        anchorY = null
        direction = null
        directionSince = 0
        setStatus(null)
      } else {
        smoothedY = smoothedY === null ? palmY : smoothedY + (palmY - smoothedY) * 0.28
        anchorY ??= smoothedY
        const delta = anchorY - smoothedY
        const nextDirection: -1 | 1 | null = delta >= HEIGHT_STEP ? 1 : delta <= -HEIGHT_STEP ? -1 : null
        if (nextDirection === null) {
          direction = null
          directionSince = 0
        } else if (direction !== nextDirection) {
          direction = nextDirection
          directionSince = now
        } else if (now - directionSince >= STABILITY_MS) {
          const committedDirection = direction
          const nextVolume = Math.max(0, Math.min(100, Math.round(input.volume + direction * 20)))
          anchorY = smoothedY
          direction = null
          directionSince = 0
          if (nextVolume !== input.volume) {
            setStatus(nextVolume === 0 ? 'paused' : nextVolume > input.volume ? 'raise' : 'lower')
            input.onVolumeChange(nextVolume)
            if (nextVolume === 0) input.onPause()
            else if (!input.playing) input.onResume()
          } else if (committedDirection === -1 && input.volume <= 10 && input.playing) {
            setStatus('paused')
            input.onPause()
          }
        }
      }
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [enabled, resultsRef])

  return status
}
