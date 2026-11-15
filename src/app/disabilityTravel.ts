import { copyDictionary } from "./copyDictionary.ts";
import {resolveTravelConflicts} from './travelConflicts.ts'
import {conflictCopy} from './uiCopy.ts'
import { categoryAdvice, combinationAdvice, deafblindAdvice } from './disabilityCopy.ts';
import { disabilityCategories, normalizeDisabilityProfile } from './disabilityProfile.ts';
import type { TravelPlanAction, TravelPlanInput, TravelTaskPlan } from './travelTaskTypes';
const stageIds = ['before', 'station', 'onboard', 'arrival', 'fallback'] as const;
const priorities = ['advance', 'access', 'communication', 'access', 'safety'] as const;
const rank = { safety: 0, advance: 1, access: 2, communication: 3, information: 4 };
/** Resolve alternative instructions for a shared step before exposing any row. */
export function applyDisabilityAdvice(plan: TravelTaskPlan, input: TravelPlanInput): TravelTaskPlan {
    const profile = normalizeDisabilityProfile(input.disabilityProfile);
    if (!profile.selections.length)
        return plan;
    const names = profile.selections.map(item => disabilityCategories.find(row => row.id === item.category)!.name);
    const selected = new Set(profile.selections.map(item => item.category));
    const pair = combinationAdvice.filter(rule => rule.categories.every(category => selected.has(category))).sort((a, b) => b.categories.length - a.categories.length)[0];
    const contact = plan.contacts[0];
    const from = plan.route.from, to = plan.route.to;
    const anchors: TravelPlanAction['anchors'] = [...(from ? [{ kind: 'from' as const, value: from }] : []), ...(to ? [{ kind: 'to' as const, value: to }] : [])];
    const ordered = profile.selections;
    const stages = plan.stages.map(stage => ({ ...stage, actions: stage.actions.map(action => ({ ...action, applicableCategories: [], conflictCategories: [], prerequisites: [], priority: priorities[stageIds.indexOf(stage.id)] })) as TravelPlanAction[] }));
    if(profile.selections.some(item=>item.accompaniment===true))for(const stage of stages)for(const action of stage.actions){
        const rewrite=(text:string)=>text.split(copyDictionary.ccda5d88bbeb31556).join(copyDictionary.accompanimentRequest).split(copyDictionary.c73240b51ebdf9759).join(copyDictionary.accompanimentScript)
        action.detail=rewrite(action.detail)
        if(action.verification)action.verification={...action.verification,question:rewrite(action.verification.question)}
    }
    for (let index = 0; index < 10; index++) {
        const stageIndex = Math.floor(index / 2), stage = stages.find(item => item.id === stageIds[stageIndex])!;
        const selection = ordered[index % ordered.length];
        let [title, detail] = selected.has('vision') && selected.has('hearing') ? deafblindAdvice[index] : categoryAdvice[selection.category][index];
        if (selected.has('physical') && selected.has('vision') && detail.includes(copyDictionary.cb720e6a9d6e8f113)) {
            title = copyDictionary.ce45cd6ec1d6e9b38;
            detail = copyDictionary.c2f8d3f100dc8341d;
        }
        if (selected.has('hearing') && selected.has('speech') && detail.includes(copyDictionary.cd04348062806ebd2))
            detail = copyDictionary.c138c75ecc20131b7;
        const assistance = selection.accompaniment === true ? copyDictionary.cbadf1bfe7cf7f90c : selection.accompaniment === false ? copyDictionary.c2250260849e070b5 : copyDictionary.cfc785c495d27b4a0;
        const combined = pair && (index === 2 || index === 6) ? pair.items[index === 2 ? 0 : 1] : null;
        const reason = combined ? copyDictionary.cd531d804dd576731 + pair!.categories.map(category => disabilityCategories.find(row => row.id === category)!.name).join(copyDictionary.cde1d5dd076fb7a70) + copyDictionary.c764baa37ad918780 + combined[1] : '';
        const advice = combined ? reason : detail;
        const question = copyDictionary.ce3b0c44298fc1c14 + (from ? from + copyDictionary.c8167d1d045fa6f23 : '') + (to ? copyDictionary.cfa96079c3b2f7341 + to + '。' : '') + advice + assistance + copyDictionary.cff5973ec5186f2ab;
        stage.actions.unshift({ id: `disability-${stage.id}-${index}`, title: combined ? combined[0] : title, detail: `${from ? from + copyDictionary.c8167d1d045fa6f23 : ''}${to ? copyDictionary.cfa96079c3b2f7341 + to + '。' : ''}${advice}${assistance}`, anchors,
            evidence: { level: 'inference', status: 'unverified', updatedAt: plan.generatedAt, officialUrl: contact.url, officialLabel: contact.name, sourceTitle: copyDictionary.cc0fea30c301fd06a },
            verification: { contact: contact.name, phone: contact.phone, question }, applicableCategories: combined ? [...pair!.categories] : [selection.category], conflictCategories: combined ? [...pair!.categories] : [], prerequisites: [copyDictionary.c6f0df1defa13dff4], priority: priorities[stageIndex],
            ...(combined ? { combined: { reason, replacedTitles: pair!.categories.map(category => categoryAdvice[category][index][0]), conflict: pair!.conflict } } : {}) });
    }
    const assisted = profile.selections.find(item => item.category === 'physical')?.accompaniment;
    if (assisted !== undefined) {
        const handoffs: Record<string, string> = { request: assisted ? copyDictionary.c504f32034dd7280b : copyDictionary.c854bf9406b4006a6, timing: assisted ? copyDictionary.c20828f8f1e30c6bf : copyDictionary.cbb8ed804f6d9675a, screening: assisted ? copyDictionary.c28dc960e9881f0d3 : copyDictionary.c05948ffa34e823df, position: assisted ? copyDictionary.cedd2964640a5c621 : copyDictionary.c9cf4c4450b62f8af, transfer: assisted ? copyDictionary.ce2cb6ad6fe6bbe09 : copyDictionary.cdd15dd33b12cb49e };
        for (const stage of stages)
            for (const action of stage.actions) {
                const key = action.id.slice(plan.mode.length + 1);
                if (handoffs[key]) {
                    action.detail += ' ' + handoffs[key];
                    if (action.verification)
                        action.verification = { ...action.verification, question: action.verification.question + ' ' + handoffs[key] };
                }
            }
    }
    const unavailable=new Set<string>([...(selected.has('vision')?['visual']:[]),...(selected.has('hearing')?['auditory']:[])])
    for(const stage of stages)for(const action of stage.actions){
        if(plan.mode==='rail'&&action.id===plan.mode+'-timing')action.constraints={task:'service-processing',minimumLeadMinutes:60}
        if((selected.has('mental')||selected.has('intellectual'))&&['disability-station-3','disability-before-1'].includes(action.id))action.constraints={task:'service-processing',minimizeWaiting:true}
    }
    const locations=new Map(stages.flatMap(stage=>stage.actions.map(action=>[action.id,stage.id] as const)))
    const resolved=resolveTravelConflicts(stages.flatMap(stage=>stage.actions),unavailable,conflict=>{
        const first=conflict.actions[0],timing=conflict.actions.find(action=>action.constraints?.minimumLeadMinutes!==undefined)
        const detail=(conflict.kind==='process'&&timing?timing.detail:from+' → '+to+'。')+conflictCopy.because+names.join('与')+conflictCopy.notApplicable+conflictCopy[conflict.kind]
        const action:TravelPlanAction={...first,id:'resolved-'+conflict.actions.map(item=>item.id).sort().join('-'),title:conflictCopy.title,detail,
          constraints:undefined,evidence:{...first.evidence,level:'inference',status:'unverified'},supportingEvidence:conflict.actions.flatMap(item=>[item.evidence,...item.supportingEvidence??[]]),
          applicableCategories:[...selected],combined:{reason:detail,replacedTitles:conflict.actions.map(item=>item.title),conflict:conflict.kind},verification:{contact:contact.name,phone:contact.phone,question:detail+conflictCopy.ask}}
        locations.set(action.id,locations.get(first.id)!)
        return action
    })
    for(const stage of stages)stage.actions=resolved.filter(action=>locations.get(action.id)===stage.id)
    for (const stage of stages)
        stage.actions.sort((a, b) => Number(Boolean(b.combined)) - Number(Boolean(a.combined)) || (rank[a.priority ?? 'information'] - rank[b.priority ?? 'information']));
    const completion = structuredClone(plan.completion);
    for (const stage of stages) {
        const old = plan.stages.find(row => row.id === stage.id)!;
        const added = stage.actions.length - old.actions.length;
        completion.stages[stage.id].generated += added;
        completion.stages[stage.id].total += added;
        if (stage.actions.length && completion.stages[stage.id].status === 'blocked')
            completion.stages[stage.id].status = 'partial';
    }
    completion.generated = stages.reduce((sum, stage) => sum + stage.actions.length, plan.generalActions.length);
    completion.total = Object.values(completion.stages).reduce((sum, stage) => sum + stage.total, plan.generalActions.length);
    if(!selected.has('physical')&&!plan.devices.length){
        completion.gaps=completion.gaps.filter(gap=>!['devices','dimensions','batteryType'].includes(gap.id))
        if(plan.route.from&&plan.route.to){for(const stage of Object.values(completion.stages)){stage.total=stage.generated;stage.status='ready';stage.missing=[]}completion.total=completion.generated}
    }
    completion.locked=completion.total-completion.generated
    completion.estimatedAdditional=completion.locked
    completion.statement = copyDictionary.c65b51163b0fc656f + completion.generated + copyDictionary.c8a5edab282632443 + completion.total + copyDictionary.ca2ecf815b7fb6f3e + (completion.gaps.length ? copyDictionary.ca18986c4ae092396 + completion.gaps.map(item => item.label).join('、') + '。' : '') + copyDictionary.c3d71af0d4cfb47d9;
    const combinedCount = stages.flatMap(stage => stage.actions).filter(item => item.combined).length;
    const labels = profile.selections.map((item, index) => names[index] + (item.grade ? ['', copyDictionary.c28b83c628f5b7f6e, copyDictionary.c3393c1261d42611d, copyDictionary.ccf4cd06c4ad7cda5, copyDictionary.c92b107d5d61a5a62][item.grade] : ''));
    return { ...plan, id: plan.id + '-' + JSON.stringify(profile), stages, completion, disabilityProfile: profile, summary: copyDictionary.cd18ed1a023116eb6 + labels.join(' + ') + (profile.selections.length >= 2 ? copyDictionary.c680680646c7ed9e6 : '') + copyDictionary.c1d6aacec71db32f9 + completion.generated + copyDictionary.c84c213ca05fb8064 + combinedCount + copyDictionary.ca2ecf815b7fb6f3e };
}
