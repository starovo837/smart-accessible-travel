import test from 'node:test'
import assert from 'node:assert/strict'
import {buildTravelTaskPlan} from '../src/app/travelPlan.ts'
import {parseTravelTask,storedDeviceSpecs,travelActionSignature,exportTravelTask} from '../src/app/travelTaskStorage.ts'
const device={id:'my-chair',name:'合成电动轮椅',type:'wheelchair',battery:'',dimensions:'',weight:'',source:'manual'}
const plan=buildTravelTaskPlan({mode:'rail',devices:[device],specs:{},context:{carrier:'unspecified',from:'上海虹桥',to:'杭州东',journeyDate:'2026-11-07'},now:Date.parse('2026-11-06T04:00:00Z')})
const snapshot={version:1,specEvidenceVersion:1,mode:'rail',selected:['my-chair'],specs:{'my-chair':{}},context:{carrier:'unspecified'},devices:[device],customModes:[],customDevices:[],plan,checked:{},savedAt:plan.generatedAt,inputKey:'synthetic'}
test('local task snapshot restores exact five stages and phone numbers without network',()=>{
 const action=plan.stages[0].actions[0],saved={...snapshot,checked:{[action.id]:travelActionSignature(action,plan)}}
 const restored=parseTravelTask(JSON.stringify(saved))
 assert.ok(restored);assert.equal(restored.plan.contacts[0].phone,'12306');assert.deepEqual(restored.plan,saved.plan)
 assert.equal(restored.checked[action.id],travelActionSignature(action,restored.plan))
})
test('corrupt or unsafe stored task data does not crash recovery or expose active script links',()=>{
 for(const raw of [null,'bad','{}','x'.repeat(700001),JSON.stringify({...snapshot,specs:{'my-chair':null}}),JSON.stringify({...snapshot,devices:[{id:'x',name:'x',type:'wheelchair'}]})])assert.equal(parseTravelTask(raw),null)
 const unsafe=structuredClone(snapshot);unsafe.plan.stages[0].actions[0].evidence.officialUrl='javascript:alert(1)';assert.equal(parseTravelTask(JSON.stringify(unsafe)),null)
})
test('saved but unconfirmed manual parameters are reused and folded state selects actual transport dimensions',()=>{
 const card={...device,values:{widthCm:'68',batteryType:'lithium',batteryWh:'288'},evidence:{widthCm:{confirmed:false,origin:'measurement',note:'本人填写'}}}
 const stored=storedDeviceSpecs(card);assert.equal(stored.widthCm,68);assert.equal(stored.batteryWh,288);assert.equal(stored.batteryType,'lithium');assert.ok(Object.values(stored.confirmed).every(value=>value===false))
 assert.equal(storedDeviceSpecs({...card,transportState:'folded',values:{...card.values,foldLengthCm:'90',foldWidthCm:'55',foldHeightCm:'70'}}).widthCm,55)
 const legacy=storedDeviceSpecs({...device,dimensions:'100 × 68 × 90 cm',weight:'28 kg',battery:'无'});assert.deepEqual([legacy.lengthCm,legacy.widthCm,legacy.heightCm,legacy.weightKg,legacy.batteryType],[100,68,90,28,'none']);assert.ok(Object.values(legacy.confirmed).every(value=>value===false))
})
test('unchanged actions keep completion through generation time changes, edited content and routes invalidate it',()=>{
 const a=plan.stages[0].actions[0],signature=travelActionSignature(a,plan)
 assert.equal(travelActionSignature({...a,evidence:{...a.evidence,updatedAt:'new generation timestamp'}},plan),signature)
 assert.notEqual(travelActionSignature({...a,detail:a.detail+'changed'},plan),signature)
 assert.notEqual(travelActionSignature(a,{...plan,route:{...plan.route,to:'南京南'}}),signature)
})

test('preparation snapshots retain explicit empty stages, an always-usable fallback and default single-step mode',()=>{
 const prep=buildTravelTaskPlan({mode:'rail',devices:[],specs:{},context:{carrier:'unspecified'},now:Date.parse('2026-11-07T02:00:00Z')})
 const restored=parseTravelTask(JSON.stringify({...snapshot,selected:[],devices:[],plan:prep}))
 assert.ok(restored);assert.equal(restored.plan.readiness,'preparation');assert.equal(restored.onlyNext,true)
 assert.ok(restored.plan.generalActions.length<=6);assert.ok(restored.plan.stages.filter(stage=>stage.id!=='fallback').every(stage=>stage.actions.length===0&&stage.emptyReason))
 assert.ok(restored.plan.stages.find(stage=>stage.id==='fallback').actions.length>0);assert.equal(restored.plan.completion.stages.fallback.status,'ready')
 assert.equal(parseTravelTask(JSON.stringify({...restored,onlyNext:false})).onlyNext,false)
 assert.equal(parseTravelTask(JSON.stringify({...restored,displayVersion:2,onlyNext:undefined})).onlyNext,false)
 assert.equal(parseTravelTask(JSON.stringify({...restored,displayVersion:2,onlyNext:true})).onlyNext,true)
 const malformed=structuredClone(restored);malformed.plan.generalActions=[{title:'broken'}]
 assert.equal(parseTravelTask(JSON.stringify(malformed)),null)
})

test('export starts with the same coverage statement as the task and preserves the presented baseline locally',()=>{
 const exported=exportTravelTask(snapshot)
 assert.equal(Object.keys(exported)[0],'completionStatement');assert.equal(exported.completionStatement,plan.completion.statement)
 const restored=parseTravelTask(JSON.stringify({...snapshot,lastViewedPlan:plan}))
 assert.deepEqual(restored.lastViewedPlan,plan)
 const broken=structuredClone(snapshot);broken.plan.completion.generated=999
 assert.equal(parseTravelTask(JSON.stringify(broken)),null)
})

test('old static snapshots migrate using current input gates instead of restoring a false complete plan',()=>{
 const legacy=structuredClone(snapshot)
 delete legacy.plan.readiness;delete legacy.plan.generalActions
 const restored=parseTravelTask(JSON.stringify(legacy))
 assert.ok(restored);assert.equal(restored.plan.readiness,'preparation');assert.equal(restored.inputKey,'');assert.deepEqual(restored.checked,{})
})

test('export contains only normalized current task and validated checkmarks, excluding raw UI drafts',()=>{
 const first=plan.stages[0].actions[0]
 const exported=exportTravelTask({...snapshot,context:{from:'（待填写）'},customDevices:[{name:'暂未选择'}],checked:{[first.id]:travelActionSignature(first,plan),stale:'wrong'}})
 assert.equal(exported.context.from,'上海虹桥');assert.ok(!('customDevices' in exported));assert.deepEqual(exported.checked,{[first.id]:true})
 assert.doesNotMatch(JSON.stringify(exported),/（?(未选择|待填写|暂未)/u)
})

test('custom device identifiers cannot carry system placeholders into exported task data',()=>{
 const custom={...device,id:'custom:暂未选择',name:'（待填写）',type:'custom:暂未选择'}
 const task=buildTravelTaskPlan({mode:'rail',devices:[custom],specs:{},context:{carrier:'unspecified'},now:Date.parse('2026-11-07T02:00:00Z')})
 const exported=exportTravelTask({...snapshot,plan:task})
 assert.doesNotMatch(JSON.stringify(exported),/（?(未选择|待填写|暂未)/u)
 assert.equal(exported.devices[0].id,'travel-device-1');assert.equal(exported.plan.devices[0].id,'travel-device-1')
 assert.equal(task.devices[0].id,custom.id)
})
