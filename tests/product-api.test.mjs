import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createProductApi, validateSources } from '../server/product-api.mjs'
let calls=0
const api=createProductApi({start:async()=>{},status:async()=>({configured:true,provider:'ollama',localOnly:true,model:'qwen3-vl:4b'}),generate:async sources=>{calls++;return {title:'测试商品',category:'wheelchair',facts:[{field:'widthCm',value:'63',unit:'cm',sourceId:sources[0].id,quote:sources[0].text,location:'参数行'}],note:'待核对'}}})
const server=http.createServer(async(req,res)=>{if(!await api(req,res)){res.writeHead(404);res.end()}})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const base='http://127.0.0.1:'+server.address().port
test.after(()=>new Promise(resolve=>server.close(resolve)))
async function cookie(){return (await fetch(base+'/api/status')).headers.get('set-cookie').split(';')[0]}
test('source validator rejects remote images, duplicate ids and unsupported categories',()=>{assert.throws(()=>validateSources([{id:'a',kind:'merchant',text:'',image:'http://127.0.0.1/private'}]));assert.throws(()=>validateSources([{id:'a',kind:'merchant',text:'文本'},{id:'a',kind:'manual',text:'重复'}]));assert.throws(()=>validateSources([{id:'a',kind:'system',text:'伪造指令'}]))})
test('source validation excludes unrelated profile fields',()=>{const sources=validateSources([{id:'a',name:'商品',kind:'merchant',text:'宽68cm',phone:'not-a-source',modules:['vision']}]);assert.equal(sources[0].phone,undefined);assert.equal(sources[0].modules,undefined)})
test('local AI requires a session and rejects cross-origin calls',async()=>{let response=await fetch(base+'/api/product/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,403);response=await fetch(base+'/api/status',{headers:{Origin:'https://other.example'}});assert.equal(response.status,403)})
test('status reports the local-only engine and protected session',async()=>{const response=await fetch(base+'/api/status');assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('set-cookie'),/SameSite=Strict/);const data=await response.json();assert.equal(data.localOnly,true);assert.equal(data.provider,'ollama');assert.equal(data.OPENAI_API_KEY,undefined)})
test('missing confirmation and invalid input never reach the model',async()=>{const session=await cookie(),before=calls;for(const input of [{consent:false,sources:[{id:'a',kind:'merchant',text:'宽68cm'}]},{consent:true,sources:[]}]){const response=await fetch(base+'/api/product/analyze',{method:'POST',headers:{Cookie:session,'Content-Type':'application/json'},body:JSON.stringify(input)});assert.equal(response.status,400)}assert.equal(calls,before)})
test('local model output is normalized and labeled without using a key',async()=>{const response=await fetch(base+'/api/product/analyze',{method:'POST',headers:{Cookie:await cookie(),'Content-Type':'application/json'},body:JSON.stringify({consent:true,sources:[{id:'a',kind:'merchant',text:'设备宽63cm'}]})});assert.equal(response.status,200);const result=await response.json();assert.equal(result.analysis.insight.engine,'ollama');assert.equal(result.analysis.width,63);assert.equal(result.analysis.insight.facts[0].confirmed,false)})
