import { contextBridge, ipcRenderer } from 'electron'

export type LampState = {
  connection: 'connecting' | 'connected' | 'offline'
  state: 'ON' | 'OFF' | null
  brightness: number | null
  error?: string
}

contextBridge.exposeInMainWorld('spellcast', {
  getLampState: (): Promise<LampState> => ipcRenderer.invoke('lamp:get-state'),
  setLampPower: (state: 'ON' | 'OFF' | 'TOGGLE') => ipcRenderer.invoke('lamp:set-power', state),
  setLampBrightness: (brightness: number) => ipcRenderer.invoke('lamp:set-brightness', brightness),
  onLampState: (callback: (state: LampState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: LampState) => callback(state)
    ipcRenderer.on('lamp:state', listener)
    return () => ipcRenderer.removeListener('lamp:state', listener)
  }
})
