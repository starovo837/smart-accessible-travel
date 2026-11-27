import {reviewedSpecs} from './helpers/confirmed-specs.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {inspectRule,createRuleService} from '../server/rule-service.mjs'
import {ruleCatalog,ruleCurrent} from '../src/app/ruleCatalog.ts'
import {buildTravelResults} from '../src/app/travelRules.ts'
import {validateAssistantAnswer} from '../src/app/assistantEvidence.ts'
import {reviewedRule} from './helpers/reviewed-rule.mjs'
const now=Date.now(),seed=ruleCatalog[0],html=seed.excerpts.map(item=>'<p>'+item.text+'</p>').join('')
test('source text changes, missing anchors and expiry disable rule thresholds',()=>{
 const inspected=inspectRule(seed,html,now);assert.equal(inspected.status,'unverified');assert.equal(inspected.checkedAt,null)
 const verified=reviewedRule(seed,now,html);assert.equal(verified.status,'verified');assert.ok(ruleCurrent(verified,now));assert.ok(!ruleCurrent(verified,now+7*86400000))
 assert.equal(inspectRule(verified,html+'<p>规则有变动</p>',now+1000).status,'changed')
 assert.equal(inspectRule(seed,'不存在条款',now).status,'changed')
 const d={id:'d',name:'助行器',type:'walker',battery:'',dimensions:'',weight:'',source:'manual'}
 assert.equal(buildTravelResults('rail',[d],{d:reviewedSpecs({weightKg:25})},{carrier:'unspecified'},[verified],now)[0].eligibility,'restricted')
 assert.notEqual(buildTravelResults('rail',[d],{d:reviewedSpecs({weightKg:25})},{carrier:'unspecified'},[verified],now+8*86400000)[0].eligibility,'restricted')
 assert.notEqual(buildTravelResults('rail',[d],{d:reviewedSpecs({weightKg:25})},{carrier:'unspecified',journeyDate:new Date(now+8*86400000).toISOString().slice(0,10)},[verified],now)[0].eligibility,'restricted')
})
test('official refresh fetches only allowlisted documents and stores verifiable source metadata',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'accessible-rules-'));try{const urls=[],service=createRuleService({file:join(dir,'rules.json'),fetcher:async url=>{urls.push(url);const documents=ruleCatalog.filter(item=>item.url===url);return new Response(documents.flatMap(item=>item.excerpts.map(row=>row.text)).join(' '))}});const records=await service.refresh();assert.ok(records.every(item=>item.status==='unverified'));assert.equal(urls.length,new Set(ruleCatalog.map(item=>item.url)).size);assert.ok(records.every(item=>!item.checkedAt&&!item.expiresAt&&!item.contentHash&&item.pendingHash&&item.anchorsMatch));const reloaded=await createRuleService({file:join(dir,'rules.json')}).get();assert.equal(reloaded[0].pendingHash,records[0].pendingHash)}finally{await rm(dir,{recursive:true,force:true})}
})
test('grounded assistant rejects invented citations, new numeric limits, and guarantees',()=>{
 const evidence=[{id:'width',label:'宽度',text:'引用：设备宽度68cm。尚未本人确认。',source:'说明书'}]
 assert.throws(()=>validateAssistantAnswer({answer:'宽度60cm。',factIds:['width']},evidence),/资料/)
 assert.throws(()=>validateAssistantAnswer({answer:'可以带。',factIds:['invented']},evidence),/依据/)
 assert.throws(()=>validateAssistantAnswer({answer:'保证安全。',factIds:['width']},evidence),/范围/)
 assert.equal(validateAssistantAnswer({answer:'资料写宽度68cm，还需核对你家门宽。',factIds:['width'],followUp:'你家门的净宽是多少？'},evidence).factIds[0],'width')
 assert.equal(validateAssistantAnswer({answer:'资料写宽度68厘米。',factIds:['width']},evidence).factIds[0],'width')
 assert.throws(()=>validateAssistantAnswer({answer:'还需核对。',factIds:['width'],followUp:'确认入口至少80cm？'},evidence),/资料/)
})
