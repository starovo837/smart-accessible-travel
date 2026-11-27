import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createProductApi} from '../server/product-api.mjs'
import {createWorkspaceService} from '../server/workspace-service.mjs'
const directory=await mkdtemp(join(tmpdir(),'accessible-api-'))
const api=createProductApi({start:async()=>{},status:async()=>({provider:'ollama',localOnly:true,configured:false}),workspace:createWorkspaceService({directory}),rules:{get:async()=>[],refresh:async()=>[]}})
const server=http.createServer(async(req,res)=>{if(!await api(req,res)){res.writeHead(404);res.end()}})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port
test.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true})})
const request=(path,{input,token,cookie,method,origin,action}={})=>fetch(base+'/api/'+path,{method:method??(input===undefined?'GET':'POST'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{}),...(action?{'X-Sai-Action':action}:{})},...(input!==undefined?{body:JSON.stringify(input)}:{})})
test('HTTP correction creation, review tracking, and deletion use scoped credentials',async()=>{
 const cookie=(await request('status')).headers.get('set-cookie').split(';')[0]
 assert.equal((await request('cases',{input:{consent:true,subject:'测试问题',text:'测试文字'}})).status,403)
 const response=await request('cases',{cookie,input:{consent:true,subject:'合成验收问题',text:'请核对宽度引用'}});assert.equal(response.status,201);const record=await response.json()
 assert.equal((await request('cases/'+record.id)).status,403)
 assert.equal((await request('review/cases')).status,403)
 assert.equal((await request('review/cases/'+record.id,{cookie,input:{revision:1,reviewer:'测试审核员',status:'resolved',note:'已核对',reference:'合成验收版本'}})).status,200)
 assert.equal((await (await request('cases/'+record.id,{token:record.accessToken})).json()).status,'resolved')
 assert.equal((await request('cases/'+record.id,{token:record.accessToken,method:'DELETE',origin:'https://untrusted.example'})).status,403)
 assert.equal((await request('cases/'+record.id,{token:record.accessToken,method:'DELETE'})).status,200)
})
test('HTTP family share protects management, records suggestions and stops reading after revoke',async()=>{
 const cookie=(await request('status')).headers.get('set-cookie').split(';')[0]
 const share=await (await request('shares',{cookie,input:{consent:true,scopes:['checklist'],days:1,allowSuggestions:true,payload:{devices:[{id:'secret',name:'私密设备'}],checklist:[{id:'task',label:'说明书',checked:false}]}}})).json()
 const viewed=await (await request('shares/'+share.id,{token:share.viewToken})).json();assert.equal(viewed.payload.devices,undefined);assert.equal(viewed.payload.checklist.length,1)
 assert.equal((await request('shares/'+share.id+'/owner',{token:share.viewToken})).status,403)
 const proposed=await (await request('shares/'+share.id+'/suggest',{token:share.viewToken,input:{revision:1,itemId:'task',checked:true}})).json();assert.equal(proposed.payload.checklist[0].checked,false)
 assert.equal((await request('shares/'+share.id+'/owner',{token:share.ownerToken,input:{revision:proposed.revision,revoke:true}})).status,200)
 assert.equal((await request('shares/'+share.id,{token:share.viewToken})).status,410)
 assert.equal((await request('shares/'+share.id+'/owner',{token:share.ownerToken,method:'DELETE'})).status,200)
})
test('gateway-compatible POST deletion retains origin and per-record capability checks',async()=>{
 const cookie=(await request('status')).headers.get('set-cookie').split(';')[0]
 const record=await (await request('cases',{cookie,input:{consent:true,subject:'合成删除测试',text:'测试网关兼容删除'}})).json()
 const target='cases/'+record.id
 assert.equal((await request(target,{method:'POST',action:'delete'})).status,403)
 assert.equal((await request(target,{method:'POST',action:'delete',token:record.accessToken,origin:'https://untrusted.example'})).status,403)
 assert.equal((await request(target,{method:'POST',action:'delete',token:record.accessToken})).status,200)
 assert.equal((await request(target,{token:record.accessToken})).status,404)
 const share=await (await request('shares',{cookie,input:{consent:true,scopes:['checklist'],days:1,payload:{checklist:[]}}})).json()
 assert.equal((await request('shares/'+share.id+'/owner',{method:'POST',action:'delete',token:share.viewToken})).status,403)
 assert.equal((await request('shares/'+share.id+'/owner',{method:'POST',action:'delete',token:share.ownerToken})).status,200)
 assert.equal((await request('shares/'+share.id,{token:share.viewToken})).status,403)
})
