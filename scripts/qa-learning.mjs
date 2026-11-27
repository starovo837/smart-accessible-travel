import { mkdir,writeFile,readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { initialJourney } from '../src/app/journey.ts'
import { scopeSnapshot } from '../src/app/storage.ts'
import { copyDictionary as c } from '../src/app/copyDictionary.ts'
const modulePath=process.env.SAI_PLAYWRIGHT_MODULE??'file:///C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const {chromium,webkit}=await import(modulePath)
const base=process.env.SAI_QA_BASE_URL??'http://127.0.0.1:5173/'
const out=process.env.SAI_QA_OUTPUT??'tmp/learning-qa'
await mkdir(out,{recursive:true})
const snapshot=scopeSnapshot({modules:[],devices:[],consent:'granted',privacy:{profile:false,devices:false,life:true,retainDays:0},settings:{elderMode:false,stepMode:false,readAloud:true},journey:initialJourney(),feedback:[],customModes:[],customDevices:[]})
const browser=await chromium.launch({channel:'chrome',headless:true})
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true})
await context.addInitScript(s=>{
 if(!localStorage.getItem('learning-qa-seeded')){localStorage.setItem('smart-accessible-travel',JSON.stringify(s));localStorage.setItem('learning-qa-seeded','yes')}
 window.learningReadCalls=0
 if(window.speechSynthesis)Object.defineProperty(window.speechSynthesis,'speak',{value:()=>{window.learningReadCalls++}})
},snapshot)
const page=await context.newPage(),errors=[],report={}
page.on('pageerror',e=>errors.push(e.message))
try{
 await page.goto(base+'#learning');await page.getByRole('heading',{name:'学习支持中心',exact:true}).waitFor()
 assert.equal(await page.locator('.learning-resources .learning-card').count(),18)
 assert.equal(await page.evaluate(()=>window.learningReadCalls),0)
 const first=page.locator('.learning-resources .learning-card').first();await first.getByRole('button',{name:'朗读介绍',exact:true}).click();assert.equal(await page.evaluate(()=>window.learningReadCalls),1)
 await page.getByRole('searchbox').fill('NVDA');assert.equal(await page.locator('.learning-resources .learning-card').count(),1)
 await page.getByRole('button',{name:'NVDA读屏，收藏',exact:true}).click();await page.getByText('筛选与排序',{exact:true}).click();await page.getByLabel('只看收藏',{exact:true}).check()
 await page.getByRole('searchbox').fill('不存在的课程XYZ');await page.getByRole('heading',{name:'自己找资源',exact:true}).waitFor();report.emptyFallback=true
 await page.getByRole('searchbox').fill('');await page.getByLabel('只看收藏',{exact:true}).uncheck();await page.getByRole('combobox',{name:'已在来源中说明的支持',exact:true}).selectOption('captions');assert.equal(await page.locator('.learning-resources .learning-card').count(),0)
 await page.getByRole('combobox',{name:'已在来源中说明的支持',exact:true}).selectOption('');await page.getByRole('searchbox').fill('NVDA');await page.getByRole('button',{name:'加入学习计划',exact:true}).click()
 await page.getByLabel('学习目标类别',{exact:true}).selectOption('job');await page.getByLabel('想学什么',{exact:true}).fill('PRIVATE_SYNTHETIC_GOAL');await page.getByLabel('为什么学（选填）',{exact:true}).fill('PRIVATE_SYNTHETIC_WHY');await page.getByRole('button',{name:'建立学习计划',exact:true}).click()
 let plan=page.locator('article.learning-card').filter({has:page.getByRole('heading',{name:'PRIVATE_SYNTHETIC_GOAL',exact:true})})
 await plan.getByRole('checkbox').nth(1).check();await plan.getByLabel('笔记与复习卡（只存本机，不导出）',{exact:true}).fill('PRIVATE_SYNTHETIC_NOTE')
 await plan.getByLabel('提醒时间',{exact:true}).fill('2026-11-16T00:01');await plan.getByRole('button',{name:'保存提醒',exact:true}).click()
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('smart-accessible-travel')));assert.equal(stored.journey.life.learning.plans.length,1);assert.equal(stored.journey.life.assistance.reminders.length,1)
 for(const label of ['导出离线清单','导出随身卡','导出到手机日历']){const pending=page.waitForEvent('download');await plan.getByRole('button',{name:label,exact:true}).click();const download=await pending,path=await download.path();const text=await readFile(path,'utf8');assert.ok(!text.includes('PRIVATE_SYNTHETIC'));report[label]=download.suggestedFilename()}
 await page.reload();await page.getByRole('button',{name:'我的学习计划',exact:true}).click();plan=page.locator('article.learning-card').filter({has:page.getByRole('heading',{name:'PRIVATE_SYNTHETIC_GOAL',exact:true})});assert.equal(await plan.getByLabel('笔记与复习卡（只存本机，不导出）',{exact:true}).inputValue(),'PRIVATE_SYNTHETIC_NOTE');report.refreshRestored=true
 await page.getByRole('button',{name:'申请学习便利',exact:true}).click();assert.equal(await page.locator('article.learning-card').count(),12);await page.getByLabel('加入申请清单',{exact:true}).first().check();const templateDownload=page.waitForEvent('download');await page.getByRole('button',{name:/导出申请清单与沟通卡/}).click();await templateDownload
 await page.getByRole('button',{name:'用现有工具来学',exact:true}).click();assert.equal(await page.locator('article.learning-card').count(),6)
 await page.getByRole('button',{name:'查看读屏工具',exact:true}).click();assert.ok(await page.locator('.learning-resources .learning-card').filter({has:page.getByRole('heading',{name:'NVDA读屏',exact:true})}).count());report.readerToolsLinked=true
 await page.getByRole('button',{name:'找学习资源',exact:true}).click()
 report.layouts=[]
 for(const width of [320,390]){await page.setViewportSize({width,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');const size=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.viewport+1,JSON.stringify(size));report.layouts.push({width,...size});await page.evaluate(()=>document.documentElement.style.fontSize='');}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/learning-resources.png',fullPage:true});await page.screenshot({path:out+'/learning-top.png'});await page.locator('.learning-resources .learning-card').first().screenshot({path:out+'/learning-card.png'})
 await page.getByRole('searchbox').focus();report.keyboard=[];for(let i=0;i<12;i++){await page.keyboard.press('Tab');report.keyboard.push(await page.evaluate(()=>({tag:document.activeElement?.tagName,name:document.activeElement?.getAttribute('aria-label')??document.activeElement?.closest('label')?.textContent?.slice(0,50)})))}assert.ok(report.keyboard.every(item=>item.tag!=='BODY'))
 await page.goto(base+'#home');await page.getByRole('button',{name:'学习支持中心',exact:true}).click();await page.getByRole('heading',{name:'学习支持中心',exact:true}).waitFor();report.homeClicks=1
 await page.goto(base+'#scene-work');await page.getByRole('button',{name:'查看全部学习资源',exact:true}).click();await page.getByRole('heading',{name:'学习支持中心',exact:true}).waitFor();report.scenePreview=true
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'清除全部学习记录',exact:true}).click();const cleared=await page.evaluate(()=>JSON.parse(localStorage.getItem('smart-accessible-travel')));assert.equal(cleared.journey.life.learning,undefined);assert.equal(cleared.journey.life.assistance.reminders.length,0);report.clearAll=true
 await page.getByRole('searchbox').fill('NVDA');await page.getByRole('button',{name:'NVDA读屏，收藏',exact:true}).click();await page.goto(base+'#profile');await page.getByRole('button',{name:c.cd51db0e607273cd9,exact:true}).click();await page.getByRole('dialog').getByRole('checkbox',{name:c.cc77f461e03a0f571,exact:true}).uncheck();await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('smart-accessible-travel'));return s?.privacy?.life===false&&s?.journey?.life?.learning===undefined});report.privacyRevoked=true
 report.errors=errors;assert.deepEqual(errors,[])
}catch(error){report.failure={message:error.message,hash:await page.evaluate(()=>location.hash),headings:await page.getByRole('heading').allTextContents(),stored:await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('smart-accessible-travel'));return {consent:s?.consent,privacy:s?.privacy,plans:s?.journey?.life?.learning?.plans?.map(p=>({id:p.id,goal:p.goal}))}})};await page.screenshot({path:out+'/failure.png',fullPage:true});console.log(JSON.stringify(report.failure));throw error}finally{await context.close();await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2))}
const webkitBrowser=await webkit.launch({headless:true});const wk=await webkitBrowser.newPage({viewport:{width:320,height:720}})
try{await wk.goto(base+'#learning');await wk.getByRole('heading',{name:'学习支持中心',exact:true}).waitFor();await wk.evaluate(()=>document.documentElement.style.fontSize='200%');report.webkit=await wk.evaluate(()=>{scrollTo(0,document.documentElement.scrollHeight);return {scroll:document.documentElement.scrollWidth,viewport:innerWidth,bottom:scrollY+innerHeight>=document.documentElement.scrollHeight-2}});assert.ok(report.webkit.scroll<=report.webkit.viewport+1);assert.ok(report.webkit.bottom)}finally{await webkitBrowser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2))}
console.log(JSON.stringify(report,null,2))
