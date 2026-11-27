import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createInferenceJobs } from '../server/inference-jobs.mjs'
import { createProductApi } from '../server/product-api.mjs'
import { studioPolicy } from '../server/studio-policy.mjs'

const tick=()=>new Promise(resolve=>setImmediate(resolve))
test('jobs are session bound, expose real progress, and remove results on cancellation',async()=>{
  const jobs=createInferenceJobs()
  let finish,signal
  const id=jobs.start('owner',(abort,progress)=>{signal=abort;progress('读取图片');return new Promise(resolve=>{finish=resolve})})
  await tick()
  assert.equal(jobs.read(id,'other'),null)
  assert.equal(jobs.cancel(id,'other'),false)
  assert.equal(jobs.read(id,'owner').progress,'读取图片')
  finish({analysis:'private result'});await tick()
  assert.deepEqual(jobs.read(id,'owner').result,{analysis:'private result'})
  assert.equal(jobs.cancel(id,'owner'),true)
  assert.equal(jobs.read(id,'owner'),null)
  assert.equal(signal.aborted,false)
})
test('abandoned work is aborted, cannot publish a late result, and expires',async()=>{
  let time=0,finish,signal
  const jobs=createInferenceJobs({now:()=>time,leaseMs:1000,timeoutMs:5000,retentionMs:100})
  const id=jobs.start('owner',(abort)=>{signal=abort;return new Promise(resolve=>{finish=resolve})})
  await tick();time=999;assert.equal(jobs.read(id,'owner').state,'running')
  time=2000;assert.equal(jobs.read(id,'owner').state,'cancelled');assert.equal(signal.aborted,true)
  finish({shouldNotAppear:true});await tick();assert.equal(jobs.read(id,'owner').result,undefined)
  time=2101;assert.equal(jobs.read(id,'owner'),null)
})
test('polling does not extend the total timeout and unexpected errors do not leak details',async()=>{
  let time=0
  const jobs=createInferenceJobs({now:()=>time,leaseMs:1000,timeoutMs:1500})
  const id=jobs.start('owner',signal=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('private engine failure')))))
  await tick();time=900;jobs.read(id,'owner');time=1500
  assert.equal(jobs.read(id,'owner').state,'cancelled');await tick()
  const failed=jobs.start('owner',()=>{throw Error('secret engine detail')});await tick()
  assert.equal(jobs.read(failed,'owner').state,'failed');assert.doesNotMatch(jobs.read(failed,'owner').error,/secret/)
})

test('HTTP asynchronous inference survives response close, enforces consent and cancels the engine',async()=>{
  let calls=0,resolveGeneration,aborted=false
  const api=createProductApi({policy:studioPolicy({SAI_DEPLOYMENT:'studio'}),start:async()=>{},status:async()=>({configured:true}),generate:async(_sources,_schema,_instructions,signal,_fetcher,progress)=>{
    calls++;progress('正在提取资料参数')
    return new Promise((resolve,reject)=>{resolveGeneration=resolve;signal.addEventListener('abort',()=>{aborted=true;reject(signal.reason)})})
  },answer:async()=>({statementIds:['one']})})
  const server=http.createServer((req,res)=>void api(req,res))
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const base='http://127.0.0.1:'+server.address().port
  try{
    const access=async()=>{const r=await fetch(base+'/api/status');return (await r.json()).session}
    const owner=await access(),other=await access(),headers={'X-Sai-Session':owner,'Content-Type':'application/json',Prefer:'respond-async'}
    const input={consent:true,sources:[{id:'a',name:'测试',kind:'merchant',text:'使用宽度68cm'}]}
    assert.equal((await fetch(base+'/api/product/analyze',{method:'POST',headers,body:JSON.stringify({...input,consent:false})})).status,400)
    assert.equal(calls,0)
    const response=await fetch(base+'/api/product/analyze',{method:'POST',headers,body:JSON.stringify(input)})
    assert.equal(response.status,202)
    const {taskId}=await response.json(),url=base+'/api/inference-jobs/'+taskId
    const read=async(session=owner)=>(await fetch(url,{headers:{'X-Sai-Session':session}}))
    assert.equal((await read(other)).status,404)
    assert.equal((await (await read()).json()).progress,'正在提取资料参数')
    assert.equal((await fetch(base+'/api/product/analyze',{method:'POST',headers,body:JSON.stringify(input)})).status,409)
    assert.equal(calls,1)
    resolveGeneration({title:'测试轮椅',category:'manual-wheelchair',facts:[{field:'widthCm',value:'68',unit:'cm',sourceId:'a',quote:'使用宽度68cm'}]});await tick()
    const job=await (await read()).json();assert.equal(job.state,'completed');assert.equal(job.result.analysis.width,68);assert.equal(job.result.analysis.insight.engine,'ollama')
    const next=await fetch(base+'/api/product/analyze',{method:'POST',headers,body:JSON.stringify(input)}),second=await next.json()
    assert.equal(next.status,202)
    assert.equal((await fetch(base+'/api/inference-jobs/'+second.taskId,{method:'POST',headers:{...headers,'X-Sai-Session':other,'X-Sai-Action':'delete'}})).status,404)
    assert.equal((await fetch(base+'/api/inference-jobs/'+second.taskId,{method:'POST',headers:{...headers,'X-Sai-Action':'delete'}})).status,200)
    await tick();assert.equal(aborted,true)
    assert.equal((await fetch(base+'/api/inference-jobs/'+second.taskId,{headers})).status,404)
    const assistant=await fetch(base+'/api/assistant/answer',{method:'POST',headers,body:JSON.stringify({consent:true,question:'需要确认什么？',evidence:[]})})
    assert.equal(assistant.status,202)
    const answerJob=await assistant.json();await tick()
    const answer=await (await fetch(base+'/api/inference-jobs/'+answerJob.taskId,{headers})).json()
    assert.deepEqual(answer.result,{statementIds:['one']})
    assert.equal((await fetch(base+'/api/assistant/answer',{method:'POST',headers:{...headers,'X-Sai-Action':'delete'},body:JSON.stringify({consent:true})})).status,400)
  }finally{await new Promise(resolve=>server.close(resolve))}
})
