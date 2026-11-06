import { deviceCard } from './journey.ts'
import { buildTravelTaskPlan } from './travelPlan.ts'
import { allTravelActions } from './travelTaskTypes.ts'
import type { CustomTravelDevice, CustomTravelMode, Device, DeviceCard, TravelContext, TravelDeviceSpecs } from './types'
import type { TravelTaskPlan, TravelPlanAction } from './travelTaskTypes'

export const TRAVEL_TASK_KEY = 'smart-accessible-travel-task-v1'
export interface TravelTaskSnapshot {
  version: 1; mode: string; selected: string[]; specs: Record<string, TravelDeviceSpecs>
  context: TravelContext; devices: Device[]; customModes: CustomTravelMode[]; customDevices: CustomTravelDevice[]
  plan: TravelTaskPlan; checked: Record<string, string>; savedAt: string; inputKey: string; onlyNext?: boolean
}
const safeUrl = (value: unknown) => { try { const url = new URL(String(value)); return url.protocol === 'https:' && !url.username && !url.password } catch { return false } }
const validAction = (action: TravelPlanAction) => Boolean(action && typeof action.id==='string' && typeof action.title==='string' && typeof action.detail==='string' && safeUrl(action.evidence?.officialUrl) && Array.isArray(action.anchors))
export function parseTravelTask(raw: string | null): TravelTaskSnapshot | null {
  if (!raw || raw.length > 700_000) return null
  try {
    const value = JSON.parse(raw) as TravelTaskSnapshot
    if (value.version !== 1 || typeof value.mode !== 'string' || !Array.isArray(value.selected) || !Array.isArray(value.devices) || value.devices.length > 50 || !value.context || !value.specs || !value.checked || !value.plan || value.plan.version !== 1 || !Array.isArray(value.plan.stages) || value.plan.stages.length !== 5 || typeof value.inputKey !== 'string') return null
    if (value.plan.stages.map(stage=>stage.id).join(',') !== 'before,station,onboard,arrival,fallback' || !value.plan.route || !Array.isArray(value.plan.devices) || !Number.isFinite(Date.parse(value.plan.generatedAt))) return null
    if (typeof value.specs !== 'object' || Array.isArray(value.specs) || !Object.values(value.specs).every(row=>row && typeof row === 'object' && !Array.isArray(row))) return null
    if (!value.plan.stages.every(stage => Array.isArray(stage.actions) && stage.actions.length <= 60 && stage.actions.every(action => typeof action.title === 'string' && typeof action.detail === 'string' && safeUrl(action.evidence?.officialUrl)))) return null
    if (!Array.isArray(value.plan.contacts) || !value.plan.contacts.every(contact => typeof contact.phone === 'string' && safeUrl(contact.url))) return null
    if (!value.devices.every(device => ['id','name','type','battery','dimensions','weight'].every(field=>typeof device[field as keyof Device] === 'string'))) return null
    if (!value.plan.readiness || !Array.isArray(value.plan.generalActions)) {
      value.plan=buildTravelTaskPlan({mode:value.mode,devices:value.devices,specs:value.specs,context:value.context,now:Date.parse(value.plan.generatedAt)})
      value.checked={};value.inputKey=''
    }
    if (!['preparation','station-only','complete'].includes(value.plan.readiness) || !Array.isArray(value.plan.generalActions) || value.plan.generalActions.length>60 || !allTravelActions(value.plan).every(validAction))return null
    if (!value.plan.stages.every(stage=>stage.actions.length||Boolean(stage.emptyReason)))return null
    return { ...value, customModes: value.customModes ?? [], customDevices: value.customDevices ?? [], onlyNext:value.onlyNext!==false }
  } catch { return null }
}
export function readTravelTask(): TravelTaskSnapshot | null {
  try { return parseTravelTask(localStorage.getItem(TRAVEL_TASK_KEY)) } catch { return null }
}
export function writeTravelTask(value: TravelTaskSnapshot) { localStorage.setItem(TRAVEL_TASK_KEY, JSON.stringify(value)) }
export function clearTravelTask() { localStorage.removeItem(TRAVEL_TASK_KEY) }
/** Export the normalized task, excluding raw UI drafts and cancelled equipment. */
export function exportTravelTask(snapshot:TravelTaskSnapshot) {
  const devices=snapshot.plan.devices.map((device,index)=>({...device,id:/（?(未选择|待填写|暂未)/u.test(device.id)?'travel-device-'+(index+1):device.id}))
  const plan={...snapshot.plan,devices}
  return {version:1,mode:plan.mode,context:{from:plan.route.from,to:plan.route.to,journeyDate:plan.route.date,companionCount:plan.companionCount},devices:plan.devices,plan,checked:Object.fromEntries(allTravelActions(plan).filter(action=>snapshot.checked[action.id]===travelActionSignature(action,plan)).map(action=>[action.id,true]))}
}

/** Reuse existing user-entered values even before verification, without upgrading their evidence. */
export function storedDeviceSpecs(device: Device): TravelDeviceSpecs {
  const card = 'values' in device ? device as DeviceCard : deviceCard(device), result: TravelDeviceSpecs = {}
  const folded = card.transportState === 'folded'
  for (const field of ['lengthCm', 'widthCm', 'heightCm', 'weightKg', 'batteryWh'] as const) {
    const savedField = folded && ['lengthCm', 'widthCm', 'heightCm'].includes(field) ? ('fold' + field[0].toUpperCase() + field.slice(1)) as keyof DeviceCard['values'] : field
    const value = Number(card.values[savedField])
    if (Number.isFinite(value) && value > 0) result[field] = value
  }
  if (['none', 'lithium', 'other'].includes(card.values.batteryType ?? '')) result.batteryType = card.values.batteryType as TravelDeviceSpecs['batteryType']
  if (['yes', 'no'].includes(card.values.removable ?? '')) result.removable = card.values.removable as TravelDeviceSpecs['removable']
  if (['1', '2'].includes(card.values.batteryCount ?? '')) result.batteryCount = Number(card.values.batteryCount) as 1 | 2
  if (folded) result.folded = 'yes'
  return result
}
/** An edited action must be checked again; unrelated, unchanged actions retain progress. */
export function travelActionSignature(action: TravelPlanAction, plan: TravelTaskPlan) {
  const { updatedAt: _updatedAt, ...evidence } = action.evidence
  return JSON.stringify([plan.mode,plan.route,action.title,action.detail,evidence,action.verification,action.anchors])
}
