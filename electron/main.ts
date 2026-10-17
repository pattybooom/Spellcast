import { app, BrowserWindow, ipcMain, session } from 'electron'
import { connect, type MqttClient } from 'mqtt'
import { join } from 'node:path'

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

function publishLampCommand(command: Record<string, string | number>) {
  if (!mqttClient?.connected) return { ok: false, error: 'MQTT is not connected.' }
  mqttClient.publish(`${lampTopic}/set`, JSON.stringify(command), { qos: 1 }, error => {
    if (error) {
      lampState = { ...lampState, error: error.message }
      publishLampState()
    }
  })
  return { ok: true }
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
