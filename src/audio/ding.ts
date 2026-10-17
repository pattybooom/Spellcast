let audioContext: AudioContext | null = null

/** Call from a trusted UI interaction so Chromium unlocks Web Audio playback. */
export async function primeDingAudio(): Promise<void> {
  try {
    audioContext ??= new AudioContext()
    if (audioContext.state === 'suspended') await audioContext.resume()
  } catch {
    // Audio is a non-critical enhancement; gesture and device control still work.
  }
}

function playWithContext(context: AudioContext, frequencies: readonly number[], duration: number, volume: number): void {
  const now = context.currentTime
  for (const [index, frequency] of frequencies.entries()) {
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, now)
    envelope.gain.setValueAtTime(0.0001, now)
    envelope.gain.exponentialRampToValueAtTime(volume / (index + 1), now + 0.008)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(envelope)
    envelope.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.01)
  }
}

/** A short, bright two-part chime synthesized locally with Web Audio. */
export function playDing(): void {
  try {
    audioContext ??= new AudioContext()
    const context = audioContext
    if (context.state === 'running') {
      playWithContext(context, [880, 1320], 0.24, 0.11)
    } else {
      void context.resume().then(() => {
        if (context.state === 'running') playWithContext(context, [880, 1320], 0.24, 0.11)
      }).catch(() => { /* Sound must never interrupt gesture control. */ })
    }
  } catch {
    // Sound is a non-critical enhancement; gesture and device control still work.
  }
}

/** A lower, softer tone for when the sticky target selection ends. */
export function playUnselectDing(): void {
  try {
    audioContext ??= new AudioContext()
    const context = audioContext
    if (context.state === 'running') {
      playWithContext(context, [392, 294], 0.3, 0.075)
    } else {
      void context.resume().then(() => {
        if (context.state === 'running') playWithContext(context, [392, 294], 0.3, 0.075)
      }).catch(() => { /* Sound must never interrupt gesture control. */ })
    }
  } catch {
    // Sound is a non-critical enhancement.
  }
}

/** Plays one ascending pitch for each control level, from fist/off to five/on. */
export function playLevelTone(level: number): void {
  const frequencies = [220, 330, 392, 494, 587, 784]
  const frequency = frequencies[Math.max(0, Math.min(5, Math.round(level)))]
  try {
    audioContext ??= new AudioContext()
    const context = audioContext
    const play = () => {
      if (context.state !== 'running') return
      const now = context.currentTime
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, now)
      envelope.gain.setValueAtTime(0.0001, now)
      envelope.gain.exponentialRampToValueAtTime(0.12, now + 0.01)
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
      oscillator.connect(envelope)
      envelope.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.31)
    }
    if (context.state === 'running') play()
    else void context.resume().then(play).catch(() => {})
  } catch {
    // Sound is a non-critical enhancement.
  }
}
