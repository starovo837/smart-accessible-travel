import { useId, useState } from 'react'
import { PageHeader, PrimaryButton } from '../../components/UI'
import { copyText, phoneLink } from '../../app/accessibility'
import { getTravelMeta } from '../../app/catalog'
import { travelActionSignature } from '../../app/travelTaskStorage'
import type { TravelTaskPlan, TravelPlanAction } from '../../app/travelTaskTypes'
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
function ActionRow({ action, plan, done, onToggle }: { action: TravelPlanAction; plan: TravelTaskPlan; done: boolean; onToggle: () => void }) {
  const id = useId(), evidence = action.evidence
  const [copyStatus,setCopyStatus]=useState('')
  const historical = evidence.status === 'historical' || Boolean(evidence.expiresAt && Date.parse(evidence.expiresAt) < Math.max(Date.now(), Date.parse(plan.route.date) || 0))
  return <article className="travel-task-action" data-action-id={action.id}>
    <label className="travel-task-check" htmlFor={id}><input id={id} type="checkbox" checked={done} onChange={onToggle}/><strong>{action.title}</strong></label>
    <p>{action.detail}</p>
    <div className="travel-task-evidence"><span>依据等级：{evidenceLabels[evidence.level]}</span><span>更新时间：{dateLabel(evidence.updatedAt)}</span><a href={evidence.officialUrl} target="_blank" rel="noopener noreferrer">{evidence.officialLabel || '官方入口'} ↗</a></div>
    {evidence.level === 'inference' && <p className="travel-task-note">编排建议，按你填写的行程和资料整理。</p>}
    {(historical || evidence.status !== 'current') && <p className="travel-task-state">{historical ? '历史条款，可能已变更' : '待核实'}</p>}
    {action.verification && <div className="travel-task-question"><p><strong>联系谁：</strong>{action.verification.contact} {phoneLink(action.verification.phone) && <a href={phoneLink(action.verification.phone)}>拨打 {action.verification.phone}</a>}</p><p><strong>直接这样问：</strong>{action.verification.question}</p><button type="button" onClick={async () => setCopyStatus(await copyText(action.verification!.question) ? '问法已复制' : '复制未完成，可选择上方文字')}>复制这句问法</button>{copyStatus&&<p role="status">{copyStatus}</p>}</div>}
    {evidence.originalText && <details><summary>原文与生效日期</summary><p>生效日期：{dateLabel(evidence.effectiveDate)}</p><p>{evidence.sourceTitle}</p><blockquote>{evidence.originalText}</blockquote><a className="travel-official-verify" href={evidence.officialUrl} target="_blank" rel="noopener noreferrer">一键打开官方页面核验 ↗</a></details>}
    <span className="sr-only">{plan.route.from || '出发地未填写'}到{plan.route.to || '目的地未填写'}</span>
  </article>
}

interface Props {
  plan: TravelTaskPlan; checked: Record<string, string>; onToggle: (action: TravelPlanAction) => void
  devices: Device[]; specs: Record<string, TravelDeviceSpecs>; onSpecChange: (id: string, field: keyof TravelDeviceSpecs, value: unknown) => void
  onBack: () => void; onEdit: () => void; onExport: () => void; onClear: () => void
  onHelp: () => void; onReport: () => void; onAssistant: () => void
  storageMessage: string; online: boolean
}
export function TravelTaskResult(props: Props) {
  const { plan, checked, onToggle } = props, total = plan.stages.reduce((sum, stage) => sum + stage.actions.length, 0)
  const completed = plan.stages.flatMap(stage => stage.actions).filter(action => checked[action.id] === travelActionSignature(action, plan)).length
  return <section className="screen travel-task-result">
    <PageHeader title="出行行动清单" subtitle={getTravelMeta(plan.mode).label + ' · 按清单一步一步准备'} onBack={props.onBack}/>
    <section className="travel-task-overview" aria-label="本次行程与行动摘要"><h2>{plan.route.from || '出发地待补充'} → {plan.route.to || '目的地待补充'}</h2><p>出行日期：{plan.route.date || '可稍后补充'}</p><p>{plan.summary}</p><p role="status">已整理 {total} 项具体行动，完成 {completed} 项。参数补充后清单立即更新。</p><p>生成时间：{new Date(plan.generatedAt).toLocaleString('zh-CN')}</p>{!props.online && <p className="travel-task-state">当前离线：保留上次清单、电话和勾选进度。外部官网需联网后打开。</p>}<p role="status">{props.storageMessage}</p><div className="travel-task-toolbar"><button onClick={props.onEdit}>修改方式、设备和行程</button><button onClick={props.onExport}>导出本次清单</button><button onClick={props.onClear}>清除本次出行数据</button></div></section>
    {props.devices.length > 0 && <section className="travel-task-parameters" aria-label="逐项补充设备参数"><h2>只补一项，清单就会更新</h2><p>“我的设备”中已有的值直接复用，标为用户资料。未知项可以跳过，不影响使用下方行动清单。</p><TravelParameterGuide mode={plan.mode} devices={props.devices} specs={props.specs} onChange={props.onSpecChange} onCheck={() => document.getElementById('travel-stage-before')?.focus()} invalid={false}/></section>}
    <nav className="travel-stage-links" aria-label="清单五个阶段">{plan.stages.map(stage => <a key={stage.id} href={'#travel-stage-' + stage.id} onClick={event => { event.preventDefault(); const section = document.getElementById('travel-stage-' + stage.id); section?.scrollIntoView({block:'start'}); section?.focus() }}>{stage.title}</a>)}</nav>
    {plan.stages.map(stage => <section id={'travel-stage-' + stage.id} tabIndex={-1} key={stage.id} className="travel-task-stage" aria-labelledby={'travel-heading-' + stage.id}><h2 id={'travel-heading-' + stage.id}>{stage.title}</h2>{stage.actions.map(action => <ActionRow key={action.id} action={action} plan={plan} done={checked[action.id] === travelActionSignature(action, plan)} onToggle={() => onToggle(action)}/>)}</section>)}
    <section className="travel-task-contacts" aria-label="本次行程官方联系渠道"><h2>需要协助时，直接联系</h2>{plan.contacts.map(contact => <p key={contact.name}><strong>{contact.name}</strong>{phoneLink(contact.phone) && <a href={phoneLink(contact.phone)}>拨打 {contact.phone}</a>}<a href={contact.url} target="_blank" rel="noopener noreferrer">官方入口 ↗</a></p>)}</section>
    <TravelCarryCard plan={plan}/>
    <div className="travel-task-toolbar"><PrimaryButton variant="secondary" onClick={props.onHelp}>展示求助沟通卡</PrimaryButton><button onClick={props.onAssistant}>围绕本次行程问文字助手</button><button onClick={props.onReport}>报告问题</button><button onClick={props.onBack}>返回首页</button></div>
    <p className="travel-task-disclaimer">完成上方准备动作后，请核对现场安排。仅供参考，以承运方书面确认为准。</p>
  </section>
}
