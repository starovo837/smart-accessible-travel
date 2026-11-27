import {reviewedSpecs} from './helpers/confirmed-specs.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {buildTravelTaskPlan} from '../src/app/travelPlan.ts'
import {ruleCatalog} from '../src/app/ruleCatalog.ts'
import {allTravelActions} from '../src/app/travelTaskTypes.ts'
import {requiresTravelDimensions,requiresTravelBattery} from '../src/app/travelCompleteness.ts'

const now=Date.parse('2026-11-07T02:00:00Z')
const chair={id:'chair',type:'wheelchair',name:'电动轮椅',dimensions:'',weight:'',battery:'',source:'manual'}
const base={mode:'rail',devices:[],specs:{},context:{carrier:'unspecified',from:'上海虹桥',to:'杭州东'},documents:ruleCatalog,now}
const full={...base,devices:[chair],specs:{chair:reviewedSpecs({lengthCm:120,widthCm:68,heightCm:95,batteryType:'lithium'})}}

test('unknown equipment exposes 12 of 20 actions and three common dependency gaps',()=>{
 const plan=buildTravelTaskPlan(base),c=plan.completion
 assert.equal(c.generated,12);assert.equal(c.total,20);assert.equal(c.locked,8)
 assert.deepEqual(c.gaps.map(gap=>gap.label),['设备类型','尺寸','电池类型'])
 assert.ok(c.gaps.every(gap=>gap.unlocks===8&&gap.requires.length===2))
 assert.match(plan.summary,/12 项.*20 项.*3 个/)
 assert.doesNotMatch(JSON.stringify(plan),/专属行动|完整/)
 assert.deepEqual([c.stages.before.status,c.stages.station.status,c.stages.onboard.status,c.stages.arrival.status,c.stages.fallback.status],['partial','partial','blocked','ready','ready'])
 assert.match(c.statement,/本清单完成 12\/20 项，缺失：设备类型、尺寸、电池类型/)
 assert.ok(!JSON.stringify(plan).includes('待定辅具方案'));assert.equal(plan.devices.length,0)
})

test('only real required equipment facts unlock the eight stable-ID actions',()=>{
 const before=buildTravelTaskPlan(base),after=buildTravelTaskPlan(full)
 const old=new Set(allTravelActions(before).map(action=>action.id)),added=allTravelActions(after).filter(action=>!old.has(action.id))
 assert.equal(added.length,8);assert.equal(after.completion.generated,20);assert.equal(after.completion.total,20)
 assert.equal(after.completion.locked,0);assert.deepEqual(after.completion.gaps,[]);assert.match(after.summary,/20\/20 已就绪/)
 assert.ok(Object.values(after.completion.stages).every(stage=>stage.status==='ready'))
 for(const specs of [{},reviewedSpecs({lengthCm:120}),reviewedSpecs({lengthCm:120,widthCm:68,heightCm:95}),reviewedSpecs({batteryType:'lithium'}),reviewedSpecs({lengthCm:120,widthCm:68,heightCm:95,batteryType:'unknown'})]){
  const partial=buildTravelTaskPlan({...full,specs:{chair:specs}})
  assert.equal(partial.completion.generated,12);assert.equal(partial.completion.locked,8)
  assert.equal(partial.stages.find(stage=>stage.id==='onboard').actions.length,0)
  assert.doesNotMatch(JSON.stringify(partial),/专属行动|完整/)
 }
})

test('full capacity follows actual mode and equipment instead of forcing every checklist to 20',()=>{
 const air=buildTravelTaskPlan({...full,mode:'plane',devices:[{...chair,type:'manual-wheelchair'}],specs:{chair:reviewedSpecs({lengthCm:120,widthCm:68,heightCm:95,batteryType:'none',folded:'no'})},context:{...base.context,from:'上海浦东',to:'北京首都'}})
 assert.equal(air.completion.locked,0);assert.equal(air.completion.generated,air.completion.total)
 assert.notEqual(air.completion.total,20)
})

test('all selected devices must satisfy applicable requirements; service animals and simple aids are exempt',()=>{
 const second={...chair,id:'second',name:'第二台轮椅'}
 const partial=buildTravelTaskPlan({...full,devices:[chair,second]})
 assert.equal(partial.completion.locked,8);assert.deepEqual(partial.completion.gaps.map(gap=>gap.deviceIds),[['second'],['second']])
 const cane={...chair,id:'cane',type:'cane',name:'盲杖'},dog={...chair,id:'dog',type:'guide-dog',name:'导盲犬'}
 const accessible=buildTravelTaskPlan({...full,mode:'metro',devices:[cane,dog],specs:{},context:{...base.context,from:'虹桥火车站',to:'人民广场'}})
 assert.equal(accessible.completion.locked,0);assert.deepEqual(accessible.completion.gaps,[])
 assert.equal(requiresTravelDimensions('cane'),false);assert.equal(requiresTravelBattery('cane'),false)
 assert.equal(requiresTravelDimensions('guide-dog'),false);assert.equal(requiresTravelBattery('guide-dog'),false)
})

test('E remains usable before route fields and an actual known destination enables an arrival inquiry',()=>{
 const empty=buildTravelTaskPlan({...base,context:{carrier:'unspecified'}})
 assert.equal(empty.completion.stages.fallback.status,'ready');assert.ok(empty.stages.find(stage=>stage.id==='fallback').actions.length)
 assert.ok(allTravelActions(empty).length<=6);assert.ok(empty.contacts.some(contact=>contact.phone==='12306'))
 assert.ok(!JSON.stringify(empty).includes('预计出发点'));assert.ok(!JSON.stringify(empty).includes('预计到达点'))
 const destination=buildTravelTaskPlan({...base,context:{carrier:'unspecified',to:'杭州东'}})
 assert.equal(destination.completion.stages.arrival.status,'ready');assert.ok(destination.stages.find(stage=>stage.id==='arrival').actions[0].detail.includes('杭州东'))
})

test('coverage is deterministic, independent of time metadata and never treats measurement blanks as zero',()=>{
 const a=buildTravelTaskPlan(full),b=buildTravelTaskPlan({...full,now:now+1000})
 assert.deepEqual(a.completion,b.completion)
 assert.deepEqual(buildTravelTaskPlan({...full,now:undefined}),buildTravelTaskPlan({...full,now:undefined}))
 const invalid=buildTravelTaskPlan({...full,specs:{chair:reviewedSpecs({lengthCm:0,widthCm:NaN,heightCm:-1,batteryType:'lithium'})}})
 assert.ok(invalid.completion.gaps.some(gap=>gap.id==='dimensions'));assert.deepEqual(invalid.devices[0].specs,{batteryType:'lithium'})
})
