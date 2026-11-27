import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { studioPolicy,allowedRequest } from '../server/studio-policy.mjs'
import { createProductApi } from '../server/product-api.mjs'
import { platformClient,hardwareOptions,requireFreeHardware,accountName,gitCredential,redactPlatformOutput,updateStudioSettingsIfChanged,ensureStudioOrigin,normalizePlatformToken } from '../deployment/modelscope/platform.mjs'
import { studioFiles,validateStudioContext } from '../deployment/modelscope/package.mjs'
import { studioState,monitorStudio } from '../deployment/modelscope/monitor.mjs'
import { mkdtemp,readFile,writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const policy=studioPolicy({SAI_DEPLOYMENT:'studio',SAI_PUBLIC_ORIGINS:'https://demo.example'})
let calls=0
const api=createProductApi({policy,start:async()=>{},status:async()=>({configured:true,provider:'ollama',localOnly:true}),generate:async()=>{calls++;return {title:'测试辅具',category:'manual-wheelchair',facts:[],note:'参数仍需确认'}},answer:async()=>({answer:'依据说明'})})
const server=http.createServer(async(req,res)=>{if(!await api(req,res)){res.writeHead(404);res.end()}})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const base='http://127.0.0.1:'+server.address().port
test.after(()=>new Promise(resolve=>server.close(resolve)))
const headers={Host:'proxy.internal',Origin:'https://demo.example','Content-Type':'application/json'}
async function session(){const response=await fetch(base+'/api/status',{headers});assert.equal(response.status,200);const value=await response.json();assert.equal(value.deployment,'studio');assert.equal(value.authorized,true);return value.session}

test('Studio accepts explicit origin and session header without third-party cookies',async()=>{
  const token=await session();assert.match(token,/^[a-f0-9]{64}$/)
  const response=await fetch(base+'/api/product/analyze',{method:'POST',headers:{...headers,'X-Sai-Session':token},body:JSON.stringify({consent:true,sources:[{id:'one',kind:'merchant',text:'公开轮椅资料'}]})})
  assert.equal(response.status,200);assert.equal((await response.json()).analysis.insight.engine,'ollama')
})
test('Studio rejects missing session and missing per-request consent without inference',async()=>{
  const before=calls
  let response=await fetch(base+'/api/product/analyze',{method:'POST',headers,body:'{}'});assert.equal(response.status,403)
  response=await fetch(base+'/api/product/analyze',{method:'POST',headers:{...headers,'X-Sai-Session':await session()},body:JSON.stringify({consent:false,sources:[{id:'one',kind:'merchant',text:'公开资料'}]})});assert.equal(response.status,400);assert.equal(calls,before)
})
test('Studio closes local admin, pairing and network inventory even on loopback',async()=>{
  const token=await session()
  for(const url of ['/api/review/cases','/api/review/rules/example','/api/pair-code','/api/pair','/api/connection']){
    const response=await fetch(base+url,{headers:{...headers,'X-Sai-Session':token}});assert.equal(response.status,404,url)
  }
})
test('Studio rejects unrelated Origin and does not trust forwarded host',async()=>{
  const response=await fetch(base+'/api/status',{headers:{Host:'proxy.internal',Origin:'https://evil.example','X-Forwarded-Host':'evil.example','X-Forwarded-Proto':'https'}});assert.equal(response.status,403)
  assert.equal(allowedRequest({headers:{host:'demo.example',origin:'https://demo.example','sec-fetch-site':'cross-site'}},policy),false)
  assert.throws(()=>studioPolicy({SAI_DEPLOYMENT:'studio',SAI_PUBLIC_ORIGINS:'https://demo.example/path'}))
})
test('platform access token is sent only in the official API request header',async()=>{
  let captured
  const api=platformClient('synthetic-deployment-credential',async(url,options)=>{captured={url,options};return Response.json({success:true,data:{username:'starovo'}})})
  assert.equal(accountName(await api('/users/me')),'starovo')
  assert.equal(captured.url,'https://modelscope.cn/openapi/v1/users/me');assert.equal(captured.options.redirect,'error');assert.equal(captured.options.headers.Authorization,'Bearer synthetic-deployment-credential')
  await assert.rejects(()=>api('https://other.example'),/路径/)
})

test('platform accepts explicit mutation acknowledgements without data but keeps reads strict',async()=>{
 for(const response of [Response.json({success:true,request_id:'synthetic-request'}),new Response(null,{status:204})]){
   const api=platformClient('synthetic-deployment-credential',async()=>response)
   assert.equal(await api('/studios/starovo/test/variables',{method:'POST',body:{key:'SAI_PUBLIC_ORIGINS',value:'https://example.com'}}),null)
 }
 const direct=platformClient('synthetic-deployment-credential',async()=>Response.json({success:true,variables:[]}))
 assert.deepEqual(await direct('/studios/starovo/test/variables'),{variables:[]})
 const invalid=platformClient('synthetic-deployment-credential',async()=>Response.json({success:true,private_value:'must-not-be-logged'}))
 await assert.rejects(()=>invalid('/users/me'),error=>error.message.includes('GET /users/me')&&!error.message.includes('must-not-be-logged'))
 const html=platformClient('synthetic-deployment-credential',async()=>new Response('<html>not an acknowledgement</html>'))
 await assert.rejects(()=>html('/studios/starovo/test/variables',{method:'POST'}),/响应格式/)
})

test('malformed deployment input is rejected before any platform request without echoing it',async()=>{
  let requests=0
  const fetcher=async()=>{requests++;throw Error('must not fetch')}
  for(const token of [undefined,'','short','已创建创空间，正在上传白名单代码','synthetic token','synthetic\r\ntoken','synthetic\ttoken','synthetic;cookie=value']){
    assert.throws(()=>platformClient(token,fetcher),/输入内容未发送/)
    await assert.rejects(()=>gitCredential(token,'starovo',fetcher),/输入内容未发送/)
  }
  assert.equal(requests,0)
  const api=platformClient('  synthetic-deployment-credential  ',async(_url,options)=>{
    assert.equal(options.headers.Authorization,'Bearer synthetic-deployment-credential')
    return Response.json({success:true,data:{username:'starovo'}})
  })
  assert.equal(accountName(await api('/users/me')),'starovo')
})

test('token input accepts Bearer punctuation and trims only outer paste whitespace',()=>{
 assert.equal(normalizePlatformToken('\r\n synthetic/token+value== \r\n'),'synthetic/token+value==')
 assert.equal(normalizePlatformToken('\u200b\ufeffsynthetic-token\u200b'),'synthetic-token')
 for(const value of ['synthetic\ntoken','synthetic token','****************','●●●●●●●●','https://modelscope.cn/my/settings/token','synthetic=inside'])assert.throws(()=>normalizePlatformToken(value),/输入内容未发送/)
})
test('deployment refuses paid, unknown-billing, unavailable and nonexistent hardware',()=>{
  const options=hardwareOptions({items:[{name:'platform/free-test',resource_type:'free'},{name:'paid/gpu',resource_type:'paid'},{name:'unknown/gpu'},{name:'free/unavailable',resource_type:'free',available:false}]})
  assert.equal(requireFreeHardware(options,'platform/free-test').name,'platform/free-test')
  for(const name of ['paid/gpu','unknown/gpu','free/unavailable','missing'])assert.throws(()=>requireFreeHardware(options,name))
})

test('an already configured free studio can publish without the failing settings endpoint',async()=>{
 const current={hardware:'platform/2v-cpu-8g-mem',visibility:'public'}
 let requests=0
 const unavailable=async()=>{requests++;throw Object.assign(Error('settings unavailable'),{status:500})}
 assert.equal(await updateStudioSettingsIfChanged(unavailable,'/studios/starovo/test',current,{...current}),false)
 assert.equal(requests,0)
 const calls=[]
 assert.equal(await updateStudioSettingsIfChanged(async(...args)=>calls.push(args),'/studios/starovo/test',{...current,visibility:'private'},current),true)
 assert.deepEqual(calls,[['/studios/starovo/test/settings',{method:'PATCH',body:current}]])
})

test('origin setup changes only the exact application variable and skips unchanged values',async()=>{
 const origin='https://starovo-smart-accessible-travel.ms.show',apiPath='/studios/starovo/smart-accessible-travel'
 for(const [data,method]of [[{variables:[]},'POST'],[{variables:[{key:'SAI_PUBLIC_ORIGINS',value:'https://old.example'}]},'PUT']]){
   const calls=[];const api=async(...args)=>{calls.push(args);return data}
   assert.equal(await ensureStudioOrigin(api,apiPath,origin),true)
   assert.deepEqual(calls[1],[apiPath+'/variables',{method,body:{key:'SAI_PUBLIC_ORIGINS',value:origin}}])
 }
 let reads=0
 assert.equal(await ensureStudioOrigin(async()=>{reads++;return {variables:[{key:'SAI_PUBLIC_ORIGINS',value:origin}]}},apiPath,origin),false)
 assert.equal(reads,1)
 await assert.rejects(()=>ensureStudioOrigin(async()=>{throw Error('must not request')},apiPath,'https://other.example'),/域名/)
})
test('clean upload inventory excludes secrets, local records, weights and unrelated projects',async()=>{
  const files=await studioFiles(fileURLToPath(new URL('../',import.meta.url)))
  assert.ok(files.includes('Dockerfile'));assert.ok(files.includes('desktop/server.mjs'));assert.ok(files.includes('deployment/modelscope/start.mjs'))
  assert.ok(files.every(file=>!/(^|\/)(\.env|\.app-data|\.local-ai|node_modules|Naiwa|scientific-figure|\.git)(\/|\.|$)/.test(file)))
  assert.ok(files.every(file=>!file.includes('run-platform')&&!file.includes('git-askpass')&&!file.includes('publish-studio')))
})

test('release preflight catches a model helper excluded from Docker even if uploaded',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'accessible-context-'))
 await writeFile(path.join(root,'Dockerfile'),'COPY deployment/modelscope/download-model.mjs /download-model.mjs\nCOPY --from=model /models /models\n')
 const policy='*\n!deployment/\ndeployment/*\n!deployment/modelscope/\ndeployment/modelscope/*\n'
 await writeFile(path.join(root,'.dockerignore'),policy)
 const files=['deployment/modelscope/download-model.mjs']
 await assert.rejects(()=>validateStudioContext(root,files),/白名单排除/)
 await writeFile(path.join(root,'.dockerignore'),policy+'!deployment/modelscope/download-model.mjs\n')
 await validateStudioContext(root,files)
 await assert.rejects(()=>validateStudioContext(root,[]),/未在上传清单/)
 const project=fileURLToPath(new URL('../',import.meta.url))
 await validateStudioContext(project,await studioFiles(project))
})

test('Git credential exchange stays on the official site and refuses another account',async()=>{
  let captured
  const fetcher=async(url,options)=>{captured={url,options};return Response.json({Success:true,Data:{Username:'starovo',AccessToken:'synthetic-git-credential'}})}
  assert.equal(await gitCredential('synthetic-deploy-token','starovo',fetcher),'synthetic-git-credential')
  assert.equal(captured.url,'https://modelscope.cn/api/v1/login');assert.equal(captured.options.redirect,'error');assert.equal(captured.options.headers.Cookie,'m_session_id=synthetic-deploy-token')
  await assert.rejects(()=>gitCredential('synthetic-deploy-token','other',fetcher),/匹配账号/)
})
test('platform error output removes both credentials and credential-bearing URLs',()=>{
  const output=redactPlatformOutput('failed synthetic-git-credential ms-1234567890abcdefghijk https://user:password@example.com/repo',['synthetic-git-credential'])
  assert.ok(!output.includes('synthetic-git-credential'));assert.ok(!output.includes('1234567890abcdefghijk'));assert.ok(!output.includes('user:password'))
})
test('deployment monitor records stages without credentials and never treats Running as AI acceptance',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'accessible-monitor-')),stages=['building','running'],messages=[]
  const api=async url=>url.includes('/logs/')?{logs:['large output '.repeat(1000)+'synthetic-hidden-token build line']}:{status:stages.shift(),host:'https://example.com',secret:'must not persist'}
  const result=await monitorStudio(api,'starovo/test',root,{attempts:2,interval:1,pause:async()=>{},notify:value=>messages.push(value),secrets:['synthetic-hidden-token']})
  assert.equal(result.state,'running');assert.equal(result.aiVerified,false)
  const saved=await readFile(path.join(root,'.studio-status.json'),'utf8'),logs=await readFile(path.join(root,'.studio-logs','build.json'),'utf8')
  assert.ok(!saved.includes('must not persist'));assert.ok(!logs.includes('synthetic-hidden-token'));assert.equal(JSON.parse(saved).aiVerified,false);assert.equal(JSON.parse(saved).runtimeUrl,'https://example.com');assert.equal(JSON.parse(logs).logs.length,1);assert.equal(messages.filter(message=>message.startsWith('创空间状态')).length,2)
  assert.equal(studioState({runtime:{status:'running'}}),'running')
})

test('publisher can continue collecting logs until the actual model is installed',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'accessible-model-monitor-'))
 let checks=0,logReads=0
 const api=async url=>url.includes('/logs/')?(logReads++,{logs:['engine status']}):{status:'Running',host:'https://example.com'}
 const result=await monitorStudio(api,'starovo/test',root,{attempts:2,interval:1,pause:async()=>{},notify:()=>{},checkReadiness:async()=>++checks===2})
 assert.equal(checks,2);assert.equal(logReads,4);assert.equal(result.modelReady,true);assert.equal(result.aiVerified,false)
 assert.equal(JSON.parse(await readFile(path.join(root,'.studio-status.json'),'utf8')).modelReady,true)
})
