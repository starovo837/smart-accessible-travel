const ENDPOINT = 'https://overpass-api.de/api/interpreter'
const RADII = [2000, 5000, 10000]
const RAW_LIMIT = 250
const RESULT_LIMIT = 50
const MAX_BYTES = 2 * 1024 * 1024
const CACHE_MS = 10 * 60 * 1000

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const validPoint = (latitude, longitude) => typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180

/** Only coordinates explicitly authorized for this one lookup are accepted. */
export function validateHospitalQuery(input) {
  if (input?.consent !== true) fail('请先同意将本次位置用于在线查询附近医院。')
  const { latitude, longitude } = input
  const radius = input.radius ?? 2000
  if (!validPoint(latitude, longitude) || !RADII.includes(radius)) fail('请提供有效的 WGS84 经纬度，并选择 2、5 或 10 公里范围。')
  return { latitude, longitude, radius }
}

function straightLineDistance(a, b) {
  const radians = value => value * Math.PI / 180
  const latitudeDelta = radians(b.latitude - a.latitude)
  const longitudeDelta = radians(b.longitude - a.longitude)
  const h = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))))
}

const text = (value, limit) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) : ''

function categoryFor(tags) {
  // A pharmacy, doctor, dentist, veterinary practice or abandoned building is
  // never promoted to a hospital based on its name or building tag.
  if (['yes', 'hospital', 'clinic'].includes(tags.disused) || ['yes', 'hospital', 'clinic'].includes(tags.abandoned) || ['yes', 'hospital', 'clinic'].includes(tags.demolished) || ['yes', 'hospital', 'clinic'].includes(tags.construction)) return null
  if (tags.amenity && !['hospital', 'clinic'].includes(tags.amenity)) return null
  if (tags.healthcare && !['hospital', 'clinic'].includes(tags.healthcare)) return null
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'hospital'
  if (tags.amenity === 'clinic' || tags.healthcare === 'clinic') return 'clinic'
  return null
}

/** OSM node coordinates and way/relation centers are WGS84. */
export function normalizeHospitalElements(raw, query, at = new Date().toISOString()) {
  if (!Array.isArray(raw?.elements) || raw.remark) fail('医院地图服务本次未返回完整的有效记录，请稍后重试或打开国内地图搜索。', 502)
  if (!validPoint(query?.latitude, query?.longitude) || !RADII.includes(query?.radius)) fail('缺少本次医院查询的有效位置或范围。')
  const seen = new Set()
  const hospitals = []
  for (const element of raw.elements.slice(0, RAW_LIMIT)) {
    if (!element || !['node', 'way', 'relation'].includes(element.type) || !Number.isSafeInteger(element.id) || element.id <= 0 || !element.tags || typeof element.tags !== 'object' || Array.isArray(element.tags)) continue
    const latitude = element.lat ?? element.center?.lat
    const longitude = element.lon ?? element.center?.lon
    if (!validPoint(latitude, longitude)) continue
    const rawTags = Object.fromEntries(Object.entries(element.tags).filter(([key, value]) => key !== '__proto__' && key !== 'constructor' && key !== 'prototype' && typeof value === 'string'))
    const category = categoryFor(rawTags)
    if (!category) continue
    const id = `osm-${element.type}-${element.id}`
    const distance = straightLineDistance(query, { latitude, longitude })
    if (seen.has(id) || distance > query.radius) continue
    seen.add(id)
    const categoryLabel = category === 'hospital' ? '医院' : '诊所'
    hospitals.push({
      id,
      name: text(rawTags['name:zh'], 120) || text(rawTags.name, 120) || `未命名${categoryLabel}（OSM记录）`,
      category,
      categoryLabel,
      address: text(rawTags['addr:full'], 250) || ['addr:province', 'addr:city', 'addr:district', 'addr:street', 'addr:housenumber'].map(key => text(rawTags[key], 80)).filter(Boolean).join(' ').slice(0, 250),
      latitude,
      longitude,
      distanceMeters: Math.round(distance),
      source: 'OpenStreetMap贡献者',
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      rawTags,
      fetchedAt: at,
    })
  }
  return hospitals.sort((a, b) => a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id)).slice(0, RESULT_LIMIT)
}

async function boundedJson(response) {
  if (Number(response.headers?.get('content-length')) > MAX_BYTES) fail('医院地图结果过大，请缩小范围或打开国内地图搜索。', 502)
  if (!response.body?.getReader) {
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > MAX_BYTES) fail('医院地图结果过大，请缩小范围或打开国内地图搜索。', 502)
    return JSON.parse(new TextDecoder().decode(bytes))
  }
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) {
        await reader.cancel()
        fail('医院地图结果过大，请缩小范围或打开国内地图搜索。', 502)
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return JSON.parse(new TextDecoder().decode(bytes))
}

/** Fixed public endpoint, in-memory ten-minute cache; no location persistence. */
export function createHospitalService({ fetcher = fetch, now = Date.now, timeoutMs = 16000 } = {}) {
  const cache = new Map()
  let active = false
  let lastStartedAt = -Infinity
  return async input => {
    const query = validateHospitalQuery(input)
    const { latitude, longitude, radius } = query
    const key = `${latitude},${longitude},${radius}`
    const cached = cache.get(key)
    if (cached && cached.expires > now()) return structuredClone(cached.value)
    if (active || now() - lastStartedAt < 3000) fail('附近医院查询正在进行，请稍后再试。也可打开国内地图搜索。', 429)
    active = true
    lastStartedAt = now()
    try {
      // Official around syntax: radius in meters, latitude, longitude.
      // https://dev.overpass-api.de/overpass-doc/en/full_data/polygon.html
      const around = `around:${radius},${latitude},${longitude}`
      const data = `[out:json][timeout:12];(nwr(${around})["amenity"~"^(hospital|clinic)$"];nwr(${around})["healthcare"~"^(hospital|clinic)$"];);out center tags ${RAW_LIMIT};`
      const response = await fetcher(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SmartAccessibleTravel/0.1 (+https://modelscope.cn/studios/starovo/smart-accessible-travel)' },
        body: new URLSearchParams({ data }),
        redirect: 'error',
        signal: AbortSignal.timeout(Math.max(1, Math.min(16000, timeoutMs))),
      })
      if (!response.ok) fail('附近医院在线服务暂不可用，请稍后再试或打开国内地图搜索。', 502)
      const raw = await boundedJson(response)
      const fetchedAt = new Date(now()).toISOString()
      const hospitals = normalizeHospitalElements(raw, query, fetchedAt)
      const value = {
        hospitals,
        ...query,
        status: hospitals.length ? 'ok' : 'empty',
        notice: hospitals.length
          ? '按地图记录的直线距离由近到远展示，最多50条，不代表医疗质量排名。记录可能遗漏或过时；号源、接诊和无障碍条件请向医院确认。'
          : '该范围内暂无可用的医院或诊所地图记录；这不代表附近没有医院。可扩大范围，或打开国内地图就近搜索。',
        source: 'OpenStreetMap / Overpass API',
        sourceUrl: 'https://www.openstreetmap.org/copyright',
        license: 'ODbL',
        fetchedAt,
      }
      for (const [entryKey, entry] of cache) if (entry.expires <= now()) cache.delete(entryKey)
      if (cache.size >= 100) cache.delete(cache.keys().next().value)
      cache.set(key, { expires: now() + CACHE_MS, value: structuredClone(value) })
      return value
    } catch (error) {
      if (error?.status) throw error
      fail('附近医院查询超时、网络未连通或地图结果无效。可重试、扩大范围，或打开国内地图就近搜索。', 502)
    } finally { active = false }
  }
}
