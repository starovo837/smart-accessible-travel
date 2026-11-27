import {reviewedSpecs} from './helpers/confirmed-specs.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {buildTravelTaskPlan} from '../src/app/travelPlan.ts'
import {allTravelActions} from '../src/app/travelTaskTypes.ts'
import {travelPlanDifference} from '../scripts/assert-travel-copy.mjs'
import {combinationAdvice} from '../src/app/disabilityCopy.ts'
import {forbiddenInterfaceCopy} from '../src/app/copyPolicy.ts'
import {exportTravelTask} from '../src/app/travelTaskStorage.ts'
import {travelCarryCardContent} from '../src/app/travelCarryCard.ts'

const selection=(category,grade,accompaniment)=>({category,grade,accompaniment,deviceIds:[]})
const input=selections=>({mode:'rail',devices:selections.some(item=>item.category==='physical')?[{id:'chair',name:'手动轮椅',type:'manual-wheelchair',battery:'无',dimensions:'',weight:'',source:'manual'}]:[],specs:selections.some(item=>item.category==='physical')?{chair:reviewedSpecs({lengthCm:120,widthCm:68,heightCm:95,batteryType:'none'})}:{},context:{carrier:'unspecified',from:'上海虹桥',to:'杭州东'},now:Date.parse('2026-11-14T00:00:00Z'),disabilityProfile:{selections}})
const cases=[ [selection('physical',1,false)],[selection('physical',1,true)],[selection('vision',1)],[selection('hearing',1)],[selection('speech',2)],[selection('mental',3)],[selection('vision',1),selection('hearing',1)],[selection('physical',1),selection('vision',1),selection('speech',2)] ]

test('eight profiles produce deterministic checklists, real differences and honest coverage',()=>{
 const plans=cases.map(rows=>buildTravelTaskPlan(input(rows)))
 for(let index=0;index<plans.length;index++){
  const plan=plans[index];assert.deepEqual(plan,buildTravelTaskPlan(input(cases[index])))
  assert.equal(allTravelActions(plan).length,plan.completion.generated)
  assert.doesNotMatch(JSON.stringify(exportTravelTask({plan,checked:{}})),forbiddenInterfaceCopy)
  assert.doesNotMatch(JSON.stringify(travelCarryCardContent(plan)),forbiddenInterfaceCopy)
  for(const action of allTravelActions(plan))for(const text of [action.detail,action.verification?.question??''])for(const sentence of text.split(/[。！？；]/))assert.ok(sentence.length<=30,sentence)
  assert.doesNotMatch(allTravelActions(plan).map(item=>item.title+item.detail+item.verification?.question).join(''),/（?(未选择|待填写|暂未)/)
 }
 assert.ok(travelPlanDifference(plans[0],plans[1])>=.4)
 assert.ok(allTravelActions(plans[1]).every(action=>!action.detail.includes('本人独自出行')&&!action.verification?.question.includes('我独自出行')))
 for(let a=0;a<plans.length;a++)for(let b=a+1;b<plans.length;b++)assert.ok(travelPlanDifference(plans[a],plans[b])>=.3,`${a+1}/${b+1}`)
 for(const index of [2,3,4,5])assert.ok(allTravelActions(plans[index]).filter(action=>action.applicableCategories?.length).length>=4)
 assert.ok(allTravelActions(plans[6]).filter(action=>action.combined).length>=2)
 assert.ok(allTravelActions(plans[6]).some(action=>action.detail.includes('触觉')))
 assert.ok(allTravelActions(plans[6]).length<=allTravelActions(plans[2]).length*1.6)
 assert.ok(allTravelActions(plans[7]).every(action=>!action.detail.includes('询问能否扶肘引导')))
})

test('six frequent combinations visibly explain two replacements and retain official verification',()=>{
 for(const rule of combinationAdvice){
  const plan=buildTravelTaskPlan(input(rule.categories.map(category=>selection(category))))
  const combined=allTravelActions(plan).filter(action=>action.combined)
  assert.ok(combined.length>=2)
  for(const action of combined){assert.equal(action.evidence.level,'inference');assert.ok(action.verification.phone);assert.match(action.evidence.officialUrl,/^https:/);assert.ok(action.combined.replacedTitles.length>=2)}
 }
})
