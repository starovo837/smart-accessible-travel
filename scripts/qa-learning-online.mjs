import { readFile,writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import {initialJourney} from '../src/app/journey.ts'
import {scopeSnapshot} from '../src/app/storage.ts'
const runtime='https://starovo-smart-accessible-travel.ms.show'
const studio='https://www.modelscope.cn/studios/starovo/smart-accessible-travel?mode=full'
const report={checkedAt:new Date().toISOString(),url:studio,appErrors:[],platformErrors:[]}
const expectedHtml=await readFile('dist-studio/index.html','utf8')
const extract=html=>html.match(/src="(\/assets\/index-[^" ]+\.js)"/)?.[1]
const expected=extract(expectedHtml),response=await fetch(runtime+'/?learning-release-check='+Date.now())
assert.equal(response.status,200)
const asset=extract(await response.text());assert.equal(asset,expected)
const remote=Buffer.from(await(await fetch(runtime+asset)).arrayBuffer()),local=await readFile('dist-studio'+expected)
const hash=data=>createHash('sha256').update(data).digest('hex')
assert.equal(hash(remote),hash(local));report.asset=asset;report.sha256=hash(remote)
const api=await fetch(runtime+'/api/status');assert.equal(api.status,200);report.apiStatus=200
const {chromium}=await import('file:///C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')
const b=await chromium.launch({channel:'chrome',headless:true}),context=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',acceptDownloads:true})
await context.addInitScript(({runtime,snapshot})=>{if(location.origin===runtime&&!localStorage.getItem('learning-online-check')){localStorage.setItem('smart-accessible-travel',JSON.stringify(snapshot));localStorage.setItem('learning-online-check','yes')}},{runtime,snapshot:scopeSnapshot({modules:[],devices:[],consent:'granted',privacy:{profile:false,devices:false,life:true,retainDays:0},settings:{elderMode:false,stepMode:false,readAloud:false},journey:initialJourney(),feedback:[],customModes:[],customDevices:[]})})
const page=await context.newPage();page.on('pageerror',e=>{const stack=String(e.stack??e.message);(stack.includes('starovo-smart-accessible-travel.ms.show')?report.appErrors:report.platformErrors).push(stack.slice(0,600))})
try{
 await page.goto(studio,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('iframe[src*="ms.show"]').first().waitFor({state:'attached',timeout:45000})
 let frame;for(let i=0;i<40;i++){frame=page.frames().find(f=>f.url().startsWith(runtime));if(frame)break;await page.waitForTimeout(500)}assert.ok(frame,'Actual Studio runtime iframe is required');report.realStudioIframe=true
 await frame.getByRole('button',{name:'学习支持中心',exact:true}).click({timeout:45000});await frame.getByRole('heading',{name:'学习支持中心',exact:true}).waitFor();assert.equal(await frame.locator('.learning-resources .learning-card').count(),18);report.resources=18
 await frame.getByRole('searchbox').fill('NVDA');assert.equal(await frame.locator('.learning-resources .learning-card').count(),1);await frame.getByRole('button',{name:'加入学习计划',exact:true}).click()
 await frame.getByLabel('学习目标类别',{exact:true}).selectOption('job');await frame.getByLabel('想学什么',{exact:true}).fill('ONLINE_SYNTHETIC_GOAL');await frame.getByRole('button',{name:'建立学习计划',exact:true}).click();await frame.getByRole('heading',{name:'ONLINE_SYNTHETIC_GOAL',exact:true}).waitFor();await frame.getByLabel('笔记与复习卡（只存本机，不导出）',{exact:true}).fill('ONLINE_SYNTHETIC_NOTE')
 const downloaded=page.waitForEvent('download');await frame.getByRole('button',{name:'导出离线清单',exact:true}).click();const file=await(await downloaded).path();assert.ok(!(await readFile(file,'utf8')).includes('ONLINE_SYNTHETIC'));report.exportPrivacy=true
 await frame.evaluate(()=>location.reload());await frame.getByRole('button',{name:'我的学习计划',exact:true}).click();assert.equal(await frame.getByLabel('笔记与复习卡（只存本机，不导出）',{exact:true}).inputValue(),'ONLINE_SYNTHETIC_NOTE');report.refreshRestored=true
 await frame.getByRole('button',{name:'申请学习便利',exact:true}).click();assert.equal(await frame.locator('article.learning-card').count(),12);report.templates=12
 await frame.getByRole('button',{name:'用现有工具来学',exact:true}).click();assert.equal(await frame.locator('article.learning-card').count(),6);report.tutorials=6
 await frame.getByRole('button',{name:'查看读屏工具',exact:true}).click();assert.ok(await frame.locator('.learning-resources .learning-card').filter({has:frame.getByRole('heading',{name:'NVDA读屏',exact:true})}).count());report.readerToolsLinked=true
 await frame.getByRole('button',{name:'找学习资源',exact:true}).click();await frame.evaluate(()=>document.documentElement.style.fontSize='200%');report.layout=await frame.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(report.layout.scroll<=report.layout.width+1);await frame.evaluate(()=>{document.documentElement.style.fontSize='';scrollTo(0,0)})
 await page.screenshot({path:'tmp/learning-qa/online-studio.png'})
 page.once('dialog',d=>d.accept());await frame.getByRole('button',{name:'清除全部学习记录',exact:true}).click();assert.equal(await frame.evaluate(()=>JSON.parse(localStorage.getItem('smart-accessible-travel')).journey.life.learning),undefined);report.deleted=true
 assert.deepEqual(report.appErrors,[])
 report.passed=true
}finally{await context.close();await b.close();await writeFile('tmp/learning-online-report.json',JSON.stringify(report,null,2))}
const published=JSON.parse(await readFile('.studio-publish-result.json','utf8'))
await writeFile('.studio-publish-result.json',JSON.stringify({...published,frontendVerified:true,frontendAsset:asset,frontendSha256:report.sha256,verifiedAt:report.checkedAt,releaseChecks:{...published.releaseChecks,learning:report}},null,2))
console.log(JSON.stringify(report,null,2))
