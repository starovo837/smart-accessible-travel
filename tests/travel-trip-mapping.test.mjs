import {reviewedSpecs} from './helpers/confirmed-specs.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {buildTravelTaskPlan} from '../src/app/travelPlan.ts'
import {canonicalTripKey,safeTripText} from '../src/app/travelTripIdentity.ts'
import {allTravelActions} from '../src/app/travelTaskTypes.ts'
import {travelPlanDifference,assertTravelCopy,assertTravelPlanShape} from '../scripts/assert-travel-copy.mjs'
const chair={id:'chair',name:'电动轮椅',type:'wheelchair',battery:'',dimensions:'',weight:'',source:'manual'}
const rail={mode:'rail',devices:[chair],specs:{chair:reviewedSpecs({lengthCm:120,widthCm:68,heightCm:95,batteryType:'lithium'})},context:{carrier:'unspecified',from:'上海虹桥',to:'杭州东',journeyDate:'2026-11-07',companionCount:0},now:Date.parse('2026-11-07T02:00:00Z')}
const manual={...chair,id:'manual',name:'手动轮椅',type:'manual-wheelchair'}
const air={...rail,mode:'plane',devices:[manual],specs:{manual:reviewedSpecs({folded:'no',batteryType:'none'})},context:{...rail.context,from:'上海浦东',to:'北京首都',carrier:'unspecified'}}
const cane={...chair,id:'cane',name:'盲杖',type:'cane'},dog={...chair,id:'dog',name:'导盲犬',type:'guide-dog'}
const metro={...rail,mode:'metro',devices:[cane,dog],specs:{cane:reviewedSpecs({batteryType:'none'}),dog:reviewedSpecs({batteryType:'none'})},context:{carrier:'unspecified',city:'上海',journeyDate:'2026-11-07'}}

test('the three exact acceptance inputs differ in actual copy and natural action counts',()=>{
 const plans=[rail,air,metro].map(buildTravelTaskPlan)
 for(const plan of plans){assertTravelCopy(plan);assertTravelPlanShape(plan,{preparation:plan.readiness==='preparation'})}
 assert.equal(plans[0].readiness,'complete');assert.equal(plans[1].readiness,'station-only');assert.ok(plans[1].completion.gaps.some(gap=>gap.id==='dimensions'));assert.equal(plans[2].readiness,'preparation')
 for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++)assert.ok(travelPlanDifference(plans[i],plans[j])>=.3)
 assert.ok(new Set(plans.map(plan=>allTravelActions(plan).length)).size>1)
 assert.ok(allTravelActions(plans[0]).filter(row=>/上海虹桥|杭州东/.test(row.detail)).length>=3)
 assert.ok(allTravelActions(plans[1]).filter(row=>/浦东|首都|国际航空/.test(row.detail)).length>=3)
 assert.ok(allTravelActions(plans[2]).length<=6)
 assert.equal(plans[2].route.from,'');assert.equal(plans[2].route.to,'')
})

test('each meaningful endpoint, date, companion or single device-spec edit refreshes at least 30% of actions',()=>{
 const original=buildTravelTaskPlan(rail)
 const contexts=[{from:'南京南'},{to:'苏州北'},{journeyDate:'2026-11-08'},{companionCount:1}]
 const specs=[reviewedSpecs({lengthCm:125}),reviewedSpecs({widthCm:70}),reviewedSpecs({heightCm:100}),reviewedSpecs({weightKg:32}),reviewedSpecs({batteryWh:288}),reviewedSpecs({batteryCount:2}),reviewedSpecs({removable:'no'}),reviewedSpecs({folded:'yes'}),reviewedSpecs({batteryType:'none'})]
 for(const change of contexts)assert.ok(travelPlanDifference(original,buildTravelTaskPlan({...rail,context:{...rail.context,...change}}))>=.3,JSON.stringify(change))
 for(const change of specs)assert.ok(travelPlanDifference(original,buildTravelTaskPlan({...rail,specs:{chair:reviewedSpecs({...rail.specs.chair,...change})}}))>=.3,JSON.stringify(change))
 assert.ok(travelPlanDifference(original,buildTravelTaskPlan({...rail,devices:[{...chair,type:'manual-wheelchair'}]}))>=.3)
 assert.ok(travelPlanDifference(buildTravelTaskPlan(air),buildTravelTaskPlan({...air,context:{...air.context,carrier:'ceair'}}))>=.3)
})

test('line and measured available space influence actions, not only identity',()=>{
 const ordinary=buildTravelTaskPlan(rail)
 for(const change of [{line:'G123次'},{doorWidthCm:60},{availableLengthCm:100},{availableWidthCm:60},{availableHeightCm:90},{availableWeightKg:20}]){
  const next=buildTravelTaskPlan({...rail,context:{...rail.context,...change}})
  assert.ok(travelPlanDifference(ordinary,next)>=.3,JSON.stringify(change))
 }
 const narrower=buildTravelTaskPlan({...rail,context:{...rail.context,doorWidthCm:60}})
 assert.match(JSON.stringify(narrower),/电动轮椅门净宽超出本人填写的可用值/)
})

test('readiness changes for required fields while an optional date remains an actual itinerary fact',()=>{
 const noDevice=buildTravelTaskPlan({...rail,devices:[],specs:{}})
 assert.equal(noDevice.readiness,'station-only');assert.equal(noDevice.stages.find(stage=>stage.id==='onboard').actions.length,0)
 assert.ok(!allTravelActions(noDevice).some(row=>/电池|设备资料|设备档案/.test(row.title)))
 assertTravelCopy(noDevice)
 const noDate=buildTravelTaskPlan({...rail,context:{...rail.context,journeyDate:''}})
 assert.equal(noDate.readiness,'complete');assert.equal(noDate.route.date,'');assert.deepEqual(noDate.completion.gaps,[])
 const noFrom=buildTravelTaskPlan({...rail,context:{...rail.context,from:''}})
 assert.equal(noFrom.readiness,'preparation');assert.ok(allTravelActions(noFrom).length<=6)
 const cityOnly=buildTravelTaskPlan(metro);assert.ok(cityOnly.stages.filter(stage=>stage.id!=='fallback').every(stage=>stage.emptyReason));assert.equal(cityOnly.completion.stages.fallback.status,'ready')
})

test('partial route preparation responds to known facts instead of repeating an unchanged generic template',()=>{
 const partial={...rail,devices:[],specs:{},context:{carrier:'unspecified'}}
 const initial=buildTravelTaskPlan(partial)
 for(const change of [{from:'上海虹桥'},{to:'杭州东'},{journeyDate:'2026-11-08'},{companionCount:1},{line:'G123次'}]){
  const next=buildTravelTaskPlan({...partial,context:{...partial.context,...change}})
  assert.equal(next.readiness,'preparation');assert.ok(allTravelActions(next).length<=6)
  assert.ok(travelPlanDifference(initial,next)>=.3,JSON.stringify(change));assertTravelCopy(next)
 }
 const dogPlan=buildTravelTaskPlan(metro),withCaneLength=buildTravelTaskPlan({...metro,specs:{...metro.specs,cane:reviewedSpecs({...metro.specs.cane,lengthCm:125})}})
 assert.ok(travelPlanDifference(dogPlan,withCaneLength)>=.3)
})

test('station-only tasks use partial measurements for preliminary service and access inquiries',()=>{
 const input={...rail,specs:{chair:reviewedSpecs({lengthCm:120,widthCm:68})},context:{...rail.context,journeyDate:''}},initial=buildTravelTaskPlan(input)
 assert.equal(initial.readiness,'station-only')
 for(const change of [reviewedSpecs({widthCm:70}),reviewedSpecs({lengthCm:125}),reviewedSpecs({heightCm:100}),reviewedSpecs({batteryType:'other'}),reviewedSpecs({weightKg:30})]){
  const next=buildTravelTaskPlan({...input,specs:{chair:reviewedSpecs({...input.specs.chair,...change})}})
  assert.equal(next.readiness,'station-only');assert.equal(next.stages.find(stage=>stage.id==='onboard').actions.length,0)
  assert.ok(travelPlanDifference(initial,next)>=.3,JSON.stringify(change));assertTravelCopy(next)
 }
 assert.ok(travelPlanDifference(buildTravelTaskPlan({...rail,context:{...rail.context,city:'上海'}}),buildTravelTaskPlan({...rail,context:{...rail.context,city:'南京'}}))>=.3)
})

test('canonical identity ignores whitespace, unrelated IDs and device order but retains real parameters',()=>{
 const other={...chair,id:'hearing',name:'助听器',type:'hearing-aid'}
 const a={...rail,devices:[chair,other],specs:{...rail.specs,hearing:reviewedSpecs({batteryType:'other'})}}
 const renamed={...chair,id:'new-id',name:'  电动轮椅  ',source:'plate'}
 const b={...a,devices:[other,renamed],specs:{hearing:reviewedSpecs({batteryType:'other'}),'new-id':rail.specs.chair},context:{...rail.context,from:' 上海虹桥 ',to:'杭州东  '}}
 assert.equal(canonicalTripKey(a),canonicalTripKey(b))
 assert.equal(buildTravelTaskPlan(a).id,buildTravelTaskPlan(b).id)
 assert.notEqual(canonicalTripKey(a),canonicalTripKey({...a,context:{...a.context,companionCount:2}}))
})

test('staff scripts sanitize placeholder-like user names and route values',()=>{
 assert.equal(safeTripText('（暂未选择）','随行辅具'),'随行辅具')
 const plan=buildTravelTaskPlan({...rail,devices:[{...chair,name:'暂未选择设备'}],context:{...rail.context,from:'（待填写）'}})
 assert.equal(plan.readiness,'preparation');assertTravelCopy(plan)
 for(const action of allTravelActions(plan))assert.ok(!/（?(未选择|待填写|暂未)/u.test(action.verification?.question??''))
})

test('stable rule IDs distinguish content edits from fabricated remove/add changes',()=>{
 const a=buildTravelTaskPlan(rail),b=buildTravelTaskPlan({...rail,specs:{chair:reviewedSpecs({...rail.specs.chair,widthCm:71})}})
 assert.deepEqual(allTravelActions(a).map(row=>row.id),allTravelActions(b).map(row=>row.id))
 assert.notEqual(a.id,b.id)
})
