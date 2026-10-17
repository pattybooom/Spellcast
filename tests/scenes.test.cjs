const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'spellcast-scenes-'))
for (const file of ['src/scenes/presets', 'electron/scenes']) {
  const output = path.join(temporary, `${file}.js`)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', `${file}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText)
}
after(() => fs.rmSync(temporary, { recursive: true, force: true }))
const { SceneController } = require(path.join(temporary, 'electron/scenes.js'))
const { SCENES } = require(path.join(temporary, 'src/scenes/presets.js'))
function harness(overrides = {}) {
  const commands = [], tracks = []
  let pauses = 0
  const controller = new SceneController({
    publish: async command => { commands.push(command) },
    play: async uri => { tracks.push(uri) },
    pause: async () => { pauses++ },
    changed: () => {}, ...overrides
  })
  return { controller, commands, tracks, pauses: () => pauses }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

test('Calm and Study apply their lighting and exact Spotify tracks', async () => {
  const h = harness()
  await h.controller.apply('calm')
  assert.deepEqual(h.commands[0], SCENES.calm.lamp)
  assert.equal(h.tracks[0], SCENES.calm.track)
  await h.controller.apply('study')
  assert.equal(h.commands[1].brightness, 254)
  assert.equal(h.commands[1].color_temp, 250)
  assert.equal(h.tracks[1], SCENES.study.track)
  assert.equal(h.controller.state.active, 'study')
  assert.equal(h.controller.state.flashing, false)
})

test('Party alternates light; switching scenes cancels all subsequent flashes', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const h = harness()
  await h.controller.apply('party')
  assert.equal(h.controller.state.flashing, true)
  t.mock.timers.tick(500); await flush()
  assert.equal(h.commands.at(-1).state, 'OFF')
  t.mock.timers.tick(500); await flush()
  assert.equal(h.commands.at(-1).state, 'ON')
  await h.controller.apply('calm')
  const count = h.commands.length
  t.mock.timers.tick(10000); await flush()
  assert.equal(h.commands.length, count)
  assert.equal(h.controller.state.active, 'calm')
})

test('Stop restores steady light, pauses music, and cancels pending flashing', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const h = harness()
  await h.controller.apply('party')
  t.mock.timers.tick(500); await flush()
  await h.controller.stop()
  assert.deepEqual(h.commands.at(-1), { state: 'ON', transition: 0 })
  assert.equal(h.pauses(), 1)
  const count = h.commands.length
  t.mock.timers.tick(10000); await flush()
  assert.equal(h.commands.length, count)
  assert.equal(h.controller.state.active, null)
})

test('Stop during Spotify startup prevents a late Party timer from starting', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let release
  const h = harness({ play: () => new Promise(resolve => { release = resolve }) })
  const applying = h.controller.apply('party')
  await flush()
  const stopping = h.controller.stop()
  release()
  await Promise.all([applying, stopping])
  t.mock.timers.tick(10000); await flush()
  assert.equal(h.controller.state.active, null)
  assert.equal(h.controller.state.flashing, false)
  assert.equal(h.commands.at(-1).state, 'ON')
})

test('Spotify failure is exposed without hiding applied lighting', async () => {
  const h = harness({ play: async () => { throw new Error('Automation access denied') } })
  await h.controller.apply('study')
  assert.equal(h.controller.state.active, 'study')
  assert.match(h.controller.state.error, /Spotify: Automation access denied/)
})

test('MQTT failure stops flashing and does not start Spotify', async () => {
  const h = harness({ publish: async () => { throw new Error('Offline') } })
  await h.controller.apply('party')
  assert.equal(h.controller.state.active, null)
  assert.equal(h.controller.state.flashing, false)
  assert.equal(h.tracks.length, 0)
  assert.match(h.controller.state.error, /Offline/)
})

test('A failed flash publish stops the timer instead of retrying indefinitely', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let count = 0
  const h = harness({ publish: async () => { if (++count > 1) throw new Error('Disconnected') } })
  await h.controller.apply('party')
  t.mock.timers.tick(500); await flush()
  assert.equal(h.controller.state.flashing, false)
  assert.match(h.controller.state.error, /Flashing stopped/)
  const stoppedCount = count
  t.mock.timers.tick(10000); await flush()
  assert.equal(count, stoppedCount)
})


test('Manual lamp takeover cancels flashing without pausing Spotify', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const h = harness()
  await h.controller.apply('party')
  await h.controller.stop(false)
  const count = h.commands.length
  t.mock.timers.tick(10000); await flush()
  assert.equal(h.commands.length, count)
  assert.equal(h.pauses(), 0)
  assert.equal(h.controller.state.active, null)
})

test('A newer scene wins while the previous Spotify startup is pending', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let release
  const tracks = []
  const h = harness({ play: uri => {
    tracks.push(uri)
    return tracks.length === 1 ? new Promise(resolve => { release = resolve }) : Promise.resolve()
  } })
  const party = h.controller.apply('party')
  await flush()
  const study = h.controller.apply('study')
  release()
  await Promise.all([party, study])
  assert.equal(h.controller.state.active, 'study')
  assert.equal(h.controller.state.flashing, false)
  assert.equal(tracks.at(-1), SCENES.study.track)
  const count = h.commands.length
  t.mock.timers.tick(10000); await flush()
  assert.equal(h.commands.length, count)
})
