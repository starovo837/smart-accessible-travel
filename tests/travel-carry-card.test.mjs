import test from 'node:test'
import assert from 'node:assert/strict'
import {carryCardFileName,travelCarryCardContent,travelCarryCardRows,wrapCarryCardText} from '../src/app/travelCarryCard.ts'
import {buildTravelTaskPlan} from '../src/app/travelPlan.ts'

const plan=()=>({version:1,id:'synthetic',generatedAt:'2026-11-06T08:00:00Z',mode:'rail',summary:'按大型辅具办理，先联系12306申请重点旅客服务。',route:{from:'上海虹桥',to:'杭州东',date:'2026-11-07'},devices:[{id:'chair',name:'电动轮椅',type:'wheelchair',specs:{}}],contacts:[{name:'铁路12306',phone:'12306',url:'https://www.12306.cn/'}],stages:[{id:'before',title:'出发前',actions:[{id:'call',title:'申请协助',detail:'拨打12306核对上下车安排。'}]}]})

test('carry card preserves unknown measurements and shows practical route, summary and phone',()=>{
 const content=travelCarryCardContent(plan())
 assert.equal(content.itinerary,'上海虹桥 → 杭州东');assert.equal(content.date,'2026-11-07');assert.equal(content.mode,'高铁')
 assert.equal(content.devices[0].dimensions,'长 未测量 × 宽 未测量 × 高 未测量');assert.equal(content.devices[0].weight,'未测量');assert.equal(content.devices[0].battery,'电池类型待核实')
 assert.match(content.summary,/大型辅具/);assert.equal(content.contacts[0].phone,'12306');assert.match(content.nextStep,/申请协助/);assert.match(content.notice,/不是运输许可或预约回执/)
})
test('carry card uses supplied device transport values without inventing missing units or battery energy',()=>{
 const value=plan();value.devices[0].specs={lengthCm:115,widthCm:65,heightCm:105,weightKg:28,batteryType:'lithium',removable:'yes'}
 const device=travelCarryCardContent(value).devices[0]
 assert.equal(device.dimensions,'长 115 cm × 宽 65 cm × 高 105 cm');assert.equal(device.weight,'28 kg');assert.match(device.battery,/锂电池/);assert.match(device.battery,/可拆卸/);assert.doesNotMatch(device.battery,/Wh/)
 value.devices[0].specs.batteryWh=144;assert.match(travelCarryCardContent(value).devices[0].battery,/144 Wh/)
})
test('card handles no device or valid phone and never places control characters in image fields',()=>{
 const value=plan();value.devices=[];value.route.from='\u0000\u0001';value.contacts=[{name:'invalid',phone:'javascript:alert(1)',url:''}];value.generatedAt='invalid'
 const content=travelCarryCardContent(value);assert.equal(content.devices.length,0);assert.equal(content.contacts.length,0);assert.equal(content.itinerary,'杭州东');assert.equal(content.generatedAt,'整理日期未记录')
})
test('Chinese and mixed unicode card text wraps without losing characters',()=>{
 const input='电动轮椅👩‍🦽运输尺寸：115 × 65 × 105 cm'
 const rows=wrapCarryCardText(input,8,text=>Array.from(text).length)
 assert.equal(rows.join(''),input);assert.ok(rows.every(row=>Array.from(row).length<=8));assert.deepEqual(wrapCarryCardText('第一行\n第二行',20,text=>text.length),['第一行','第二行']);assert.throws(()=>wrapCarryCardText('text',0,text=>text.length),/宽度/)
 assert.equal(carryCardFileName(plan()),'智能无碍行-随身携带卡-2026-11-07.png');assert.match(carryCardFileName(plan(),2,3),/2共3张\.png$/)
})

test('card wraps dates and dimension units as readable tokens without losing characters',()=>{
 const text='尺寸：120 cm；日期2026-11-07；电池288 Wh'
 const rows=wrapCarryCardText(text,12,value=>Array.from(value).length)
 assert.equal(rows.join(''),text)
 assert.ok(rows.some(row=>row.includes('120 cm')));assert.ok(rows.some(row=>row.includes('2026-11-07')));assert.ok(rows.some(row=>row.includes('288 Wh')))
 assert.ok(rows.every(row=>Array.from(row).length<=12))
 assert.deepEqual(wrapCarryCardText('2026-11-07',4,value=>value.length),['2026','-11-','07'])
})

test('complete travel plans keep long contact labels separate from indivisible phone rows',()=>{
 const task=buildTravelTaskPlan({mode:'rail',devices:[{id:'chair',name:'电动轮椅',type:'wheelchair',dimensions:'',battery:'',weight:'',source:'manual'}],specs:{},context:{carrier:'unspecified',from:'上海虹桥',to:'杭州东',journeyDate:'2026-11-07'},now:Date.parse('2026-11-06T08:00:00Z')})
 const content=travelCarryCardContent(task),rows=travelCarryCardRows(content),phones=rows.filter(row=>row.kind==='phone')
 assert.ok(content.contacts[0].name.length>12)
 assert.ok(phones.some(row=>row.text==='12306'))
 assert.deepEqual(phones.map(row=>row.text),content.contacts.map(contact=>contact.phone))
 for(const phone of phones){const index=rows.indexOf(phone);assert.equal(rows[index-1].kind,'body');assert.ok(!phone.text.includes('\n'));assert.ok(!rows[index-1].text.endsWith(phone.text))}
})

test('incomplete card begins with visible coverage and omitted equipment requirements',()=>{
 const task=buildTravelTaskPlan({mode:'rail',devices:[],specs:{},context:{carrier:'unspecified',from:'上海虹桥',to:'杭州东'},now:Date.parse('2026-11-07T02:00:00Z')})
 const content=travelCarryCardContent(task),rows=travelCarryCardRows(content)
 assert.equal(rows[0].text,'清单资料覆盖');assert.equal(rows[1].text,task.completion.statement)
 assert.match(content.completionStatement,/本清单完成 \d+\/\d+ 项，缺失：设备类型、尺寸、电池类型/)
 assert.match(content.completionStatement,/不含.*设备相关要求/)
})
