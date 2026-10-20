import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

const zigbeeDir = `${process.env.HOME}/zigbee2mqtt`
const bundledNode = `${process.env.HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`
const zigbeeConfig = `${zigbeeDir}/data/configuration.yaml`
const mosquittoConfig = '/opt/homebrew/etc/mosquitto/mosquitto.conf'
const node24 = '/opt/homebrew/opt/node@24/bin/node'
const children = new Set()
let shuttingDown = false

function stopChildren() {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill('SIGTERM')
  setTimeout(() => {
    for (const child of children) if (child.exitCode === null) child.kill('SIGKILL')
    process.exit()
  }, 3000).unref()
}

process.on('SIGINT', stopChildren)
process.on('SIGTERM', stopChildren)

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options })
    children.add(child)
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      children.delete(child)
      resolve({ code: code ?? 1, signal })
    })
  })
}

async function ensureMosquitto() {
  const probe = await run('sh', ['-c', 'nc -z 127.0.0.1 1883'], { stdio: 'ignore' })
  if (probe.code === 0) {
    console.log('Mosquitto is already accepting connections on localhost:1883.')
    return
  }
  if (!existsSync(mosquittoConfig)) throw new Error(`Mosquitto config not found: ${mosquittoConfig}`)
  console.log('Starting Mosquitto with Homebrew...')
  const result = await run('brew', ['services', 'start', 'mosquitto'])
  if (result.code !== 0) throw new Error('Could not start Mosquitto with brew services.')
  for (let attempt = 0; attempt < 20; attempt++) {
    await delay(500)
    if ((await run('sh', ['-c', 'nc -z 127.0.0.1 1883'], { stdio: 'ignore' })).code === 0) return
  }
  throw new Error('Mosquitto did not start listening on localhost:1883.')
}

async function main() {
  if (process.platform !== 'darwin') throw new Error('The automatic Zigbee startup is configured for this macOS machine.')
  if (!existsSync(zigbeeDir) || !existsSync(zigbeeConfig)) throw new Error(`Zigbee2MQTT setup not found at ${zigbeeDir}.`)
  if (!existsSync(bundledNode)) throw new Error(`Bundled Node runtime not found at ${bundledNode}.`)
  if (!existsSync(node24)) throw new Error('Node.js 24 is required. Expected it at /opt/homebrew/opt/node@24; install or repair Homebrew node@24 first.')

  await ensureMosquitto()

  const coordinator = await new Promise(resolve => {
    const child = spawn('sh', ['-c', 'ls /dev/cu.usb* 2>/dev/null'], { stdio: ['ignore', 'pipe', 'ignore'] })
    let output = ''
    child.stdout.setEncoding('utf8').on('data', chunk => { output += chunk })
    child.once('error', () => resolve(''))
    child.once('exit', code => resolve(code === 0 ? output.trim() : ''))
  })
  if (coordinator) console.log(`Detected serial device(s): ${coordinator}. Zigbee2MQTT will use its saved adapter configuration.`)
  else console.warn('No /dev/cu.usb* device detected. Zigbee2MQTT will still start and report the adapter error.')
  const config = await readFile(zigbeeConfig, 'utf8')
  const configuredPort = config.match(/^\s+port:\s*(.+?)\s*$/m)?.[1]
  if (configuredPort && coordinator && !String(coordinator).split('\n').includes(configuredPort)) {
    console.warn(`Saved Zigbee2MQTT port (${configuredPort}) is not among the detected devices (${String(coordinator).replaceAll('\n', ', ')}). Update serial.port in ${zigbeeConfig} before relying on lamp controls.`)
  }

  console.log('Starting Zigbee2MQTT. Keep the USB coordinator connected; this window will show its logs.')
  const zigbee = spawn(bundledNode, ['index.js'], { cwd: zigbeeDir, stdio: 'inherit' })
  children.add(zigbee)
  zigbee.once('error', error => { console.error('Could not start Zigbee2MQTT:', error); stopChildren() })
  zigbee.once('exit', (code, signal) => {
    children.delete(zigbee)
    if (!shuttingDown) {
      console.error(`Zigbee2MQTT exited unexpectedly (${signal ?? `code ${code}`}). App will remain open; lamp and scene controls need Zigbee2MQTT.`)
    }
  })

  await delay(1500)
  if (zigbee.exitCode !== null) throw new Error('Zigbee2MQTT exited during startup; see its error above.')

  console.log('Starting Spellcast...')
  const app = spawn(node24, ['node_modules/electron-vite/bin/electron-vite.js', 'dev'], { cwd: process.cwd(), stdio: 'inherit', env: { ...process.env, PATH: `/opt/homebrew/opt/node@24/bin:${process.env.PATH ?? ''}` } })
  children.add(app)
  app.once('error', error => { console.error('Could not start the Spellcast app:', error); stopChildren() })
  app.once('exit', (code, signal) => {
    children.delete(app)
    if (!shuttingDown) {
      console.log('Spellcast closed; stopping Zigbee2MQTT.')
      stopChildren()
      if (code !== 0) process.exitCode = code ?? 1
    }
  })
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  stopChildren()
  process.exitCode = 1
})
