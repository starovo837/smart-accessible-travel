import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readText, readingFallbackEvent, stopReading } from '../src/app/accessibility.ts'
import { initialJourney } from '../src/app/journey.ts'
import { serviceProviders, safeServiceUrl } from '../src/app/serviceProviders.ts'
import { STORAGE_KEY, readSnapshot, sharesForPrivacyWithdrawal, withoutLifeAssistance, writeScopedSnapshot } from '../src/app/storage.ts'
import { buildTravelTaskPlan } from '../src/app/travelPlan.ts'
import { travelReadingText } from '../src/app/travelTaskTypes.ts'
import { createProductApi } from '../server/product-api.mjs'
import { createWorkspaceService } from '../server/workspace-service.mjs'

const share = (id, scopes, revoked = false) => ({ id, scopes, revoked, expiresAt: Date.now() + 60000 })
const data = () => ({
  journey: initialJourney(), modules: [], devices: [], consent: 'granted', settings: {},
  privacy: { life: true, devices: true, profile: false, retainDays: 30 },
  feedback: [], customModes: [], customDevices: [],
})

test('withdrawal targets device details and carrier records, keeping checklist-only shares active', () => {
  const rows = [share('a', ['devices']), share('b', ['records']), share('c', ['checklist']),
    share('d', ['devices', 'checklist']), share('e', ['devices'], true)]
  assert.deepEqual(sharesForPrivacyWithdrawal(rows, { devices: true, life: false }).map(row => row.id), ['a', 'b', 'd'])
  assert.deepEqual(sharesForPrivacyWithdrawal(rows, { devices: false, life: true }).map(row => row.id), ['a', 'b', 'c', 'd'])
  assert.deepEqual(sharesForPrivacyWithdrawal(rows, { devices: false, life: false }), [])
})

test('withdrawing life consent clears assistance and learning in memory and storage before regrant', () => {
  const snapshot = data()
  snapshot.journey.life.assistance = { phrases: ['合成话语'], tasks: [], progress: { demo: 1 }, gesturePhrases: { demo: '合成' } }
  snapshot.journey.life.learning = { favorites: ['cdlvi'], recent: [], plans: [], reports: [] }
  const records = new Map()
  const storage = { setItem: (key, value) => records.set(key, value), getItem: key => records.get(key) ?? null }
  writeScopedSnapshot(snapshot, storage)
  assert.equal(readSnapshot(storage.getItem(STORAGE_KEY)).journey.life.assistance.phrases[0], '合成话语')
  const revokedLife = withoutLifeAssistance(snapshot.journey.life)
  assert.equal(revokedLife.assistance, undefined)
  assert.equal(revokedLife.learning, undefined)
  const revoked = { ...snapshot, journey: { ...snapshot.journey, life: revokedLife }, privacy: { ...snapshot.privacy, life: false } }
  assert.throws(() => writeScopedSnapshot(revoked, { ...storage, setItem() {} }))
  assert.equal(readSnapshot(storage.getItem(STORAGE_KEY)).privacy.life, true)
  writeScopedSnapshot(revoked, storage)
  assert.equal(readSnapshot(storage.getItem(STORAGE_KEY)).privacy.life, false)
  writeScopedSnapshot({ ...revoked, privacy: snapshot.privacy }, storage)
  assert.equal(readSnapshot(storage.getItem(STORAGE_KEY)).journey.life.assistance, undefined)
  assert.equal(readSnapshot(storage.getItem(STORAGE_KEY)).journey.life.learning, undefined)
})

test('26 service entries retain safe sources and dates, including both Beijing healthcare channels', () => {
  assert.equal(serviceProviders.length, 26)
  for (const provider of serviceProviders) {
    assert.ok(safeServiceUrl(provider.sourceUrl), provider.id)
    assert.ok(safeServiceUrl(provider.url), provider.id)
    assert.match(provider.verifiedAt, /^\d{4}-\d{2}-\d{2}$/)
  }
  const healthcare = serviceProviders.filter(row => row.category === 'healthcare')
  assert.deepEqual(healthcare.map(row => row.id), ['crrc-hospital', 'beijing-114'])
  assert.equal(healthcare[1].phone, '010-114')
})

test('reading succeeds only on completion and shows the original text on voice or playback failure', async t => {
  const fakeWindow = new EventTarget()
  const voices = new EventTarget()
  const shown = [], spoken = []
  const voice = { localService: true, lang: 'zh-CN' }
  let available = [{ ...voice, lang: 'en' }, { ...voice, localService: false }]
  let playback = 'fail'
  voices.getVoices = () => available
  voices.cancel = () => {}
  voices.speak = utterance => {
    spoken.push(utterance.text)
    assert.equal(utterance.voice, voice)
    if (playback === 'hang') return
    queueMicrotask(() => playback === 'fail' ? utterance.onerror?.() : utterance.onend?.())
  }
  fakeWindow.speechSynthesis = voices
  fakeWindow.addEventListener(readingFallbackEvent, event => { if (event.detail) shown.push(event.detail) })
  globalThis.window = fakeWindow
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
  t.after(() => {
    delete globalThis.window
    delete globalThis.SpeechSynthesisUtterance
  })
  assert.equal(await readText('缺少本机中文音色'), false)
  assert.deepEqual(spoken, [])
  available = [voice]
  assert.equal(await readText('播报失败'), false)
  assert.deepEqual(shown, ['缺少本机中文音色', '播报失败'])
  playback = 'complete'
  const long = '一段朗读内容。\n'.repeat(50)
  spoken.length = 0
  assert.equal(await readText(long), true)
  assert.equal(spoken.join(''), long)
  playback = 'hang'
  const stopped = readText('主动停止')
  await Promise.resolve()
  stopReading()
  assert.equal(await stopped, null)
  assert.equal(shown.length, 2)
})

test('reading the whole travel plan includes summary, A–E, general actions and every contact', () => {
  const plan = buildTravelTaskPlan({ mode: 'rail', devices: [], specs: {}, context: { from: '', to: '' } })
  assert.ok(plan.generalActions.length)
  const spoken = travelReadingText(plan, '通用建议', '联系渠道')
  assert.ok(spoken.includes(plan.summary))
  plan.stages.forEach(stage => assert.ok(spoken.includes(stage.title)))
  plan.generalActions.forEach(action => assert.ok(spoken.includes(action.title) && spoken.includes(action.detail)))
  plan.contacts.forEach(contact => assert.ok(spoken.includes(contact.name) && spoken.includes(contact.phone)))
})

test('case deletion requires the owner credential and returns 404 after successful deletion; share revocation denies the recipient', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sai-everyday-'))
  const workspace = createWorkspaceService({ directory })
  const api = createProductApi({ workspace })
  const server = createServer((req, res) => { void api(req, res) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  })
  const item = await workspace.createCase({ subject: '合成纠错', text: '本机验证', consent: true })
  const link = await workspace.createShare({ scopes: ['devices'], consent: true, payload: { devices: [] } })
  const call = (path, token, remove = false) => fetch('http://127.0.0.1:' + server.address().port + '/api/' + path, {
    method: remove ? 'POST' : 'GET',
    headers: { 'X-Sai-Capability': token, ...(remove ? { 'X-Sai-Action': 'delete' } : {}) },
  })
  assert.equal((await call('cases/' + item.id, 'incorrect', true)).status, 403)
  assert.equal((await call('cases/' + item.id, item.accessToken)).status, 200)
  assert.equal((await call('cases/' + item.id, item.accessToken, true)).status, 200)
  assert.equal((await call('cases/' + item.id, item.accessToken)).status, 404)
  assert.equal((await call('shares/' + link.id, link.viewToken)).status, 200)
  assert.equal((await call('shares/' + link.id + '/owner', link.ownerToken, true)).status, 200)
  assert.equal((await call('shares/' + link.id, link.viewToken)).status, 403)
})
