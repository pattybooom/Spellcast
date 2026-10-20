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
    minHandDetectionConfidence: 0.25,
    minHandPresenceConfidence: 0.25,
    minTrackingConfidence: 0.25
  })
}

export class HandTracker {
  private frameRequest = 0
  private lastVideoTime = -1
  private stopped = false
  private gamma = 1
  private lastExposureSample = 0
  private readonly frameCanvas = document.createElement('canvas')
  private readonly frameContext = this.frameCanvas.getContext('2d', { willReadFrequently: true })
  private readonly sampleCanvas = document.createElement('canvas')
  private readonly sampleContext = this.sampleCanvas.getContext('2d', { willReadFrequently: true })

  constructor(
    private readonly landmarker: HandLandmarker,
    private readonly video: HTMLVideoElement,
    private readonly onResults: (result: HandLandmarkerResult) => void,
    private readonly onError: (error: Error) => void,
    private readonly onExposure: (gamma: number) => void = () => {}
  ) {
    this.frameCanvas.width = 720
    this.frameCanvas.height = 405
    this.sampleCanvas.width = 48
    this.sampleCanvas.height = 27
  }

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
        const now = performance.now()
        if (now - this.lastExposureSample >= 350 && this.sampleContext) {
          this.sampleContext.drawImage(this.video, 0, 0, this.sampleCanvas.width, this.sampleCanvas.height)
          const pixels = this.sampleContext.getImageData(0, 0, this.sampleCanvas.width, this.sampleCanvas.height).data
          let luminance = 0
          for (let i = 0; i < pixels.length; i += 4) {
            luminance += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]
          }
          luminance /= pixels.length / 4
          // Gamma lifts dark detail without multiplying channels into clipped,
          // over-saturated highlights. Keep the source color balance intact.
          const target = luminance < 100 ? Math.max(0.5, 1 - ((100 - luminance) / 100) * 0.8) : 1
          this.gamma += (target - this.gamma) * 0.24
          this.lastExposureSample = now
          this.onExposure(this.gamma)
        }
        if (!this.frameContext) throw new Error('Could not prepare camera frames for hand tracking.')
        // The room lighting is strongly magenta. Desaturating the detector's
        // copy reduces that cast and contrast lifts the hand edges; the visible
        // video remains untouched and retains its natural camera colors.
        this.frameContext.filter = 'grayscale(0.72) contrast(1.28)'
        this.frameContext.drawImage(this.video, 0, 0, this.frameCanvas.width, this.frameCanvas.height)
        this.frameContext.filter = 'none'
        if (this.gamma < 0.995) {
          const frame = this.frameContext.getImageData(0, 0, this.frameCanvas.width, this.frameCanvas.height)
          for (let i = 0; i < frame.data.length; i += 4) {
            frame.data[i] = 255 * Math.pow(frame.data[i] / 255, this.gamma)
            frame.data[i + 1] = 255 * Math.pow(frame.data[i + 1] / 255, this.gamma)
            frame.data[i + 2] = 255 * Math.pow(frame.data[i + 2] / 255, this.gamma)
          }
          this.frameContext.putImageData(frame, 0, 0)
        }
        const result = this.landmarker.detectForVideo(this.frameCanvas, now)
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
