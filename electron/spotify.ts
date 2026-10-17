import { execFile } from 'node:child_process'

export type SpotifyState = {
  connected: boolean
  playing: boolean
  track: string | null
  artist: string | null
  volume: number
  error?: string
}

export type SpotifyAction = 'play' | 'pause' | 'toggle' | 'next' | 'previous'

function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/osascript', ['-e', script], { timeout: 12000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message))
      else resolve(stdout.trim())
    })
  })
}

function isSpotifyRunning(): Promise<boolean> {
  return new Promise(resolve => {
    execFile('/usr/bin/pgrep', ['-x', 'Spotify'], error => resolve(!error))
  })
}

export async function getSpotifyState(): Promise<SpotifyState> {
  if (!await isSpotifyRunning()) {
    return { connected: false, playing: false, track: null, artist: null, volume: 50 }
  }

  try {
    const value = await runAppleScript(`tell application "Spotify"
      set trackState to player state as text
      set trackTitle to ""
      set trackArtist to ""
      if trackState is not "stopped" then
        set trackTitle to name of current track
        set trackArtist to artist of current track
      end if
      return trackState & (ASCII character 9) & trackTitle & (ASCII character 9) & trackArtist & (ASCII character 9) & (sound volume as text)
    end tell`)
    const [state, track, artist, volume] = value.split('\t')
    return {
      connected: true,
      playing: state === 'playing',
      track: track || null,
      artist: artist || null,
      volume: Math.max(0, Math.min(100, Number(volume) || 0))
    }
  } catch (error) {
    return {
      connected: true,
      playing: false,
      track: null,
      artist: null,
      volume: 50,
      error: error instanceof Error ? error.message : 'Could not read Spotify state.'
    }
  }
}

export function openSpotify(): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/open', ['-a', 'Spotify'], error => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export async function controlSpotify(action: SpotifyAction): Promise<void> {
  const commands: Record<SpotifyAction, string> = {
    play: 'play',
    pause: 'pause',
    toggle: 'playpause',
    next: 'next track',
    previous: 'previous track'
  }
  await runAppleScript(`tell application "Spotify" to ${commands[action]}`)
}

export async function setSpotifyVolume(volume: number): Promise<void> {
  if (!Number.isFinite(volume)) throw new Error('Volume must be a number.')
  const boundedVolume = Math.round(Math.max(0, Math.min(100, volume)))
  await runAppleScript(`tell application "Spotify" to set sound volume to ${boundedVolume}`)
}

/** Play only a fixed scene track URI; no renderer-supplied AppleScript. */
export async function playSpotifyTrack(uri: string): Promise<void> {
  if (!/^spotify:track:[A-Za-z0-9]{22}$/.test(uri)) throw new Error('Invalid Spotify track.')
  await openSpotify()
  await runAppleScript(`tell application "Spotify" to play track "${uri}"`)
}
