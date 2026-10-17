import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'

function localAsset(path: string): string {
  return new URL(`${import.meta.env.BASE_URL}${path}`, window.location.href).toString()
}

export async function createHandLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(localAsset('mediapipe/wasm/'))
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: localAsset('models/hand_landmarker.task') },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.5
  })
}

export class HandTracker {
  private frameRequest = 0
  private lastVideoTime = -1
  private stopped = false

  constructor(
    private readonly landmarker: HandLandmarker,
    private readonly video: HTMLVideoElement,
    private readonly onResults: (result: HandLandmarkerResult) => void,
    private readonly onError: (error: Error) => void
  ) {}

  start(): void {
    this.stopped = false
    this.processFrame()
  }

  stop(): void {
    this.stopped = true
    cancelAnimationFrame(this.frameRequest)
    this.landmarker.close()
  }

  private processFrame = (): void => {
    if (this.stopped) return

    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && this.video.currentTime !== this.lastVideoTime) {
      try {
        const result = this.landmarker.detectForVideo(this.video, performance.now())
        this.lastVideoTime = this.video.currentTime
        this.onResults(result)
      } catch (cause) {
        this.stopped = true
        this.onError(cause instanceof Error ? cause : new Error('Hand tracking failed.'))
        return
      }
    }

    this.frameRequest = requestAnimationFrame(this.processFrame)
  }
}
