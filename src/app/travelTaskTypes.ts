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
export function allTravelActions(plan: TravelTaskPlan): TravelPlanAction[] {
  return [...plan.stages.flatMap(stage => stage.actions), ...(plan.generalActions ?? [])]
}
export interface TravelPlanInput {
  mode: TravelMode
  devices: Device[]
  specs: Record<string, TravelDeviceSpecs>
  context: TravelContext
  documents?: RuleDocument[]
  now?: number
}
