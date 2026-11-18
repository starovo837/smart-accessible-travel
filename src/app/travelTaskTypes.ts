import type { Device, TravelContext, TravelDeviceSpecs, TravelMode } from './types'
import type { RuleDocument } from './ruleCatalog'

export type TravelStageId = 'before' | 'station' | 'onboard' | 'arrival' | 'fallback'
export interface TravelActionEvidence {
  level: 'official-rule' | 'official-excerpt' | 'user' | 'inference'
  updatedAt: string
  officialUrl: string
  officialLabel: string
  status: 'current' | 'historical' | 'unverified'
  effectiveDate?: string | null
  expiresAt?: string | null
  originalText?: string
  sourceTitle?: string
}
export interface TravelPlanAction {
  constraints?: {
    task: string
    onlyChannel?: 'visual' | 'auditory'
    minimumLeadMinutes?: number
    minimizeWaiting?: boolean
    directive?: { key: string; value: string }
  }
  supportingEvidence?: TravelActionEvidence[]
  applicableCategories?: import('./disabilityProfile').DisabilityCategory[]
  conflictCategories?: import('./disabilityProfile').DisabilityCategory[]
  prerequisites?: string[]
  priority?: 'safety' | 'advance' | 'access' | 'communication' | 'information'
  combined?: { reason: string; replacedTitles: string[]; conflict: 'channel' | 'process' | 'instruction' }
  id: string
  title: string
  detail: string
  evidence: TravelActionEvidence
  verification?: { contact: string; phone: string; question: string }
  anchors: { kind: 'mode' | 'from' | 'to' | 'date' | 'device' | 'companion' | 'spec' | 'city' | 'line' | 'carrier'; value: string; label?: string }[]
}
export interface TravelTaskDevice {
  id: string
  name: string
  type: string
  specs: TravelDeviceSpecs
}
export interface TravelCompletionGap {
  id: 'devices' | 'dimensions' | 'batteryType' | 'from' | 'to' | 'mode'
  label: string
  unlocks: number
  deviceIds?: string[]
  requires?: string[]
}
export interface TravelStageCompletion {
  generated: number
  total: number
  status: 'ready' | 'partial' | 'blocked'
  missing: string[]
}
export interface TravelCompleteness {
  version: 1
  generated: number
  total: number
  locked: number
  gaps: TravelCompletionGap[]
  stages: Record<TravelStageId, TravelStageCompletion>
  statement: string
  estimatedAdditional: number
}
export interface TravelTaskPlan {
  disabilityProfile?: import('./disabilityProfile').DisabilityProfile
  version: 1
  id: string
  generatedAt: string
  mode: TravelMode
  summary: string
  completion: TravelCompleteness
  readiness: 'preparation' | 'station-only' | 'complete'
  generalActions: TravelPlanAction[]
  missingFields: string[]
  companionCount: number
  route: { from: string; to: string; date: string }
  devices: TravelTaskDevice[]
  stages: { id: TravelStageId; title: string; actions: TravelPlanAction[]; emptyReason?: string }[]
  contacts: { name: string; phone: string; url: string }[]
}
export function travelReadingText(plan: TravelTaskPlan, generalTitle: string, contactsTitle: string): string {
  const actionText = (action: TravelPlanAction) => [action.title, action.detail]
  return [
    plan.summary,
    ...plan.stages.flatMap(stage => [stage.title, stage.emptyReason, ...stage.actions.flatMap(actionText)]),
    ...(plan.generalActions?.length ? [generalTitle, ...plan.generalActions.flatMap(actionText)] : []),
    ...(plan.contacts.length ? [contactsTitle, ...plan.contacts.flatMap(contact => [contact.name, contact.phone])] : []),
  ].filter(Boolean).join('。')
}
export function allTravelActions(plan: TravelTaskPlan): TravelPlanAction[] {
  const actions=[...plan.stages.flatMap(stage => stage.actions), ...(plan.generalActions ?? [])]
  if(!plan.disabilityProfile)return actions
  const rank={safety:0,advance:1,access:2,communication:3,information:4}
  const severity=(action:TravelPlanAction)=>Math.min(5,...plan.disabilityProfile!.selections.filter(item=>action.applicableCategories?.includes(item.category)).map(item=>item.grade??5))
  return actions.sort((a,b)=>rank[a.priority??'information']-rank[b.priority??'information']||severity(a)-severity(b)||Number(Boolean(b.applicableCategories?.includes(plan.disabilityProfile!.primary!)))-Number(Boolean(a.applicableCategories?.includes(plan.disabilityProfile!.primary!))))
}
export interface TravelPlanInput {
  disabilityProfile?: import('./disabilityProfile').DisabilityProfile
  mode: TravelMode
  devices: Device[]
  specs: Record<string, TravelDeviceSpecs>
  context: TravelContext
  documents?: RuleDocument[]
  now?: number
}
