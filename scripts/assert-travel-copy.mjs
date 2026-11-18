const confirmedGuardSpecs = raw => ({...raw,confirmed:Object.fromEntries(Object.keys(raw).map(field=>[field,true]))}) // Reviewed synthetic guard fixtures only.
import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {travelCarryCardContent} from '../src/app/travelCarryCard.ts'
import {ruleCatalog} from '../src/app/ruleCatalog.ts'
import {safeOfficialTravelUrl} from '../src/app/travelPlanSources.ts'

export const TRAVEL_PLACEHOLDER_PATTERN = /（?(未选择|待填写|暂未)/u
const stageIds = ['before', 'station', 'onboard', 'arrival', 'fallback']
const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\p{P}\p{S}\s]+/gu, '')
const actions = plan => [...(plan.stages ?? []).flatMap(stage => stage.actions ?? []), ...(plan.generalActions ?? [])]
const copyFields = action => [action.title, action.detail, action.verification?.question].filter(Boolean)

export class TravelCopyGuardError extends Error {
  constructor(paths) {
    const unique = [...new Set(paths)]
    super('Travel copy guard failed at: ' + unique.join(', '))
    this.name = 'TravelCopyGuardError'
    this.paths = unique
  }
}

function scanStrings(value, path, bad, state) {
  if (typeof value === 'string') {
    state.checkedFields++
    if (TRAVEL_PLACEHOLDER_PATTERN.test(value)) bad.push(path)
  } else if (Array.isArray(value)) value.forEach((item, index) => scanStrings(item, `${path}[${index}]`, bad, state))
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) scanStrings(item, `${path}.${key}`, bad, state)
}

/** Checks actual user-facing and exported text, never UI placeholder-card labels or identifiers. */
export function assertTravelCopy(plan, {carryContent = travelCarryCardContent(plan), exportPayload} = {}) {
  const bad = [], state = {checkedFields: 0}
  scanStrings(plan.summary, 'plan.summary', bad, state)
  scanStrings(plan.completion, 'plan.completion', bad, state)
  scanStrings(plan.route, 'plan.route', bad, state)
  scanStrings(plan.devices?.map(device => ({name: device.name})), 'plan.devices', bad, state)
  scanStrings(plan.contacts, 'plan.contacts', bad, state)
  for (const [stageIndex, stage] of (plan.stages ?? []).entries()) {
    scanStrings(stage.title, `plan.stages[${stageIndex}].title`, bad, state)
    scanStrings(stage.emptyReason, `plan.stages[${stageIndex}].emptyReason`, bad, state)
    for (const [index, action] of (stage.actions ?? []).entries()) scanAction(action, `plan.stages[${stageIndex}].actions[${index}]`)
  }
  for (const [index, action] of (plan.generalActions ?? []).entries()) scanAction(action, `plan.generalActions[${index}]`)
  scanStrings(carryContent, 'carryCardContent', bad, state)
  if (exportPayload !== undefined) scanStrings(exportPayload, 'export', bad, state)
  if (bad.length) throw new TravelCopyGuardError(bad)
  return state

  function scanAction(action, prefix) {
    for (const key of ['title', 'detail']) scanStrings(action[key], `${prefix}.${key}`, bad, state)
    scanStrings(action.verification, `${prefix}.verification`, bad, state)
    for (const key of ['officialLabel', 'sourceTitle', 'originalText']) scanStrings(action.evidence?.[key], `${prefix}.evidence.${key}`, bad, state)
  }
}

const grams = value => {
  const points = Array.from(normalize(value))
  return new Set(points.length < 2 ? points : points.slice(0, -1).map((character, index) => character + points[index + 1]))
}

/** Dice similarity of normalized visible title bigrams; IDs and dates have no role. */
export function travelTitleSimilarity(left, right) {
  const a = grams(left), b = grams(right)
  if (!a.size && !b.size) return 1
  const overlap = [...a].filter(gram => b.has(gram)).length
  return 2 * overlap / (a.size + b.size)
}

/** Symmetric changed-action ratio over visible title/detail/question content. */
export function travelPlanDifference(left, right) {
  const a = new Set(actions(left).map(action => copyFields(action).map(normalize).join('|')))
  const b = new Set(actions(right).map(action => copyFields(action).map(normalize).join('|')))
  if (!a.size && !b.size) return 0
  const unchanged = [...a].filter(copy => b.has(copy)).length
  return 1 - 2 * unchanged / (a.size + b.size)
}

function realAnchor(anchor, plan, action, input) {
  if (!anchor || typeof anchor.value !== 'string' || !anchor.value.trim()) return false
  const value = normalize(anchor.value), visible = normalize(copyFields(action).join(' ')), route = plan.route ?? {}
  const matches = values => values.some(item => item !== undefined && item !== '' && normalize(item) === value)
  // A metadata tag is not personalization. The supplied fact must be visible in
  // the actual instruction or question, and mode/city alone cannot promote it.
  if (['mode', 'city', 'carrier'].includes(anchor.kind)) return false
  if (anchor.kind !== 'spec' && !visible.includes(value)) return false
  switch (anchor.kind) {
    case 'from': return matches([route.from])
    case 'to': return matches([route.to])
    case 'date': return matches([route.date])
    case 'device': return (plan.devices ?? []).some(device => matches([device.id, device.name, device.type]))
    case 'companion': return Number.isInteger(plan.companionCount) && plan.companionCount >= 0 && matches([String(plan.companionCount), `${plan.companionCount}人`, `${plan.companionCount}人陪同`])
    case 'spec': {
      const numeric = anchor.value.match(/\d+(?:\.\d+)?/g) ?? []
      const visibleNumbers = copyFields(action).join(' ').match(/\d+(?:\.\d+)?/g) ?? []
      if (numeric.length) return numeric.every(number => visibleNumbers.includes(number)) && (plan.devices ?? []).some(device => {
        const facts = Object.values(device.specs ?? {}).filter(spec => typeof spec === 'number').map(String)
        return numeric.every(number => facts.includes(number))
      })
      const aliases = {none:['无电池','不含电池'],lithium:['锂电池','锂电'],other:['其他电池']}
      return visible.includes(value) && (plan.devices ?? []).some(device => Object.values(device.specs ?? {}).some(spec => typeof spec === 'string' && [spec,...(aliases[spec]??[])].some(alias => normalize(alias) === value)))
    }
    case 'line': return matches([input?.context?.line, plan.line, route.line])
    default: return false
  }
}

export function assertTravelPlanShape(plan, {preparation = false, input} = {}) {
  const bad = [], all = actions(plan)
  if (JSON.stringify((plan.stages ?? []).map(stage => stage.id)) !== JSON.stringify(stageIds)) bad.push('plan.stages.fixedFiveStages')
  if (preparation && all.length > 6) bad.push('plan.preparation.actions.maximumSix')
  for (const [stageIndex, stage] of (plan.stages ?? []).entries()) {
    if (!(stage.actions ?? []).length && !String(stage.emptyReason ?? '').trim()) bad.push(`plan.stages[${stageIndex}].emptyReason.required`)
    for (const [index, action] of (stage.actions ?? []).entries()) {
      const genericFallback=stage.id==='fallback'&&(!plan.route?.from||!plan.route?.to)&&action.id?.endsWith('-prepare-contact')&&['official-rule','official-excerpt'].includes(action.evidence?.level)&&safeOfficialTravelUrl(action.evidence?.officialUrl??'')&&action.verification?.contact&&/^\+?[\d -]{3,24}$/.test(action.verification?.phone??'')&&action.verification?.question
      if (!genericFallback&&(!Array.isArray(action.anchors) || !action.anchors.length || !action.anchors.some(anchor => realAnchor(anchor, plan, action, input)))) bad.push(`plan.stages[${stageIndex}].actions[${index}].anchors.actualVisibleInputRequired`)
    }
  }
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    if (travelTitleSimilarity(all[i].title, all[j].title) > .8) bad.push(`plan.actions[${i},${j}].title.similarityAbove0.8`)
  }
  if (bad.length) throw new TravelCopyGuardError(bad)
  return {actions: all.length, stages: plan.stages.length}
}

/** Coverage is a statement about actual action availability, never ticked progress. */
export function assertTravelCompleteness(plan,{carryContent=travelCarryCardContent(plan),exportPayload}={}){
  const bad=[],coverage=plan.completion,all=actions(plan)
  if(!coverage||coverage.version!==1)throw new TravelCopyGuardError(['plan.completion.required'])
  for(const key of ['generated','total','locked','estimatedAdditional'])if(!Number.isInteger(coverage[key])||coverage[key]<0)bad.push(`plan.completion.${key}.nonnegativeInteger`)
  if(coverage.generated!==all.length)bad.push('plan.completion.generated.actualActionCount')
  if(coverage.total<coverage.generated||coverage.locked!==coverage.total-coverage.generated)bad.push('plan.completion.locked.capacityDifference')
  if(coverage.estimatedAdditional!==coverage.locked)bad.push('plan.completion.estimatedAdditional.actualLockedCount')
  const gaps=Array.isArray(coverage.gaps)?coverage.gaps:[]
  if(!Array.isArray(coverage.gaps)||new Set(gaps.map(gap=>gap.id)).size!==gaps.length)bad.push('plan.completion.gaps.uniqueParameters')
  if(coverage.locked>0&&!gaps.length)bad.push('plan.completion.gaps.missingParametersRequired')
  for(const [index,gap] of gaps.entries()){
    if(!String(gap.label??'').trim()||!Number.isInteger(gap.unlocks)||gap.unlocks<0||gap.unlocks>coverage.locked)bad.push(`plan.completion.gaps[${index}].validUnlockCount`)
    if(!String(coverage.statement??'').includes(gap.label))bad.push(`plan.completion.gaps[${index}].statementMissingParameter`)
  }
  if(!String(coverage.statement??'').includes(`${coverage.generated}/${coverage.total}`))bad.push('plan.completion.statement.coverageRequired')
  if((coverage.locked>0||gaps.length)&&/专属行动|完整/u.test(plan.summary??''))bad.push('plan.summary.incompleteClaim')
  const states=coverage.stages??{}
  if(JSON.stringify(Object.keys(states).sort())!==JSON.stringify([...stageIds].sort()))bad.push('plan.completion.stages.fixedFiveStages')
  for(const stage of plan.stages??[]){
    const state=states[stage.id]
    if(!state){bad.push(`plan.completion.stages.${stage.id}.required`);continue}
    if(state.generated!==stage.actions.length||!Number.isInteger(state.total)||state.total<state.generated)bad.push(`plan.completion.stages.${stage.id}.actualCounts`)
    if(!Array.isArray(state.missing))bad.push(`plan.completion.stages.${stage.id}.missingParameters`)
    const expected=stage.id==='fallback'?'ready':state.generated===state.total&&!state.missing?.length?'ready':state.generated>0?'partial':'blocked'
    if(state.status!==expected)bad.push(`plan.completion.stages.${stage.id}.honestStatus`)
    if(stage.id==='fallback'&&!stage.actions.length)bad.push('plan.completion.stages.fallback.realActionRequired')
  }
  if(coverage.total!==Object.values(states).reduce((sum,state)=>sum+(Number(state.total)||0),plan.generalActions?.length??0))bad.push('plan.completion.total.stageCapacities')
  if(carryContent?.completionStatement!==coverage.statement)bad.push('carryCardContent.completionStatement.required')
  if(exportPayload!==undefined){
    if(Object.keys(exportPayload)[0]!=='completionStatement'||exportPayload.completionStatement!==coverage.statement)bad.push('export.completionStatement.firstFieldRequired')
    if(JSON.stringify(exportPayload.completion)!==JSON.stringify(coverage))bad.push('export.completion.actualCoverageRequired')
  }
  if(bad.length)throw new TravelCopyGuardError(bad)
  return {generated:coverage.generated,total:coverage.total,locked:coverage.locked,missingParameters:gaps.length}
}

const device = (id, type, name) => ({id, type, name, battery: '', dimensions: '', weight: '', source: 'manual'})
const now = Date.parse('2026-11-07T02:00:00Z')
export const travelCopyFixtures = [
  {name: 'empty', preparation: true, input: {mode: '', devices: [], specs: {}, context: {carrier: 'unspecified'}, now}},
  {name: 'station-only', preparation: false, compare: false, input: {mode: 'rail', devices: [], specs: {}, context: {carrier: 'unspecified', from: '上海虹桥', to: '杭州东'}, documents:ruleCatalog, now}},
  {name: 'rail-electric-wheelchair', input: {mode: 'rail', devices: [device('guard-electric', 'wheelchair', '电动轮椅')], specs: {'guard-electric': confirmedGuardSpecs({lengthCm: 120, widthCm: 68, heightCm: 95, batteryType: 'lithium', batteryWh: 288, batteryCount: 1, removable: 'no'})}, context: {carrier: 'unspecified', from: '上海虹桥', to: '杭州东', journeyDate: '2026-11-07', companionCount: 1}, now}},
  {name: 'plane-unfoldable-manual-wheelchair', input: {mode: 'plane', devices: [device('guard-manual', 'manual-wheelchair', '不可折叠手动轮椅')], specs: {'guard-manual': confirmedGuardSpecs({lengthCm: 110, widthCm: 70, heightCm: 95, batteryType: 'none', folded: 'no'})}, context: {carrier: 'unspecified', from: '上海浦东国际机场', to: '北京首都国际机场', journeyDate: '2026-11-07', companionCount: 1}, now}},
  {name: 'metro-cane-guide-dog', preparation: true, compare: true, input: {mode: 'metro', devices: [device('guard-cane', 'cane', '盲杖'), device('guard-dog', 'guide-dog', '导盲犬')], specs: {'guard-cane': confirmedGuardSpecs({batteryType: 'none'}), 'guard-dog': confirmedGuardSpecs({batteryType: 'none'})}, context: {carrier: 'unspecified', city: '上海'}, now}},
  {name: 'metro-cane-guide-dog-with-stations', compare: false, input: {mode: 'metro', devices: [device('guard-cane', 'cane', '盲杖'), device('guard-dog', 'guide-dog', '导盲犬')], specs: {'guard-cane': confirmedGuardSpecs({batteryType: 'none'}), 'guard-dog': confirmedGuardSpecs({batteryType: 'none'})}, context: {carrier: 'unspecified', city: '上海', line: '2号线', from: '虹桥火车站', to: '人民广场', journeyDate: '2026-11-07', companionCount: 0}, now}},
]

/** Build-time gate: pure synthetic inputs only; errors contain schema paths, never supplied text. */
export async function runTravelCopyGuard() {
  const {buildTravelTaskPlan} = await import('../src/app/travelPlan.ts')
  const {exportTravelTask} = await import('../src/app/travelTaskStorage.ts')
  const plans = [], results = []
  for (const fixture of travelCopyFixtures) {
    const plan = buildTravelTaskPlan(fixture.input), again = buildTravelTaskPlan(fixture.input)
    assert.equal(plan.readiness,fixture.preparation?'preparation':fixture.name==='station-only'?'station-only':'complete',`Travel readiness mismatch: ${fixture.name}`)
    assert.deepEqual(plan, again, `Travel plan is not deterministic: ${fixture.name}`)
    const {now: _now, ...withoutClock} = fixture.input
    assert.deepEqual(buildTravelTaskPlan(withoutClock), buildTravelTaskPlan(withoutClock), `Travel plan without a clock is not deterministic: ${fixture.name}`)
    const snapshot = {version: 1, mode: fixture.input.mode, selected: fixture.input.devices.map(item => item.id), specs: fixture.input.specs, context: fixture.input.context, devices: fixture.input.devices, customModes: [], customDevices: [], plan, checked: {}, savedAt: plan.generatedAt, inputKey: 'guard'}
    const exported = exportTravelTask(snapshot)
    const exportPayload = typeof exported === 'string' ? JSON.parse(exported) : exported
    const copy = assertTravelCopy(plan, {exportPayload}), shape = assertTravelPlanShape(plan, {preparation: fixture.preparation, input: fixture.input}),coverage=assertTravelCompleteness(plan,{exportPayload})
    plans.push({fixture, plan}); results.push({scenario: fixture.name, ...shape, ...copy, ...coverage})
  }
  const complete = plans.filter(item => item.fixture.compare ?? !item.fixture.preparation), comparisons = []
  for (let i = 0; i < complete.length; i++) for (let j = i + 1; j < complete.length; j++) {
    const difference = travelPlanDifference(complete[i].plan, complete[j].plan)
    if (difference < .3) throw new TravelCopyGuardError([`scenarios.${complete[i].fixture.name}.${complete[j].fixture.name}.differenceBelow30Percent`])
    comparisons.push({scenarios: [complete[i].fixture.name, complete[j].fixture.name], difference})
  }
  return {scenarios: results, comparisons}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const report = await runTravelCopyGuard(); console.log('Travel copy guard passed: ' + report.scenarios.length + ' scenarios, no placeholders, deterministic and differentiated actions.') }
  catch (error) { console.error(error instanceof TravelCopyGuardError ? error.message : 'Travel copy guard failed: ' + (error?.name ?? 'Error')); process.exitCode = 1 }
}
