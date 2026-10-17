/// <reference types="vite/client" />
import type { LampState } from '../electron/preload'

declare global {
  interface Window {
    spellcast: {
      getLampState: () => Promise<LampState>
      setLampPower: (state: 'ON' | 'OFF' | 'TOGGLE') => Promise<{ ok: boolean; error?: string }>
      setLampBrightness: (brightness: number) => Promise<{ ok: boolean; error?: string }>
      onLampState: (callback: (state: LampState) => void) => () => void
    }
  }
}

export {}
