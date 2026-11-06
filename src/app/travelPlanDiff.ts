import { allTravelActions, type TravelPlanAction, type TravelTaskPlan } from './travelTaskTypes.ts'
export interface TravelPlanChanges { added: string[]; removed: string[]; updated: string[] }
export const noTravelChanges = (): TravelPlanChanges => ({ added: [], removed: [], updated: [] })
export function visibleTravelAction(action: TravelPlanAction) {
  return JSON.stringify([action.title,action.detail,action.verification,action.anchors,action.evidence.level,action.evidence.status,action.evidence.originalText])
}
export function diffTravelPlans(previous: TravelTaskPlan, next: TravelTaskPlan): TravelPlanChanges {
  const old=new Map(allTravelActions(previous).map(action=>[action.id,action])),current=new Map(allTravelActions(next).map(action=>[action.id,action]))
  return {added:[...current.keys()].filter(id=>!old.has(id)),removed:[...old.values()].filter(action=>!current.has(action.id)).map(action=>action.title),updated:[...current.values()].filter(action=>old.has(action.id)&&visibleTravelAction(old.get(action.id)!)!==visibleTravelAction(action)).map(action=>action.id)}
}
