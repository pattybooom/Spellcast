import { HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { projectToPreview, type ScreenPoint } from './projection'

type Point = ScreenPoint

export function drawHandOverlay(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  result: HandLandmarkerResult | null,
  width: number,
  height: number,
  previous: Point[][],
  smoothing = 0.42
): Point[][] {
  context.clearRect(0, 0, width, height)
  if (!result || video.videoWidth === 0 || video.videoHeight === 0) return []

  const hands = result.landmarks.map((landmarks, handIndex) => {
    const target = landmarks.map(point => projectToPreview(point, video, width, height))
    const old = previous[handIndex]
    return old?.length === target.length
      ? target.map((point, index) => ({
        x: old[index].x + (point.x - old[index].x) * smoothing,
        y: old[index].y + (point.y - old[index].y) * smoothing
      }))
      : target
  })

  for (const points of hands) {
    context.save()
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = 'rgba(124, 196, 255, 0.82)'
    context.lineWidth = 1.6
    context.shadowColor = 'rgba(124, 196, 255, 0.7)'
    context.shadowBlur = 8
    context.beginPath()
    for (const { start, end } of HandLandmarker.HAND_CONNECTIONS) {
      const from = points[start]
      const to = points[end]
      if (!from || !to) continue
      context.moveTo(from.x, from.y)
      context.lineTo(to.x, to.y)
    }
    context.stroke()

    context.shadowBlur = 10
    points.forEach((point, index) => {
      const isTip = [4, 8, 12, 16, 20].includes(index)
      const radius = index === 8 ? 3.6 : isTip ? 2.8 : index === 0 ? 2.5 : 1.9
      context.beginPath()
      context.arc(point.x, point.y, radius, 0, Math.PI * 2)
      context.fillStyle = isTip ? '#c5eaff' : '#7cc4ff'
      context.fill()
      context.lineWidth = 1
      context.strokeStyle = 'rgba(8, 16, 26, 0.78)'
      context.stroke()
    })
    context.restore()
  }

  return hands
}
