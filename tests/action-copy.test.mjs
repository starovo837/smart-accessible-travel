import test from 'node:test'
import assert from 'node:assert/strict'
import {actionSentences,readableTravelPlan} from '../src/app/actionCopy.ts'
import {buildTravelTaskPlan} from '../src/app/travelPlan.ts'
import {allTravelActions} from '../src/app/travelTaskTypes.ts'
test('sentence splitting preserves numbers, dates, official evidence and action counts',()=>{
 const text='上海虹桥，提前60分钟到站；拨12306，2026-11-14出发。'
 assert.deepEqual(actionSentences(text).match(/\d+(?:-\d+)*/g),text.match(/\d+(?:-\d+)*/g))
 const plan=buildTravelTaskPlan({mode:'rail',devices:[],specs:{},context:{carrier:'unspecified',from:'上海虹桥',to:'杭州东'},now:Date.parse('2026-11-14T00:00:00Z')})
 const before=allTravelActions(plan),after=allTravelActions(readableTravelPlan(plan))
 assert.equal(before.length,after.length)
 for(let index=0;index<before.length;index++){
  assert.deepEqual(before[index].evidence,after[index].evidence)
  assert.equal(before[index].verification?.phone,after[index].verification?.phone)
  assert.equal(before[index].id,after[index].id)
 }
})
