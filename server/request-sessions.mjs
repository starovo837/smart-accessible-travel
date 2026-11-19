import { randomBytes } from 'node:crypto'
import { isIP, SocketAddress } from 'node:net'
import { copyDictionary as copy } from '../src/app/copyDictionary.ts'

const minute = 60_000
const lifetime = 12 * 60 * minute
const pendingLifetime = 5 * minute
const maxSessions = 2000
const maxPending = 500
const perAddress = 6
const studioGatewayPerAddress = 60
const maxSessionsPerAddress = 64
const maxRateKeys = 10_000

export function normalizeAddress(raw) {
  if (typeof raw !== 'string' || raw.includes('%')) return ''
  const version = isIP(raw)
  if (version === 4) return raw
  if (version !== 6) return ''
  const ip = new SocketAddress({ address: raw, family: 'ipv6' }).address
  return ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip
}

function trustedPeer(req, policy) {
  return policy.trustedProxies?.includes(normalizeAddress(req.socket.remoteAddress)) === true
}

function clientAddress(req, policy) {
  const peer = normalizeAddress(req.socket.remoteAddress) || 'unknown'
  const forwarded = req.headers['x-forwarded-for']
  if (!trustedPeer(req, policy) || typeof forwarded !== 'string' || forwarded.length > 1024) return peer
  const addresses = forwarded.split(',').map(part => normalizeAddress(part.trim()))
  if (addresses.some(address => !address)) return peer
  // A configured gateway must append the immediate source or replace the header.
  return addresses.findLast(address => !policy.trustedProxies.includes(address)) ?? peer
}

function usesHttps(req, policy) {
  if (req.socket.encrypted === true) return true
  if (trustedPeer(req, policy) && req.headers['x-forwarded-proto'] === 'https') return true
  if (!policy.enabled) return false
  // Browser GET requests can omit Origin, and the Studio gateway may rewrite Host.
  if (policy.origins.length && policy.origins.every(origin => origin.startsWith('https://'))) return true
  return policy.origins.some(origin => origin.startsWith('https://') && (
    origin === req.headers.origin || origin === 'https://' + req.headers.host
  ))
}

export function createRequestSessions(policy, now = Date.now) {
  const sessions = new Map()
  const pending = new Map()
  const issuanceLimits = new Map()
  const limits = new Map()
  const sweepAt = new Map()
  const issuance = { issued: 0, evictedPending: 0, limited: 0 }

  function consume(pool, key, max, at = now()) {
    if (at >= (sweepAt.get(pool) ?? 0)) {
      for (const [key, entry] of pool) if (entry.until <= at) pool.delete(key)
      sweepAt.set(pool, at + minute)
    }
    const prior = pool.get(key)
    const entry = prior?.until > at ? prior : { until: at + minute, count: 0 }
    if (!prior && pool.size >= maxRateKeys) return Math.ceil((sweepAt.get(pool) - at) / 1000)
    if (entry.count >= max) return Math.ceil((entry.until - at) / 1000)
    entry.count++
    pool.set(key, entry)
    return 0
  }

  function resolve(req) {
    const cookies = String(req.headers.cookie ?? '').split(';').map(part => part.trim())
    const candidates = [req.headers['x-sai-session'], ...cookies.filter(part => part.startsWith('sai_session=')).map(part => part.slice(12))]
    const at = now()
    return candidates.find(token => (sessions.get(token)?.until ?? 0) > at)
  }

  function markUsed(token) {
    const entry = pending.get(token)
    if (!entry || entry.until <= now()) return
    pending.delete(token)
    entry.until = entry.issuedAt + lifetime
  }

  function rateError(seconds) {
    issuance.limited++
    return Object.assign(Error(copy.sessionRateLimited), { status: 429, retryAfter: Math.max(1, seconds) })
  }

  function evictPending(token) {
    pending.delete(token)
    sessions.delete(token)
    issuance.evictedPending++
  }

  function issue(req, res, paired = false) {
    const existing = resolve(req)
    if (existing) {
      if (paired) markUsed(existing)
      return existing
    }
    const at = now(), address = clientAddress(req, policy)
    const sharedGateway = policy.enabled && !trustedPeer(req, policy)
    const wait = consume(issuanceLimits, address, sharedGateway ? studioGatewayPerAddress : perAddress, at)
    if (wait) throw rateError(wait)
    for (const [key, entry] of sessions) {
      if (entry.until <= at) {
        sessions.delete(key)
        pending.delete(key)
      }
    }
    if (!sharedGateway) {
      const waiting = [...pending.values()].filter(entry => entry.address === address)
      if (!paired && waiting.length >= perAddress) {
        throw rateError(Math.ceil((Math.min(...waiting.map(entry => entry.until)) - at) / 1000))
      }
      const ownSessions = [...sessions.values()].filter(entry => entry.address === address)
      if (ownSessions.length >= maxSessionsPerAddress) {
        throw rateError(Math.ceil((Math.min(...ownSessions.map(entry => entry.until)) - at) / 1000))
      }
    }
    // Leave room for new visitors while protecting sessions already used by the app.
    if (pending.size && ((!paired && pending.size >= maxPending) || sessions.size >= maxSessions)) {
      evictPending(pending.keys().next().value)
    }
    if (sessions.size >= maxSessions) {
      const earliest = Math.min(...Array.from(sessions.values(), entry => entry.until))
      throw rateError(Math.ceil((earliest - at) / 1000))
    }
    const token = randomBytes(32).toString('hex')
    const entry = { address, issuedAt: at, until: at + (paired ? lifetime : pendingLifetime) }
    sessions.set(token, entry)
    if (!paired) pending.set(token, entry)
    issuance.issued++
    res.setHeader('Set-Cookie', `sai_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${usesHttps(req, policy) ? '; Secure' : ''}`)
    return token
  }

  function hit(req, route, max, res) {
    const wait = consume(limits, `${route}:${clientAddress(req, policy)}`, max)
    if (wait) res?.setHeader('Retry-After', String(wait))
    return wait === 0
  }

  return {
    resolve, issue, hit, markUsed,
    issuanceStats: () => {
      const at = now()
      let active = 0
      for (const entry of sessions.values()) if (entry.until > at) active++
      return { ...issuance, sessions: active }
    },
  }
}
