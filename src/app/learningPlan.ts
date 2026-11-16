import { copyDictionary as c } from './copyDictionary.ts'
import { learningResources } from './learningCatalog.ts'
import type { LifeData } from './types.ts'
export type LearningGoalCategory = 'degree'|'job'|'interest'|'access'
export interface LearningPlan { id:string; goalCategory:LearningGoalCategory;goal:string;why:string;weeklyMinutes:number;resourceIds:string[];steps:string[];completed:number;notes:string;createdAt:string }
export interface LearningData {version:1;favorites:string[];recent:Record<string,string>;reports:{resourceId:string;kind:'link'|'access'|'scope';at:string}[];plans:LearningPlan[]}
export const initialLearning = ():LearningData=>({version:1,favorites:[],recent:{},reports:[],plans:[]})
const text=(v:unknown,max=500)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max):''
const ids=(v:unknown)=>Array.isArray(v)?[...new Set(v.filter((id):id is string=>typeof id==='string'&&learningResources.some(r=>r.id===id)))]:[]
export function sanitizeLearning(raw:unknown):LearningData {
  const base=initialLearning();if(!raw||typeof raw!=='object')return base
  const value=raw as Partial<LearningData>
  return {...base,favorites:ids(value.favorites),recent:Object.fromEntries(Object.entries(value.recent??{}).filter(([id,at])=>ids([id]).length&&typeof at==='string'&&Number.isFinite(Date.parse(at))).slice(0,100)),
    reports:Array.isArray(value.reports)?value.reports.filter(r=>r&&ids([r.resourceId]).length&&['link','access','scope'].includes(r.kind)&&Number.isFinite(Date.parse(r.at))).slice(-100).map(r=>({resourceId:r.resourceId,kind:r.kind,at:r.at})):[],
    plans:Array.isArray(value.plans)?value.plans.filter(p=>p&&typeof p.id==='string'&&/^learning-[a-zA-Z0-9-]+$/.test(p.id)&&ids(p.resourceIds).length&&typeof p.goal==='string'&&p.goal.trim()).slice(0,30).map(p=>{
      const steps=[c.learningStepAccess,c.learningStepChapter,c.learningStepStudy,c.learningStepReview]
      return {id:text(p.id,100),goalCategory:['degree','job','interest','access'].includes(p.goalCategory)?p.goalCategory:'interest',goal:text(p.goal,120),why:text(p.why),weeklyMinutes:Number.isFinite(p.weeklyMinutes)?Math.min(10080,Math.max(1,p.weeklyMinutes)):60,resourceIds:ids(p.resourceIds).slice(0,3),steps,completed:Number.isInteger(p.completed)?Math.min(steps.length,Math.max(0,p.completed)):0,notes:text(p.notes,2000),createdAt:Number.isFinite(Date.parse(p.createdAt))?p.createdAt:''}
    }):[]}
}
export function createLearningPlan(input:Pick<LearningPlan,'goalCategory'|'goal'|'why'|'weeklyMinutes'|'resourceIds'>, id:string, now=new Date().toISOString()):LearningPlan|null {
  if(!input.goal.trim()||input.resourceIds.length<1||input.resourceIds.length>3||ids(input.resourceIds).length!==input.resourceIds.length||!Number.isFinite(input.weeklyMinutes)||input.weeklyMinutes<1||input.weeklyMinutes>10080||!/^learning-[a-zA-Z0-9-]+$/.test(id))return null
  return sanitizeLearning({plans:[{...input,id,createdAt:now,completed:0,notes:''}]}).plans[0]??null
}
/** Only existing steps/reminders are used. Private notes never enter either channel. */
export function attachLearningPlan(life:LifeData,plan:LearningPlan):LifeData {
  const learning=sanitizeLearning(life.learning),a=life.assistance??{tasks:[],progress:{}}
  return {...life,learning:{...learning,plans:[plan,...learning.plans]},assistance:{...a,tasks:[...a.tasks.filter(t=>t.id!==plan.id),{id:plan.id,title:c.learningPlanWord,steps:plan.steps}],progress:{...a.progress,[plan.id]:plan.completed}}}
}
export function removeLearning(life:LifeData, planId?:string):LifeData {
  const a=life.assistance
  const remove=(id:string)=>planId?id===planId||id.startsWith(planId+'-reminder-'):id.startsWith('learning-')
  return {...life,learning:planId?{...sanitizeLearning(life.learning),plans:sanitizeLearning(life.learning).plans.filter(p=>p.id!==planId)}:undefined,
    assistance:a?{...a,tasks:a.tasks.filter(t=>!remove(t.id)),reminders:a.reminders?.filter(r=>!remove(r.id)),progress:Object.fromEntries(Object.entries(a.progress).filter(([id])=>!remove(id)))}:a}
}
/** Export public titles and fixed steps only. Never export user goal, notes, profile or dates. */
export function learningPlanText(plan:LearningPlan):string {
  return [c.learningExportTitle,c.learningExportBoundary,...plan.resourceIds.flatMap(id=>{const r=learningResources.find(row=>row.id===id);return r?[r.name,r.url,c.learningCheckedAt+': '+r.verifiedAt,r.notes]:[]}),...plan.steps.map((step,i)=>`${i<plan.completed?'[x]':'[ ]'} ${i+1}. ${step}`)].join('\n')
}
export function learningCalendar(dueAt:string):string {
  if(!Number.isFinite(Date.parse(dueAt)))return ''
  const start=new Date(dueAt).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
  const end=new Date(Date.parse(dueAt)+30*60000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Smart Accessible Travel//Learning//ZH','BEGIN:VEVENT',`UID:learning-${Date.parse(dueAt)}@local`, `DTSTAMP:${start}`,`DTSTART:${start}`,`DTEND:${end}`,`SUMMARY:${c.learningCalendarText}`,'BEGIN:VALARM','TRIGGER:-PT10M','ACTION:DISPLAY',`DESCRIPTION:${c.learningCalendarText}`,'END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n')+'\r\n'
}
