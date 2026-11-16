import { useState, type Dispatch, type SetStateAction } from 'react'
import { copyDictionary as c } from '../../app/copyDictionary'
import { learningResources } from '../../app/learningCatalog'
import { createLearningPlan, attachLearningPlan, removeLearning, sanitizeLearning, learningPlanText, learningCalendar, type LearningGoalCategory, type LearningPlan } from '../../app/learningPlan'
import { downloadText } from '../../app/accessibility'
import type { LifeData } from '../../app/types'
import type { SupportToolId } from '../../app/supportCatalog'
import { OfficialLearningLink } from './LearningCenter'

export function LearningPlans({life,setLife,selected,setSelected,onTool,notify}:{life:LifeData;setLife:Dispatch<SetStateAction<LifeData>>;selected:string[];setSelected:(ids:string[])=>void;onTool:(id:SupportToolId)=>void;notify:(message:string)=>void}) {
  const [goalCategory,setGoalCategory]=useState<LearningGoalCategory>('interest'),[goal,setGoal]=useState(''),[why,setWhy]=useState(''),[weekly,setWeekly]=useState(60),[due,setDue]=useState<Record<string,string>>({})
  const data=sanitizeLearning(life.learning)
  const update=(planId:string,patch:Partial<LearningPlan>)=>setLife(current=>({...current,learning:{...sanitizeLearning(current.learning),plans:sanitizeLearning(current.learning).plans.map(p=>p.id===planId?{...p,...patch}:p)},assistance:patch.completed!==undefined?{...current.assistance,tasks:current.assistance?.tasks??[],progress:{...current.assistance?.progress,[planId]:patch.completed}}:current.assistance}))
  return <><h2>{c.learningPlans}</h2><form className="learning-card" onSubmit={event=>{event.preventDefault();if(data.plans.length>=30||(life.assistance?.tasks.length??0)>=30)return notify(c.learningLimits)
    const plan=createLearningPlan({goalCategory,goal,why,weeklyMinutes:weekly,resourceIds:selected},'learning-'+crypto.randomUUID())
    if(!plan)return notify(c.learningChooseHint)
    setLife(current=>attachLearningPlan(current,plan));setGoal('');setWhy('');setSelected([]);notify(c.learningCreated)
  }}><label>{c.learningGoalCategory}<select aria-label={c.learningGoalCategory} value={goalCategory} onChange={e=>setGoalCategory(e.target.value as LearningGoalCategory)}>{[['degree',c.learningGoalDegree],['job',c.learningGoalJob],['interest',c.learningGoalInterest],['access',c.learningGoalAccess]].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label>{c.learningGoal}<input required maxLength={120} value={goal} onChange={e=>setGoal(e.target.value)}/></label><label>{c.learningWhy}<textarea aria-label={c.learningWhy} maxLength={500} value={why} onChange={e=>setWhy(e.target.value)}/></label><label>{c.learningWeekly}<input type="number" required min={1} max={10080} value={weekly} onChange={e=>setWeekly(Number(e.target.value))}/></label>
    <fieldset><legend>{c.learningResourcesChoose}（{selected.length}/3）</legend>{learningResources.map(r=><label className="learning-check" key={r.id}><input type="checkbox" checked={selected.includes(r.id)} disabled={selected.length>=3&&!selected.includes(r.id)} onChange={e=>setSelected(e.target.checked?[...selected,r.id]:selected.filter(id=>id!==r.id))}/>{r.name}</label>)}</fieldset><button type="submit">{c.learningCreate}</button></form>
    {!data.plans.length&&<p>{c.learningNoPlan}</p>}{data.plans.map(plan=>{const progress=Math.min(plan.steps.length,life.assistance?.progress[plan.id]??plan.completed),record={...plan,completed:progress}
      return <article className="learning-card" key={plan.id}><h3>{plan.goal}</h3><p>{c.learningWeekly}：{plan.weeklyMinutes}</p><label>{c.learningProgress} {progress}/{plan.steps.length}<progress value={progress} max={plan.steps.length}/></label>
        <ol>{plan.steps.map((step,i)=><li key={step}><label className="learning-check"><input type="checkbox" checked={i<progress} onChange={e=>update(plan.id,{completed:e.target.checked?i+1:i})}/>{step}</label></li>)}</ol>
        <ul>{plan.resourceIds.map(id=>{const r=learningResources.find(row=>row.id===id)!;return <li key={id}><OfficialLearningLink url={r.url}>{r.name}</OfficialLearningLink></li>})}</ul>
        <label>{c.learningNotes}<textarea aria-label={c.learningNotes} maxLength={2000} value={plan.notes} placeholder={c.learningReviewNote} onChange={e=>update(plan.id,{notes:e.target.value})}/></label>
        <div className="learning-actions"><button onClick={()=>onTool('steps')}>{c.learningNextStep}</button><button onClick={()=>downloadText(learningPlanText(record),c.learningPlanExportFile,'text/plain;charset=utf-8')}>{c.learningExport}</button><button onClick={()=>{
          const escape=(v:string)=>v.replace(/[<>&"']/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[ch]!))
          const lines=learningPlanText(record).split('\n').flatMap(line=>Array.from({length:Math.ceil(line.length/21)||1},(_,i)=>line.slice(i*21,(i+1)*21)))
          const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${70+lines.length*38}" viewBox="0 0 720 ${70+lines.length*38}"><rect width="100%" height="100%" fill="#fffdf5"/><g fill="#173e48" font-family="sans-serif" font-size="26">${lines.map((line,i)=>`<text x="28" y="${46+i*38}">${escape(line)}</text>`).join('')}</g></svg>`
          downloadText(svg,c.learningCardFile,'image/svg+xml;charset=utf-8')
        }}>{c.learningCarry}</button></div><p>{c.learningExportBoundary}</p>
        <fieldset><legend>{c.learningReminder}</legend><label>{c.learningReminderTime}<input type="datetime-local" value={due[plan.id]??''} onChange={e=>setDue({...due,[plan.id]:e.target.value})}/></label><p>{c.learningReminderBoundary}</p><div className="learning-actions"><button type="button" onClick={()=>{
          const at=due[plan.id];if(!at||!Number.isFinite(Date.parse(at)))return notify(c.learningReminderInvalid)
          if((life.assistance?.reminders?.length??0)>=100)return notify(c.learningLimits)
          const reminder={id:plan.id+'-reminder-'+crypto.randomUUID(),title:c.learningCalendarText,dueAt:new Date(at).toISOString(),done:false,note:''}
          setLife(current=>({...current,assistance:{...current.assistance,tasks:current.assistance?.tasks??[],progress:current.assistance?.progress??{},reminders:[...(current.assistance?.reminders??[]),reminder]}}));notify(c.learningReminderSaved)
        }}>{c.learningReminderSave}</button><button type="button" onClick={()=>{const calendar=learningCalendar(due[plan.id]??'');if(!calendar)return notify(c.learningReminderInvalid);downloadText(calendar,c.learningCalendarFile,'text/calendar;charset=utf-8')}}>{c.learningCalendar}</button><button onClick={()=>onTool('reminders')}>{c.learningGoReminder}</button></div></fieldset>
        <button onClick={()=>{if(window.confirm(c.learningDeletePlanConfirm))setLife(current=>removeLearning(current,plan.id))}}>{c.learningDeletePlan}</button>
      </article>
    })}</>
}
