import { copyDictionary } from "../../app/copyDictionary.ts";
import { publicSourceDate } from '../../app/sourceDate';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { PageHeader, PrimaryButton } from '../../components/UI';
import { copyText, phoneLink, readText } from '../../app/accessibility';
import { uiCopy } from '../../app/uiCopy';
import { getTravelMeta } from '../../app/catalog';
import { travelActionSignature } from '../../app/travelTaskStorage';
import { allTravelActions, travelReadingText, type TravelTaskPlan, type TravelPlanAction } from '../../app/travelTaskTypes';
import type { Device, TravelContext, TravelDeviceSpecs } from '../../app/types';
import { TravelParameterGuide } from '../TravelParameterGuide';
import { TravelCarryCard } from './TravelCarryCard';
import { TravelGapEditor, type TravelGapPatch } from './TravelGapEditor';
import {TravelSpecReview} from './TravelSpecReview';
import '../../travel-task.css';
import { disabilityCategories } from '../../app/disabilityProfile';
import { disabilityNotice } from '../../app/disabilityCopy';
const evidenceLabels = uiCopy.evidence;
function dateLabel(value?: string | null) {
    if (!value)
        return copyDictionary.c82f562a3c50336ba;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? publicSourceDate(value) : value.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, stamp => new Date(stamp).toLocaleString('zh-CN'));
}
interface TravelChanges {
    added: string[];
    removed: string[];
    updated: string[];
}
function ActionRow({ action, plan, done, onToggle, general, change }: {
    action: TravelPlanAction;
    plan: TravelTaskPlan;
    done: boolean;
    onToggle: () => void;
    general?: boolean;
    change?: 'added' | 'updated';
}) {
    const id = useId(), evidence = action.evidence;
    const [copyStatus, setCopyStatus] = useState('');
    useEffect(() => setCopyStatus(''), [action.verification?.question]);
    const historical = evidence.status === 'historical' || Boolean(evidence.expiresAt && Date.parse(evidence.expiresAt) < Math.max(Date.now(), Date.parse(plan.route.date) || 0));
    return <article className={`travel-task-action${change ? ' travel-action-changed' : ''}`} data-action-id={action.id} data-change={change}>
    {change && <p className="travel-change-tag">{change === 'added' ? copyDictionary.c3cc493bc5b3b9b51 : copyDictionary.c059fe7a766d0491b}</p>}
    <label className="travel-task-check" htmlFor={id}><input id={id} type="checkbox" checked={done} onChange={onToggle}/><strong>{action.title}</strong></label>
    <p>{action.detail}</p>
    {action.applicableCategories?.length ? <div className="disability-badges">{action.applicableCategories.map(category => <span key={category}>{disabilityCategories.find(item => item.id === category)!.name}</span>)}</div> : null}
    {action.combined && <aside className="travel-replaced-advice"><p>{copyDictionary.c62ce327a2a8d1c5e}{action.combined.replacedTitles.join('；')}。</p></aside>}
    {!general && action.anchors?.length > 0 && <p className="travel-anchor-summary">{copyDictionary.c2b0257013a50be65}{[...new Set(action.anchors.filter(anchor => anchor.kind !== 'mode').map(anchor => anchor.label ? anchor.label + ' ' + anchor.value : anchor.value))].slice(0, 4).join(' · ')}</p>}
    <div className="travel-task-evidence"><span>{evidenceLabels[evidence.level]}{evidence.updatedAt ? <>。{evidence.level === 'inference' ? <>{uiCopy.recorded}<time dateTime={evidence.updatedAt}>{dateLabel(evidence.updatedAt)}</time></> : evidence.updatedAt.replace(/\d{4}-\d{2}-\d{2}/g, publicSourceDate)}。</> : null}</span><a href={evidence.officialUrl} target="_blank" rel="noopener noreferrer">{evidence.officialLabel || copyDictionary.cb269e548f439c520} ↗</a></div>
    {evidence.level === 'inference' && <p className="travel-task-note">{uiCopy.verify}</p>}
    {(historical || evidence.status !== 'current') && <p className="travel-task-state">{historical ? copyDictionary.cb14e9a4cc9172010 : copyDictionary.cccf9206892f889b7}</p>}
    {action.verification && <div className="travel-task-question"><p><strong>{copyDictionary.c42742c6ee2ebbd99}</strong>{action.verification.contact} {phoneLink(action.verification.phone) && <a href={phoneLink(action.verification.phone)}>{copyDictionary.cd92c3bb46b1083b8}{action.verification.phone}</a>}</p><p><strong>{copyDictionary.cd5fefeee517f3b43}</strong>{action.verification.question}</p><button type="button" onClick={async () => setCopyStatus(await copyText(action.verification!.question) ? copyDictionary.c8ad55b21ac030ec5 : copyDictionary.c26c9ce501bce4ae7)}>{copyDictionary.cd62e87e750a4e365}</button>{copyStatus && <p role="status">{copyStatus}</p>}</div>}
    {evidence.originalText && <details><summary>{copyDictionary.cae463b9bbf993b5f}</summary><p>{copyDictionary.c0479208be8b813fb}{dateLabel(evidence.effectiveDate)}</p><p>{evidence.sourceTitle}</p><blockquote>{evidence.originalText}</blockquote><a className="travel-official-verify" href={evidence.officialUrl} target="_blank" rel="noopener noreferrer">{copyDictionary.ca68e393c5479f0cf}</a></details>}
  </article>;
}
interface Props {
    legacySpecs?: boolean;
    coverage?: ReactNode;
    plan: TravelTaskPlan;
    checked: Record<string, string>;
    onToggle: (action: TravelPlanAction) => void;
    devices: Device[];
    specs: Record<string, TravelDeviceSpecs>;
    onSpecChange: (id: string, field: keyof TravelDeviceSpecs, value: unknown) => void;
    onBack: () => void;
    onEdit: () => void;
    onChooseDevice: () => void;
    onExport: () => void;
    onClear: () => void;
    onHelp: () => void;
    onReport: () => void;
    onAssistant: () => void;
    storageMessage: string;
    online: boolean;
    onlyNext: boolean;
    onOnlyNextChange: (value: boolean) => void;
    changes: TravelChanges;
    hasBaseline: boolean;
    completionUpdate: boolean;
    availableDevices: Device[];
    context: TravelContext;
    onCompleteGaps: (patch: TravelGapPatch) => void;
}
export function TravelTaskResult(props: Props) {
    const { plan, checked, onToggle, changes } = props, onlyNext = props.onlyNext !== false, completion = plan.completion;
    const actions = allTravelActions(plan), generalActions = plan.generalActions ?? [];
    const isDone = (action: TravelPlanAction) => checked[action.id] === travelActionSignature(action, plan);
    const completed = actions.filter(isDone).length, next = actions.find(action => !isDone(action));
    const [editor, setEditor] = useState<{
        gap: string;
        request: number;
    } | null>(null), [showActionId, setShowActionId] = useState<string | null>(null), [jumpRequest, setJumpRequest] = useState(0), [expandedStages, setExpandedStages] = useState<Set<string>>(() => new Set());
    const selectedId = showActionId && actions.some(action => action.id === showActionId) ? showActionId : next?.id;
    const root = useRef<HTMLElement>(null), overviewHeading = useRef<HTMLHeadingElement>(null), completeHeading = useRef<HTMLHeadingElement>(null), advanceFocus = useRef(false), pendingJump = useRef<string | null>(null), saveFocus = useRef(false), descriptionId = useId();
    useEffect(() => { if (advanceFocus.current) {
        (root.current?.querySelector<HTMLElement>('.travel-task-action input[type="checkbox"]') ?? completeHeading.current)?.focus();
        advanceFocus.current = false;
    } }, [selectedId, completed, onlyNext]);
    useEffect(() => { if (pendingJump.current) {
        const row = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-action-id]') ?? []).find(item => item.dataset.actionId === pendingJump.current);
        if (row) {
            row.scrollIntoView({ block: 'center' });
            row.querySelector<HTMLElement>('input[type="checkbox"]')?.focus();
            pendingJump.current = null;
        }
    } }, [jumpRequest, selectedId, plan.id]);
    useEffect(() => { if (saveFocus.current && !editor) {
        overviewHeading.current?.focus();
        saveFocus.current = false;
    } }, [plan.id, editor]);
    const visible = (action: TravelPlanAction, stageId?: string) => !onlyNext || Boolean(stageId && expandedStages.has(stageId)) || action.id === selectedId;
    const renderAction = (action: TravelPlanAction, general = false) => <ActionRow key={action.id} action={action} plan={plan} general={general} done={isDone(action)} change={!props.hasBaseline ? undefined : changes.added.includes(action.id) ? 'added' : !props.completionUpdate && changes.updated.includes(action.id) ? 'updated' : undefined} onToggle={() => { advanceFocus.current = onlyNext && !isDone(action); if (onlyNext)
        setShowActionId(null); onToggle(action); }}/>;
    const jump = (id: string) => { const section = document.getElementById(id); section?.scrollIntoView({ block: 'start' }); section?.focus(); };
    const jumpAction = (id: string) => { pendingJump.current = id; setShowActionId(id); setJumpRequest(value => value + 1); };
    const collapsedSummary = (id: string, items: TravelPlanAction[]) => <div className="travel-stage-collapsed" aria-label={copyDictionary.c3a53f604efdbc994 + items.length + copyDictionary.cf9d529eacdf392b4}><p><strong>{copyDictionary.c6c615c20e566ad47}</strong>{items.slice(0, 2).map(item => item.title).join('；')}{items.length > 2 ? '……' : ''}</p><button type="button" onClick={() => setExpandedStages(current => new Set([...current, id]))} aria-label={copyDictionary.c5464fe69624950e3 + items.length + copyDictionary.cf9d529eacdf392b4}>{copyDictionary.c3f9579cca67c2156}{items.length}{copyDictionary.cf9d529eacdf392b4}</button></div>;
    const renderStageActions = (stage: TravelTaskPlan['stages'][number]) => {
        const shown = stage.actions.filter(action => visible(action, stage.id)), combined = shown.filter(action => action.combined), ordinary = shown.filter(action => !action.combined);
        return <>{combined.length > 0 && <section className="disability-combined" aria-label={stage.title + copyDictionary.c470088b8d9ab6534}><h3>{copyDictionary.c2c64a2cfca3335e4}</h3>{combined.map(action => renderAction(action))}</section>}{ordinary.map(action => renderAction(action))}</>;
    };
    const generic = <section id="travel-stage-general" className="travel-task-stage travel-general-stage" tabIndex={-1} aria-labelledby="travel-heading-general"><h2 id="travel-heading-general">{plan.readiness === 'preparation' ? copyDictionary.c8169a531e8220fbc : copyDictionary.c835b700e028c9b20}</h2>{generalActions.filter(action => visible(action, 'general')).map(action => renderAction(action, true))}{!generalActions.length && <p>{copyDictionary.ca833b36c45c2293b}</p>}{onlyNext && generalActions.length > 0 && !expandedStages.has('general') && collapsedSummary('general', generalActions)}</section>;
    const addedActions = actions.filter(action => changes.added.includes(action.id));
    const hasChanges = changes.added.length + changes.removed.length + changes.updated.length > 0;
    const stateText = (stage: TravelTaskPlan['stages'][number]) => { const state = completion.stages[stage.id]; return stage.id === 'fallback' || state.status === 'ready' ? copyDictionary.cab27f80d046f3d7f : state.status === 'blocked' ? copyDictionary.c2b1e313b14fdf4a2 : copyDictionary.c2424e2e6e067fd4a + state.generated + copyDictionary.c8a5edab282632443 + state.total; };
    const openGap = (gap: string) => setEditor(current => ({ gap, request: (current?.request ?? 0) + 1 }));
    const cancelEditor = () => { const gap = editor?.gap; setEditor(null); requestAnimationFrame(() => { Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-gap-id]') ?? []).find(button => button.dataset.gapId === gap)?.focus(); }); };
    return <section ref={root} className="screen travel-task-result">
    <PageHeader title={plan.readiness === 'preparation' ? copyDictionary.c604dad45b34f0c19 : copyDictionary.c29019cc705a783b0} subtitle={getTravelMeta(plan.mode).label + copyDictionary.c589b9619949d5699} onBack={props.onBack}/>
    {props.coverage}
    <section className="travel-task-overview" aria-label={copyDictionary.cbace92d4e9764628}>
      <h2 ref={overviewHeading} tabIndex={-1}>{plan.readiness === 'preparation' ? copyDictionary.cabbcead62c7a81ec : `${plan.route.from} → ${plan.route.to}`}</h2>
      <p className="travel-dynamic-summary" role="status">{plan.summary}</p>
      <p className="travel-completion-count">{uiCopy.completion(completion.generated, completion.total)}{copyDictionary.c83eec76b39115f38}{completion.locked}{copyDictionary.c267a72280ab372ce}</p>
      {completion.gaps.length > 0 && <p>{copyDictionary.c820a748cf8bd2ea8}</p>}
      {completion.gaps.length > 0 && <p className="travel-task-state">{uiCopy.missing(completion.gaps.length)}{completion.gaps.map(gap => gap.label).join('、')}。</p>}
      <p>{copyDictionary.c0aefdf6434d26e0e}{completed} / {actions.length}{copyDictionary.ca2ecf815b7fb6f3e}</p>
      <button type="button" onClick={() => void readText(travelReadingText(plan, copyDictionary.c835b700e028c9b20, copyDictionary.cf97bbbbc2c41e888))}>{uiCopy.readAll}</button>
      {!props.online && <p className="travel-task-state">{copyDictionary.c68414ac543532db5}</p>}
      <p role="status">{props.storageMessage}</p>
      <div className="travel-task-toolbar"><button onClick={props.onEdit}>{copyDictionary.c7ce97d15f35a17cc}</button><button onClick={props.onExport}>{copyDictionary.ce9698c11696db611}</button><button onClick={props.onClear}>{copyDictionary.c1ea3a4a33889671a}</button></div>
      {props.hasBaseline ? <div className="travel-diff-block"><p role="status" className="travel-change-status">{copyDictionary.c99f168789c4ad007}{changes.added.length}{copyDictionary.c9e0ed19b1e6e61f4}{changes.removed.length}{copyDictionary.ccc9c006f62bfa8e5}{changes.updated.length}{copyDictionary.cc8bf29372979066b}</p>
        {changes.removed.length > 0 && <details><summary>{copyDictionary.c30f10ff36248a36a}</summary><ul>{changes.removed.map((title, index) => <li key={index}>{title}</li>)}</ul></details>}
        {addedActions.length > 0 && <div className="travel-new-actions"><h3>{copyDictionary.c13cb2dff0bb0291e}</h3>{addedActions.map(action => <button key={action.id} onClick={() => jumpAction(action.id)} aria-label={copyDictionary.c48883a9799a5f6ab + action.title}><span aria-hidden="true" className="travel-new-badge">{copyDictionary.c3cc493bc5b3b9b51}</span>{action.title}</button>)}</div>}
        {hasChanges && <button onClick={() => props.onOnlyNextChange(false)}>{copyDictionary.c142c2f5af71bb902}</button>}
      </div> : completion.locked > 0 && <p className="travel-unlock-estimate">{copyDictionary.c31c75481d22af1cc}{completion.estimatedAdditional}{copyDictionary.ca2ecf815b7fb6f3e}</p>}
    </section>
    {completion.gaps.length > 0 && <section className="travel-gap-section" aria-labelledby="travel-gap-heading"><h2 id="travel-gap-heading">{copyDictionary.cf8d3a2f44c91c5a0}</h2><p className="travel-gap-summary">{copyDictionary.c9b892087bc3ab66b}{completion.gaps.length}{copyDictionary.ccbec1407628ffd08}{completion.locked}{copyDictionary.c62aeaa7cc69bea52}{completion.gaps.map(gap => gap.id === 'dimensions' ? copyDictionary.c246df7d8db841735 : gap.label).join('、')}。</p><div className="travel-gap-cards">{completion.gaps.map(gap => {
                const label = gap.id === 'dimensions' ? copyDictionary.c24c5addafd7dcbe1 : gap.label;
                return <article className="travel-gap-card" key={gap.id}><h3>{copyDictionary.c1c64182187debf5b}{label}</h3><p>{copyDictionary.c1739d8c9466d163f}</p><button type="button" data-gap-id={gap.id} aria-label={copyDictionary.c83e147edba70c301 + label + copyDictionary.c8682ab466e619a80 + completion.locked + copyDictionary.c6bb32451f0fcbee1} aria-expanded={editor?.gap === gap.id} onClick={() => openGap(gap.id)}>{copyDictionary.c83e147edba70c301}</button></article>;
            })}</div></section>}
    {editor && <TravelGapEditor focusGap={editor.gap} focusRequest={editor.request} availableDevices={props.availableDevices} devices={props.devices} specs={props.specs} context={props.context} mode={plan.mode} gaps={completion.gaps} onApply={patch => { saveFocus.current = true; props.onCompleteGaps(patch); setEditor(null); }} onCancel={cancelEditor}/>}
    {!editor && <TravelSpecReview devices={props.devices} specs={props.specs} onChange={props.onSpecChange} legacy={props.legacySpecs}/>}
    {plan.readiness !== 'preparation' && props.devices.length > 0 && !editor && <section className="travel-task-parameters" aria-label={copyDictionary.ceb00d20222a3df6d}><h2>{copyDictionary.cd5d1477276bb384a}</h2><p>{copyDictionary.c82612ef13c5cfc14}</p><TravelParameterGuide mode={plan.mode} devices={props.devices} specs={props.specs} onChange={props.onSpecChange} onCheck={() => jump('travel-stage-before')} invalid={false}/></section>}
    <section className="travel-task-filter"><label className="switch-line"><input type="checkbox" checked={onlyNext} onChange={event => { setShowActionId(null); setExpandedStages(new Set()); props.onOnlyNextChange(event.target.checked); }} aria-describedby={descriptionId}/>{copyDictionary.c493e833cbe9db317}</label><p id={descriptionId}>{copyDictionary.cd1a9708085361c76}</p></section>
    {actions.length > 0 && !next && <h2 ref={completeHeading} tabIndex={-1} className="travel-complete-message">{copyDictionary.c53077bd9635bc933}{completion.locked > 0 ? copyDictionary.c1a1f6f3d0815afa1 + completion.locked + copyDictionary.c09f957fca77486ff : copyDictionary.ceebe649d7f9ba9ea}</h2>}
    {plan.readiness === 'preparation' && generic}
    <nav className="travel-stage-links" aria-label={copyDictionary.cfe6040ca598e3236}>{plan.stages.map(stage => <a key={stage.id} href={'#travel-stage-' + stage.id} onClick={event => { event.preventDefault(); jump('travel-stage-' + stage.id); }}>{stage.title}【{stateText(stage)}】</a>)}{generalActions.length > 0 && <a href="#travel-stage-general" onClick={event => { event.preventDefault(); jump('travel-stage-general'); }}>{copyDictionary.c835b700e028c9b20}</a>}</nav>
    {plan.stages.map(stage => <section id={'travel-stage-' + stage.id} tabIndex={-1} key={stage.id} className="travel-task-stage" aria-labelledby={'travel-heading-' + stage.id}><h2 id={'travel-heading-' + stage.id}>{stage.title}<span className="travel-stage-status">【{stateText(stage)}】</span></h2>{completion.stages[stage.id].missing.length > 0 && <p className="travel-stage-missing">{copyDictionary.c38983a7d83f4afba}{completion.stages[stage.id].missing.join('、')}。</p>}{!stage.actions.length ? <p className="travel-stage-empty">{copyDictionary.c6429263012245dae}{stage.emptyReason}</p> : <>{renderStageActions(stage)}{onlyNext && !expandedStages.has(stage.id) && collapsedSummary(stage.id, stage.actions)}</>}</section>)}
    {plan.readiness !== 'preparation' && generic}
    <section className="travel-task-contacts" aria-label={copyDictionary.cec7a68a2ac4f62d5}><h2>{copyDictionary.cf97bbbbc2c41e888}</h2>{plan.contacts.map(contact => <p key={contact.name}><strong>{contact.name}</strong>{phoneLink(contact.phone) && <a href={phoneLink(contact.phone)}>{copyDictionary.cd92c3bb46b1083b8}{contact.phone}</a>}<a href={contact.url} target="_blank" rel="noopener noreferrer">{copyDictionary.c940a7bc830f68b0a}</a></p>)}</section>
    <TravelCarryCard plan={plan}/>
    <div className="travel-export-footer"><button type="button" className="button-primary" onClick={props.onExport}>{copyDictionary.ce9698c11696db611}</button><p>{copyDictionary.ca3c376f4d901133a}</p></div>
    <div className="travel-task-toolbar"><PrimaryButton variant="secondary" onClick={props.onHelp}>{copyDictionary.cc75fb8984dc11046}</PrimaryButton><button onClick={props.onAssistant}>{copyDictionary.ccca8ffca6df158a0}</button><button onClick={props.onReport}>{copyDictionary.c0f7d68ecdcf65b2d}</button><button onClick={props.onBack}>{copyDictionary.cd66f4359dae37110}</button></div>
    <p className="travel-task-disclaimer">{copyDictionary.c48ecb942a1cebf0a}</p>
    {plan.disabilityProfile && <p>{disabilityNotice}</p>}
  </section>;
}
