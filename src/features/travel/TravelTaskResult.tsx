import { useEffect, useId, useRef, useState } from 'react'
import { PageHeader, PrimaryButton } from '../../components/UI'
import { copyText, phoneLink } from '../../app/accessibility'
import { getTravelMeta } from '../../app/catalog'
import { travelActionSignature } from '../../app/travelTaskStorage'
import { allTravelActions, type TravelTaskPlan, type TravelPlanAction } from '../../app/travelTaskTypes'
import type { Device, TravelDeviceSpecs } from '../../app/types'
import { TravelParameterGuide } from '../TravelParameterGuide'
import { TravelCarryCard } from './TravelCarryCard'
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
    {change&&<p className="travel-change-tag">{change==='added'?'本次新增':'本次已调整'}</p>}
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
}
export function TravelTaskResult(props: Props) {
  const {plan,checked,onToggle,changes}=props,onlyNext=props.onlyNext!==false
  const actions=allTravelActions(plan),generalActions=plan.generalActions??[],missing=plan.missingFields??[]
  const isDone=(action:TravelPlanAction)=>checked[action.id]===travelActionSignature(action,plan)
  const completed=actions.filter(isDone).length,next=actions.find(action=>!isDone(action))
  const specific=plan.stages.reduce((sum,stage)=>sum+stage.actions.length,0)
  const root=useRef<HTMLElement>(null),completeHeading=useRef<HTMLHeadingElement>(null),advanceFocus=useRef(false),descriptionId=useId()
  useEffect(()=>{if(advanceFocus.current){(root.current?.querySelector<HTMLElement>('.travel-task-action input[type="checkbox"]')??completeHeading.current)?.focus();advanceFocus.current=false}},[next?.id,completed,onlyNext])
  const visible=(action:TravelPlanAction)=>!onlyNext||action.id===next?.id
  const renderAction=(action:TravelPlanAction,general=false)=><ActionRow key={action.id} action={action} plan={plan} general={general} done={isDone(action)} change={changes.added.includes(action.id)?'added':changes.updated.includes(action.id)?'updated':undefined} onToggle={()=>{advanceFocus.current=onlyNext&&!isDone(action);onToggle(action)}}/>
  const jump=(id:string)=>{const section=document.getElementById(id);section?.scrollIntoView({block:'start'});section?.focus()}
  const generic=<section id="travel-stage-general" className="travel-task-stage travel-general-stage" tabIndex={-1} aria-labelledby="travel-heading-general"><h2 id="travel-heading-general">{plan.readiness==='preparation'?'通用预备段':'通用'}</h2>{generalActions.filter(visible).map(action=>renderAction(action,true))}{!generalActions.length&&<p>本次没有额外通用建议。</p>}{onlyNext&&generalActions.length>0&&!generalActions.some(visible)&&<p>{generalActions.every(isDone)?'本区行动已完成，关闭筛选可回顾。':"本区有 "+generalActions.length+" 项通用建议，当前下一项在其他阶段。"}</p>}</section>
  const hasChanges=changes.added.length+changes.removed.length+changes.updated.length>0
  return <section ref={root} className="screen travel-task-result">
    <PageHeader title={plan.readiness==='preparation'?'通用出行预备':'出行行动清单'} subtitle={getTravelMeta(plan.mode).label+' · 一次做一件事'} onBack={props.onBack}/>
    <section className="travel-task-overview" aria-label="本次行程与行动摘要">
      <h2>{plan.readiness==='preparation'?'先确定出发和到达':`${plan.route.from} → ${plan.route.to}`}</h2>
      <p className="travel-dynamic-summary">{plan.summary}</p><p>当前完成 {completed} / {actions.length} 项。</p>
      <p>生成时间：{Number.isFinite(Date.parse(plan.generatedAt))?new Date(plan.generatedAt).toLocaleString('zh-CN'):plan.generatedAt}</p>
      {plan.readiness!=='complete'&&<p className="travel-task-state">{plan.readiness==='preparation'?'填写出发到达后，为你生成站内与接驳的专属行动。':missing.includes('devices')?'已整理站点相关行动，设备相关安排待选设备后补充。':'补充出行日期后，完善预约和到达交接安排。'}</p>}
      {!props.online&&<p className="travel-task-state">当前离线：保留上次清单、电话和勾选进度。外部官网需联网后打开。</p>}
      <p role="status">{props.storageMessage}</p>
      <div className="travel-task-toolbar"><button onClick={props.onEdit}>修改方式、设备和行程</button><button onClick={props.onExport}>导出本次清单</button><button onClick={props.onClear}>清除本次出行数据</button></div>
      <p role="status" className="travel-change-status">本次变化：新增 {changes.added.length} 条，删除 {changes.removed.length} 条，调整 {changes.updated.length} 条。</p>
      {changes.removed.length>0&&<details><summary>查看已移除的行动</summary><ul>{changes.removed.map((title,index)=><li key={index}>{title}</li>)}</ul></details>}
      {hasChanges&&<button onClick={()=>props.onOnlyNextChange(false)}>查看本次变化</button>}
    </section>
    {plan.readiness!=='preparation'&&missing.includes('devices')&&<section className="travel-device-placeholder" aria-label="设备安排占位卡"><h2>待选设备后补充</h2><p>选定辅具后，再补充打包、设备固定、电池和携带安排。这张提示卡不会写入沟通话术。</p><button onClick={props.onChooseDevice}>选择所带设备</button></section>}
    {plan.readiness!=='preparation'&&props.devices.length>0&&<section className="travel-task-parameters" aria-label="逐项补充设备参数"><h2>按需要补一项</h2><p>已有设备参数直接复用，补充时行动立即重算。</p><TravelParameterGuide mode={plan.mode} devices={props.devices} specs={props.specs} onChange={props.onSpecChange} onCheck={()=>jump('travel-stage-before')} invalid={false}/></section>}
    <section className="travel-task-filter"><label className="switch-line"><input type="checkbox" checked={onlyNext} onChange={event=>props.onOnlyNextChange(event.target.checked)} aria-describedby={descriptionId}/>仅显示需要我做的下一条</label><p id={descriptionId}>开启后，从 {specific} 项专属行动和 {generalActions.length} 项通用建议中依次显示下一项；关闭可回顾全量及已完成行动。</p></section>
    {actions.length>0&&!next&&<h2 ref={completeHeading} tabIndex={-1} className="travel-complete-message">本次清单已全部勾选完成，可以回顾或修改行程。</h2>}
    {plan.readiness==='preparation'&&generic}
    <nav className="travel-stage-links" aria-label="清单阶段与通用建议">{plan.stages.map(stage=><a key={stage.id} href={'#travel-stage-'+stage.id} onClick={event=>{event.preventDefault();jump('travel-stage-'+stage.id)}}>{stage.title}</a>)}{generalActions.length>0&&<a href="#travel-stage-general" onClick={event=>{event.preventDefault();jump('travel-stage-general')}}>通用</a>}</nav>
    {plan.stages.map(stage=><section id={'travel-stage-'+stage.id} tabIndex={-1} key={stage.id} className="travel-task-stage" aria-labelledby={'travel-heading-'+stage.id}><h2 id={'travel-heading-'+stage.id}>{stage.title}</h2>{!stage.actions.length?<p className="travel-stage-empty">本段本次无适用行动：{stage.emptyReason||'此阶段没有匹配当前信息的任务。'}</p>:<>{stage.actions.filter(visible).map(action=>renderAction(action))}{onlyNext&&!stage.actions.some(visible)&&<p>{stage.actions.every(isDone)?'本段行动已完成，关闭筛选可回顾。':`本段有 ${stage.actions.length} 项专属行动，当前下一项在其他阶段；关闭筛选可查看。`}</p>}</>}</section>)}
    {plan.readiness!=='preparation'&&generic}
    <section className="travel-task-contacts" aria-label="本次行程官方联系渠道"><h2>需要协助时，直接联系</h2>{plan.contacts.map(contact => <p key={contact.name}><strong>{contact.name}</strong>{phoneLink(contact.phone) && <a href={phoneLink(contact.phone)}>拨打 {contact.phone}</a>}<a href={contact.url} target="_blank" rel="noopener noreferrer">官方入口 ↗</a></p>)}</section>
    <TravelCarryCard plan={plan}/>
    <div className="travel-task-toolbar"><PrimaryButton variant="secondary" onClick={props.onHelp}>展示求助沟通卡</PrimaryButton><button onClick={props.onAssistant}>围绕本次行程问文字助手</button><button onClick={props.onReport}>报告问题</button><button onClick={props.onBack}>返回首页</button></div>
    <p className="travel-task-disclaimer">完成上方准备动作后，请核对现场安排。仅供参考，以承运方书面确认为准。</p>
  </section>
}
