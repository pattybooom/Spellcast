import { SCENES, type SceneId, type ScenePosition, type SceneState } from '../src/scenes/presets'

type Dependencies = {
  publish: (command: Record<string, unknown>) => Promise<void>
  play: (uri: string) => Promise<void>
  pause: () => Promise<void>
  changed: (state: SceneState) => void
}

const PARTY_COLORS = [
  { r: 255, g: 0, b: 110 }, // pink
  { r: 140, g: 0, b: 255 }, // violet
  { r: 0, g: 90, b: 255 }, // blue
  { r: 0, g: 220, b: 190 }, // cyan
  { r: 0, g: 255, b: 55 }, // green
  { r: 255, g: 190, b: 0 } // gold
] as const

/** Owns scene lifetimes and flashes Party colours without switching the bulb off. */
export class SceneController {
  state: SceneState = { active: null, applying: false, cyclingColors: false }
  private generation = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private musicQueue: Promise<void> = Promise.resolve()

  constructor(private readonly deps: Dependencies) {}

  private update(state: SceneState) {
    this.state = state
    this.deps.changed({ ...state })
  }

  private cancel() {
    this.generation += 1
    clearTimeout(this.timer)
    this.timer = undefined
    return this.generation
  }

  private music(generation: number, action: () => Promise<void>) {
    const task = this.musicQueue.then(async () => {
      if (generation === this.generation) await action()
    })
    this.musicQueue = task.catch(() => {})
    return task
  }

  async apply(id: ScenePosition) {
    if (!id) { await this.stop(); return }
    const generation = this.cancel()
    this.update({ active: id, applying: true, cyclingColors: false })
    try {
      await this.deps.publish({ ...SCENES[id].lamp })
      if (generation !== this.generation) return
      let musicError: string | undefined
      try { await this.music(generation, () => this.deps.play(SCENES[id].track)) }
      catch (error) { musicError = `Lighting applied. Spotify: ${message(error)}` }
      if (generation !== this.generation) return
      this.update({ active: id, applying: false, cyclingColors: id === 'party', error: musicError })
      if (id === 'party') this.cycleColor(generation, 0)
    } catch (error) {
      if (generation === this.generation) this.update({ active: null, applying: false, cyclingColors: false, error: message(error) })
    }
  }

  private cycleColor(generation: number, index: number) {
    this.timer = setTimeout(async () => {
      if (generation !== this.generation) return
      try {
        const color = PARTY_COLORS[index % PARTY_COLORS.length]
        await this.deps.publish({ state: 'ON', brightness: 254, color: { ...color }, transition: 0 })
        if (generation === this.generation) this.cycleColor(generation, index + 1)
      } catch (error) {
        if (generation !== this.generation) return
        this.cancel()
        this.update({ ...this.state, applying: false, cyclingColors: false, error: `Color changes stopped: ${message(error)}` })
      }
    }, 900)
  }

  /** Manual bulb changes keep the selected scene and its music, but end Party's competing color cycle. */
  manualLampOverride() {
    if (!this.state.cyclingColors) return
    this.cancel()
    this.update({ ...this.state, applying: false, cyclingColors: false })
  }

  /** Selecting no scene or closing the app ends the active effect and pauses scene music. */
  async stop(pauseMusic = true) {
    const previous = this.state
    if (!previous.active && !previous.applying) return
    const generation = this.cancel()
    this.update({ active: null, applying: false, cyclingColors: false })
    const actions: Promise<unknown>[] = []
    if (pauseMusic && previous.active) actions.push(this.deps.publish({ state: 'ON', transition: 0 }))
    if (pauseMusic && previous.active) actions.push(this.music(generation, this.deps.pause))
    const results = await Promise.allSettled(actions)
    const failed = results.find(result => result.status === 'rejected')
    if (failed?.status === 'rejected' && generation === this.generation) {
      this.update({ ...this.state, error: `Scene ended. ${message(failed.reason)}` })
    }
  }
}

function message(error: unknown) { return error instanceof Error ? error.message : String(error) }
