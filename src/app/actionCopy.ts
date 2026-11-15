import type {TravelTaskPlan} from './travelTaskTypes'

/** Split authored reminders at clause boundaries; never touch verbatim evidence. */
export function actionSentences(text:string):string {
    return text.replace(/，/g,'。').replace(/；/g,'。')
}
export function readableTravelPlan(plan:TravelTaskPlan):TravelTaskPlan {
    const convert=(action:TravelTaskPlan['stages'][number]['actions'][number])=>({...action,detail:actionSentences(action.detail),...(action.verification?{verification:{...action.verification,question:actionSentences(action.verification.question)}}:{})})
    return {...plan,stages:plan.stages.map(stage=>({...stage,actions:stage.actions.map(convert)})),generalActions:plan.generalActions.map(convert)}
}
