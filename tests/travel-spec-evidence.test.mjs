import test from 'node:test'
import assert from 'node:assert/strict'
import {deviceTravelSpecs,confirmedTravelSpecs,updateTravelSpec,sanitizeTravelSpecDraft,sampleDeviceField,travelSpecFields} from '../src/app/travelSpecEvidence.ts'
import {storedDeviceSpecs,parseTravelTask,writeTravelTask,readTravelTask,TRAVEL_TASK_KEY,exportTravelTask} from '../src/app/travelTaskStorage.ts'
import {buildTravelResults} from '../src/app/travelRules.ts'
import {buildTravelTaskPlan} from '../src/app/travelPlan.ts'
import {travelQuestions} from '../src/app/dailyFlow.ts'
import {rememberTravelSpecs,deviceCard,confirmedSpecs} from '../src/app/journey.ts'
import {localAnalysis,insightCard,preserveConfirmations,sampleBundles,normalizeAnalysis} from '../src/app/product.ts'
import {ruleCatalog} from '../src/app/ruleCatalog.ts'
import {copyDictionary as c} from '../src/app/copyDictionary.ts'
import {initialFitting,transportCard} from '../src/app/fitting.ts'
import {travelCarryCardContent} from '../src/app/travelCarryCard.ts'
import {assistantEvidence} from '../src/app/assistantEvidence.ts'
import {reviewedSpecs} from './helpers/confirmed-specs.mjs'
import {reviewedRule} from './helpers/reviewed-rule.mjs'

const now=Date.parse('2026-11-18T02:00:00Z')
const wheel={id:'actual-wheel',name:'合成实物电动轮椅',type:'wheelchair',battery:'',dimensions:'',weight:'',source:'manual'}
const context={carrier:'unspecified',from:'上海虹桥',to:'杭州东'}
const actual={lengthCm:120,widthCm:68,heightCm:95,weightKg:32,batteryType:'lithium',batteryWh:350,batteryCount:1,removable:'yes',folded:'no'}
const rules=ruleCatalog.map(rule=>reviewedRule(rule,now)) // Synthetic review only; no production rule file.
const planFor=(specs,device=wheel)=>buildTravelTaskPlan({mode:'rail',devices:[device],specs:{[device.id]:specs},context,documents:ruleCatalog,now})
const resultFor=(specs,device=wheel,mode='plane')=>buildTravelResults(mode,[device],{[device.id]:specs},{...context,carrier:mode==='plane'?'airchina':'unspecified'},rules,now)[0]
const cardFor=confirmed=>({...wheel,values:Object.fromEntries(Object.entries(actual).map(([field,value])=>[field,String(value)])),evidence:Object.fromEntries(Object.keys(actual).map(field=>[field,{origin:'measurement',confirmed,note:'合成实测记录'}]))})
const snapshot=(specs,plan=planFor(specs))=>({version:1,specEvidenceVersion:1,mode:'rail',selected:[wheel.id],devices:[wheel],specs:{[wheel.id]:specs},context,customModes:[],customDevices:[],plan,checked:{},savedAt:plan.generatedAt,inputKey:'synthetic'})

test('stored device fields carry their own strict confirmation flags',()=>{
 const card=cardFor(true);card.evidence.widthCm.confirmed=false;card.evidence.heightCm.confirmed='true'
 const stored=storedDeviceSpecs(card),safe=confirmedTravelSpecs(stored,card)
 assert.equal(stored.widthCm,68);assert.equal(stored.confirmed.widthCm,false);assert.equal(stored.confirmed.heightCm,false)
 assert.equal(safe.lengthCm,120);assert.equal(safe.widthCm,undefined);assert.equal(safe.heightCm,undefined)
 assert.equal(safe.batteryWh,350)
})
test('manual descriptions and simulated plate values cannot auto-confirm a field',()=>{
 for(const source of ['manual','plate']){
  const device={...wheel,source,dimensions:'120 × 68 × 95 cm',weight:'32 kg',battery:'无'}
  const stored=deviceTravelSpecs(device);assert.equal(stored.widthCm,68);assert.ok(Object.values(stored.confirmed).every(value=>value===false))
  assert.deepEqual(confirmedSpecs(deviceCard(device)),{});assert.deepEqual(confirmedTravelSpecs(stored,device),{})
 }
})
test('sample card values and forged sample confirmations never enter travel drafts or checks',()=>{
 const card={...cardFor(true),sample:true},stored=storedDeviceSpecs(card)
 assert.ok(travelSpecFields.every(field=>stored[field]===undefined&&stored.confirmed[field]===false))
 assert.deepEqual(confirmedTravelSpecs(reviewedSpecs(actual),card),{})
 assert.notEqual(resultFor(reviewedSpecs(actual),card).eligibility,'restricted')
 assert.equal(planFor(reviewedSpecs(actual),card).completion.generated,12)
})
test('legacy sample note markers remain sample even when an old checkbox was true',()=>{
 const card=cardFor(true);for(const evidence of Object.values(card.evidence))evidence.note+=c.c16febcb7f2806ae6
 assert.equal(sampleDeviceField(card),true);assert.deepEqual(confirmedSpecs(card),{})
 assert.equal(storedDeviceSpecs(card).widthCm,undefined)
})
test('legacy simulated plate recognition cannot become real evidence through its old confirmation checkbox',()=>{
 const card=deviceCard({...wheel,source:'plate',dimensions:'120 × 68 × 95 cm',weight:'32 kg'})
 for(const evidence of Object.values(card.evidence))evidence.confirmed=true
 assert.equal(sampleDeviceField(card),true);assert.equal(storedDeviceSpecs(card).widthCm,undefined);assert.deepEqual(confirmedSpecs(card),{})
})
test('mixed real and sample sources are gated per field',()=>{
 const card=cardFor(true);card.evidence.widthCm.sample=true
 assert.equal(sampleDeviceField(card),false)
 const stored=storedDeviceSpecs(card),safe=confirmedTravelSpecs(stored,card)
 assert.equal(stored.widthCm,undefined);assert.equal(stored.confirmed.widthCm,false);assert.equal(safe.lengthCm,120)
 assert.equal(safe.widthCm,undefined)
})
test('sample product facts cannot become confirmed evidence or regain a previous confirmation',()=>{
 const product=localAnalysis(sampleBundles[0].sources,'sample');for(const fact of product.insight.facts)fact.confirmed=true
 const card=insightCard(product);assert.equal(card.sample,true);assert.ok(Object.values(card.evidence).every(row=>!row.confirmed&&row.sample))
 assert.deepEqual(confirmedSpecs(card),{});assert.equal(storedDeviceSpecs(card).widthCm,undefined)
 const repeated=preserveConfirmations(product,localAnalysis(sampleBundles[0].sources,'sample'))
 assert.ok(repeated.insight.facts.every(fact=>fact.confirmed===false))
 const evidence=assistantEvidence(product).filter(item=>item.kind==='fact');assert.ok(evidence.every(item=>item.text.includes(c.travelSampleFact)&&!item.text.includes(c.c88f9e99179f87b72)))
})
test('a sample source in a local analysis is still blocked while a separate real source can be reviewed',()=>{
 const sources=[{id:'demo',name:'合成样例',sample:true,kind:'manual',text:'宽度68cm。'},{id:'measured',name:'合成实测',kind:'manual',text:'长度120cm。'}]
 const product=normalizeAnalysis({category:'wheelchair',facts:[{field:'widthCm',value:'68',unit:'cm',sourceId:'demo',quote:'宽度68cm'},{field:'lengthCm',value:'120',unit:'cm',sourceId:'measured',quote:'长度120cm'}]},sources,'local')
 for(const fact of product.insight.facts)fact.confirmed=true
 const card=insightCard(product);assert.equal(card.evidence.widthCm.confirmed,false);assert.equal(card.evidence.lengthCm.confirmed,true)
 assert.equal(confirmedSpecs(card).widthCm,undefined);assert.equal(confirmedSpecs(card).lengthCm,120)
})
test('300Wh and 160Wh comparisons require every relevant battery field to be confirmed',()=>{
 const confirmed=reviewedSpecs(actual);assert.equal(resultFor(confirmed).eligibility,'restricted')
 const two=reviewedSpecs({...actual,batteryCount:2,batteryWh:180});assert.equal(resultFor(two).eligibility,'restricted')
 for(const field of ['batteryType','batteryWh','batteryCount','removable']){
  const incomplete={...confirmed,confirmed:{...confirmed.confirmed,[field]:false}}
  const result=resultFor(incomplete);assert.notEqual(result.eligibility,'restricted',field);assert.ok(!result.checks.some(text=>text.includes('350')),field)
 }
 assert.notEqual(resultFor(actual).eligibility,'restricted');assert.ok(!JSON.stringify(resultFor(actual)).includes('350'))
})
test('33 by 91 by 106 storage checks use only confirmed dimensions and folding state',()=>{
 const device={...wheel,type:'manual-wheelchair'},fits=reviewedSpecs({lengthCm:90,widthCm:25,heightCm:80,weightKg:14,batteryType:'none',folded:'yes'})
 assert.ok(resultFor(fits,device).checks.includes(c.c99e47d2fd3f90385))
 for(const field of ['lengthCm','widthCm','heightCm','folded']){
  const draft={...fits,confirmed:{...fits.confirmed,[field]:false}},result=resultFor(draft,device)
  assert.ok(!result.checks.includes(c.c99e47d2fd3f90385),field)
 }
 const unfolded={...fits,folded:'no'};assert.ok(!resultFor(unfolded,device).checks.includes(c.c99e47d2fd3f90385))
})
test('rail weight thresholds do not consume an unreviewed number',()=>{
 const device={...wheel,type:'walker'},values=reviewedSpecs({weightKg:25})
 assert.equal(resultFor(values,device,'rail').eligibility,'restricted')
 assert.notEqual(resultFor({weightKg:25},device,'rail').eligibility,'restricted')
})
test('unconfirmed and sample facts leave an honest 12 of 20 plan and no raw measurements in exports',()=>{
 const confirmed=planFor(reviewedSpecs(actual));assert.equal(confirmed.completion.generated,20);assert.equal(confirmed.completion.locked,0)
 for(const plan of [planFor(actual),planFor(reviewedSpecs(actual),{...wheel,sample:true})]){
  assert.equal(plan.completion.generated,12);assert.equal(plan.completion.total,20);assert.deepEqual(plan.devices[0].specs,{})
  const exported=JSON.stringify(exportTravelTask(snapshot(actual,plan))),carry=JSON.stringify(travelCarryCardContent(plan))
  assert.ok(!exported.includes('350'));assert.ok(!carry.includes('350'));assert.ok(plan.completion.gaps.some(gap=>gap.id==='dimensions'))
 }
})
test('editing invalidates just that field; explicit confirmation refreshes the plan',()=>{
 const before=reviewedSpecs(actual),edited=updateTravelSpec(before,'widthCm',70)
 assert.equal(edited.confirmed.widthCm,false);assert.equal(edited.confirmed.lengthCm,true)
 assert.equal(planFor(edited).devices[0].specs.widthCm,undefined)
 const reviewed=updateTravelSpec(edited,'confirmed',{widthCm:true});assert.equal(planFor(reviewed).devices[0].specs.widthCm,70)
 assert.notEqual(planFor(reviewed).id,planFor(edited).id)
 assert.equal(updateTravelSpec({widthCm:68,sampleFields:{widthCm:true}},'confirmed',{widthCm:true}).confirmed.widthCm,false)
 for(const bad of [0,-1,Infinity,NaN])assert.equal(updateTravelSpec({widthCm:bad},'confirmed',{widthCm:true}).confirmed.widthCm,false)
})
test('one-question flow asks about prefilled unconfirmed facts, then skips only the confirmed field',()=>{
 const pending=travelQuestions('plane',[wheel],{[wheel.id]:actual})
 assert.equal(pending[0].field,'lengthCm')
 const one=updateTravelSpec(actual,'confirmed',{lengthCm:true})
 assert.equal(travelQuestions('plane',[wheel],{[wheel.id]:one})[0].field,'widthCm')
 assert.equal(travelQuestions('plane',[wheel],{[wheel.id]:reviewedSpecs(actual)}).length,0)
})
test('remembering drafts does not silently confirm them on a device card',()=>{
 const blank=deviceCard(wheel),draft=rememberTravelSpecs(blank,actual)
 assert.equal(draft.values.widthCm,'68');assert.equal(draft.evidence.widthCm.confirmed,false);assert.deepEqual(confirmedSpecs(draft),{})
 const reviewed=rememberTravelSpecs(blank,reviewedSpecs(actual));assert.equal(confirmedSpecs(reviewed).widthCm,68)
 assert.equal(confirmedSpecs(rememberTravelSpecs({...blank,sample:true},reviewedSpecs(actual))).widthCm,undefined)
})
test('folded dimensions need their own evidence plus a reviewed transport state',()=>{
 const card={...cardFor(true),transportState:'folded',values:{...cardFor(true).values,foldLengthCm:'90',foldWidthCm:'25',foldHeightCm:'80'},evidence:{...cardFor(true).evidence,folded:{origin:'measurement',confirmed:false,note:'待核对'},...Object.fromEntries(['foldLengthCm','foldWidthCm','foldHeightCm'].map(field=>[field,{origin:'measurement',confirmed:true,note:'合成折后实测'}]))}}
 assert.equal(storedDeviceSpecs(card).widthCm,25);assert.equal(confirmedSpecs(card).widthCm,undefined)
 card.values.folded='yes';card.evidence.folded.confirmed=true;assert.equal(confirmedSpecs(card).widthCm,25);assert.equal(confirmedSpecs(card).folded,'yes')
 card.values.folded='no';assert.equal(confirmedSpecs(card).widthCm,undefined);assert.equal(confirmedSpecs(card).folded,undefined)
 card.values.folded='yes';delete card.transportState;card.evidence.widthCm.sample=true;assert.equal(confirmedSpecs(card).widthCm,25)
})
test('old complete snapshots are rebuilt before offline display; previous checkmarks cannot survive the evidence downgrade',()=>{
 const old=snapshot(actual,planFor(reviewedSpecs(actual)));delete old.specEvidenceVersion;old.checked={'rail-carry':'old-check'};old.lastViewedPlan=old.plan
 const restored=parseTravelTask(JSON.stringify(old));assert.ok(restored);assert.equal(restored.needsSpecReview,true)
 assert.equal(restored.plan.completion.generated,12);assert.deepEqual(restored.checked,{});assert.equal(restored.lastViewedPlan,undefined)
 assert.equal(restored.inputKey,'');assert.ok(Object.values(restored.specs[wheel.id].confirmed).every(value=>!value))
 assert.ok(!JSON.stringify(exportTravelTask(restored)).includes('350'))
})
test('even a new-version snapshot cannot restore a complete plan whose values have lost confirmation',()=>{
 const stale=snapshot({...actual,confirmed:{}},planFor(reviewedSpecs(actual)))
 const restored=parseTravelTask(JSON.stringify(stale));assert.ok(restored);assert.equal(restored.plan.completion.generated,12)
 assert.deepEqual(restored.plan.devices[0].specs,{})
})
test('local save and reload retain per-field confirmation and sample exclusion',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),memory=new Map()
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)}})
 try{
  writeTravelTask(snapshot(reviewedSpecs(actual)));assert.equal(JSON.parse(memory.get(TRAVEL_TASK_KEY)).specEvidenceVersion,1)
  const restored=readTravelTask();assert.equal(restored.specs[wheel.id].confirmed.widthCm,true);assert.equal(restored.plan.completion.generated,20)
  const draft=snapshot({...reviewedSpecs(actual),sampleFields:{widthCm:true}},planFor({...reviewedSpecs(actual),sampleFields:{widthCm:true}}))
  writeTravelTask(draft);const sample=readTravelTask();assert.equal(sample.specs[wheel.id].widthCm,undefined);assert.equal(sample.specs[wheel.id].confirmed.widthCm,false)
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage')}
})
test('capacity estimates never leak invented dimensions as actual device information',()=>{
 const plan=planFor({});assert.equal(plan.completion.total,20);assert.deepEqual(plan.devices[0].specs,{})
 assert.ok(!JSON.stringify(plan.devices).includes('120'));assert.ok(!JSON.stringify(plan.devices).includes('68'))
 const unknown=sanitizeTravelSpecDraft({...actual,confirmed:{widthCm:'true'}},wheel)
 assert.equal(unknown.confirmed.widthCm,false)
 assert.equal(confirmedTravelSpecs({batteryType:['none'],confirmed:{batteryType:true}}).batteryType,undefined)
 const malformed=cardFor(false);malformed.evidence.widthCm.note=123;assert.doesNotThrow(()=>storedDeviceSpecs(malformed))
})
test('actual confirmed transport measurements from fitting still work without changing three-dimensional geometry rules',()=>{
 const draft=initialFitting();draft.transport={lengthCm:'120',widthCm:'68',heightCm:'95',weightKg:'32',batteryType:'lithium',batteryWh:'350',source:'合成实物铭牌',confirmed:true}
 const card=transportCard(draft);assert.ok(card);assert.equal(confirmedTravelSpecs(storedDeviceSpecs(card),card).widthCm,68)
})
