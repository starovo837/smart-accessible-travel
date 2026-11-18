import {sanitizeTravelSpecDraft,travelSpecFields} from './travelSpecEvidence.ts'
import {normalizeTripSpecs,canonicalTripKey} from './travelTripIdentity.ts'
import {ruleCatalog} from './ruleCatalog.ts'
import {copyDictionary as c} from './copyDictionary.ts'
import { buildTravelTaskPlan } from './travelPlan.ts'
import {forbiddenInterfaceCopy} from './copyPolicy.ts'
import { allTravelActions } from './travelTaskTypes.ts'
import type { CustomTravelDevice, CustomTravelMode, Device, TravelContext, TravelDeviceSpecs } from './types'
import type { TravelTaskPlan, TravelPlanAction } from './travelTaskTypes'

export const TRAVEL_TASK_KEY = 'smart-accessible-travel-task-v1'
export interface TravelTaskSnapshot {
  profileScrubbed?:boolean;
  specEvidenceVersion?:1; needsSpecReview?:boolean;
  version: 1; mode: string; selected: string[]; specs: Record<string, TravelDeviceSpecs>
  context: TravelContext; devices: Device[]; customModes: CustomTravelMode[]; customDevices: CustomTravelDevice[]
  plan: TravelTaskPlan; checked: Record<string, string>; savedAt: string; inputKey: string; onlyNext?: boolean; displayVersion?:2; lastViewedPlan?:TravelTaskPlan
}
const safeUrl = (value: unknown) => { try { const url = new URL(String(value)); return url.protocol === 'https:' && !url.username && !url.password } catch { return false } }
const validAction = (action: TravelPlanAction) => Boolean(action && typeof action.id==='string' && typeof action.title==='string' && typeof action.detail==='string' && safeUrl(action.evidence?.officialUrl) && Array.isArray(action.anchors))
const validCompletion = (plan:TravelTaskPlan) => {
  const value=plan.completion
  return Boolean(value&&value.version===1&&value.generated===allTravelActions(plan).length&&Number.isInteger(value.total)&&value.total>=value.generated&&value.locked===value.total-value.generated&&Array.isArray(value.gaps)&&value.gaps.every(gap=>gap&&['devices','dimensions','batteryType','from','to','mode'].includes(gap.id)&&typeof gap.label==='string'&&Number.isInteger(gap.unlocks)&&gap.unlocks>=0&&(!gap.deviceIds||Array.isArray(gap.deviceIds))&&(!gap.requires||Array.isArray(gap.requires)))&&typeof value.statement==='string'&&plan.stages.every(stage=>{const row=value.stages?.[stage.id];return row&&row.generated===stage.actions.length&&row.total>=row.generated&&['ready','partial','blocked'].includes(row.status)&&Array.isArray(row.missing)})&&value.stages.fallback.status==='ready')
}
export function parseTravelTask(raw: string | null,options:{profileAllowed?:boolean}={}): TravelTaskSnapshot | null {
  if (!raw || raw.length > 700_000) return null
  try {
    const value = JSON.parse(raw) as TravelTaskSnapshot
    if (value.version !== 1 || typeof value.mode !== 'string' || !Array.isArray(value.selected) || !Array.isArray(value.devices) || value.devices.length > 50 || !value.context || !value.specs || !value.checked || !value.plan || value.plan.version !== 1 || !Array.isArray(value.plan.stages) || value.plan.stages.length !== 5 || typeof value.inputKey !== 'string') return null
    if (value.plan.stages.map(stage=>stage.id).join(',') !== 'before,station,onboard,arrival,fallback' || !value.plan.route || !Array.isArray(value.plan.devices) || !Number.isFinite(Date.parse(value.plan.generatedAt))) return null
    if (typeof value.specs !== 'object' || Array.isArray(value.specs) || !Object.values(value.specs).every(row=>row && typeof row === 'object' && !Array.isArray(row))) return null
    if (!value.plan.stages.every(stage => Array.isArray(stage.actions) && stage.actions.length <= 60 && stage.actions.every(action => typeof action.title === 'string' && typeof action.detail === 'string' && safeUrl(action.evidence?.officialUrl)))) return null
    if (!Array.isArray(value.plan.contacts) || !value.plan.contacts.every(contact => typeof contact.phone === 'string' && safeUrl(contact.url))) return null
    if (!value.devices.every(device => ['id','name','type','battery','dimensions','weight'].every(field=>typeof device[field as keyof Device] === 'string'))) return null
    const legacy=value.specEvidenceVersion!==1||Object.values(value.specs).some(row=>!row.confirmed&&travelSpecFields.some(field=>row[field]!==undefined));
    const unchecked=Object.values(value.specs).some(row=>travelSpecFields.some(field=>row[field]!==undefined&&row.confirmed?.[field]!==true));
    value.specs=Object.fromEntries(Object.entries(value.specs).map(([id,row])=>[id,sanitizeTravelSpecDraft(row,value.devices.find(device=>device.id===id),legacy)]));
    if(legacy){value.needsSpecReview=unchecked||Object.values(value.specs).some(row=>travelSpecFields.some(field=>row[field]!==undefined));value.specEvidenceVersion=1;}
    const staleEvidence=value.plan.devices.some(row=>JSON.stringify(row.specs)!==JSON.stringify(normalizeTripSpecs(value.devices.find(device=>device.id===row.id)??{...row,battery:'',dimensions:'',weight:'',source:'manual'},value.specs[row.id])));
    if (legacy || staleEvidence || !value.plan.readiness || !Array.isArray(value.plan.generalActions) || !value.plan.completion || forbiddenInterfaceCopy.test(value.plan.summary+' '+value.plan.completion?.statement)) {
      value.plan=buildTravelTaskPlan({mode:value.mode,devices:value.devices,specs:value.specs,context:value.context,documents:ruleCatalog,now:Date.parse(value.plan.generatedAt),disabilityProfile:value.plan.disabilityProfile})
      value.checked={};value.inputKey='';delete value.lastViewedPlan
    }
    if (!['preparation','station-only','complete'].includes(value.plan.readiness) || !Array.isArray(value.plan.generalActions) || value.plan.generalActions.length>60 || !allTravelActions(value.plan).every(validAction))return null
    if (!value.plan.stages.every(stage=>stage.actions.length||Boolean(stage.emptyReason))||!validCompletion(value.plan))return null
    if(value.lastViewedPlan&&(!value.lastViewedPlan.completion||!Array.isArray(value.lastViewedPlan.stages)||!allTravelActions(value.lastViewedPlan).every(validAction)||!validCompletion(value.lastViewedPlan)))delete value.lastViewedPlan
    return scopeTravelProfile({ ...value, customModes: value.customModes ?? [], customDevices: value.customDevices ?? [], onlyNext:value.displayVersion===2?value.onlyNext===true:value.onlyNext!==false },options.profileAllowed===true)
  } catch { return null }
}
export function readTravelTask(options:{profileAllowed?:boolean}={}): TravelTaskSnapshot | null {
  try { return parseTravelTask(localStorage.getItem(TRAVEL_TASK_KEY),options) } catch { return null }
}
/** Category/grade-derived advice is personal data too; rebuild rather than just removing its label. */
export function scopeTravelProfile(value:TravelTaskSnapshot,profileAllowed=false):TravelTaskSnapshot {
 if(profileAllowed||(!value.plan.disabilityProfile&&!value.lastViewedPlan?.disabilityProfile&&!('disabilityProfile' in value)&&!value.inputKey.includes('"disabilityProfile":')))return value
 const plan=buildTravelTaskPlan({mode:value.mode,devices:value.devices,specs:value.specs,context:value.context,documents:ruleCatalog,now:Date.parse(value.plan.generatedAt)})
 const checked=Object.fromEntries(allTravelActions(plan).filter(action=>value.checked[action.id]===travelActionSignature(action,plan)).map(action=>[action.id,value.checked[action.id]]))
 const next={...value,plan,checked,inputKey:canonicalTripKey({mode:value.mode,devices:value.devices,specs:value.specs,context:value.context}),profileScrubbed:true}
 delete next.lastViewedPlan
 Reflect.deleteProperty(next,'disabilityProfile')
 return next
}
export function writeTravelTask(value: TravelTaskSnapshot,options:{profileAllowed?:boolean}={}) { const scoped={...scopeTravelProfile(value,options.profileAllowed===true),specEvidenceVersion:1};delete scoped.profileScrubbed;localStorage.setItem(TRAVEL_TASK_KEY, JSON.stringify(scoped)) }
/** Remove cached profile advice while retaining ordinary itinerary and verified equipment drafts. */
export function clearTravelProfileStorage(storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>=localStorage){
 const raw=storage.getItem(TRAVEL_TASK_KEY);if(raw===null)return
 const snapshot=parseTravelTask(raw)
 if(!snapshot){storage.removeItem(TRAVEL_TASK_KEY);if(storage.getItem(TRAVEL_TASK_KEY)!==null)throw Error(c.profileCleanupFailed);return}
 if(!snapshot.profileScrubbed)return
 const scoped={...snapshot,specEvidenceVersion:1};delete scoped.profileScrubbed
 const clean=JSON.stringify(scoped);storage.setItem(TRAVEL_TASK_KEY,clean)
 if(storage.getItem(TRAVEL_TASK_KEY)!==clean)throw Error(c.profileCleanupFailed)
}
export function clearTravelTask() { localStorage.removeItem(TRAVEL_TASK_KEY) }
/** Export the normalized task, excluding raw UI drafts and cancelled equipment. */
export function exportTravelTask(snapshot:TravelTaskSnapshot) {
  const devices=snapshot.plan.devices.map((device,index)=>({...device,id:/（?(未选择|待填写|暂未)/u.test(device.id)?'travel-device-'+(index+1):device.id}))
  const deviceIds=new Map(snapshot.plan.devices.map((device,index)=>[device.id,devices[index].id]))
  const completion={...snapshot.plan.completion,gaps:snapshot.plan.completion.gaps.map(gap=>({...gap,...(gap.deviceIds?{deviceIds:gap.deviceIds.map(id=>deviceIds.get(id)??id)}:{})}))}
  const plan={...snapshot.plan,devices,completion}
  return {completionStatement:plan.completion.statement,completion:plan.completion,version:1,mode:plan.mode,context:{from:plan.route.from,to:plan.route.to,journeyDate:plan.route.date,companionCount:plan.companionCount},devices:plan.devices,plan,checked:Object.fromEntries(allTravelActions(plan).filter(action=>snapshot.checked[action.id]===travelActionSignature(action,plan)).map(action=>[action.id,true]))}
}

/** Editable drafts and per-field confirmation travel together. */
export {deviceTravelSpecs as storedDeviceSpecs} from './travelSpecEvidence.ts'
/** An edited action must be checked again; unrelated, unchanged actions retain progress. */
export function travelActionSignature(action: TravelPlanAction, plan: TravelTaskPlan) {
  const { updatedAt: _updatedAt, ...evidence } = action.evidence
  return JSON.stringify([plan.mode,plan.route,action.title,action.detail,evidence,action.verification,action.anchors])
}
