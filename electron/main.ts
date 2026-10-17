import { app, BrowserWindow, ipcMain, session } from 'electron'
import { connect, type MqttClient } from 'mqtt'
import { join } from 'node:path'
import { controlSpotify, getSpotifyState, openSpotify, setSpotifyVolume, type SpotifyAction } from './spotify'

// This is a desktop app, so interaction feedback should not require a browser-style media gesture.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

type LampState = { connection: 'connecting' | 'connected' | 'offline'; state: 'ON' | 'OFF' | null; brightness: number | null; error?: string }

const lampTopic = process.env.SPELLCAST_LAMP_TOPIC ?? 'zigbee2mqtt/0x84fd27fffeb35eb4'
let mqttClient: MqttClient | null = null
let lampState: LampState = { connection: 'connecting', state: null, brightness: null }

function publishLampState() {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('lamp:state', lampState)
  }
}

function connectMqtt() {
  mqttClient = connect(process.env.SPELLCAST_MQTT_URL ?? 'mqtt://localhost:1883', {
    clientId: `spellcast_${process.pid}`,
    reconnectPeriod: 2000,
    connectTimeout: 5000
  })
  mqttClient.on('connect', () => {
    lampState = { ...lampState, connection: 'connected', error: undefined }
    mqttClient?.subscribe(lampTopic, error => {
      if (error) {
        lampState = { ...lampState, error: error.message }
        publishLampState()
      }
    })
    publishLampState()
  })
  mqttClient.on('message', (_topic, payload) => {
    try {
      const message = JSON.parse(payload.toString()) as { state?: string; brightness?: number }
      lampState = {
        ...lampState,
        state: message.state === 'ON' || message.state === 'OFF' ? message.state : lampState.state,
        brightness: typeof message.brightness === 'number' ? message.brightness : lampState.brightness
      }
      publishLampState()
    } catch {
      // Ignore non-JSON messages on the lamp state topic.
    }
  })
  mqttClient.on('offline', () => {
    lampState = { ...lampState, connection: 'offline' }
    publishLampState()
  })
  mqttClient.on('error', error => {
    lampState = { ...lampState, connection: 'offline', error: error.message }
    publishLampState()
  })
}

function publishLampCommand(command: Record<string, unknown>) {
  if (!mqttClient?.connected) return { ok: false, error: 'MQTT is not connected.' }
  mqttClient.publish(`${lampTopic}/set`, JSON.stringify(command), { qos: 1 }, error => {
    if (error) {
      lampState = { ...lampState, error: error.message }
      publishLampState()
    }
  })
  return { ok: true }
}

function hueToRgb(hue: number) {
  const h = (hue % 360) / 60
  const x = 1 - Math.abs((h % 2) - 1)
  const channels = h < 1 ? [1, x, 0] : h < 2 ? [x, 1, 0] : h < 3 ? [0, 1, x] : h < 4 ? [0, x, 1] : h < 5 ? [x, 0, 1] : [1, 0, x]
  return { r: Math.round(channels[0] * 255), g: Math.round(channels[1] * 255), b: Math.round(channels[2] * 255) }
}

ipcMain.handle('lamp:get-state', () => lampState)
ipcMain.handle('lamp:set-power', (_event, state: 'ON' | 'OFF' | 'TOGGLE') => {
  if (!['ON', 'OFF', 'TOGGLE'].includes(state)) return { ok: false, error: 'Invalid power state.' }
  return publishLampCommand({ state })
})
ipcMain.handle('lamp:set-brightness', (_event, brightness: number) => {
  if (!Number.isFinite(brightness)) return { ok: false, error: 'Invalid brightness.' }
  return publishLampCommand({ brightness: Math.round(Math.max(1, Math.min(254, brightness))) })
})
ipcMain.handle('lamp:set-hue', (_event, hue: number) => {
  if (!Number.isFinite(hue) || hue < 0 || hue >= 360) return { ok: false, error: 'Invalid hue.' }
  return publishLampCommand({ color: hueToRgb(Math.round(hue)) })
})

ipcMain.handle('spotify:get-state', () => getSpotifyState())
ipcMain.handle('spotify:open', async () => {
  try {
    await openSpotify()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not open Spotify.' }
  }
})
ipcMain.handle('spotify:control', async (_event, action: SpotifyAction) => {
  if (!['play', 'pause', 'toggle', 'next', 'previous'].includes(action)) return { ok: false, error: 'Invalid Spotify action.' }
  try {
    await controlSpotify(action)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Spotify control failed.' }
  }
})
ipcMain.handle('spotify:set-volume', async (_event, volume: number) => {
  try {
    await setSpotifyVolume(volume)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Spotify volume control failed.' }
  }
})

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 920,
    minHeight: 640,
    title: 'Spellcast',
    backgroundColor: '#10110f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else window.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  connectMqtt()
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media')
  })
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => permission === 'media')
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('before-quit', () => mqttClient?.end())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
