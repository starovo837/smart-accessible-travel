import { chosenFact, conflictsOf, missingQuestions, productImpacts, type FactField } from './product.ts'
import type { Device, ProductAnalysis, TravelCheckResult, TravelDeviceSpecs } from './types.ts'
import { largeDeviceTypes } from './travelRules.ts'

export function productFocus(product:ProductAnalysis) {
  const insight=product.insight
  if(!insight)return {risks:[],otherRisks:[],extra:0,field:undefined,action:'补充商品资料',section:'next' as const}
  const conflicts=conflictsOf(insight).filter(row=>!insight.resolutions[row.field]),impacts=productImpacts(product)
  const risks=[...impacts.filter(row=>row.tone==='danger'),...conflicts.map(row=>({title:row.label+'有不同说法',detail:'资料存在矛盾，核对前不会采用任何一项。',tone:'warn' as const})),...impacts.filter(row=>row.tone!=='danger')]
  const questions=missingQuestions(product)
  const fields:FactField[]=['widthCm','weightKg','weightIncludesBattery','foldHands','batteryWh','operation','compatibility','batteryType','lengthCm','heightCm','removable','batteryCount']
  const pending=fields.map(field=>chosenFact(insight,field)).find(fact=>fact&&!fact.confirmed)
  const field=conflicts[0]?.field??pending?.field
  if(!risks.length)risks.push({title:questions.length?'重要资料还不完整':'仍需结合本人操作核对',detail:questions[0]?.question??'原文说明不等于本人试用或运输许可。',tone:'warn'})
  return {risks:risks.slice(0,2),otherRisks:risks.slice(2),extra:Math.max(0,risks.length-2),field,action:field?'先核对'+(conflicts[0]?.label??pending!.label):questions.length?'补充'+questions[0].label:'保存资料并选择下一步',section:field?'evidence' as const:questions.length?'next' as const:'next' as const}
}
export interface TravelQuestion {id:string;deviceId:string;name:string;field:keyof TravelDeviceSpecs;label:string;hint:string;choices?:[string,string][]}
export function travelQuestions(mode:string,devices:Device[],specs:Record<string,TravelDeviceSpecs>):TravelQuestion[] {
  return devices.flatMap(device=>{
    const values=specs[device.id]??{},large=largeDeviceTypes.has(device.type),rows:TravelQuestion[]=[]
    const add=(field:keyof TravelDeviceSpecs,label:string,hint:string,choices?:[string,string][])=>{const value=values[field];if(value===undefined||value==='unknown')rows.push({id:device.id+':'+field,deviceId:device.id,name:device.name,field,label,hint,choices})}
    if(large||['rail','train'].includes(mode)){
      for(const [field,label]of [['lengthCm','实际运输长度（cm）'],['widthCm','实际运输宽度（cm）'],['heightCm','实际运输高度（cm）'],['weightKg','含所携部件的总重量（kg）']] as const)add(field,label,'填写实际运输状态的实测值；没有可靠资料可以先跳过，不会按符合处理。')
    }
    add('batteryType','运输时是否带电池？','按实际携带状态选择，不根据设备名称自动认定。',[['none','没有电池'],['lithium','锂电池'],['other','其他电池']])
    if(values.batteryType==='lithium')add('batteryWh','铭牌标称的每块电池能量（Wh）','查看电池铭牌上的Wh，不用电压×容量估算。')
    if(mode==='plane'&&['wheelchair','mobility-scooter'].includes(device.type)&&values.batteryType&&values.batteryType!=='none'&&values.batteryType!=='unknown'){
      add('batteryCount','驱动电池有几块？','指驱动设备所需的电池，不包含备用电池。',[['1','1块'],['2','2块']])
      add('removable','电池能否拆下？','按说明书核对，不自行拆解固定电池。',[['yes','可以拆下'],['no','不可拆']])
    }
    if(mode==='plane'&&device.type==='manual-wheelchair')add('folded','这些是折叠后的尺寸吗？','客舱存放与托运条件不同，不能把使用尺寸当折叠尺寸。',[['yes','是，已折叠'],['no','否，未折叠或不可折叠']])
    return rows
  })
}
export function travelNextAction(results:TravelCheckResult[]) {
  if(results.some(result=>result.eligibility==='restricted'))return {kind:'script' as const,label:'联系承运方，确认替代安排',detail:'当前参数存在不适配，先核对可替代的运输、设备或协助方案。'}
  const missing=results.flatMap(result=>result.missingInformation??[]),parameter=missing.find(item=>!/(正式条款|承运方条件|设备用途)/.test(item))
  if(parameter)return {kind:'supplement' as const,label:'补充最重要的缺项',detail:parameter}
  if(missing.length)return {kind:'script' as const,label:'联系运营方，补充适用条件',detail:missing[0]}
  if(results.some(result=>result.eligibility==='conditional'||result.eligibility==='unknown'))return {kind:'script' as const,label:'准备联系承运方的话术',detail:'确认协助、存放或使用安排，并保留书面答复。'}
  return {kind:'list' as const,label:'生成出行清单',detail:'按清单准备材料并配合安检；本结果不是运输批准。'}
}
