import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {createProductApi} from '../server/product-api.mjs'
import { createHospitalService, normalizeHospitalElements, validateHospitalQuery } from '../server/hospital-service.mjs'
import { HOSPITAL_SEARCH_RADII, buildHospitalPlaceMapLinks, buildHospitalRegionMapLinks, buildNearbyHospitalMapLinks, distanceMeters, formatHospitalDistance, isValidWgs84Location } from '../src/app/nearbyHealthcare.ts'

// Deliberately synthetic OSM fixtures; no fabricated fixture enters the app.
const query = { consent: true, latitude: 31.2304, longitude: 121.4737, radius: 2000 }
const point = (id, latitude, tags = { amenity: 'hospital', name: '测试医院记录' }) => ({ type: 'node', id, lat: latitude, lon: query.longitude, tags })
const fixture = { elements: [point(1, 31.2314), point(2, 31.2305, { healthcare: 'clinic', name: '测试诊所记录', wheelchair: 'yes', 'healthcare:speciality': 'general' })] }

test('nearby hospital lookup requires explicit consent, numeric WGS84 and a bounded supported radius', () => {
  for (const change of [{ consent: false }, { consent: undefined }, { consent: 'true' }, { latitude: '31.2304' }, { latitude: null }, { latitude: 91 }, { longitude: 181 }, { latitude: NaN }, { longitude: Infinity }, { radius: 1000 }, { radius: '2000' }, { radius: 10001 }]) {
    assert.throws(() => validateHospitalQuery({ ...query, ...change }), error => error.status === 400)
  }
  assert.deepEqual(validateHospitalQuery({ ...query, endpoint: 'https://private.invalid', profile: 'PRIVATE' }), { latitude: query.latitude, longitude: query.longitude, radius: 2000 })
  assert.equal(validateHospitalQuery({ ...query, radius: undefined }).radius, 2000)
  assert.deepEqual(HOSPITAL_SEARCH_RADII, [2000, 5000, 10000])
})

test('records contain only hospitals or clinics with source tags and straight-line distance order', () => {
  const rows = normalizeHospitalElements(fixture, query, '2026-10-26T00:00:00Z')
  assert.deepEqual(rows.map(row => row.id), ['osm-node-2', 'osm-node-1'])
  assert.equal(rows[0].category, 'clinic')
  assert.equal(rows[0].categoryLabel, '诊所')
  assert.ok(rows[0].distanceMeters > 0 && rows[0].distanceMeters < rows[1].distanceMeters)
  assert.equal(rows[0].fetchedAt, '2026-10-26T00:00:00Z')
  assert.equal(rows[0].sourceUrl, 'https://www.openstreetmap.org/node/2')
  assert.deepEqual(rows[0].rawTags, fixture.elements[1].tags)
  for (const key of ['rating', 'rank', 'accessible', 'wheelchair', 'appointments', 'appointmentSlots', 'hospitalGrade', 'recommended']) assert.equal(rows[0][key], undefined)
})

test('names, building tags, pharmacies, doctors, dentists, inactive places and invalid records cannot become hospitals', () => {
  const nonHospitals = [
    point(3, 31.2304, { name: '医院', building: 'hospital' }),
    point(4, 31.2304, { amenity: 'pharmacy', healthcare: 'hospital' }),
    point(5, 31.2304, { healthcare: 'doctor' }),
    point(6, 31.2304, { amenity: 'dentist' }),
    point(7, 31.2304, { healthcare: 'hospital', amenity: 'veterinary' }),
    point(8, 31.2304, { amenity: 'hospital', disused: 'yes' }),
    point(9, 31.2304, { amenity: 'clinic', construction: 'clinic' }),
    null, {}, { ...point(-1, 31.2304) }, { ...point(1.5, 31.2304) },
    { ...point(10, 91) }, { ...point(11, 31.2304), lon: 181 },
    { ...point(12, 31.2304), type: 'script' }, point(13, 32.2304),
  ]
  assert.deepEqual(normalizeHospitalElements({ elements: nonHospitals }, query), [])
  assert.throws(() => normalizeHospitalElements({}, query), error => error.status === 502)
  assert.throws(() => normalizeHospitalElements({ elements: [], remark: 'runtime error: Query timed out' }, query), error => error.status === 502)
})

test('way centers, unnamed records and addresses retain their limited map meaning; IDs deduplicate and results cap at 50', () => {
  const way = { type: 'way', id: 99, center: { lat: query.latitude, lon: query.longitude }, tags: { healthcare: 'hospital', 'addr:city': '测试市', 'addr:street': '测试路', 'addr:housenumber': '1号' } }
  const [row] = normalizeHospitalElements({ elements: [way, way] }, query)
  assert.equal(row.name, '未命名医院（OSM记录）')
  assert.equal(row.address, '测试市 测试路 1号')
  assert.equal(row.sourceUrl, 'https://www.openstreetmap.org/way/99')
  assert.equal(row.distanceMeters, 0)
  const many = Array.from({ length: 300 }, (_, index) => point(index + 1, query.latitude + index / 100000))
  assert.equal(normalizeHospitalElements({ elements: many }, query).length, 50)
})

test('lookup uses one fixed HTTPS endpoint, sends no profile, bounds timeout and caches exact authorized coordinates', async () => {
  let calls = 0
  let clock = 1000
  const service = createHospitalService({ now: () => clock, fetcher: async (url, init) => {
    calls++
    assert.equal(url, 'https://overpass-api.de/api/interpreter')
    assert.equal(init.method, 'POST')
    assert.equal(init.redirect, 'error')
    assert.ok(init.signal instanceof AbortSignal)
    assert.match(init.body.get('data'), /around:2000,31\.2304,121\.4737/)
    assert.match(init.body.get('data'), /hospital\|clinic/)
    assert.match(init.body.get('data'), /out center tags 250/)
    assert.ok(!init.body.toString().includes('PRIVATE'))
    return new Response(JSON.stringify(fixture))
  } })
  const first = await service({ ...query, profile: 'PRIVATE', endpoint: 'https://private.invalid' })
  assert.equal(first.status, 'ok')
  assert.equal(first.hospitals.length, 2)
  assert.match(first.notice, /不代表医疗质量/)
  assert.match(first.notice, /号源.*无障碍/)
  assert.deepEqual(await service(query), first)
  assert.equal(calls, 1)
  first.hospitals[0].name = 'mutated by caller'
  assert.notEqual((await service(query)).hospitals[0].name, 'mutated by caller')
  await assert.rejects(() => service({ ...query, consent: false }), error => error.status === 400)
  clock += 600001
  await service(query)
  assert.equal(calls, 2)
})

test('no OSM matches are an explicit empty result and never substitute another city or fabricated hospitals', async () => {
  const result = await createHospitalService({ fetcher: async () => new Response('{"elements":[]}') })(query)
  assert.deepEqual(result.hospitals, [])
  assert.equal(result.status, 'empty')
  assert.equal(result.latitude, query.latitude)
  assert.equal(result.longitude, query.longitude)
  assert.match(result.notice, /不代表附近没有医院/)
  assert.match(result.notice, /国内地图/)
  assert.ok(!JSON.stringify(result).includes('北京'))
})

test('upstream failure, invalid JSON, partial results and oversized bodies retain safe actionable errors', async () => {
  for (const fetcher of [
    async () => new Response('unavailable PRIVATE', { status: 503 }),
    async () => new Response('not JSON PRIVATE'),
    async () => new Response(JSON.stringify({ elements: fixture.elements, remark: 'PRIVATE timeout' })),
    async () => new Response('x'.repeat(2 * 1024 * 1024 + 1)),
    async () => new Response('tiny', { headers: { 'content-length': String(2 * 1024 * 1024 + 1) } }),
    async () => { throw Error('PRIVATE network details') },
  ]) {
    await assert.rejects(() => createHospitalService({ fetcher })(query), error => error.status === 502 && error.message.includes('国内地图') && !error.message.includes('PRIVATE'))
  }
})

test('a timed-out fetch aborts and a failed request can be retried after cooldown', async () => {
  let clock = 1000
  let calls = 0
  const service = createHospitalService({ now: () => clock, timeoutMs: 5, fetcher: async (_url, init) => {
    calls++
    if (calls > 1) return new Response(JSON.stringify(fixture))
    await new Promise((_resolve, reject) => {
      // Keep the mocked request alive until AbortSignal.timeout fires.
      const timer = setTimeout(() => reject(Error('mock network did not abort')), 1000)
      init.signal.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal.reason) }, { once: true })
    })
  } })
  await assert.rejects(() => service(query), error => error.status === 502 && error.message.includes('超时'))
  await assert.rejects(() => service(query), error => error.status === 429)
  clock += 3001
  assert.equal((await service(query)).hospitals.length, 2)
})

test('concurrent upstream work is bounded and separate locations cannot borrow the previous location cache', async () => {
  let finish
  let clock = 1000
  let calls = 0
  const service = createHospitalService({ now: () => clock, fetcher: () => {
    calls++
    return new Promise(resolve => { finish = () => resolve(new Response(JSON.stringify(fixture))) })
  } })
  const first = service(query)
  await assert.rejects(() => service({ ...query, latitude: 30 }), error => error.status === 429)
  finish()
  await first
  clock += 3001
  const second = service({ ...query, latitude: query.latitude + 0.000001 })
  finish()
  await second
  assert.equal(calls, 2)
})

test('WGS84 distance helpers validate coordinates and label distance as straight-line', () => {
  assert.equal(isValidWgs84Location(query), true)
  for (const invalid of [null, {}, { latitude: '31', longitude: 121 }, { latitude: 91, longitude: 121 }, { latitude: 31, longitude: NaN }]) assert.equal(isValidWgs84Location(invalid), false)
  assert.equal(distanceMeters(query, query), 0)
  assert.ok(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) > 111000)
  assert.ok(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) < 112000)
  assert.ok(Number.isNaN(distanceMeters({ latitude: NaN, longitude: 0 }, query)))
  assert.equal(formatHospitalDistance(1250), '直线约1.3公里')
  assert.equal(formatHospitalDistance(20), '直线约20米')
  assert.equal(formatHospitalDistance(NaN), '距离未知')
})

test('nearby map links use documented coordinate order and WGS84 switches without injecting profile data', () => {
  const links = buildNearbyHospitalMapLinks({ ...query, profile: 'PRIVATE' }, 5000)
  const baidu = new URL(links.find(link => link.provider === 'baidu').url)
  assert.equal(baidu.hostname, 'api.map.baidu.com')
  assert.equal(baidu.pathname, '/place/search')
  assert.equal(baidu.searchParams.get('location'), '31.2304,121.4737')
  assert.equal(baidu.searchParams.get('coord_type'), 'wgs84')
  assert.equal(baidu.searchParams.get('radius'), '5000')
  assert.equal(baidu.searchParams.get('query'), '医院')
  assert.equal(baidu.searchParams.has('region'), false)
  const amap = new URL(links.find(link => link.provider === 'amap').url)
  assert.equal(amap.pathname, '/marker')
  assert.equal(amap.searchParams.get('position'), '121.4737,31.2304')
  assert.equal(amap.searchParams.get('coordinate'), 'wgs84')
  assert.equal(amap.searchParams.has('center'), false)
  assert.ok(!JSON.stringify(links).includes('PRIVATE'))
  for (const link of links) assert.equal(new URL(link.url).protocol, 'https:')
  assert.deepEqual(buildNearbyHospitalMapLinks({ latitude: 91, longitude: 121 }), [])
  assert.deepEqual(buildNearbyHospitalMapLinks(query, 3000), [])
})

test('manual region links use only the entered area, and empty areas never default to Beijing', () => {
  const region = '成都市 武侯区 & profile=PRIVATE?'
  const links = buildHospitalRegionMapLinks(region)
  assert.equal(links.length, 2)
  for (const link of links) {
    const url = new URL(link.url)
    assert.equal(url.searchParams.has('profile'), false)
    assert.equal(url.searchParams.has('location'), false)
    assert.equal(url.searchParams.has('center'), false)
    assert.ok(!url.toString().includes(encodeURIComponent('北京')))
    assert.equal(url.searchParams.get(link.provider === 'amap' ? 'keyword' : 'query'), region + ' 医院')
  }
  assert.equal(new URL(links[1].url).searchParams.get('region'), region)
  assert.deepEqual(buildHospitalRegionMapLinks(' \u0000\n '), [])
  assert.ok(new URL(buildHospitalRegionMapLinks('x'.repeat(500))[0].url).searchParams.get('city').length <= 120)
})

test('selected hospital links preserve only that hospital name and public coordinates with correct coordinate system', () => {
  const links = buildHospitalPlaceMapLinks({ name: '测试医院 & other=PRIVATE', latitude: query.latitude, longitude: query.longitude, sourceUrl: 'https://evil.invalid', profile: 'SECRET' })
  assert.equal(links.length, 2)
  for (const link of links) {
    const url = new URL(link.url)
    assert.ok(['api.map.baidu.com', 'uri.amap.com'].includes(url.hostname))
    assert.equal(url.searchParams.has('other'), false)
    assert.ok(!url.toString().includes('SECRET'))
    assert.ok(!url.toString().includes('evil.invalid'))
    assert.equal(url.searchParams.get(link.provider === 'amap' ? 'coordinate' : 'coord_type'), 'wgs84')
    assert.equal(url.searchParams.get(link.provider === 'amap' ? 'name' : 'title'), '测试医院 & other=PRIVATE')
  }
  assert.deepEqual(buildHospitalPlaceMapLinks({ name: 'test', latitude: NaN, longitude: 121 }), [])
})


test('nearby hospital HTTP endpoint requires a session and explicit query consent', async()=>{
 let calls=0
 const hospitals=createHospitalService({fetcher:async()=>{calls++;return new Response(JSON.stringify(fixture))}})
 const api=createProductApi({hospitals,start:async()=>{},status:async()=>({configured:true})})
 const server=http.createServer((req,res)=>api(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port
 const post=(cookie,input,origin)=>fetch(base+'/api/healthcare/nearby',{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})},body:JSON.stringify(input)})
 try{
  assert.equal((await post(null,query)).status,403);assert.equal(calls,0)
  const cookie=(await fetch(base+'/api/status')).headers.get('set-cookie').split(';')[0]
  assert.equal((await post(cookie,{...query,consent:false})).status,400);assert.equal(calls,0)
  assert.equal((await post(cookie,query,'https://evil.invalid')).status,403);assert.equal(calls,0)
  const response=await post(cookie,{...query,diagnosis:'PRIVATE'});assert.equal(response.status,200);const data=await response.json();assert.equal(data.hospitals.length,2);assert.ok(!JSON.stringify(data).includes('PRIVATE'));assert.equal(calls,1)
 }finally{await new Promise(resolve=>server.close(resolve))}
})
