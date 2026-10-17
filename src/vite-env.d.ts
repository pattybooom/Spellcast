/// <reference types="vite/client" />
import type { LampState, SpotifyState } from '../electron/preload'

import type { SceneId, SceneState } from './scenes/presets'

declare global {
  interface Window {
    spellcast: {
      getSceneState: () => Promise<SceneState>
      applyScene: (id: SceneId | null) => Promise<{ ok: boolean; error?: string }>
      onSceneState: (callback: (state: SceneState) => void) => () => void
      getLampState: () => Promise<LampState>
      setLampPower: (state: 'ON' | 'OFF' | 'TOGGLE') => Promise<{ ok: boolean; error?: string }>
      setLampBrightness: (brightness: number) => Promise<{ ok: boolean; error?: string }>
      setLampHue: (hue: number) => Promise<{ ok: boolean; error?: string }>
      onLampState: (callback: (state: LampState) => void) => () => void
      getSpotifyState: () => Promise<SpotifyState>
      openSpotify: () => Promise<{ ok: boolean; error?: string }>
      controlSpotify: (action: 'play' | 'pause' | 'toggle' | 'next' | 'previous') => Promise<{ ok: boolean; error?: string }>
      setSpotifyVolume: (volume: number) => Promise<{ ok: boolean; error?: string }>
    }
  }
}

export {}
