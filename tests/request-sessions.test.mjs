import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createProductApi } from '../server/product-api.mjs'
import { createRequestSessions, normalizeAddress } from '../server/request-sessions.mjs'
import { studioPolicy } from '../server/studio-policy.mjs'

const studio = { SAI_DEPLOYMENT: 'studio', SAI_PUBLIC_ORIGINS: 'https://demo.example' }
const origin = { Origin: 'https://demo.example' }
const minute = 60_000
const tokenHeader = token => ({ 'x-sai-session': token })

async function localApi(t, env = studio, status = async () => ({ configured: true })) {
  let time = Date.parse('2026-11-18T04:00:00Z')
  let statusCalls = 0
  const api = createProductApi({
    policy: studioPolicy(env), sessionClock: () => time,
    start: async () => { statusCalls++ }, status,
    answer: async () => ({ statementIds: ['test'] }),
  })
  const server = createServer((req, res) => { void api(req, res) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const base = 'http://127.0.0.1:' + server.address().port
  return {
    advance: delta => { time += delta },
    calls: () => statusCalls,
    status: headers => fetch(base + '/api/status', { headers }),
    ask: (token, consent = true, extra = {}) => fetch(base + '/api/assistant/answer', {
      method: 'POST', headers: { ...origin, ...extra, ...tokenHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent, question: '合成测试问题', evidence: [] }),
    }),
  }
}

test('ten status calls reuse the same session via header or cookie and send no replacement cookie', async t => {
  const api = await localApi(t), first = await api.status(origin)
  assert.equal(first.status, 200)
  const cookie = first.headers.get('Set-Cookie'), { session } = await first.json()
  assert.match(cookie, /; HttpOnly; SameSite=Strict; Path=\/; Max-Age=43200; Secure$/)
  for (let i = 0; i < 9; i++) {
    const headers = i % 2 ? tokenHeader(session) : { Cookie: `sai_session=stale; ${cookie.split(';')[0]}`, ...tokenHeader('expired-header') }
    const response = await api.status({ ...origin, ...headers })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).session, session)
    assert.equal(response.headers.has('Set-Cookie'), false)
  }
})

test('a retryable status error exposes Retry-After without issuing again to an existing session', async t => {
  let unavailable = false
  const api = await localApi(t, studio, async () => {
    if (unavailable) throw Object.assign(Error('synthetic auth refresh'), { status: 401 })
    return { configured: true }
  })
  const first = await api.status(origin)
  const token = (await first.json()).session
  unavailable = true
  const reply = await api.status({ ...origin, ...tokenHeader(token) })
  assert.equal(reply.status, 401)
  assert.equal(reply.headers.get('Retry-After'), '1')
  assert.equal(reply.headers.has('Set-Cookie'), false)
})

test('HTTPS-only Studio applies Secure when the gateway rewrites Host and the browser omits Origin', async t => {
  const api = await localApi(t)
  const response = await api.status({ Host: 'proxy.internal' })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('Set-Cookie'), /; Secure$/)
  assert.ok((await response.json()).session)
})

test('ten independent Studio visitors behind one gateway can receive and reuse their own cookie', async t => {
  const api = await localApi(t), cookies = [], ids = []
  for (let i = 0; i < 10; i++) {
    const response = await api.status({ ...origin, Cookie: `test_visitor=${i}` })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.sessionIssuance.issued, i + 1)
    assert.equal(body.sessionIssuance.sessions, i + 1)
    ids.push(body.session)
    cookies.push(response.headers.get('Set-Cookie').split(';')[0])
  }
  assert.equal(new Set(ids).size, 10)
  for (let i = 0; i < 10; i++) {
    const response = await api.status({ ...origin, Cookie: cookies[i] })
    assert.equal((await response.json()).session, ids[i])
  }
})

test('unverified Studio gateway issues 60 per minute and preserves active sessions through pending expiry', async t => {
  const api = await localApi(t), ids = []
  for (let i = 0; i < 60; i++) {
    const response = await api.status(origin)
    assert.equal(response.status, 200)
    ids.push((await response.json()).session)
  }
  assert.equal(new Set(ids).size, 60)
  let response = await api.status(origin)
  assert.equal(response.status, 429)
  assert.equal(response.headers.get('Retry-After'), '60')
  assert.equal(response.headers.has('Set-Cookie'), false)
  assert.equal(api.calls(), 60)
  api.advance(minute)
  response = await api.status(origin)
  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).sessionIssuance, { issued: 61, evictedPending: 0, limited: 1, sessions: 61 })
  assert.equal((await (await api.status({ ...origin, ...tokenHeader(ids[0]) })).json()).session, ids[0])
  assert.equal((await api.ask(ids[0])).status, 200)
  assert.equal((await api.ask(ids[1], false)).status, 400)
  api.advance(4 * minute)
  assert.equal((await api.ask(ids[1])).status, 403)
  assert.equal((await api.ask(ids[0])).status, 200)
  response = await api.status(origin)
  assert.equal(response.status, 200)
  assert.ok(!ids.includes((await response.json()).session))
})

test('different sessions from one IP share the assistant limit and retain per-request consent', async t => {
  const api = await localApi(t)
  const first = (await (await api.status(origin)).json()).session
  const second = (await (await api.status(origin)).json()).session
  const third = (await (await api.status(origin)).json()).session
  assert.equal((await api.ask('no-session')).status, 403)
  assert.equal((await api.ask(first, false)).status, 400)
  for (let i = 0; i < 7; i++) assert.equal((await api.ask(i % 2 ? first : second)).status, 200)
  const limited = await api.ask(third)
  assert.equal(limited.status, 403)
  assert.equal(limited.headers.get('Retry-After'), '60')
  assert.equal((await api.status(origin)).status, 200)
  api.advance(minute)
  assert.equal((await api.ask(third)).status, 200)
})

test('an unconfigured proxy does not use forwarding headers for either address counting or HTTP cookie security', async t => {
  const api = await localApi(t, {})
  for (let i = 1; i <= 7; i++) {
    const response = await api.status({ 'X-Forwarded-For': `192.0.2.${i}`, 'X-Forwarded-Proto': 'https' })
    assert.equal(response.status, i <= 6 ? 200 : 429)
    if (i <= 6) assert.doesNotMatch(response.headers.get('Set-Cookie'), /; Secure/)
    await response.json()
  }
})

test('a configured proxy counts the client address nearest the trusted hops and secures TLS cookies', async t => {
  const api = await localApi(t, { ...studio, SAI_TRUSTED_PROXY_IPS: '::ffff:127.0.0.1, 198.51.100.11' })
  for (let i = 1; i <= 7; i++) {
    const response = await api.status({ 'X-Forwarded-For': `192.0.2.${i}, 198.51.100.20, 198.51.100.11`, 'X-Forwarded-Proto': 'https' })
    assert.equal(response.status, i <= 6 ? 200 : 429)
    if (i <= 6) assert.match(response.headers.get('Set-Cookie'), /; Secure$/)
    await response.json()
  }
  const another = await api.status({ 'X-Forwarded-For': '198.51.100.21, 198.51.100.11' })
  assert.equal(another.status, 200)
  await another.json()
  assert.equal(normalizeAddress('::ffff:7f00:1'), '127.0.0.1')
  assert.throws(() => studioPolicy({ SAI_TRUSTED_PROXY_IPS: '0.0.0.0/0' }))
})

test('a surge of unclaimed credentials cannot fill the 2000-session pool', () => {
  const manager = createRequestSessions(studioPolicy(studio))
  const request = (i, token) => ({ socket: { remoteAddress: `2001:db8:1::${i.toString(16)}` }, headers: tokenHeader(token) })
  const response = { setHeader() {} }
  const active = manager.issue(request(0), response)
  manager.markUsed(active)
  const oldest = manager.issue(request(1), response)
  for (let i = 2; i <= 2100; i++) assert.ok(manager.issue(request(i), response))
  assert.equal(manager.resolve(request(1, oldest)), undefined)
  assert.equal(manager.resolve(request(0, active)), active)
  assert.equal(manager.issuanceStats().evictedPending, 1600)
  assert.ok(manager.issue(request(2101), response))
})

test('the shared gateway can keep more than 64 waiting sessions from one address', () => {
  let at = 0
  const manager = createRequestSessions(studioPolicy(studio), () => at)
  const socket = { remoteAddress: '192.0.2.10' }, req = { socket, headers: {} }, res = { setHeader() {} }
  const active = manager.issue(req, res)
  manager.markUsed(active)
  const waiting = Array.from({ length: 63 }, (_, i) => {
    if (i === 59) at += minute
    return manager.issue(req, res)
  })
  const other = manager.issue({ ...req, socket: { remoteAddress: '192.0.2.11' } }, res)
  waiting.push(manager.issue(req, res))
  const resolve = token => manager.resolve({ socket, headers: tokenHeader(token) })
  assert.equal(resolve(active), active)
  assert.equal(resolve(other), other)
  assert.equal(waiting.filter(resolve).length, 64)
  assert.deepEqual(manager.issuanceStats(), { issued: 66, evictedPending: 0, limited: 0, sessions: 66 })
  at += 5 * minute
  assert.equal(manager.issuanceStats().sessions, 1)
})

test('one shared gateway can issue a new session after 100 used sessions and is still capped at 2000', () => {
  let at = 0
  const manager = createRequestSessions(studioPolicy(studio), () => at)
  const req = { socket: { remoteAddress: '192.0.2.10' }, headers: {} }
  const res = { setHeader() {} }
  for (let i = 0; i < 2000; i++) {
    if (i % 60 === 0) at += minute
    const session = manager.issue(req, res)
    if (i === 100) assert.equal(manager.issuanceStats().sessions, 101)
    manager.markUsed(session)
  }
  assert.equal(manager.issuanceStats().sessions, 2000)
  at += minute
  assert.throws(() => manager.issue(req, res), { status: 429, retryAfter: 43200 - 34 * 60 })
})

test('the overall 2000-slot cap protects active sessions and reports retry time when they fill it', () => {
  let at = 0
  const manager = createRequestSessions(studioPolicy(studio), () => at)
  const req = i => ({ socket: { remoteAddress: `2001:db8:2::${i.toString(16)}`, encrypted: true }, headers: {} })
  const res = { setHeader(name, value) { assert.equal(name, 'Set-Cookie'); assert.match(value, /; Secure$/) } }
  for (let i = 1; i <= 2000; i++) {
    const token = manager.issue(req(i), res)
    manager.markUsed(token)
  }
  assert.throws(() => manager.issue(req(2001), res), { status: 429, retryAfter: 43200 })
  at += 12 * 60 * minute
  assert.ok(manager.issue(req(2001), res))
})

test('a client behind a trusted gateway cannot accumulate more than 64 sessions', () => {
  let at = 0
  const manager = createRequestSessions(studioPolicy({ ...studio, SAI_TRUSTED_PROXY_IPS: '192.0.2.10' }), () => at)
  const req = { socket: { remoteAddress: '192.0.2.10' }, headers: { 'x-forwarded-for': '198.51.100.10' } }
  const res = { setHeader() {} }
  for (let i = 0; i < 64; i++) {
    if (i % 6 === 0) at += minute
    manager.markUsed(manager.issue(req, res))
  }
  assert.throws(() => manager.issue(req, res), { status: 429 })
  assert.ok(manager.issue({ ...req, headers: { 'x-forwarded-for': '198.51.100.11' } }, res))
})
