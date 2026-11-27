import test from 'node:test'
import assert from 'node:assert/strict'
import {buildTravelTaskPlan} from '../src/app/travelPlan.ts'
import {exportTravelTask} from '../src/app/travelTaskStorage.ts'
import {travelCarryCardContent,travelCarryCardRows} from '../src/app/travelCarryCard.ts'
import {ruleCatalog} from '../src/app/ruleCatalog.ts'
import {assertTravelCompleteness} from '../scripts/assert-travel-copy.mjs'
const input={mode:'rail',devices:[],specs:{},context:{carrier:'unspecified',from:'上海虹桥',to:'杭州东'},documents:ruleCatalog,now:Date.parse('2026-11-07T02:00:00Z')}
const plan=()=>buildTravelTaskPlan(input)
const exported=value=>exportTravelTask({plan:value,checked:{}})

test('coverage gate distinguishes eight locked actions from three missing parameter categories',()=>{
 assert.deepEqual(assertTravelCompleteness(plan(),{exportPayload:exported(plan())}),{generated:12,total:20,locked:8,missingParameters:3})
 for(const change of [{generated:13},{total:19},{locked:3},{estimatedAdditional:3},{gaps:[]}]){
  const value=plan();Object.assign(value.completion,change);assert.throws(()=>assertTravelCompleteness(value))
 }
})
test('incomplete summary claims and fictional stage readiness fail the build gate',()=>{
 const value=plan();value.summary='已生成12项专属行动';assert.throws(()=>assertTravelCompleteness(value),/incompleteClaim/)
 value.summary='完整清单';assert.throws(()=>assertTravelCompleteness(value),/incompleteClaim/)
 const dishonest=plan();dishonest.completion.stages.onboard.status='ready';assert.throws(()=>assertTravelCompleteness(dishonest),/onboard.honestStatus/)
 const noSafety=plan();noSafety.stages[4].actions=[];noSafety.completion.stages.fallback.generated=0;assert.throws(()=>assertTravelCompleteness(noSafety),/fallback.realActionRequired/)
})
test('both JSON first field and the printable card first rows expose actual completion',()=>{
 const value=plan(),data=exported(value),card=travelCarryCardContent(value),rows=travelCarryCardRows(card)
 assert.equal(Object.keys(data)[0],'completionStatement');assert.equal(data.completionStatement,value.completion.statement)
 assert.match(JSON.stringify(data,null,2).split('\n').slice(0,3).join('\n'),/本清单完成 12\/20 项/)
 assert.equal(rows[0].text,'清单资料覆盖');assert.equal(rows[1].text,value.completion.statement)
 assertTravelCompleteness(value,{exportPayload:data,carryContent:card})
 assert.throws(()=>assertTravelCompleteness(value,{exportPayload:{version:1,...data}}),/firstFieldRequired/)
 assert.throws(()=>assertTravelCompleteness(value,{carryContent:{...card,completionStatement:'资料齐全'}}),/completionStatement.required/)
})
