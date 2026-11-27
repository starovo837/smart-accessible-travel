import test from 'node:test'
import assert from 'node:assert/strict'
import {assertTravelCopy,assertTravelPlanShape,travelTitleSimilarity,travelPlanDifference,TravelCopyGuardError} from '../scripts/assert-travel-copy.mjs'

const action = (title = '联系车站落实轮椅接应') => ({id:'one',title,detail:'在上海虹桥乘高铁前联系车站，说明轮椅尺寸和协助需要。',evidence:{level:'inference',officialLabel:'铁路官方服务',officialUrl:'https://www.12306.cn/index/'},verification:{contact:'铁路客服',phone:'12306',question:'我携带轮椅，怎样联系车站接应？'},anchors:[{kind:'from',value:'上海虹桥'}]})
function plan() {
  return {version:1,id:'synthetic',generatedAt:'2026-11-07T02:00:00Z',mode:'rail',readiness:'complete',companionCount:0,route:{from:'上海虹桥',to:'杭州东',date:'2026-11-08'},summary:'联系12306安排车站协助，按下方行动准备。',devices:[],contacts:[{name:'铁路客服',phone:'12306',url:'https://www.12306.cn/index/'}],generalActions:[],stages:['before','station','onboard','arrival','fallback'].map((id,index)=>({id,title:['出发前','站内','乘车中','到达','兜底'][index],actions:index?[]:[action()],emptyReason:index?'本段无需额外安排。':undefined}))}
}

test('copy guard accepts real copy and ignores unrelated UI placeholder-card metadata',()=>{
 const value=plan();value.stationCards=[{label:'未选择出发站'}]
 assert.ok(assertTravelCopy(value).checkedFields>0)
})

test('all forbidden placeholders in visible, clipboard, card and export text produce paths without leaking copy',()=>{
 for(const forbidden of ['未选择','待填写','暂未','（未选择）']){
  const value=plan();value.stages[0].actions[0].verification.question='PRIVATE-'+forbidden
  assert.throws(()=>assertTravelCopy(value),error=>error instanceof TravelCopyGuardError&&error.paths.includes('plan.stages[0].actions[0].verification.question')&&!error.message.includes('PRIVATE'))
 }
 const value=plan();value.generalActions=[{...action('整理设备清单'),detail:'暂未选择设备'}]
 assert.throws(()=>assertTravelCopy(value),/plan.generalActions\[0\].detail/)
 assert.throws(()=>assertTravelCopy(plan(),{carryContent:{summary:'待填写资料'}}),/carryCardContent.summary/)
 assert.throws(()=>assertTravelCopy(plan(),{exportPayload:{next:'未选择'}}),/export.next/)
 const empty=plan();empty.stages[1].emptyReason='暂未生成';assert.throws(()=>assertTravelCopy(empty),/emptyReason/)
})

test('shape gate requires fixed five stages, empty-stage reasons, real anchors and at most six preparation actions',()=>{
 assert.equal(assertTravelPlanShape(plan()).stages,5)
 const empty=plan();delete empty.stages[1].emptyReason;assert.throws(()=>assertTravelPlanShape(empty),/emptyReason.required/)
 const unanchored=plan();unanchored.stages[0].actions[0].anchors=[];assert.throws(()=>assertTravelPlanShape(unanchored),/anchors.actualVisibleInputRequired/)
 const fake=plan();fake.stages[0].actions[0].anchors=[{kind:'device',value:'虚构设备'}];assert.throws(()=>assertTravelPlanShape(fake),/anchors.actualVisibleInputRequired/)
 const prep=plan();prep.generalActions=Array.from({length:6},(_,index)=>action('准备事项'+index));assert.throws(()=>assertTravelPlanShape(prep,{preparation:true}),/maximumSix/)
})

test('hidden metadata anchors and mode or city-only copy cannot pass as trip-specific actions',()=>{
 const hidden=plan();hidden.stages[0].actions[0].detail='联系工作人员了解协助安排。';assert.throws(()=>assertTravelPlanShape(hidden),/actualVisibleInputRequired/)
 const modeOnly=plan();modeOnly.stages[0].actions[0].anchors=[{kind:'mode',value:'高铁'}];assert.throws(()=>assertTravelPlanShape(modeOnly),/actualVisibleInputRequired/)
 const cityOnly=plan();cityOnly.stages[0].actions[0].anchors=[{kind:'city',value:'上海'}];assert.throws(()=>assertTravelPlanShape(cityOnly),/actualVisibleInputRequired/)
 const device=plan();device.devices=[{id:'chair',name:'电动轮椅',type:'wheelchair',specs:{widthCm:68}}];device.stages[0].actions[0].anchors=[{kind:'device',value:'电动轮椅'}];assert.throws(()=>assertTravelPlanShape(device),/actualVisibleInputRequired/)
 device.stages[0].actions[0].verification.question='电动轮椅宽68cm，进站需要哪些协助？';assert.equal(assertTravelPlanShape(device).stages,5)
 device.stages[0].actions[0].anchors=[{kind:'spec',value:'68cm'}];assert.equal(assertTravelPlanShape(device).stages,5)
 device.stages[0].actions[0].verification.question='电动轮椅宽69cm，进站需要哪些协助？';assert.throws(()=>assertTravelPlanShape(device),/actualVisibleInputRequired/)
})

test('title similarity is normalized and duplicate actions are rejected above 0.8',()=>{
 assert.equal(travelTitleSimilarity('联系 车站！','联系车站'),1)
 assert.ok(travelTitleSimilarity('核对轮椅的长宽高尺寸与电池容量','核对轮椅的长宽高尺寸和电池容量')>.8)
 const duplicate=plan();duplicate.stages[0].actions.push({...action(),id:'different-id'});assert.throws(()=>assertTravelPlanShape(duplicate),/similarityAbove0.8/)
})

test('scenario difference uses only visible title detail and question, not IDs or metadata timestamps',()=>{
 const a=plan(),b=plan();b.id='another';b.generatedAt='2099-01-01';b.stages[0].actions[0].id='changed';b.stages[0].actions[0].evidence.updatedAt='2099-01-01'
 assert.equal(travelPlanDifference(a,b),0)
 b.stages[0].actions[0].detail='向机场申请手动轮椅交运与到达归还。'
 assert.equal(travelPlanDifference(a,b),1)
})

test('generic E contact is allowed before a route only with the actual official contact rule',()=>{
 const value=plan();value.route={from:'',to:'',date:''};value.stages[0].actions=[];value.stages[0].emptyReason='先补起终点。'
 const fallback={...action('先咨询12306协助渠道'),id:'rail-prepare-contact',detail:'拨12306询问重点旅客服务。',anchors:[],evidence:{level:'official-excerpt',officialUrl:'https://www.12306.cn/index/'},verification:{contact:'中国铁路12306',phone:'12306',question:'无障碍服务需要向谁申请？'}}
 value.stages[4].actions=[fallback];assert.equal(assertTravelPlanShape(value).actions,1)
 for(const patch of [{id:'rail-arbitrary'},{evidence:{...fallback.evidence,level:'inference'}},{evidence:{...fallback.evidence,officialUrl:'https://evil.test/'}},{verification:{...fallback.verification,phone:''}}]){
  const invalid=structuredClone(value);invalid.stages[4].actions[0]={...fallback,...patch};assert.throws(()=>assertTravelPlanShape(invalid),/actualVisibleInputRequired/)
 }
})
