import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import {stripTypeScriptTypes} from 'node:module'
const dir=await mkdtemp(join(tmpdir(),'accessible-portable-'))
for(const name of ['disabilityProfile','travelSpecEvidence','copyDictionary','journey','storage','portable','livingServices','livingCatalog','liveHelp','learningPlan','learningCatalog','serviceProviders']){const source=await readFile(new URL('../src/app/'+name+'.ts',import.meta.url),'utf8');await writeFile(join(dir,name+'.mjs'),stripTypeScriptTypes(source).replace(/from ["'](\.\/[^"']+)["']/g,(_,path)=>"from '"+path.replace(/\.ts$/,'')+".mjs'"))}
const {embedPortable,portableSnapshot}=await import(pathToFileURL(join(dir,'portable.mjs'))),{initialJourney}=await import(pathToFileURL(join(dir,'journey.mjs')))
test.after(()=>rm(dir,{recursive:true,force:true}))
test('portable data insertion cannot delete matching strings inside the application script or expand replacement tokens',()=>{
 const template='<!doctype html><html><head><title>独立应用</title></head><body><script type="module">const marker=\'<script id="portable-data" type="application/json">\';console.log("APP_END")</script></body></html>'
 const value={title:'$& <script>alert(1)</script>'},out=embedPortable(template,value)
 assert.ok(out.includes('APP_END'));assert.ok(out.includes('const marker='));assert.ok(out.includes('$& \\u003cscript>'));assert.ok(!out.includes('<script>alert(1)'))
 const revised=embedPortable(out,{title:'第二次'});assert.ok(!revised.includes('alert(1)'));assert.ok(revised.includes('APP_END'));assert.ok(revised.includes('第二次'))
})
test('portable selection excludes contacts, sharing capabilities and corrections and preserves chosen trip checklist',()=>{
 const journey=initialJourney();journey.life.emergency.phone='PRIVATE_PHONE';journey.shares=[{ownerToken:'PRIVATE_TOKEN'}];journey.packet={savedAt:'测试',mode:'rail',cards:[],results:[],records:[],checklist:[{id:'one',label:'说明书',checked:true}],communication:'PRIVATE_CONTACT'}
 const exported=portableSnapshot(journey,[],{devices:false,life:false,trip:true}),serialized=JSON.stringify(exported)
 assert.ok(!serialized.includes('PRIVATE_PHONE'));assert.ok(!serialized.includes('PRIVATE_TOKEN'));assert.ok(!serialized.includes('PRIVATE_CONTACT'));assert.equal(exported.journey.packet.checklist[0].checked,true)
})

test('including life in a portable app preserves service records but excludes every help capability',()=>{
 const journey=initialJourney();journey.life.helpSessions=[{ownerToken:'PRIVATE_HELP_OWNER',viewUrl:'PRIVATE_HELP_VIEW',text:'PRIVATE_HELP_PAYLOAD'}];journey.life.services={version:1,facilities:[],cases:[{id:'synthetic-case',title:'合成事项'}],digitalTasks:[],homeConnections:[]}
 const output=portableSnapshot(journey,[],{devices:false,life:true,trip:false}),json=JSON.stringify(output)
 assert.ok(json.includes('synthetic-case'));assert.ok(!json.includes('PRIVATE_HELP'));assert.equal(output.journey.life.helpSessions,undefined)
})
