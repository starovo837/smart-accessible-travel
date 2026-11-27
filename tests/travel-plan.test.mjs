import {reviewedSpecs} from './helpers/confirmed-specs.mjs'
import {reviewedRule} from './helpers/reviewed-rule.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {buildTravelTaskPlan,taskDeviceSpecs} from '../src/app/travelPlan.ts'
import {travelPlanSources,safeOfficialTravelUrl} from '../src/app/travelPlanSources.ts'
import {ruleCatalog} from '../src/app/ruleCatalog.ts'
import {allTravelActions} from '../src/app/travelTaskTypes.ts'
import {assertTravelPlanShape,assertTravelCopy} from '../scripts/assert-travel-copy.mjs'

const now=Date.parse('2026-11-07T02:00:00Z')
const wheelchair={id:'mine-chair',type:'wheelchair',name:'我的电动轮椅',dimensions:'',weight:'',battery:'',source:'manual'}
const input={mode:'rail',devices:[wheelchair],specs:{},context:{carrier:'unspecified',from:'上海虹桥',to:'杭州东',journeyDate:'2026-11-07'},now}
const rows=allTravelActions

test('unknown dimensions retain five stages, station anchors and practical rail defaults',()=>{
 const plan=buildTravelTaskPlan(input),actions=rows(plan),body=JSON.stringify(plan)
 assert.equal(plan.readiness,'station-only');assert.ok(plan.completion.locked>0)
 assert.deepEqual(plan.stages.map(stage=>stage.id),['before','station','onboard','arrival','fallback'])
 assert.ok(actions.length>=8)
 assert.ok(actions.filter(action=>action.evidence.officialUrl||action.verification?.phone).length>=3)
 assert.match(body,/大型辅具/);assert.match(body,/60分钟/);assert.match(body,/12306/)
 assert.match(body,/杭州东/);assert.ok(plan.contacts.some(contact=>contact.phone==='0571-96600'))
 assert.ok(!/信息不足|没有适用且未过期的核验来源/.test(body))
 assert.ok(!/保证.*携带|已获.*许可/.test(plan.summary))
})

test('every supported mode has valid evidence and a precise verification action',()=>{
 for(const mode of ['rail','train','plane','bus','metro','taxi','ride-hailing','accessible-car','coach','ferry','private-car','custom:校园接驳']){
  const plan=buildTravelTaskPlan({...input,mode})
  assertTravelCopy(plan);assertTravelPlanShape(plan)
  for(const action of rows(plan)){
   assert.ok(['official-rule','official-excerpt','user','inference'].includes(action.evidence.level))
   assert.ok(action.evidence.updatedAt&&action.evidence.officialLabel)
   assert.ok(safeOfficialTravelUrl(action.evidence.officialUrl),action.evidence.officialUrl)
   assert.ok(action.verification?.contact&&action.verification?.phone&&action.verification?.question,action.id)
  }
 }
})

test('expired source retains original text and effective date without destroying other actions',()=>{
 const rule={id:'history',title:'合成历史条款',operator:'中国铁路12306',modes:['rail'],url:'https://www.12306.cn/index/',version:'old',publishedAt:'2020-01-01',effectiveAt:'2020-02-01',checkedAt:'2020-03-01',expiresAt:'2020-04-01',status:'verified',excerpts:[{label:'旧尺寸',text:'仅作测试的旧阈值1厘米'}]}
 const plan=buildTravelTaskPlan({...input,documents:[rule]}),history=rows(plan).find(action=>action.id==='rail-source-history')
 assert.equal(history.evidence.status,'historical');assert.equal(history.evidence.effectiveDate,'2020-02-01')
 assert.equal(history.evidence.originalText,'旧尺寸：仅作测试的旧阈值1厘米')
 assert.match(history.title,/旧版本，规定可能已变/);assert.match(history.detail,/不以其中旧阈值/)
 assert.ok(rows(plan).length>=8);assert.ok(!plan.summary.includes('1厘米'))
})

test('operator, journey date and supplied clock determine source status, not permission',()=>{
 const rule=reviewedRule({id:'current',title:'合成当前条款',operator:'airchina',modes:['plane'],url:'https://www.airchina.com.cn/',version:'now',publishedAt:null,effectiveAt:'2026-11-01',checkedAt:'2026-11-05',expiresAt:'2026-11-08',status:'verified',excerpts:[{label:'内容',text:'合成原文'}]},Date.parse('2026-11-05'))
 assert.ok(!rows(buildTravelTaskPlan({...input,mode:'plane',documents:[rule]})).some(action=>action.id==='plane-source-current'))
 const context={...input.context,carrier:'airchina'}
 assert.equal(rows(buildTravelTaskPlan({...input,mode:'plane',context,documents:[rule]})).find(action=>action.id==='plane-source-current').evidence.status,'current')
 assert.equal(rows(buildTravelTaskPlan({...input,mode:'plane',context:{...context,journeyDate:'2026-11-13'},documents:[rule]})).find(action=>action.id==='plane-source-current').evidence.status,'historical')
})

test('incomplete endpoints retain at most six preparations and a usable unconditional fallback',()=>{
 for(const mode of ['rail','plane','bus','metro','taxi','custom:自定义']){
  const plan=buildTravelTaskPlan({mode,devices:[],specs:{},context:{carrier:'unspecified'},now})
  assert.equal(plan.readiness,'preparation');assert.ok(rows(plan).length<=6)
  assert.ok(plan.stages.filter(stage=>stage.id!=='fallback').every(stage=>stage.actions.length===0&&stage.emptyReason))
  assert.ok(plan.stages.find(stage=>stage.id==='fallback').actions.length);assert.equal(plan.completion.stages.fallback.status,'ready')
  assert.match(plan.summary,/填写出发到达后/)
  assert.ok(!/1号口|A口|二层西侧|未选择|待填写|暂未/.test(JSON.stringify(plan)))
 }
})

test('only known numeric parameters are carried into device records',()=>{
 const initial=buildTravelTaskPlan(input),next=buildTravelTaskPlan({...input,specs:{'mine-chair':reviewedSpecs({widthCm:68,batteryType:'lithium',batteryWh:288})}})
 assert.notEqual(initial.id,next.id)
 assert.equal(next.devices[0].specs.widthCm,68);assert.equal(next.devices[0].specs.lengthCm,undefined)
 assert.equal(next.devices[0].specs.batteryWh,288)
 assert.match(rows(next).find(action=>action.id==='rail-request').detail,/长度需测量\/宽68\/高度需测量/)
 assert.ok(!rows(next).some(action=>action.id==='rail-device-record'));assert.ok(next.completion.locked>0)
 assert.deepEqual(taskDeviceSpecs(wheelchair,{widthCm:NaN,heightCm:-2,weightKg:Infinity}),{})
})

test('rail, road and aviation retain correctly scoped telephone routes',()=>{
 const rail=buildTravelTaskPlan(input),road=buildTravelTaskPlan({...input,mode:'taxi'}),air=buildTravelTaskPlan({...input,mode:'plane'}),ca=buildTravelTaskPlan({...input,mode:'plane',context:{...input.context,carrier:'airchina'}})
 assert.equal(rail.contacts[0].phone,'12306');assert.equal(road.contacts[0].phone,'12328');assert.equal(ca.contacts[0].phone,'95583')
 assert.match(JSON.stringify(air),/12326不代办预约/)
 assert.match(rows(road).find(action=>action.id==='taxi-contact').detail,/城市客运/)
 assert.match(rows(rail).find(action=>action.id==='rail-contact').detail,/12328不代替铁路客服/)
})

test('source dates remain separate from generation metadata and multiple rules have distinct titles',()=>{
 const plan=buildTravelTaskPlan({...input,mode:'plane',context:{...input.context,carrier:'airchina'},documents:ruleCatalog})
 assertTravelCopy(plan);assertTravelPlanShape(plan)
 const official=rows(buildTravelTaskPlan(input)).find(action=>action.id==='rail-request')
 assert.match(official.evidence.updatedAt,/原页面未标注更新日/)
 assert.ok(!official.evidence.updatedAt.includes(plan.generatedAt))
 assert.equal(travelPlanSources.shanghaiMetro.pageUpdatedAt,'2024-03-17')
 for(const url of ['javascript:alert(1)','https://12306.cn.evil.test/','https://evil.test/','https://x@www.12306.cn/','http://www.12306.cn/'])assert.equal(safeOfficialTravelUrl(url),'')
})

test('clocked and clockless generation are deterministic and snapshots retain callable phone numbers',()=>{
 for(const options of [input,{...input,now:undefined}])assert.deepEqual(buildTravelTaskPlan(options),buildTravelTaskPlan(options))
 const plan=buildTravelTaskPlan(input),offline=JSON.parse(JSON.stringify(plan))
 assert.equal(offline.contacts[0].phone,'12306');assert.equal(new Set(rows(offline).map(action=>action.id)).size,rows(offline).length)
 assert.equal(buildTravelTaskPlan({...input,now:undefined}).generatedAt,'整理日期未记录')
})
