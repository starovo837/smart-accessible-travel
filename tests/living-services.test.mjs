import test from 'node:test'
import assert from 'node:assert/strict'
import {initialLivingServices,emptyFacility,facilitySummary,emptyServiceCase,caseStatus,caseCard,digitalDraft,sanitizeLivingServices} from '../src/app/livingServices.ts'

test('new facility records do not invent access conditions or coordinates',()=>{
 const row=emptyFacility(),summary=facilitySummary(row)
 assert.equal(row.steps,'unknown');assert.equal(row.elevator,'unknown');assert.equal(row.toilet,'unknown');assert.equal(row.latitude,undefined);assert.equal(row.longitude,undefined);assert.equal(row.doorCm,undefined);assert.equal(summary.hasSource,false)
 assert.ok(summary.labels.every(label=>label.includes('待核实')));assert.match(summary.notice,/不等于整段路线可达/)
})
test('a saved source is not treated as a current universal accessibility guarantee',()=>{
 const row={...emptyFacility(),name:'合成设施',address:'合成地址',doorCm:81,elevator:'working',source:'本人实测',checkedAt:'2026-10-26T00:00:00Z'}
 const result=facilitySummary(row);assert.equal(result.hasSource,true);assert.ok(result.labels.includes('入口净宽 81cm'));assert.match(result.notice,/状态可能变化/);assert.equal(result.accessible,undefined)
})
test('opening a service provider is distinct from personally recording an actual response',()=>{
 const row=emptyServiceCase('healthcare');assert.equal(caseStatus(row),'尚未联系服务方');row.openedAt='2026-10-26T00:00:00Z';assert.equal(caseStatus(row),'已打开渠道，待本人核对');row.confirmation={source:'',reference:'合成回执',confirmedAt:'2026-10-26T00:00:00Z'};assert.equal(caseStatus(row),'已打开渠道，待本人核对');row.confirmation.source='合成服务方';assert.equal(caseStatus(row),'本人已记录确认');assert.match(caseCard({...row,title:'合成就医',needs:'文字沟通'}),/文字沟通/);assert.match(caseCard(row),/没有代替服务方确认预约/)
})
test('digital task drafts preserve source sentences without deciding deadlines or submitting actions',()=>{
 const source='请核对收到的通知。原文写明十月三十日提交材料；需要本人签字。'
 const steps=digitalDraft(source);assert.ok(steps.some(step=>step.label==='原文写明十月三十日提交材料'));assert.ok(steps.every(step=>step.checked===false));assert.equal(steps.filter(step=>step.label.includes('付款')).length,1)
})
test('import sanitization rejects invalid coordinates and cannot manufacture a connected home device',()=>{
 const data=sanitizeLivingServices({facilities:[{id:'f',name:'合成',latitude:999,longitude:-999,doorCm:-1,elevator:'yes',feedback:['合成反馈']}],cases:[],homeConnections:[{id:'h',name:'门铃',brandModel:'合成型号',event:'按铃',channel:'invalid',compatibility:'supported',connected:true}],digitalTasks:[]})
 assert.equal(data.facilities[0].latitude,undefined);assert.equal(data.facilities[0].longitude,undefined);assert.equal(data.facilities[0].doorCm,undefined);assert.equal(data.facilities[0].elevator,'unknown');assert.equal(data.homeConnections[0].connected,false);assert.equal(data.homeConnections[0].channel,'text');assert.deepEqual(sanitizeLivingServices(null),initialLivingServices())
})
