import { useEffect, type RefObject } from 'react'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import type { MutableRefObject } from 'react'
import { drawHandOverlay } from './handOverlay'

export function useHandOverlay(
  videoRef: RefObject<HTMLVideoElement>,
  canvasRef: RefObject<HTMLCanvasElement>,
  resultsRef: MutableRefObject<HandLandmarkerResult | null>,
  enabled: boolean
) {
  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!enabled || !video || !canvas || !context) return

    let animationFrame = 0
    let smoothedPoints: { x: number; y: number }[][] = []
    let width = 0
    let height = 0
    let pixelRatio = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const nextRatio = window.devicePixelRatio || 1
      if (rect.width === width && rect.height === height && nextRatio === pixelRatio) return
      width = rect.width
      height = rect.height
      pixelRatio = nextRatio
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const render = () => {
      resize()
      smoothedPoints = drawHandOverlay(context, video, resultsRef.current, width, height, smoothedPoints)
      animationFrame = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      context.clearRect(0, 0, width, height)
      smoothedPoints = []
    }
  }, [canvasRef, enabled, resultsRef, videoRef])
}
