import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,writeFile,mkdir,rm,access} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {ruleCatalog,ruleCurrent,ruleDocumentsFromResponse,safeRuleUrl} from '../src/app/ruleCatalog.ts'
import {inspectRule,approveRule,fetchRuleText,plainRuleText,createRuleService,readRuleRecords,writeRuleRecords,storedRuleDocuments,initializeRuleFile} from '../server/rule-service.mjs'
import {reviewRules} from '../scripts/review-rules.mjs'
import {bundledRuleBytes,prepareStudio,studioFiles} from '../deployment/modelscope/package.mjs'
import {reviewedRule} from './helpers/reviewed-rule.mjs'

const now=Date.parse('2026-11-17T02:00:00Z'),seed=ruleCatalog[0]
const bodyFor=url=>ruleCatalog.filter(rule=>rule.url===url).flatMap(rule=>rule.excerpts.map(row=>row.text)).join(' ')
const fetcher=async url=>new Response(bodyFor(url))
const approval=hash=>({reviewer:'合成审核人-仅测试',note:'合成文本，不代表生产条款的人工核验。',hash})
async function directory(t){const dir=await mkdtemp(join(tmpdir(),'sai-rule-review-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir}

test('successful text inspection does not grant a review or create review dates',()=>{
 const inspected=inspectRule(seed,bodyFor(seed.url),now)
 assert.equal(inspected.status,'unverified');assert.equal(inspected.checkedAt,null);assert.equal(inspected.expiresAt,null)
 assert.equal(inspected.contentHash,undefined);assert.match(inspected.pendingHash,/^[a-f0-9]{64}$/)
 assert.ok(inspected.anchorsMatch);assert.ok(!ruleCurrent(inspected,now))
 for(const input of [{},approval('a'.repeat(64)),{...approval(inspected.pendingHash),reviewer:' '},{...approval(inspected.pendingHash),note:' '}])assert.throws(()=>approveRule(inspected,input,now))
})
test('explicit synthetic reviewer and note produce a seven-day record; refresh cannot extend it',()=>{
 const approved=reviewedRule(seed,now),refreshed=inspectRule(approved,seed.excerpts.map(row=>row.text).join(' '),now+86400000)
 assert.equal(Date.parse(approved.expiresAt)-Date.parse(approved.checkedAt),7*86400000)
 assert.equal(refreshed.status,'verified');assert.equal(refreshed.checkedAt,approved.checkedAt);assert.equal(refreshed.expiresAt,approved.expiresAt)
 assert.ok(ruleCurrent(refreshed,now+86400000));assert.ok(!ruleCurrent(refreshed,now+7*86400000))
 assert.equal(inspectRule(approved,bodyFor(seed.url)+' changed',now).status,'changed')
 assert.equal(inspectRule(approved,'missing excerpts',now).status,'changed')
})
test('response parser rejects unsafe schemes, credentials, ports, lookalike domains and unsupported hosts',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,hello','http://www.12306.cn','https://user:secret@www.12306.cn','https://www.12306.cn:444/','https://www.12306.cn.attacker.example/','https://evil12306.cn/','https://example.com/']){
  assert.equal(safeRuleUrl(url),'');assert.throws(()=>ruleDocumentsFromResponse({documents:[{...seed,url}]}))
 }
 for(const url of ['https://www.12306.cn/','https://m.airchina.com/','https://www.airchina.com.cn/','https://www.caac.gov.cn/','https://www.mot.gov.cn/'])assert.ok(safeRuleUrl(url))
})
test('response parser bounds records and excerpts, strips unknown keys and requires review proof',()=>{
 const invalid=[{status:'approved'},{excerpts:[]},{excerpts:Array.from({length:21},()=>seed.excerpts[0])},{excerpts:[{label:'x',text:'x'.repeat(6001)}]},{reviewer:42},{reviewNote:'x'.repeat(2001)},{checkedAt:'not-a-date'},{status:'verified',checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+86400000).toISOString()}]
 for(const change of invalid)assert.throws(()=>ruleDocumentsFromResponse({documents:[{...seed,...change}]}))
 assert.throws(()=>ruleDocumentsFromResponse({documents:[seed,seed]}))
 assert.throws(()=>ruleDocumentsFromResponse({documents:Array.from({length:31},(_,i)=>({...seed,id:String(i)}))}))
 assert.throws(()=>ruleDocumentsFromResponse({documents:Array.from({length:3},(_,i)=>({...seed,id:String(i),excerpts:Array.from({length:20},(_,n)=>({label:String(n),text:'x'.repeat(6000)}))}))}))
 const approved=reviewedRule(seed,now),rows=ruleDocumentsFromResponse({documents:[{...approved,unexpected:'discard'}]})
 assert.equal(rows[0].unexpected,undefined);assert.ok(ruleCurrent(rows[0],now));assert.notEqual(rows[0],approved)
})
test('HTTP fetch uses redirect:error and enforces whole-download deadline and both size checks',async()=>{
 let options
 assert.equal(await fetchRuleText(seed,{fetcher:async(_url,input)=>{options=input;return new Response('<p>ok</p>')}}),'<p>ok</p>')
 assert.equal(options.redirect,'error');assert.ok(options.signal.aborted)
 for(const response of [new Response('no',{status:403}),new Response('x',{headers:{'Content-Length':String(2*1024*1024+1)}}),new Response('x'.repeat(2*1024*1024+1))])await assert.rejects(()=>fetchRuleText(seed,{fetcher:async()=>response}))
 await assert.rejects(()=>fetchRuleText(seed,{fetcher:async()=>({ok:true,redirected:true})}))
 await assert.rejects(()=>fetchRuleText({...seed,url:'https://example.com'},{fetcher:()=>{throw Error('must not fetch')}}))
 for(const limits of [{timeoutMs:15001},{timeoutMs:NaN},{maxBytes:2*1024*1024+1},{maxBytes:NaN}])await assert.rejects(()=>fetchRuleText(seed,{...limits,fetcher:()=>{throw Error('must not fetch')}}))
 await assert.rejects(()=>fetchRuleText(seed,{timeoutMs:10,fetcher:()=>new Promise(()=>{})}))
 let cancelled=false
 const stalled=new ReadableStream({start(controller){controller.enqueue(new Uint8Array([65]))},cancel(){cancelled=true}})
 await assert.rejects(()=>fetchRuleText(seed,{timeoutMs:10,fetcher:async()=>new Response(stalled)}));assert.ok(cancelled)
 assert.equal(plainRuleText('<script>fake</script><p>33 × 91 &amp; 106 &#65; &#99999999;</p>'),'33*91&106A')
})
test('CLI check-only never writes; missing human inputs do not even fetch',async t=>{
 const dir=await directory(t),file=join(dir,'rules.json');let calls=0
 await assert.rejects(()=>reviewRules({file,fetcher:async()=>{calls++;return new Response('')}}));assert.equal(calls,0)
 const checked=await reviewRules({file,checkOnly:true,fetcher:async url=>{calls++;return fetcher(url)},now})
 assert.equal(checked.written,false);assert.ok(checked.records.every(row=>row.status==='unverified'))
 assert.equal(calls,new Set(ruleCatalog.map(row=>row.url)).size);await assert.rejects(()=>access(file))
})
test('CLI stores only fully matched explicitly reviewed records; misses and failures stay unusable',async t=>{
 const dir=await directory(t),file=join(dir,'rules.json')
 const good=await reviewRules({...approval(),file,fetcher,now});assert.ok(good.ok);assert.ok(good.written)
 assert.ok((await readRuleRecords(file)).every(row=>ruleCurrent(row,now)))
 const bad=await reviewRules({...approval(),file,now,fetcher:async url=>url===seed.url?new Response('missing text'):Promise.reject(Error('offline'))})
 assert.equal(bad.ok,false);assert.equal(bad.records[0].status,'changed');assert.ok(bad.records.slice(1).every(row=>row.status==='fetch-failed'))
 assert.ok((await readRuleRecords(file)).every(row=>!ruleCurrent(row,now)))
})
test('stored legacy auto-verified records are downgraded; sources cannot be swapped through disk',async t=>{
 const dir=await directory(t),file=join(dir,'rules.json'),legacy=ruleCatalog.map(row=>({...row,status:'verified',checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+86400000).toISOString()}))
 await writeFile(file,JSON.stringify(legacy));const read=await readRuleRecords(file)
 assert.ok(read.every(row=>row.status==='unverified'&&!row.checkedAt&&!row.expiresAt))
 assert.throws(()=>storedRuleDocuments(legacy,{strict:true}))
 const swapped={...seed,url:'https://www.12306.cn/other'}
 assert.equal(storedRuleDocuments([swapped])[0].status,'changed');assert.throws(()=>storedRuleDocuments([swapped],{strict:true}))
 assert.throws(()=>storedRuleDocuments([{...seed,id:'invented'}]))
})
test('service reloads CLI output, preserves approval dates and rejects an outdated approval hash',async t=>{
 const dir=await directory(t),file=join(dir,'rules.json');let changed=false
 const service=createRuleService({file,fetcher:async url=>new Response(bodyFor(url)+(changed?' changed':''))})
 assert.ok((await service.get()).every(row=>row.status==='unverified'))
 await reviewRules({...approval(),file,fetcher,now:Date.now()});const before=await service.get();assert.ok(before.every(row=>ruleCurrent(row)))
 const refreshed=await service.refresh();assert.equal(refreshed[0].expiresAt,before[0].expiresAt)
 changed=true;await assert.rejects(()=>service.approve(seed.id,approval(before[0].pendingHash)))
 assert.equal((await service.get())[0].status,'changed')
})
test('approval fails closed on failed fetch, missing reviewer and altered excerpts',async t=>{
 const dir=await directory(t),file=join(dir,'rules.json'),records=ruleCatalog.map(row=>reviewedRule(row,Date.now(),bodyFor(row.url)))
 await writeRuleRecords(file,records);let calls=0
 const service=createRuleService({file,fetcher:async()=>{calls++;throw Error('offline')}})
 await assert.rejects(()=>service.approve(seed.id,{hash:records[0].pendingHash}));assert.equal(calls,0)
 await assert.rejects(()=>service.approve(seed.id,approval(records[0].pendingHash)));assert.equal((await service.get())[0].status,'fetch-failed')
 const mismatch=createRuleService({file,fetcher:async()=>new Response('not the original')})
 await assert.rejects(()=>mismatch.approve(seed.id,approval(records[0].pendingHash)));assert.equal((await mismatch.get())[0].status,'changed')
})
test('failed validation cannot overwrite the prior file; corrupt files never silently become verified',async t=>{
 const dir=await directory(t),file=join(dir,'rules.json');await writeRuleRecords(file,ruleCatalog);const before=await readFile(file,'utf8')
 await assert.rejects(()=>writeRuleRecords(file,[{...seed,status:'verified'}]));assert.equal(await readFile(file,'utf8'),before)
 await writeFile(file,'{"broken"');await assert.rejects(()=>readRuleRecords(file))
})
test('startup installs only the optional strict review bundle; missing or invalid bundles reset to unverified without network',async t=>{
 const dir=await directory(t),dataDirectory=join(dir,'data'),bundledFile=join(dir,'rules.verified.json'),warnings=[]
 const good=ruleCatalog.map(row=>reviewedRule(row,now,bodyFor(row.url)))
 await mkdir(dataDirectory);await writeRuleRecords(join(dataDirectory,'rules.json'),good)
 const missing=await initializeRuleFile({bundledFile,dataDirectory});assert.ok(missing.records.every(row=>row.status==='unverified'))
 await writeFile(bundledFile,JSON.stringify(good));const valid=await initializeRuleFile({bundledFile,dataDirectory})
 assert.deepEqual(valid.records,good);assert.equal(valid.rejected,false)
 await writeFile(bundledFile,JSON.stringify([{...seed,status:'verified'}]))
 const invalid=await initializeRuleFile({bundledFile,dataDirectory,notify:message=>warnings.push(message)})
 assert.equal(invalid.rejected,true);assert.equal(warnings.length,1);assert.ok((await readRuleRecords(join(dataDirectory,'rules.json'))).every(row=>!ruleCurrent(row,now)))
})
test('packager validates optional review file and refuses credentials or legacy automatic approval',async t=>{
 const root=await directory(t),folder=join(root,'deployment/modelscope'),file=join(folder,'rules.verified.json');await mkdir(folder,{recursive:true})
 assert.equal(await bundledRuleBytes(root),null)
 const good=ruleCatalog.map(row=>reviewedRule(row,now,bodyFor(row.url)));await writeFile(file,JSON.stringify(good))
 assert.deepEqual(JSON.parse((await bundledRuleBytes(root)).toString()),good)
 await writeFile(file,JSON.stringify([{...seed,status:'verified'}]));await assert.rejects(()=>bundledRuleBytes(root))
 await writeFile(file,JSON.stringify([{...seed,reviewNote:'sk-'+'x'.repeat(25)}]));await assert.rejects(()=>bundledRuleBytes(root),/凭据/)
 await writeFile(file,'x'.repeat(2*1024*1024+1));await assert.rejects(()=>bundledRuleBytes(root),/2MB/)
})
test('clean package carries a validated review mirror via existing server allowlist',async t=>{
 const root=await directory(t),source=fileURLToPath(new URL('../',import.meta.url)),inventory=await studioFiles(source)
 // Tiny synthetic files reproduce the package inventory, without copying user data.
 for(const file of [...inventory,'deployment/modelscope/README.md']){await mkdir(join(root,file,'..'),{recursive:true});await writeFile(join(root,file),'fixture')}
 await writeFile(join(root,'Dockerfile'),'COPY server ./server\nCOPY deployment/modelscope/start.mjs ./deployment/modelscope/start.mjs\n')
 await writeFile(join(root,'.dockerignore'),'*\n!server/\n!server/**\n!deployment/\n!deployment/modelscope/\n!deployment/modelscope/start.mjs\n')
 const reviewed=ruleCatalog.map(row=>reviewedRule(row,now,bodyFor(row.url)))
 await writeFile(join(root,'deployment/modelscope/rules.verified.json'),JSON.stringify(reviewed))
 const destination=join(root,'packed');await prepareStudio(root,destination)
 assert.deepEqual(JSON.parse(await readFile(join(destination,'server/bundled-rules.verified.json'),'utf8')),reviewed)
 await writeFile(join(root,'server/bundled-rules.verified.json'),'untrusted')
 await assert.rejects(()=>studioFiles(root),/打包位置/)
})
