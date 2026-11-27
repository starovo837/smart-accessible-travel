import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {createProductApi} from '../server/product-api.mjs'
import {createHelpService} from '../server/help-service.mjs'
import {initialJourney,packetHtml} from '../src/app/journey.ts'
import {scopeSnapshot,readSnapshot} from '../src/app/storage.ts'
import {initialLivingServices} from '../src/app/livingServices.ts'
import {livingEntries,livingScenes,sceneSteps} from '../src/app/livingCatalog.ts'
import {supportTools} from '../src/app/supportCatalog.ts'

test('all six scenarios lead to implemented tools and all eight services are always available',()=>{
 assert.equal(livingScenes.length,6);assert.equal(livingEntries.length,8)
 const ids=new Set([...supportTools.map(row=>row.id),'fitting','shop','travel'])
 for(const entry of livingEntries)assert.ok(ids.has(entry.id))
 for(const scene of livingScenes){assert.ok(sceneSteps[scene.id].length>=3);for(const step of sceneSteps[scene.id])assert.ok(ids.has(step.action))}
})

const snapshotData=()=>({modules:[],devices:[],consent:'granted',privacy:{profile:false,devices:false,life:true,retainDays:7},settings:{elderMode:false,stepMode:false,readAloud:false},journey:initialJourney(),feedback:[],customModes:[],customDevices:[]})
test('new life records follow life consent and restored records reject forged connections and capabilities',()=>{
 const input=snapshotData();input.journey.life.services={...initialLivingServices(),homeConnections:[{id:'one',name:'合成设备',connected:true}]};input.journey.life.helpSessions=[{id:'fake',ownerToken:'fake'}];input.journey.life.sceneProgress={hospital:['needs','not-a-step','needs'],fake:['one']}
 const saved=scopeSnapshot(input,1000),restored=readSnapshot(JSON.stringify(saved),2000)
 assert.equal(restored.journey.life.services.homeConnections[0].connected,false);assert.deepEqual(restored.journey.life.helpSessions,[]);assert.deepEqual(restored.journey.life.sceneProgress,{hospital:['needs']})
 const denied=scopeSnapshot({...input,privacy:{...input.privacy,life:false}},1000)
 for(const key of ['services','helpSessions','sceneProgress'])assert.equal(denied.journey.life[key],undefined)
})

test('static life export escapes new records and never exports help management credentials',()=>{
 const life=initialJourney().life;life.services={...initialLivingServices(),digitalTasks:[{id:'x',title:'合成<script>alert(1)</script>',deadline:'',steps:[],sourceText:'',confirmed:true,createdAt:''}]};life.helpSessions=[{ownerToken:'PRIVATE_OWNER_TOKEN',viewUrl:'PRIVATE_VIEW_LINK'}]
 const html=packetHtml({savedAt:'测试',cards:[],results:[],records:[],checklist:[],communication:'',life})
 assert.ok(html.includes('合成&lt;script&gt;'));assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(!html.includes('PRIVATE_OWNER_TOKEN'));assert.ok(!html.includes('PRIVATE_VIEW_LINK'))
})

test('help HTTP roundtrip enforces session, capabilities, explicit replies and Studio-compatible deletion',async()=>{
 const help=createHelpService(),api=createProductApi({help,start:async()=>{},status:async()=>({configured:true})})
 const server=http.createServer((req,res)=>api(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port
 const request=(path,{token,cookie,input,method='GET',headers={}}={})=>fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(token?{'X-Sai-Capability':token}:{}),...headers},...(input?{body:JSON.stringify(input)}:{})})
 const body={text:'合成HTTP测试',minutes:15,consent:true,previewed:true}
 try{
  assert.equal((await request('help',{method:'POST',input:body})).status,403)
  const cookie=(await request('status')).headers.get('set-cookie').split(';')[0]
  assert.equal((await request('help',{method:'POST',cookie,input:{...body,previewed:false}})).status,400)
  const created=await request('help',{method:'POST',cookie,input:body});assert.equal(created.status,201);const row=await created.json()
  assert.equal((await request('help/'+row.id)).status,403)
  assert.equal((await request('help/'+row.id+'/owner',{token:row.viewToken})).status,403)
  assert.equal((await request('help/'+row.id,{token:row.ownerToken})).status,403)
  assert.equal((await (await request('help/'+row.id,{token:row.viewToken})).json()).status,'waiting')
  assert.equal((await request('help/'+row.id+'/respond',{token:row.viewToken})).status,405)
  const reply=await request('help/'+row.id+'/respond',{method:'POST',token:row.viewToken,input:{response:'acknowledged',name:'合成接收方'}});assert.equal(reply.status,200)
  const owner=await (await request('help/'+row.id+'/owner',{token:row.ownerToken})).json();assert.equal(owner.response.name,'合成接收方');assert.equal(owner.ownerToken,undefined)
  assert.equal((await request('help/'+row.id+'/owner',{method:'POST',token:row.viewToken,headers:{'X-Sai-Action':'delete'}})).status,403)
  assert.equal((await request('help/'+row.id+'/owner',{method:'POST',token:row.ownerToken,headers:{'X-Sai-Action':'delete',Origin:'https://evil.example'}})).status,403)
  assert.equal((await request('help/'+row.id+'/owner',{method:'POST',token:row.ownerToken,headers:{'X-Sai-Action':'delete'}})).status,200)
  assert.equal((await request('help/'+row.id,{token:row.viewToken})).status,403)
 }finally{help.dispose();await new Promise(r=>server.close(r))}
})

test('facility HTTP requests require a current session and forward only the requested query',async()=>{
 let received=null;const api=createProductApi({start:async()=>{},status:async()=>({configured:true}),facilities:async input=>{received=input;return{facilities:[]}}})
 const server=http.createServer((req,res)=>api(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port
 try{
  const input={latitude:31.23,longitude:121.47,radius:500,consent:true},post=cookie=>fetch(base+'/api/facilities/query',{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(input)})
  assert.equal((await post()).status,403);assert.equal(received,null)
  const cookie=(await fetch(base+'/api/status')).headers.get('set-cookie').split(';')[0];assert.equal((await post(cookie)).status,200);assert.deepEqual(received,input)
 }finally{await new Promise(r=>server.close(r))}
})
