// Synthetic browser acceptance. No real appointment, message or location access.
import assert from 'node:assert/strict'
import path from 'node:path'
import {mkdir} from 'node:fs/promises'
const {chromium}=await import(process.env.SAI_PLAYWRIGHT_MODULE??'playwright')
const base=process.env.SAI_QA_BASE_URL??'http://127.0.0.1:5173',output=path.resolve(process.env.SAI_QA_OUTPUT??'docs/design')
await mkdir(output,{recursive:true})
const browser=await chromium.launch({...(process.platform==='win32'?{channel:'chrome'}:{}),headless:true}),context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[]
page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000)
await context.route('**/*',async route=>{
 const url=new URL(route.request().url())
 if(url.origin!==new URL(base).origin)return route.abort()
 if(url.pathname==='/api/facilities/query')return route.fulfill({json:{facilities:[{id:'osm-node-123',name:'合成测试设施（仅验收）',address:'合成测试位置',latitude:31.23,longitude:121.47,kind:'电梯位置',wheelchair:'yes',sourceUrl:'https://www.openstreetmap.org/node/123',source:'OpenStreetMap贡献者',sourceCheckedAt:'2024-01-01',fetchedAt:'2026-10-26T00:00:00Z',notes:'合成API验收记录；地图标记不代表设施现在可用。'}]}})
 return route.continue()
})
try{
 await page.goto(base+'/#home');await page.getByRole('button',{name:'打开我的',exact:true}).click();await page.getByRole('button',{name:'隐私与数据',exact:true}).click();await page.getByRole('checkbox',{name:'保存生活任务、常用话语、居家行程与服务记录',exact:true}).check();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('smart-accessible-travel')??'null')?.privacy.life===true)
 await page.goto(base+'/#services');await page.locator('.living-scene-grid').getByRole('button',{name:/去医院/}).click();await page.getByRole('heading',{name:'去医院',exact:true}).waitFor();await page.getByRole('checkbox',{name:'这一步我已完成',exact:true}).first().check();await page.reload();await page.getByRole('checkbox',{name:'这一步我已完成',exact:true}).first().waitFor();assert.equal(await page.getByRole('checkbox',{name:'这一步我已完成',exact:true}).first().isChecked(),true)
 await page.getByRole('button',{name:'准备就医资料与预约渠道',exact:true}).click();await page.getByRole('heading',{name:'就医协助',exact:true}).waitFor()
 await page.goto(base+'/#aid-places');await page.getByText('在线地图与公开设施（可选）',{exact:true}).click();await page.getByLabel('纬度（WGS84）',{exact:true}).fill('31.23');await page.getByLabel('经度（WGS84）',{exact:true}).fill('121.47');assert.equal(await page.getByRole('button',{name:'加载在线地图与设施',exact:true}).isDisabled(),true);await page.getByRole('checkbox',{name:/同意将本次坐标交给OpenStreetMap/}).check();await page.getByRole('button',{name:'加载在线地图与设施',exact:true}).click();await page.getByRole('heading',{name:'合成测试设施（仅验收）',exact:true}).waitFor();await page.getByRole('button',{name:'保存为待核实设施',exact:true}).click();await page.locator('.living-record').getByText('电梯待核实',{exact:true}).waitFor();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('smart-accessible-travel')).journey.life.services.facilities[0]);assert.equal(saved.elevator,'unknown');assert.equal(saved.doorCm,undefined);assert.equal(saved.checkedAt,'');assert.equal(saved.source,'https://www.openstreetmap.org/node/123')
 await page.getByRole('checkbox',{name:/同意将本次坐标交给OpenStreetMap/}).uncheck();assert.equal(await page.locator('.facility-map-frame').count(),0);await page.getByRole('heading',{name:'设施地图与通行档案',exact:true}).focus();await page.screenshot({path:path.join(output,'设施记录-原生列表验收.png'),fullPage:true,animations:'disabled'})
 for(const hash of ['services','scene-hospital','aid-places','aid-live-help']){
  await page.goto(base+'/#'+hash);await page.setViewportSize({width:320,height:800});await page.addStyleTag({content:'html{font-size:200%}'});assert.ok(await page.evaluate(()=>document.body.scrollWidth<=innerWidth),hash+' horizontal overflow')
  if(hash==='scene-hospital')await page.getByRole('button',{name:'重新整理这件事的步骤',exact:true}).focus()
 }
 await page.goto(base+'/#home');await page.getByRole('button',{name:'打开我的',exact:true}).click();await page.getByRole('button',{name:'隐私与数据',exact:true}).click();await page.getByRole('button',{name:'一键删除全部数据',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'确认删除',exact:true}).click();await page.getByRole('button',{name:'选择我的情况',exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('smart-accessible-travel')),null)
 assert.deepEqual(errors,[]);console.log(JSON.stringify({sceneNavigation:true,sceneConsentRestore:true,realApiBoundaryWithSyntheticMapPayload:true,noOperationalStatusInference:true,mapConsentRevocation:true,allDataDeletion:true,smallScreen200Percent:true,errors}))
}finally{await browser.close()}
