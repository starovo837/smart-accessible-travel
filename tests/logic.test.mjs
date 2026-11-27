import {reviewedSpecs} from './helpers/confirmed-specs.mjs'
import {reviewedRule} from './helpers/reviewed-rule.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { stripTypeScriptTypes } from 'node:module'

const temp = await mkdtemp(join(tmpdir(), 'accessible-travel-tests-'))
for (const name of ['disabilityProfile','travelSpecEvidence','copyDictionary','journey','logic','storage','ruleCatalog','travelRules','livingServices','livingCatalog','liveHelp','learningPlan','learningCatalog','serviceProviders']) {
  const source = await readFile(new URL('../src/app/' + name + '.ts', import.meta.url), 'utf8')
  const compiled = stripTypeScriptTypes(source).replace(/from ["'](\.\/[^"']+)["']/g, (_, path) => "from '" + path.replace(/\.ts$/, '') + ".mjs'")
  await writeFile(join(temp, name + '.mjs'), compiled)
}
const logic = await import(pathToFileURL(join(temp,'logic.mjs')))
const journey = await import(pathToFileURL(join(temp,'journey.mjs')))
const storage = await import(pathToFileURL(join(temp,'storage.mjs')))
const { buildTravelResults } = await import(pathToFileURL(join(temp,'travelRules.mjs')))
test.after(() => rm(temp, { recursive: true, force: true }))
const {ruleCatalog}=await import(pathToFileURL(join(temp,'ruleCatalog.mjs')))
const awaitRule=ruleCatalog.find(item=>item.id==='rail-domestic')
const device = { id: 'my-chair', type: 'wheelchair', name: '测试设备', battery: '', dimensions: '', weight: '', source: 'manual' }
const data = () => ({ modules: ['hearing'], devices: [device], consent: 'granted', settings: { elderMode:false,stepMode:false,readAloud:false }, customModes:[],customDevices:[], journey: journey.initialJourney(), feedback: [{id:'f',text:'本机问题'}], privacy: { profile:false,devices:false,life:false,retainDays:7 } })

test('fit compares selected product width, not a universal threshold', () => { assert.match(logic.fitProduct({width:68,length:100},'65','90'),/不能直线通过/); assert.match(logic.fitProduct({width:62,length:100},'65','90'),/剩余 3 cm/); assert.match(logic.fitProduct({width:62,length:100},'','90'),/大于 0/) })
test('new route never fabricates facilities or accessibility', () => { const route=logic.prepareRoute('测试起点','测试终点','metro',{energy:'limited',pain:'mild',companion:true,note:''},'测试时间'); assert.equal(route.accessible,false); assert.ok(route.facilities.every(item=>item.status==='unknown')); assert.match(route.steps.join(),/休息/); assert.equal(route.step,0) })
test('assistant asks one missing field and uses supplied text', () => { let turn=logic.assistantReply('我要带助听器坐飞机',{}); assert.equal(turn.slots.mode,'plane'); assert.equal(turn.slots.device,'助听器'); assert.match(turn.text,/出发城市/); assert.equal((turn.text.match(/？/g)||[]).length,1); turn=logic.assistantReply('测试城市',turn.slots); assert.equal(turn.complete,true); assert.match(turn.text,/测试城市/); assert.match(turn.text,/没有核实/) })
test('shopping question follows the product flow instead of asking for transport', () => {const turn=logic.assistantReply('我想买助听器',{});assert.equal(turn.slots.intent,'product');assert.equal(turn.slots.product,'助听器');assert.equal(turn.complete,true);assert.match(turn.text,/买辅具/);assert.doesNotMatch(turn.text,/出发城市/) })
test('confirmed device specs only; sample plate cannot become actual evidence', () => { const card=journey.deviceCard({...device,source:'plate',dimensions:'100×60×90 cm',weight:'30 kg'}); assert.equal(journey.confirmedSpecs(card).widthCm,undefined); card.evidence.widthCm.confirmed=true; assert.equal(journey.confirmedSpecs(card).widthCm,undefined) })
test('reply extraction stays distinct from evidence confirmation', () => { const values=journey.extractReply('使用尺寸 95×62×110 cm，重量 28 kg，电池 288 Wh'); assert.equal(values.widthCm,'62'); assert.equal(values.batteryWh,'288') })
test('saving travel specs never confirms unrelated inherited fields', () => { const card=journey.deviceCard({...device,source:'manual',dimensions:'100×60×90 cm',weight:'30 kg'});const next=journey.rememberTravelSpecs(card,reviewedSpecs({lengthCm:70,widthCm:50,heightCm:35,folded:'yes'}));assert.equal(next.evidence.widthCm.confirmed,false);assert.equal(next.evidence.foldWidthCm.confirmed,true);assert.equal(journey.confirmedSpecs(next).widthCm,50);const unfolded=journey.rememberTravelSpecs(next,reviewedSpecs({lengthCm:100,widthCm:60,heightCm:90,folded:'no'}));assert.equal(journey.confirmedSpecs(unfolded).widthCm,60) })
test('unselected storage categories contain no user records', () => { const snapshot=storage.scopeSnapshot(data(),1000); assert.deepEqual(snapshot.devices,[]); assert.deepEqual(snapshot.modules,[]); assert.deepEqual(snapshot.feedback,[]); assert.equal(snapshot.journey.life.emergency.phone,''); assert.equal(snapshot.expiresAt,1000+7*86400000) })
test('selected categories survive; expired and invalid records do not restore', () => { const input=data();input.privacy.devices=true;const saved=storage.scopeSnapshot(input,1000);assert.equal(saved.devices[0].id,device.id);assert.equal(storage.readSnapshot(JSON.stringify(saved),2000).devices.length,1);assert.equal(storage.readSnapshot(JSON.stringify(saved),saved.expiresAt),null);assert.equal(storage.readSnapshot('invalid'),null) })
test('legacy consent is migrated without losing already authorized equipment', () => { const saved=storage.readSnapshot(JSON.stringify({...data(),version:undefined,privacy:undefined}),1000); assert.equal(saved.devices[0].id,device.id); assert.equal(saved.version,2) })
test('family scope, expiry and revocation hide unavailable content', () => { const packet={cards:[{name:'不应分享的设备'}],records:[{reply:'不应分享的回复'}],checklist:[{label:'清单'}]};const share={id:'s',scopes:['checklist'],expiresAt:5000,revoked:false};const payload=journey.sharePayload(packet,share,1000);assert.equal(payload.devices,undefined);assert.equal(payload.records,undefined);assert.equal(payload.checklist.length,1);assert.equal(journey.sharePayload(packet,share,5000),null);assert.equal(journey.sharePayload(packet,{...share,revoked:true},1000),null) })
test('unknown transport or device never defaults to permission', () => { assert.equal(buildTravelResults('custom:测试',[device])[0].eligibility,'unknown'); assert.equal(buildTravelResults('plane',[{...device,type:'custom-device'}])[0].eligibility,'unknown'); assert.notEqual(buildTravelResults('metro',[{...device,type:'cane'}])[0].eligibility,'allowed') })
test('ground advice is not labelled official and has no invented confidence', () => {const result=buildTravelResults('bus',[device])[0]; assert.notEqual(result.status,'official-conditional');assert.equal(result.confidence,undefined);assert.match(result.updatedAt,/没有适用/);assert.ok(result.nextSteps.some(item=>item.includes('缺少'))) })
test('catalog device id matches the specs lookup', () => {const d={...device,id:'catalog-wheelchair'};const result=buildTravelResults('bus',[d],{[d.id]:reviewedSpecs({lengthCm:100,widthCm:70,heightCm:90,weightKg:30})},{carrier:'unspecified',doorWidthCm:60})[0];assert.equal(result.eligibility,'restricted') })
test('rail weight is checked even when dimensions are absent', () => {const d={...device,type:'walker'};assert.equal(buildTravelResults('rail',[d],{[d.id]:reviewedSpecs({weightKg:25})},{carrier:'unspecified'},[reviewedRule(awaitRule,Date.now()-1000)])[0].eligibility,'restricted') })
test('operator load limit compares weight without requiring dimensions', () => {assert.equal(buildTravelResults('bus',[device],{[device.id]:reviewedSpecs({weightKg:30})},{carrier:'unspecified',availableWeightKg:25})[0].eligibility,'restricted') })
test('missing battery count never silently applies the single-battery example', () => {const result=buildTravelResults('plane',[device],{[device.id]:reviewedSpecs({batteryType:'lithium',batteryWh:200,removable:'yes'})},{carrier:'airchina'})[0];assert.notEqual(result.eligibility,'restricted');assert.ok(result.nextSteps.some(item=>item.includes('数量'))) })
test('offline export escapes markup and omits unselected life contacts', () => {const html=journey.packetHtml({savedAt:'测试',mode:'rail',cards:[],results:[],records:[],checklist:[],communication:'<script>alert(1)</script>'});assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('未选择导出生活资料')) })


test('legacy voice input settings are removed while authorized data and reading preferences survive', () => {
 const input=data();input.privacy.profile=true;input.privacy.devices=true;input.settings={...input.settings,voiceInput:true,readAloud:true};
 const saved=storage.scopeSnapshot(input,1000);
 assert.equal(saved.settings.voiceInput,undefined);assert.equal(input.settings.voiceInput,true);assert.equal(saved.settings.readAloud,true);
 const legacy={...saved,settings:input.settings};const restored=storage.readSnapshot(JSON.stringify(legacy),2000);
 assert.equal(restored.settings.voiceInput,undefined);assert.equal(restored.settings.readAloud,true);assert.deepEqual(restored.modules,['hearing']);assert.equal(restored.devices[0].id,device.id);
})
