import { useEffect, useId, useRef, useState } from 'react'
import { PageHeader, PrimaryButton } from '../../components/UI'
import { copyText, phoneLink } from '../../app/accessibility'
import { getTravelMeta } from '../../app/catalog'
import { travelActionSignature } from '../../app/travelTaskStorage'
import { allTravelActions, type TravelTaskPlan, type TravelPlanAction } from '../../app/travelTaskTypes'
import type { Device, TravelContext, TravelDeviceSpecs } from '../../app/types'
import { TravelParameterGuide } from '../TravelParameterGuide'
import { TravelCarryCard } from './TravelCarryCard'
import { TravelGapEditor, type TravelGapPatch } from './TravelGapEditor'
import '../../travel-task.css'

const evidenceLabels = { 'official-rule': '官方条款', 'official-excerpt': '官方页面摘录', user: '用户自填', inference: '模型推断' }
function dateLabel(value?: string | null) {
  if (!value) return '官方未注明'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('zh-CN') : value.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, stamp => new Date(stamp).toLocaleString('zh-CN'))
}
interface TravelChanges { added: string[]; removed: string[]; updated: string[] }
function ActionRow({ action, plan, done, onToggle, general, change }: { action: TravelPlanAction; plan: TravelTaskPlan; done: boolean; onToggle: () => void; general?: boolean; change?: 'added' | 'updated' }) {
  const id = useId(), evidence = action.evidence
  const [copyStatus,setCopyStatus]=useState('')
  useEffect(()=>setCopyStatus(''),[action.verification?.question])
  const historical = evidence.status === 'historical' || Boolean(evidence.expiresAt && Date.parse(evidence.expiresAt) < Math.max(Date.now(), Date.parse(plan.route.date) || 0))
  return <article className={`travel-task-action${change?' travel-action-changed':''}`} data-action-id={action.id} data-change={change}>
    {change&&<p className="travel-change-tag">{change==='added'?'新':'本次已调整'}</p>}
    <label className="travel-task-check" htmlFor={id}><input id={id} type="checkbox" checked={done} onChange={onToggle}/><strong>{action.title}</strong></label>
    <p>{action.detail}</p>
    {!general&&action.anchors?.length>0&&<p className="travel-anchor-summary">行程关联：{[...new Set(action.anchors.filter(anchor=>anchor.kind!=='mode').map(anchor=>anchor.label?anchor.label+' '+anchor.value:anchor.value))].slice(0,4).join(' · ')}</p>}
    <div className="travel-task-evidence"><span>依据等级：{evidenceLabels[evidence.level]}</span><span>{evidence.level==='inference'?'生成时间':'更新时间'}：{dateLabel(evidence.updatedAt)}</span><a href={evidence.officialUrl} target="_blank" rel="noopener noreferrer">{evidence.officialLabel || '官方入口'} ↗</a></div>
    {evidence.level === 'inference' && <p className="travel-task-note">{general?'通用建议。':'依据上方行程锚点编排；现场条件仍需逐项核实。'}</p>}
    {(historical || evidence.status !== 'current') && <p className="travel-task-state">{historical ? '历史条款，可能已变更' : '待核实'}</p>}
    {action.verification && <div className="travel-task-question"><p><strong>联系谁：</strong>{action.verification.contact} {phoneLink(action.verification.phone) && <a href={phoneLink(action.verification.phone)}>拨打 {action.verification.phone}</a>}</p><p><strong>直接这样问：</strong>{action.verification.question}</p><button type="button" onClick={async () => setCopyStatus(await copyText(action.verification!.question) ? '问法已复制' : '复制未完成，可选择上方文字')}>复制这句问法</button>{copyStatus&&<p role="status">{copyStatus}</p>}</div>}
    {evidence.originalText && <details><summary>原文与生效日期</summary><p>生效日期：{dateLabel(evidence.effectiveDate)}</p><p>{evidence.sourceTitle}</p><blockquote>{evidence.originalText}</blockquote><a className="travel-official-verify" href={evidence.officialUrl} target="_blank" rel="noopener noreferrer">一键打开官方页面核验 ↗</a></details>}
  </article>
}

interface Props {
  plan: TravelTaskPlan; checked: Record<string, string>; onToggle: (action: TravelPlanAction) => void
  devices: Device[]; specs: Record<string, TravelDeviceSpecs>; onSpecChange: (id: string, field: keyof TravelDeviceSpecs, value: unknown) => void
  onBack: () => void; onEdit: () => void; onChooseDevice: () => void; onExport: () => void; onClear: () => void
  onHelp: () => void; onReport: () => void; onAssistant: () => void
  storageMessage: string; online: boolean
  onlyNext: boolean; onOnlyNextChange: (value:boolean)=>void; changes: TravelChanges
  hasBaseline:boolean; completionUpdate:boolean; availableDevices:Device[]; context:TravelContext
  onCompleteGaps:(patch:TravelGapPatch)=>void
}
export function TravelTaskResult(props: Props) {
  const {plan,checked,onToggle,changes}=props,onlyNext=props.onlyNext!==false,completion=plan.completion
  const actions=allTravelActions(plan),generalActions=plan.generalActions??[]
  const isDone=(action:TravelPlanAction)=>checked[action.id]===travelActionSignature(action,plan)
  const completed=actions.filter(isDone).length,next=actions.find(action=>!isDone(action))
  const [editor,setEditor]=useState<{gap:string;request:number}|null>(null),[showActionId,setShowActionId]=useState<string|null>(null),[jumpRequest,setJumpRequest]=useState(0)
  const selectedId=showActionId&&actions.some(action=>action.id===showActionId)?showActionId:next?.id
  const root=useRef<HTMLElement>(null),overviewHeading=useRef<HTMLHeadingElement>(null),completeHeading=useRef<HTMLHeadingElement>(null),advanceFocus=useRef(false),pendingJump=useRef<string|null>(null),saveFocus=useRef(false),descriptionId=useId()
  useEffect(()=>{if(advanceFocus.current){(root.current?.querySelector<HTMLElement>('.travel-task-action input[type="checkbox"]')??completeHeading.current)?.focus();advanceFocus.current=false}},[selectedId,completed,onlyNext])
  useEffect(()=>{if(pendingJump.current){const row=Array.from(root.current?.querySelectorAll<HTMLElement>('[data-action-id]')??[]).find(item=>item.dataset.actionId===pendingJump.current);if(row){row.scrollIntoView({block:'center'});row.querySelector<HTMLElement>('input[type="checkbox"]')?.focus();pendingJump.current=null}}},[jumpRequest,selectedId,plan.id])
  useEffect(()=>{if(saveFocus.current&&!editor){overviewHeading.current?.focus();saveFocus.current=false}},[plan.id,editor])
  const visible=(action:TravelPlanAction)=>!onlyNext||action.id===selectedId
  const renderAction=(action:TravelPlanAction,general=false)=><ActionRow key={action.id} action={action} plan={plan} general={general} done={isDone(action)} change={!props.hasBaseline?undefined:changes.added.includes(action.id)?'added':!props.completionUpdate&&changes.updated.includes(action.id)?'updated':undefined} onToggle={()=>{advanceFocus.current=onlyNext&&!isDone(action);if(onlyNext)setShowActionId(null);onToggle(action)}}/>
  const jump=(id:string)=>{const section=document.getElementById(id);section?.scrollIntoView({block:'start'});section?.focus()}
  const jumpAction=(id:string)=>{pendingJump.current=id;setShowActionId(id);setJumpRequest(value=>value+1)}
  const generic=<section id="travel-stage-general" className="travel-task-stage travel-general-stage" tabIndex={-1} aria-labelledby="travel-heading-general"><h2 id="travel-heading-general">{plan.readiness==='preparation'?'通用预备段':'通用'}</h2>{generalActions.filter(visible).map(action=>renderAction(action,true))}{!generalActions.length&&<p>本次没有额外通用建议。</p>}{onlyNext&&generalActions.length>0&&!generalActions.some(visible)&&<p>{generalActions.every(isDone)?'本区行动已勾选，关闭筛选可回顾。':`本区有 ${generalActions.length} 项通用建议，当前显示其他阶段的行动。`}</p>}</section>
  const addedActions=actions.filter(action=>changes.added.includes(action.id))
  const hasChanges=changes.added.length+changes.removed.length+changes.updated.length>0
  const stateText=(stage:TravelTaskPlan['stages'][number])=>{const state=completion.stages[stage.id];return stage.id==='fallback'||state.status==='ready'?'已就绪':state.status==='blocked'?'待补参数':`部分就绪 ${state.generated}/${state.total}`}
  const openGap=(gap:string)=>setEditor(current=>({gap,request:(current?.request??0)+1}))
  const cancelEditor=()=>{const gap=editor?.gap;setEditor(null);requestAnimationFrame(()=>{Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-gap-id]')??[]).find(button=>button.dataset.gapId===gap)?.focus()})}
  return <section ref={root} className="screen travel-task-result">
    <PageHeader title={plan.readiness==='preparation'?'通用出行预备':'出行行动清单'} subtitle={getTravelMeta(plan.mode).label+' · 一次做一件事'} onBack={props.onBack}/>
    <section className="travel-task-overview" aria-label="本次行程与行动摘要">
      <h2 ref={overviewHeading} tabIndex={-1}>{plan.readiness==='preparation'?'先确定出发和到达':`${plan.route.from} → ${plan.route.to}`}</h2>
      <p className="travel-dynamic-summary" role="status">{plan.summary}</p>
      <p className="travel-completion-count">已生成 {completion.generated} 项 / 满配 {completion.total} 项，尚有 {completion.locked} 项行动待补条件。</p>
      {completion.gaps.length>0&&<p>满配数量按当前路线、设备类别和适用行动估算，补充资料后会重新计算。</p>}
      {completion.gaps.length>0&&<p className="travel-task-state">缺少 {completion.gaps.length} 个参数：{completion.gaps.map(gap=>gap.label).join('、')}。</p>}
      <p>已勾选 {completed} / {actions.length} 项已生成行动。</p>
      <p>生成时间：{Number.isFinite(Date.parse(plan.generatedAt))?new Date(plan.generatedAt).toLocaleString('zh-CN'):plan.generatedAt}</p>
      {!props.online&&<p className="travel-task-state">当前离线：保留上次清单、电话和勾选进度。外部官网需联网后打开。</p>}
      <p role="status">{props.storageMessage}</p>
      <div className="travel-task-toolbar"><button onClick={props.onEdit}>修改方式、设备和行程</button><button onClick={props.onExport}>导出本次清单</button><button onClick={props.onClear}>清除本次出行数据</button></div>
      {props.hasBaseline?<div className="travel-diff-block"><p role="status" className="travel-change-status">较上次：新增 {changes.added.length} 条、删除 {changes.removed.length} 条、调整 {changes.updated.length} 条。</p>
        {changes.removed.length>0&&<details><summary>查看已移除的行动</summary><ul>{changes.removed.map((title,index)=><li key={index}>{title}</li>)}</ul></details>}
        {addedActions.length>0&&<div className="travel-new-actions"><h3>新增行动</h3>{addedActions.map(action=><button key={action.id} onClick={()=>jumpAction(action.id)} aria-label={'跳到新增行动：'+action.title}><span aria-hidden="true" className="travel-new-badge">新</span>{action.title}</button>)}</div>}
        {hasChanges&&<button onClick={()=>props.onOnlyNextChange(false)}>查看全部变化</button>}
      </div>:completion.locked>0&&<p className="travel-unlock-estimate">补齐{completion.gaps.some(gap=>['devices','dimensions','batteryType'].includes(gap.id))?'设备参数':'行程资料'}后，预计新增 {completion.estimatedAdditional} 项行动。首次生成尚无比较基线。</p>}
    </section>
    {completion.gaps.length>0&&<section className="travel-gap-section" aria-labelledby="travel-gap-heading"><h2 id="travel-gap-heading">还差哪些条件</h2><p>缺少的参数与待解锁行动分别计算；存在共同条件的行动只计算一次。</p><div className="travel-gap-cards">{completion.gaps.map(gap=>{
      const otherGaps=completion.gaps.filter(other=>other.id!==gap.id&&(gap.requires?.includes(other.id)??true))
      const shared=otherGaps.length>0,label=gap.id==='dimensions'?'设备尺寸':gap.label
      return <article className="travel-gap-card" key={gap.id}><h3>尚未填写{label}</h3><p>补{label}可{shared?'共同':''}解锁 {gap.unlocks} 项行动。</p>{shared&&<p>还需同时补齐：{otherGaps.map(other=>other.label).join('、')}。这些行动不会重复计数。</p>}<button type="button" data-gap-id={gap.id} aria-label={`补齐${label}，可${shared?'共同':''}解锁 ${gap.unlocks} 项行动`} aria-expanded={editor?.gap===gap.id} onClick={()=>openGap(gap.id)}>补齐{label}</button></article>
    })}</div></section>}
    {editor&&<TravelGapEditor focusGap={editor.gap} focusRequest={editor.request} availableDevices={props.availableDevices} devices={props.devices} specs={props.specs} context={props.context} mode={plan.mode} gaps={completion.gaps} onApply={patch=>{saveFocus.current=true;props.onCompleteGaps(patch);setEditor(null)}} onCancel={cancelEditor}/>}
    {plan.readiness!=='preparation'&&props.devices.length>0&&!editor&&<section className="travel-task-parameters" aria-label="逐项补充设备参数"><h2>按需要补一项</h2><p>已有设备参数直接复用。也可以通过上方补齐卡一次核对所缺资料。</p><TravelParameterGuide mode={plan.mode} devices={props.devices} specs={props.specs} onChange={props.onSpecChange} onCheck={()=>jump('travel-stage-before')} invalid={false}/></section>}
    <section className="travel-task-filter"><label className="switch-line"><input type="checkbox" checked={onlyNext} onChange={event=>{setShowActionId(null);props.onOnlyNextChange(event.target.checked)}} aria-describedby={descriptionId}/>仅显示需要我做的下一条</label><p id={descriptionId}>从当前已生成的 {actions.length} 项行动中依次显示下一项；关闭可回顾全部已生成和已勾选行动。待补条件的行动不计入已生成数量。</p></section>
    {actions.length>0&&!next&&<h2 ref={completeHeading} tabIndex={-1} className="travel-complete-message">已生成的行动已全部勾选。{completion.locked>0?`还有 ${completion.locked} 项行动需要补充条件。`:'可以回顾或修改行程。'}</h2>}
    {plan.readiness==='preparation'&&generic}
    <nav className="travel-stage-links" aria-label="清单阶段与通用建议">{plan.stages.map(stage=><a key={stage.id} href={'#travel-stage-'+stage.id} onClick={event=>{event.preventDefault();jump('travel-stage-'+stage.id)}}>{stage.title}【{stateText(stage)}】</a>)}{generalActions.length>0&&<a href="#travel-stage-general" onClick={event=>{event.preventDefault();jump('travel-stage-general')}}>通用</a>}</nav>
    {plan.stages.map(stage=><section id={'travel-stage-'+stage.id} tabIndex={-1} key={stage.id} className="travel-task-stage" aria-labelledby={'travel-heading-'+stage.id}><h2 id={'travel-heading-'+stage.id}>{stage.title}<span className="travel-stage-status">【{stateText(stage)}】</span></h2>{completion.stages[stage.id].missing.length>0&&<p className="travel-stage-missing">本段还缺：{completion.stages[stage.id].missing.join('、')}。</p>}{!stage.actions.length?<p className="travel-stage-empty">本段当前没有已生成行动：{stage.emptyReason||'请按上方缺口提示补充条件。'}</p>:<>{stage.actions.filter(visible).map(action=>renderAction(action))}{onlyNext&&!stage.actions.some(visible)&&<p>{stage.actions.every(isDone)?'本段已生成行动已勾选，关闭筛选可回顾。':`本段已有 ${stage.actions.length} 项可执行行动，当前显示其他阶段；关闭筛选可查看。`}</p>}</>}</section>)}
    {plan.readiness!=='preparation'&&generic}
    <section className="travel-task-contacts" aria-label="本次行程官方联系渠道"><h2>需要协助时，直接联系</h2>{plan.contacts.map(contact=><p key={contact.name}><strong>{contact.name}</strong>{phoneLink(contact.phone)&&<a href={phoneLink(contact.phone)}>拨打 {contact.phone}</a>}<a href={contact.url} target="_blank" rel="noopener noreferrer">官方入口 ↗</a></p>)}</section>
    <TravelCarryCard plan={plan}/>
    <div className="travel-task-toolbar"><PrimaryButton variant="secondary" onClick={props.onHelp}>展示求助沟通卡</PrimaryButton><button onClick={props.onAssistant}>围绕本次行程问文字助手</button><button onClick={props.onReport}>报告问题</button><button onClick={props.onBack}>返回首页</button></div>
    <p className="travel-task-disclaimer">完成上方准备动作后，请核对现场安排。仅供参考，以承运方书面确认为准。</p>
  </section>
}
