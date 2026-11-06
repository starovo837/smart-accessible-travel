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
}
export interface TravelTaskDevice {
  id: string
  name: string
  type: string
  specs: TravelDeviceSpecs
}
export interface TravelTaskPlan {
  version: 1
  id: string
  generatedAt: string
  mode: TravelMode
  summary: string
  route: { from: string; to: string; date: string }
  devices: TravelTaskDevice[]
  stages: { id: TravelStageId; title: string; actions: TravelPlanAction[] }[]
  contacts: { name: string; phone: string; url: string }[]
}
export interface TravelPlanInput {
  mode: TravelMode
  devices: Device[]
  specs: Record<string, TravelDeviceSpecs>
  context: TravelContext
  documents?: RuleDocument[]
  now?: number
}
