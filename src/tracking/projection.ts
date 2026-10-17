type NormalizedPoint = { x: number; y: number }
export type ScreenPoint = { x: number; y: number }

/** Projects MediaPipe's source-image coordinates into the mirrored object-fit:cover preview. */
export function projectToPreview(point: NormalizedPoint, video: HTMLVideoElement, width: number, height: number): ScreenPoint {
  if (!video.videoWidth || !video.videoHeight || !width || !height) return { x: 0, y: 0 }

  const scale = Math.max(width / video.videoWidth, height / video.videoHeight)
  const imageWidth = video.videoWidth * scale
  const imageHeight = video.videoHeight * scale
  const cropX = (imageWidth - width) / 2
  const cropY = (imageHeight - height) / 2

  return {
    x: width - (point.x * imageWidth - cropX),
    y: point.y * imageHeight - cropY
  }
}
