import { contextBridge, ipcRenderer } from 'electron'

import type { SceneId, SceneState } from '../src/scenes/presets'

export type LampState = {
  connection: 'connecting' | 'connected' | 'offline'
  state: 'ON' | 'OFF' | null
  brightness: number | null
  error?: string
}

export type SpotifyState = {
  connected: boolean
  playing: boolean
  track: string | null
  artist: string | null
  volume: number
  error?: string
}

contextBridge.exposeInMainWorld('spellcast', {
  getSceneState: (): Promise<SceneState> => ipcRenderer.invoke('scene:get-state'),
  applyScene: (id: SceneId | null) => ipcRenderer.invoke('scene:apply', id),
  onSceneState: (callback: (state: SceneState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: SceneState) => callback(state)
    ipcRenderer.on('scene:state', listener)
    return () => ipcRenderer.removeListener('scene:state', listener)
  },
  getLampState: (): Promise<LampState> => ipcRenderer.invoke('lamp:get-state'),
  setLampPower: (state: 'ON' | 'OFF' | 'TOGGLE') => ipcRenderer.invoke('lamp:set-power', state),
  setLampBrightness: (brightness: number) => ipcRenderer.invoke('lamp:set-brightness', brightness),
  setLampHue: (hue: number) => ipcRenderer.invoke('lamp:set-hue', hue),
  getSpotifyState: (): Promise<SpotifyState> => ipcRenderer.invoke('spotify:get-state'),
  openSpotify: () => ipcRenderer.invoke('spotify:open'),
  controlSpotify: (action: 'play' | 'pause' | 'toggle' | 'next' | 'previous') => ipcRenderer.invoke('spotify:control', action),
  setSpotifyVolume: (volume: number) => ipcRenderer.invoke('spotify:set-volume', volume),
  onLampState: (callback: (state: LampState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: LampState) => callback(state)
    ipcRenderer.on('lamp:state', listener)
    return () => ipcRenderer.removeListener('lamp:state', listener)
  }
})
