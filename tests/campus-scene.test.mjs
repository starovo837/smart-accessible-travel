import test from 'node:test'
import assert from 'node:assert/strict'
import { campusPhotoCover, campusPhotoSize, fountainPainter, heroWindow, particleCountForCover, projectFountain, waterMotionAllowed } from '../src/app/campusScene.ts'
import { initialJourney } from '../src/app/journey.ts'
import { readSnapshot, scopeSnapshot } from '../src/app/storage.ts'
import { portableSnapshot } from '../src/app/portable.ts'

test('each jet point and the basin line follow the photo cover crop and position', () => {
  const { width, height } = campusPhotoSize
  assert.deepEqual(campusPhotoCover(width, height, .5), { x: 0, y: 0, w: width, h: height })
  const coverWidth = 600, coverHeight = 320
  const calibration = { ...heroWindow, positionY: .8 }
  const projected = projectFountain(coverWidth, coverHeight, calibration)
  const imageHeight = coverWidth * 3 / 4
  const offsetY = (coverHeight - imageHeight) * calibration.positionY
  assert.deepEqual(projected.jets, calibration.jets.map(jet => ({
    x: jet.x * coverWidth,
    y: offsetY + jet.y * imageHeight,
  })))
  assert.equal(projected.basinY, offsetY + calibration.basinY * imageHeight)
})

test('each accessibility and data-saving preference independently stops water motion', () => {
  assert.equal(waterMotionAllowed({}), true)
  assert.equal(waterMotionAllowed({ enabled: false }), false)
  for (const key of ['reduced', 'elder', 'saveData', 'forcedColors']) {
    assert.equal(waterMotionAllowed({ [key]: true }), false, key)
  }
})

test('the homepage cover keeps the fountain in view at the three target sizes', () => {
  for (const [width, height] of [[320, 414.4], [390, 472.64], [458, 504]]) {
    const { photo, jets, basinY } = projectFountain(width, height)
    assert.ok(jets.length >= 2 && jets.length <= 3)
    for (const jet of jets) assert.ok(jet.x > 0 && jet.x < width && jet.y > 0 && jet.y < basinY)
    assert.ok(photo.y + photo.h * .311 > 0 && basinY < height)
  }
})

test('particle density scales by cover area within the drawing budget', () => {
  assert.equal(particleCountForCover(320, 414.4), 180)
  assert.ok(particleCountForCover(390, 472.64) > 180)
  assert.ok(particleCountForCover(390, 472.64) < 260)
  assert.equal(particleCountForCover(460, 540), 260)
})

test('water uses cached soft sprites for drops and leaves ellipse drawing for three stroked ripples', () => {
  const sprites = [], drawn = [], ripple = []
  const ownerDocument = { createElement() {
    const stops = []
    const sprite = { stops, getContext: () => ({
      createRadialGradient: () => ({ addColorStop: (...entry) => stops.push(entry) }),
      fillRect() {},
    }) }
    sprites.push(sprite)
    return sprite
  } }
  const context = {
    canvas: { ownerDocument },
    globalAlpha: 1,
    clearRect() {},
    beginPath() {},
    drawImage(sprite, x, y, width, height) { drawn.push({ sprite, width, height, alpha: this.globalAlpha }) },
    fill() { assert.fail('Water droplets must use drawImage') },
    ellipse(x, y, radius) { ripple.push({ x, y, radius }) },
    stroke() {},
  }
  const paint = fountainPainter(context)
  assert.equal(sprites.length, 2)
  assert.equal(sprites[0].width, 64)
  assert.deepEqual(sprites[0].stops.at(-1), [.65, 'transparent'])
  assert.equal(sprites[0].stops[0][1], 'rgba(244,255,252,0.95)')
  const projection = projectFountain(390, 473)
  paint(1.2, projection, 390, 473, 180)
  assert.equal(drawn.filter(item => item.sprite === sprites[1]).length, 13)
  const drops = drawn.filter(item => item.sprite === sprites[0])
  assert.ok(drops.length >= 180 && drops.length <= 240)
  assert.ok(drops.every(({ width, height, alpha }) => width >= 2 && height <= 8 && height > width && alpha <= .7))
  assert.equal(ripple.length, 3)
  assert.ok(ripple.every(({ x, y, radius }) => x === projection.basinX && y === projection.basinY && radius <= 390 * .4))
  paint(2.2, projection, 390, 473, 180)
  assert.equal(sprites.length, 2)
  assert.equal(context.globalAlpha, 1)
})

test('the disabled water preference survives the normal settings roundtrip and stays out of portable exports', () => {
  const journey = initialJourney()
  const settings = { elderMode: false, stepMode: false, readAloud: false, fountainMotion: false }
  const data = { modules: [], devices: [], consent: 'granted', settings, customModes: [], customDevices: [], journey,
    privacy: { profile: false, devices: false, life: false, retainDays: 0 }, feedback: [] }
  const saved = readSnapshot(JSON.stringify(scopeSnapshot(data, 10)), 20)
  assert.equal(saved.settings.fountainMotion, false)
  assert.equal(portableSnapshot(journey, [], { devices: false, life: false, trip: false }).settings.fountainMotion, undefined)
})
