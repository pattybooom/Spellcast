import { useEffect, useRef, useState, type RefObject } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { createHandLandmarker, HandTracker } from './handTracker'

export type HandTrackingStatus = 'idle' | 'loading' | 'ready' | 'error'

export function useHandTracking(videoRef: RefObject<HTMLVideoElement>, enabled: boolean) {
  const [status, setStatus] = useState<HandTrackingStatus>('idle')
  const [handCount, setHandCount] = useState(0)
  const [error, setError] = useState('')
  const resultsRef = useRef<HandLandmarkerResult | null>(null)

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      setHandCount(0)
      setError('')
      resultsRef.current = null
      return
    }

    let cancelled = false
    let tracker: HandTracker | null = null
    setStatus('loading')
    setHandCount(0)
    setError('')

    void createHandLandmarker().then(landmarker => {
      if (cancelled) {
        landmarker.close()
        return
      }
      const video = videoRef.current
      if (!video) {
        landmarker.close()
        throw new Error('Camera video is not available for hand tracking.')
      }
      tracker = new HandTracker(landmarker, video, result => {
        resultsRef.current = result
        setHandCount(result.landmarks.length)
        setStatus('ready')
      }, cause => {
        setError(cause.message)
        setStatus('error')
      })
      setStatus('ready')
      tracker.start()
    }).catch(cause => {
      if (cancelled) return
      setError(cause instanceof Error ? cause.message : 'Could not load the hand tracking model.')
      setStatus('error')
    })

    return () => {
      cancelled = true
      tracker?.stop()
    }
  }, [enabled, videoRef])

  return { status, handCount, error, resultsRef }
}
