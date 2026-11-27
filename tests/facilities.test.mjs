import test from 'node:test'
import assert from 'node:assert/strict'
import {validateFacilityQuery,normalizeFacilityElements,createFacilityService} from '../server/facility-service.mjs'

const query={consent:true,latitude:31.23,longitude:121.47,radius:1000}
const fixture={elements:[{type:'node',id:123,lat:31.23,lon:121.47,tags:{name:'合成电梯',highway:'elevator',wheelchair:'yes','check_date:wheelchair':'2024-01-01'}}]}
test('online facilities require explicit consent, finite WGS84 coordinates and a supported radius',()=>{
 for(const change of [{consent:false},{latitude:'31.23'},{latitude:86},{longitude:181},{latitude:NaN},{radius:10000}])assert.throws(()=>validateFacilityQuery({...query,...change}))
 assert.deepEqual(validateFacilityQuery({...query,phone:'PRIVATE',url:'http://evil.example'}),{latitude:31.23,longitude:121.47,radius:1000})
})
test('map records retain provenance and separate source check dates from retrieval without inventing onsite availability',()=>{
 const row=normalizeFacilityElements(fixture,'2026-10-26T00:00:00Z')[0]
 assert.equal(row.sourceCheckedAt,'2024-01-01');assert.equal(row.fetchedAt,'2026-10-26T00:00:00Z');assert.equal(row.wheelchair,'yes');assert.equal(row.sourceUrl,'https://www.openstreetmap.org/node/123')
 for(const key of ['doorCm','elevator','steps','accessible','confirmed'])assert.equal(row[key],undefined)
 assert.match(row.notes,/不代表设施现在可用/)
})
test('invalid and excessive OSM records cannot become real-looking facilities',()=>{
 const valid=fixture.elements[0],invalid=[null,{}, {...valid,id:-1},{...valid,id:1.5},{...valid,lat:999},{...valid,lon:999},{...valid,type:'script'}]
 assert.deepEqual(normalizeFacilityElements({elements:invalid}),[])
 assert.equal(normalizeFacilityElements({elements:Array(200).fill(valid)}).length,80)
 assert.throws(()=>normalizeFacilityElements({}),/有效设施/)
})
test('facility queries use one fixed public endpoint, send only coordinates and cache repeated requests',async()=>{
 let calls=0,clock=1000
 const service=createFacilityService({now:()=>clock,fetcher:async(url,init)=>{calls++;assert.equal(url,'https://overpass-api.de/api/interpreter');assert.equal(init.method,'POST');assert.match(init.body.get('data'),/around:1000,31.23,121.47/);assert.ok(!init.body.toString().includes('PRIVATE'));assert.ok(init.signal instanceof AbortSignal);return new Response(JSON.stringify(fixture))}})
 const first=await service({...query,body:{weight:'PRIVATE'}});assert.equal(first.facilities.length,1)
 assert.deepEqual(await service(query),first);assert.equal(calls,1)
 clock+=600001;await service(query);assert.equal(calls,2)
})
test('map failure, invalid JSON and oversized results never become fallback or invented facilities',async()=>{
 for(const fetcher of [async()=>new Response('down',{status:503}),async()=>new Response('not-json'),async()=>new Response('x'.repeat(2*1024*1024+1)),async()=>{throw Error('network PRIVATE_DETAIL')}]){
  const service=createFacilityService({fetcher})
  await assert.rejects(()=>service(query),error=>error.status===502&&!error.message.includes('PRIVATE_DETAIL'))
 }
})
test('concurrent map work is bounded and a failed request can be retried after cooldown',async()=>{
 let finish,clock=1000,calls=0
 const service=createFacilityService({now:()=>clock,fetcher:()=>{calls++;return new Promise(resolve=>{finish=()=>resolve(new Response(JSON.stringify(fixture)))})}})
 const first=service(query);await assert.rejects(()=>service({...query,latitude:30}),error=>error.status===429);finish();await first;assert.equal(calls,1)
 clock+=3001;const next=service({...query,latitude:30});finish();await next;assert.equal(calls,2)
})
