import test from 'node:test'
import assert from 'node:assert/strict'
import { learningResources,learningCategories,learningResourceStatus,findLearningResources,nextLearningReview } from '../src/app/learningCatalog.ts'
import { safeServiceUrl } from '../src/app/serviceProviders.ts'
import { createLearningPlan,sanitizeLearning,attachLearningPlan,removeLearning,learningPlanText,learningCalendar } from '../src/app/learningPlan.ts'
import { initialJourney } from '../src/app/journey.ts'
import { scopeSnapshot,readSnapshot } from '../src/app/storage.ts'
import { accommodationTemplates,accommodationExport,learningTutorials } from '../src/app/learningGuides.ts'
import { exportableLife } from '../src/app/portable.ts'
import { dueReminders } from '../src/app/supportCatalog.ts'

test('catalog has 18 unique verified resources, at least 3 per category, with complete evidence and safe links',()=>{
 assert.equal(learningResources.length,18);assert.equal(new Set(learningResources.map(r=>r.id)).size,18)
 for(const category of Object.keys(learningCategories))assert.ok(learningResources.filter(r=>r.category===category).length>=3)
 for(const r of learningResources){
  for(const field of ['id','name','org','category','formats','accessibility','targetUsers','region','language','fee','account','scope','url','sourceUrl','verifiedAt','reviewDueAt','status','fallback','notes'])assert.notEqual(r[field],undefined,`${r.id}.${field}`)
  for(const url of [r.url,r.sourceUrl,r.fallback.url,...(r.accessibility.statementUrl?[r.accessibility.statementUrl]:[])])assert.equal(safeServiceUrl(url),url)
  assert.equal(learningResourceStatus(r,'2026-11-16'),'verified');assert.equal(r.reviewDueAt,nextLearningReview(r.verifiedAt));assert.ok(r.scope&&r.notes&&r.account&&r.fee.text)
 }
 for(const id of ['cdpee','smartedu','cdlvi'])assert.ok(learningResources.some(r=>r.id===id))
})
test('link guard rejects HTTP, embedded credentials, custom ports and similar host attacks',()=>{
 for(const url of ['http://www.nvaccess.org/','https://evil@www.nvaccess.org/','https://www.nvaccess.org:8443/','https://www.nvaccess.org.evil.test/','javascript:alert(1)'])assert.equal(safeServiceUrl(url),'')
})
test('review status expires after 90 days, invalid evidence never counts as verified',()=>{
 const r=learningResources[0];assert.equal(learningResourceStatus(r,r.reviewDueAt),'verified');assert.equal(learningResourceStatus(r,'2027-02-15'),'review-due')
 assert.equal(learningResourceStatus({...r,sourceUrl:'https://evil.test/'},'2026-11-16'),'unverified')
 assert.equal(learningResourceStatus({...r,status:'unverified'},'2026-11-16'),'unverified')
})
test('search and filters combine without inventing capability support; recommendations and recent sorting are deterministic',()=>{
 assert.deepEqual(findLearningResources({query:'不存在的课程XYZ'}),[])
 assert.equal(findLearningResources({query:'NVDA'})[0].id,'nvda')
 assert.ok(findLearningResources({access:'captions'}).length===0)
 assert.equal(findLearningResources({fee:'free'})[0].id,'nvda')
 assert.deepEqual(findLearningResources({favoriteOnly:true,favorites:['cdlvi']}).map(r=>r.id),['cdlvi'])
 assert.equal(findLearningResources({sort:'recent',recent:{cdlvi:'2026-11-16T10:00:00Z'}})[0].id,'cdlvi')
 assert.ok(findLearningResources({region:'宁夏'}).every(r=>r.region.includes('全国')||r.region.includes('宁夏')))
 const f={modules:['vision'],goalCategory:'access'};assert.deepEqual(findLearningResources(f),findLearningResources(f));assert.equal(findLearningResources(f)[0].category,'tools')
})
const plan=()=>createLearningPlan({goalCategory:'interest',goal:'PRIVATE_GOAL',why:'PRIVATE_WHY',weeklyMinutes:60,resourceIds:['cdlvi']},'learning-synthetic','2026-11-16T08:00:00Z')
const snapshot=(life,lifeConsent=true)=>({modules:[],devices:[],consent:'granted',privacy:{profile:false,devices:false,life:lifeConsent,retainDays:0},settings:{elderMode:false,stepMode:false,readAloud:false},journey:{...initialJourney(),life},feedback:[],customModes:[],customDevices:[]})
test('plans reuse tasks, restore from authorized snapshot, and life permission revocation removes all learning data',()=>{
 const p=plan();p.notes='PRIVATE_NOTE';const life=attachLearningPlan(initialJourney().life,p)
 life.learning.favorites=['cdlvi'];life.assistance.reminders=[{id:p.id+'-reminder-one',title:'学习时间',dueAt:'2026-11-16T09:00:00Z',done:false,note:''}]
 assert.equal(life.assistance.tasks[0].id,p.id)
 const stored=scopeSnapshot(snapshot(life),1000),restored=readSnapshot(JSON.stringify(stored),2000)
 assert.equal(restored.journey.life.learning.plans[0].notes,'PRIVATE_NOTE')
 const denied=scopeSnapshot(snapshot(life,false),1000);assert.equal(denied.journey.life.learning,undefined);assert.equal(denied.journey.life.assistance,undefined)
 const cleared=removeLearning(life);assert.equal(cleared.learning,undefined);assert.equal(cleared.assistance.tasks.length,0);assert.equal(cleared.assistance.reminders.length,0)
})
test('deleting one plan removes its tasks, progress and reminders while preserving unrelated daily tasks',()=>{
 const p=plan(),life=attachLearningPlan(initialJourney().life,p);life.assistance.tasks.push({id:'other',title:'其他',steps:['一步']});life.assistance.reminders=[{id:p.id+'-reminder-a',title:'学习',dueAt:'2026-11-16T00:00:00Z',done:false,note:''}]
 const out=removeLearning(life,p.id);assert.equal(out.learning.plans.length,0);assert.deepEqual(out.assistance.tasks.map(r=>r.id),['other']);assert.equal(out.assistance.progress[p.id],undefined);assert.equal(out.assistance.reminders.length,0)
})
test('learning exports, generic life exports and calendar never include private goals, notes or profile fields',()=>{
 const p=plan();p.notes='PRIVATE_NOTE';const life=attachLearningPlan(initialJourney().life,p)
 assert.ok(!learningPlanText(p).includes('PRIVATE_'));assert.ok(learningPlanText(p).includes('https://www.cdlvi.cn/'))
 assert.ok(!JSON.stringify(exportableLife(life)).includes('PRIVATE_'));assert.equal(exportableLife(life).learning,undefined)
 const ics=learningCalendar('2026-11-17T08:00:00Z');assert.match(ics,/DTSTART:20261117T080000Z/);assert.match(ics,/BEGIN:VALARM/);assert.ok(!ics.includes('PRIVATE_'));assert.equal(learningCalendar('bad'),'')
})
test('plan validation caps resources and rejects malformed imported data; reminders use actual existing due predicate',()=>{
 assert.equal(createLearningPlan({goal:'',goalCategory:'job',why:'',weeklyMinutes:60,resourceIds:[]},'learning-test'),null)
 assert.equal(createLearningPlan({goal:'x',goalCategory:'job',why:'',weeklyMinutes:60,resourceIds:['fake']},'learning-test'),null)
 assert.equal(sanitizeLearning({plans:[{id:'x',goal:'x',resourceIds:['fake']}]}).plans.length,0)
 assert.equal(dueReminders([{id:'learning-a',title:'学习',dueAt:'2026-11-16T00:00:00Z',done:false,note:''}],Date.parse('2026-11-17')).length,1)
})
test('twelve distinct accommodation requests retain scope, recipient, deadlines, materials and official sources; six tools tutorials',()=>{
 assert.equal(accommodationTemplates.length,12);assert.equal(learningTutorials.length,6)
 assert.equal(learningTutorials.find(row=>row.id==='screen').tool,'screen-reader-resources')
 assert.equal(learningTutorials.find(row=>row.id==='image').tool,'vision')
 for(const row of accommodationTemplates){for(const field of ['title','scene','recipient','leadTime','materials','script','sourceUrl'])assert.ok(row[field]);assert.equal(safeServiceUrl(row.sourceUrl),row.sourceUrl)}
 for(const id of ['sign','assistant'])assert.ok(accommodationTemplates.find(row=>row.id===id).recipient.includes('任课教师'))
 for(const id of ['extraTime','room'])assert.equal(accommodationTemplates.find(row=>row.id===id).recipient,'当地教育考试机构')
 const exported=accommodationExport(['extraTime','recording']);assert.ok(exported.includes('不表示你一定获批'));assert.equal((exported.match(/https:/g)??[]).length,2)
})
