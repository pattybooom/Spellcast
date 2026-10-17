const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'spellcast-scene-gesture-'))
for (const file of ['src/gesture/handPose', 'src/scenes/presets']) {
  const output = path.join(temporary, `${file}.js`)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', `${file}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText)
}

const { detectIndexFingerContact } = require(path.join(temporary, 'src/gesture/handPose.js'))

function hand(offsetX) {
  const landmarks = Array.from({ length: 21 }, () => ({ x: offsetX, y: 0.5, z: 0 }))
  landmarks[5] = { x: offsetX, y: 0.5, z: 0 }
  landmarks[17] = { x: offsetX + 0.1, y: 0.5, z: 0 }
  landmarks[8] = { x: offsetX + 0.05, y: 0.5, z: 0 }
  return landmarks
}

test('index fingertip contact is scale-relative and has hysteresis gap', () => {
  const first = hand(0)
  const second = hand(0)
  first[8] = { x: 0.05, y: 0.2, z: 0 }
  second[8] = { x: 0.05, y: 0.21, z: 0 }
  assert.equal(detectIndexFingerContact(first, second), 'touching')
  second[8] = { x: 0.05, y: 0.23, z: 0 }
  assert.equal(detectIndexFingerContact(first, second), null)
  second[8] = { x: 0.05, y: 0.3, z: 0 }
  assert.equal(detectIndexFingerContact(first, second), 'apart')
})

test('scene cycle advances Party to No scene', () => {
  const { SCENE_CYCLE } = require(path.join(temporary, 'src/scenes/presets.js'))
  const current = SCENE_CYCLE.indexOf('party')
  assert.equal(SCENE_CYCLE[(current + 1) % SCENE_CYCLE.length], null)
})
