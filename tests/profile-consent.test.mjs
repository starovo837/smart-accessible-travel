import test from 'node:test'
import assert from 'node:assert/strict'
import {canSaveDisabilityProfile,persistDisabilityProfile,restoreDisabilityProfile,removeDisabilityProfile,clearProfileStorage,scopeSnapshot,readSnapshot,STORAGE_KEY,DISABILITY_PROFILE_KEY} from '../src/app/storage.ts'
import {initialJourney} from '../src/app/journey.ts'
import {buildTravelTaskPlan} from '../src/app/travelPlan.ts'
import {scopeTravelProfile,parseTravelTask,clearTravelProfileStorage,writeTravelTask,readTravelTask,TRAVEL_TASK_KEY} from '../src/app/travelTaskStorage.ts'
import {canonicalTripKey} from '../src/app/travelTripIdentity.ts'
import {ruleCatalog} from '../src/app/ruleCatalog.ts'
import {allTravelActions} from '../src/app/travelTaskTypes.ts'
import {copyDictionary as c} from '../src/app/copyDictionary.ts'

const profile={selections:[{category:'hearing',grade:2,accompaniment:true,deviceIds:[]},{category:'vision',grade:1,deviceIds:[]}],primary:'vision'}
const allowed={profile:true,devices:true,life:true,retainDays:30}
const input=()=>({consent:'granted',privacy:{...allowed},modules:['vision','hearing'],devices:[],journey:initialJourney(),customModes:[],customDevices:[],feedback:[],settings:{elderMode:false,stepMode:false,readAloud:false}})
const memory=entries=>{
 const map=new Map(entries),calls=[];return {map,calls,getItem(key){calls.push(['get',key]);return map.get(key)??null},setItem(key,value){calls.push(['set',key]);map.set(key,value)},removeItem(key){calls.push(['remove',key]);map.delete(key)}}
}
const trip=()=>{
 const data={mode:'rail',devices:[],specs:{},context:{carrier:'unspecified',from:'上海虹桥',to:'杭州东'},documents:ruleCatalog,now:Date.parse('2026-11-18T02:00:00Z'),disabilityProfile:profile}
 const plan=buildTravelTaskPlan(data)
 return {version:1,specEvidenceVersion:1,...data,selected:[],customModes:[],customDevices:[],plan,lastViewedPlan:plan,checked:{},savedAt:plan.generatedAt,inputKey:canonicalTripKey(data)}
}

test('profile save requires granted consent and a strictly enabled profile scope',()=>{
 for(const consent of ['undecided','skipped',undefined,'granted '])assert.equal(canSaveDisabilityProfile(consent,allowed),false)
 for(const privacy of [undefined,{profile:false},{profile:1},{profile:'true'}])assert.equal(canSaveDisabilityProfile('granted',privacy),false)
 assert.equal(canSaveDisabilityProfile('granted',allowed),true)
})
test('unconsented category and grade edits never write the standalone profile key',()=>{
 for(const consent of ['undecided','skipped']){
  const store=memory();persistDisabilityProfile(profile,consent,allowed,store)
  assert.equal(store.getItem(DISABILITY_PROFILE_KEY),null);assert.ok(!store.calls.some(([op,key])=>op==='set'&&key===DISABILITY_PROFILE_KEY))
 }
 const disabled=memory();persistDisabilityProfile(profile,'granted',{profile:false},disabled)
 assert.ok(!disabled.calls.some(([op])=>op==='set'))
})
test('authorized profiles retain categories and grades, normalizing unrequested fields away',()=>{
 const store=memory();persistDisabilityProfile({...profile,certificateNumber:'NEVER_SAVE_THIS'},'granted',allowed,store)
 const loaded=restoreDisabilityProfile({consent:'granted',privacy:allowed},store)
 assert.equal(loaded.error,'');assert.equal(loaded.profile.selections[0].category,'vision');assert.equal(loaded.profile.selections[0].grade,1)
 assert.equal(loaded.profile.selections[1].grade,2);assert.equal(loaded.profile.primary,'vision')
 assert.ok(!store.getItem(DISABILITY_PROFILE_KEY).includes('NEVER_SAVE_THIS'))
})
test('startup without consent deletes an orphaned profile instead of restoring it',()=>{
 for(const saved of [null,{consent:'undecided',privacy:allowed},{consent:'skipped',privacy:allowed},{consent:'granted',privacy:{...allowed,profile:false}}]){
  const store=memory([[DISABILITY_PROFILE_KEY,JSON.stringify(profile)]])
  const restored=restoreDisabilityProfile(saved,store)
  assert.deepEqual(restored.profile,{selections:[]});assert.equal(restored.error,'');assert.equal(store.getItem(DISABILITY_PROFILE_KEY),null)
 }
})
test('expired main consent cannot revive the separate profile',()=>{
 const expired=scopeSnapshot(input(),1),store=memory([[DISABILITY_PROFILE_KEY,JSON.stringify(profile)]])
 const snapshot=readSnapshot(JSON.stringify(expired),Date.now())
 assert.equal(snapshot,null);assert.deepEqual(restoreDisabilityProfile(snapshot,store).profile,{selections:[]});assert.equal(store.getItem(DISABILITY_PROFILE_KEY),null)
})
test('failed startup cleanup does not expose the old profile or conceal the error',()=>{
 const store=memory([[DISABILITY_PROFILE_KEY,JSON.stringify(profile)]]);store.removeItem=()=>{throw Error('synthetic-denied')}
 const restored=restoreDisabilityProfile(null,store)
 assert.deepEqual(restored.profile,{selections:[]});assert.equal(restored.error,c.profileStartupCleanupFailed)
 assert.equal(store.map.get(DISABILITY_PROFILE_KEY),JSON.stringify(profile))
})
test('read failure and malformed authorized JSON fail closed with a visible error',()=>{
 for(const store of [{getItem(){throw Error('denied')}},memory([[DISABILITY_PROFILE_KEY,'{broken']])]){
  const restored=restoreDisabilityProfile({consent:'granted',privacy:allowed},store)
  assert.deepEqual(restored.profile,{selections:[]});assert.equal(restored.error,c.profileReadFailed)
 }
})
test('revoking profile removes its key and main snapshot modules without deleting equipment or life data',()=>{
 const data=input();data.devices=[{id:'actual-cane',type:'cane',name:'合成实物盲杖',battery:'',dimensions:'',weight:'',source:'manual'}];data.journey.life.home.doorCm=85
 const store=memory([[STORAGE_KEY,JSON.stringify(scopeSnapshot(data))],[DISABILITY_PROFILE_KEY,JSON.stringify(profile)]])
 clearProfileStorage({storage:store})
 assert.equal(store.getItem(DISABILITY_PROFILE_KEY),null)
 const restored=readSnapshot(store.getItem(STORAGE_KEY));assert.deepEqual(restored.modules,[]);assert.equal(restored.privacy.profile,false)
 assert.equal(restored.devices[0].id,'actual-cane');assert.equal(restored.journey.life.home.doorCm,85)
 assert.equal(restored.privacy.devices,true);assert.equal(restored.privacy.life,true)
})
test('revoking main profile and saving an empty reauthorized profile cannot restore the old categories',()=>{
 const store=memory([[DISABILITY_PROFILE_KEY,JSON.stringify(profile)],[STORAGE_KEY,JSON.stringify(scopeSnapshot(input()))]])
 clearProfileStorage({storage:store})
 persistDisabilityProfile({selections:[]},'granted',allowed,store)
 assert.deepEqual(restoreDisabilityProfile({consent:'granted',privacy:allowed},store).profile,{selections:[]})
})
test('delete all removes main and standalone keys and propagates a failed removal',()=>{
 const store=memory([[DISABILITY_PROFILE_KEY,JSON.stringify(profile)],[STORAGE_KEY,JSON.stringify(scopeSnapshot(input()))]])
 clearProfileStorage({storage:store,all:true});assert.equal(store.getItem(DISABILITY_PROFILE_KEY),null);assert.equal(store.getItem(STORAGE_KEY),null)
 const denied=memory([[DISABILITY_PROFILE_KEY,'sensitive']]);denied.removeItem=()=>{throw Error('synthetic-denied')}
 assert.throws(()=>clearProfileStorage({storage:denied,all:true}),/synthetic-denied/);assert.equal(denied.map.get(DISABILITY_PROFILE_KEY),'sensitive')
})
test('silent remove/write failures are detected, not reported as saved or deleted',()=>{
 const store=memory([[DISABILITY_PROFILE_KEY,JSON.stringify(profile)]]);store.removeItem=()=>{}
 assert.throws(()=>removeDisabilityProfile(store),/清除失败/)
 const ignored=memory();ignored.setItem=()=>{}
 assert.throws(()=>persistDisabilityProfile(profile,'granted',allowed,ignored),/未能保存/)
 const main=memory([[STORAGE_KEY,JSON.stringify(scopeSnapshot(input()))]]);main.setItem=()=>{}
 assert.throws(()=>clearProfileStorage({storage:main}),/清除失败/)
})
test('main snapshots also exclude module classifications when consent is not granted',()=>{
 for(const consent of ['undecided','skipped'])assert.deepEqual(scopeSnapshot({...input(),consent}).modules,[])
 assert.deepEqual(scopeSnapshot({...input(),privacy:{...allowed,profile:false}}).modules,[])
 assert.deepEqual(scopeSnapshot(input()).modules,['vision','hearing'])
})
test('unconsented travel persistence drops both classification metadata and derived advice',()=>{
 const original=trip(),clean=scopeTravelProfile(original)
 assert.equal(original.plan.disabilityProfile.selections.length,2);assert.equal(clean.plan.disabilityProfile,undefined);assert.equal(clean.lastViewedPlan,undefined)
 assert.ok(!clean.inputKey.includes('"disabilityProfile":'));assert.equal(clean.context.from,'上海虹桥')
 assert.deepEqual(clean.plan.devices,original.plan.devices)
 assert.ok(!allTravelActions(clean.plan).some(action=>action.applicableCategories?.length||action.combined))
 assert.doesNotMatch(JSON.stringify(clean),/"category":"(?:vision|hearing)"/)
})
test('authorized travel snapshots preserve profile advice, while default reads are private',()=>{
 const original=trip(),raw=JSON.stringify(original)
 assert.equal(scopeTravelProfile(original,true),original)
 assert.ok(parseTravelTask(raw,{profileAllowed:true}).plan.disabilityProfile)
 assert.equal(parseTravelTask(raw).plan.disabilityProfile,undefined)
})
test('cached category advice is scrubbed on disk while ordinary route data remains; failed cleanup throws',()=>{
 const store=memory([[TRAVEL_TASK_KEY,JSON.stringify(trip())]])
 clearTravelProfileStorage(store)
 const clean=JSON.parse(store.getItem(TRAVEL_TASK_KEY));assert.equal(clean.plan.disabilityProfile,undefined);assert.equal(clean.context.from,'上海虹桥');assert.equal(clean.lastViewedPlan,undefined)
 assert.equal(clean.profileScrubbed,undefined)
 const denied=memory([[TRAVEL_TASK_KEY,JSON.stringify(trip())]]);denied.setItem=()=>{throw Error('synthetic-quota')}
 assert.throws(()=>clearTravelProfileStorage(denied),/synthetic-quota/)
 assert.ok(JSON.parse(denied.map.get(TRAVEL_TASK_KEY)).plan.disabilityProfile)
})
test('profile-scoped travel write/read roundtrip never defaults to consent',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),store=memory()
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:store})
 try{
  writeTravelTask(trip());assert.equal(JSON.parse(store.getItem(TRAVEL_TASK_KEY)).plan.disabilityProfile,undefined)
  writeTravelTask(trip(),{profileAllowed:true});assert.ok(JSON.parse(store.getItem(TRAVEL_TASK_KEY)).plan.disabilityProfile)
  assert.equal(readTravelTask().plan.disabilityProfile,undefined);assert.ok(readTravelTask({profileAllowed:true}).plan.disabilityProfile)
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage')}
})
