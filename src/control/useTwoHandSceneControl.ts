import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { detectIndexFingerContact } from '../gesture/handPose'
import { SCENE_CYCLE, type ScenePosition, type SceneState } from '../scenes/presets'
import { playSceneAdvance, playSceneArmed } from '../audio/ding'

type GestureStatus = 'show-two-hands' | 'touch-index-fingers' | 'first-touch-detected' | 'second-touch-detected' | 'release-fingers'
const CONTACT_STABILITY_MS = 90
const RELEASE_STABILITY_MS = 80
const DOUBLE_TAP_WINDOW_MS = 850

/** Advances one scene after two deliberate index-tip contacts, then waits for a release before rearming. */
export function useTwoHandSceneControl(
  resultsRef: MutableRefObject<HandLandmarkerResult | null>,
  enabled: boolean,
  scene: SceneState,
  onSceneChange: (next: ScenePosition) => void
): GestureStatus {
  const [status, setStatus] = useState<GestureStatus>('show-two-hands')
  const inputRef = useRef({ scene, onSceneChange })
  inputRef.current = { scene, onSceneChange }

  useEffect(() => {
    let frame = 0
    let candidate: 'touching' | 'apart' | null = null
    let candidateSince = 0
    let armed = true
    let tapCount = 0
    let lastTapAt = 0
    let wasApplying = inputRef.current.scene.applying

    if (!enabled) {
      setStatus('show-two-hands')
      return
    }

    const update = (now: number) => {
      const input = inputRef.current
      if (input.scene.applying) {
        if (!wasApplying) armed = false
        wasApplying = true
        candidate = null
        candidateSince = 0
        tapCount = 0
        lastTapAt = 0
        frame = requestAnimationFrame(update)
        return
      }
      wasApplying = false
      const hands = resultsRef.current?.landmarks ?? []
      if (tapCount === 1 && now - lastTapAt > DOUBLE_TAP_WINDOW_MS) {
        tapCount = 0
        lastTapAt = 0
      }
      const pose = hands.length === 2 ? detectIndexFingerContact(hands[0], hands[1]) : null
      if (hands.length !== 2) {
        tapCount = 0
        lastTapAt = 0
        setStatus('show-two-hands')
      } else if (pose === 'touching' && armed) setStatus(tapCount ? 'second-touch-detected' : 'first-touch-detected')
      else if (armed) setStatus('touch-index-fingers')

      if (pose !== candidate) {
        candidate = pose
        candidateSince = pose ? now : 0
      } else if (pose && candidateSince && now - candidateSince >= (pose === 'apart' ? RELEASE_STABILITY_MS : CONTACT_STABILITY_MS)) {
        if (pose === 'apart' && !armed) {
          armed = true
          setStatus('touch-index-fingers')
          playSceneArmed()
        } else if (pose === 'apart' && armed && tapCount === 1 && now - lastTapAt > DOUBLE_TAP_WINDOW_MS) {
          tapCount = 0
          lastTapAt = 0
          setStatus('touch-index-fingers')
        } else if (pose === 'touching' && armed && candidate === 'touching') {
          if (tapCount === 1 && now - lastTapAt > DOUBLE_TAP_WINDOW_MS) {
            tapCount = 0
            lastTapAt = 0
          }
          if (tapCount === 0) {
            tapCount = 1
            lastTapAt = now
            setStatus('first-touch-detected')
          } else if (now - lastTapAt <= DOUBLE_TAP_WINDOW_MS) {
            armed = false
            tapCount = 0
            lastTapAt = 0
            const current = SCENE_CYCLE.indexOf(input.scene.active)
            const next = SCENE_CYCLE[(current + 1) % SCENE_CYCLE.length]
            setStatus('release-fingers')
            playSceneAdvance()
            input.onSceneChange(next)
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
