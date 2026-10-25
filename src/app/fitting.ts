import { chosenFact } from './product.ts'
import type { DeviceCard, ProductAnalysis } from './types'

export const FITTING_KEY = 'smart-accessible-fitting-v1'
export const bodyFields = [
  {key:'heightCm',label:'身高',unit:'cm',min:60,max:240,example:170,help:'直立身高；无法站立时可填已有可靠记录，未知留空。'},
  {key:'weightKg',label:'体重',unit:'kg',min:5,max:350,example:65,help:'用于商品承重资料比较，不据此推断体型。'},
  {key:'hipWidthCm',label:'坐姿臀部最宽处',unit:'cm',min:15,max:90,example:38,help:'坐姿下两侧最宽处的水平距离，不是腰围。'},
  {key:'thighLengthCm',label:'臀后至膝窝长度',unit:'cm',min:15,max:80,example:44,help:'沿大腿水平测量；不把它直接当作最终座深。'},
  {key:'lowerLegCm',label:'膝窝至足底高度',unit:'cm',min:10,max:80,example:43,help:'穿日常鞋测量；足踏板和坐垫需要另行复核。'},
  {key:'shoulderWidthCm',label:'肩宽',unit:'cm',min:15,max:80,example:42,help:'左右肩部之间的水平距离。'},
  {key:'forearmLengthCm',label:'前臂长度',unit:'cm',min:10,max:50,example:26,help:'肘部至腕部，不包含手掌。'},
  {key:'wristCircCm',label:'腕围',unit:'cm',min:8,max:40,example:17,help:'软尺轻贴腕部一周，不收紧。腕托仍需评估压迫和活动范围。'},
  {key:'ankleCircCm',label:'踝围',unit:'cm',min:10,max:60,example:23,help:'记录测量位置；肿胀或皮肤情况需要专业人员评估。'},
  {key:'footLengthCm',label:'足长',unit:'cm',min:8,max:40,example:25,help:'脚跟至最长脚趾，左右差异请在方案备注中说明。'},
] as const
export type BodyKey = typeof bodyFields[number]['key']
export type BodyDraft = Record<BodyKey,string>
export const aidOptions = [
  {id:'wheelchair',label:'手动轮椅',query:'可调座宽座深 手动轮椅',type:'manual-wheelchair'},
  {id:'walker',label:'助行架',query:'可调高度 助行架',type:'walker'},
  {id:'crutch',label:'前臂拐杖',query:'可调高度 前臂拐杖',type:'crutches'},
  {id:'cane',label:'盲杖',query:'折叠盲杖',type:'cane'},
  {id:'hearing',label:'耳背式助听器',query:'耳背式助听器',type:'hearing-aid'},
  {id:'wrist',label:'腕部支撑',query:'可调腕部支撑',type:'other'},
  {id:'ankle',label:'踝部支撑',query:'踝部支撑护具',type:'other'},
] as const
export type AidId = typeof aidOptions[number]['id']
export interface DesignParameters { seatWidth:number;seatDepth:number;seatHeight:number;backHeight:number;handleHeight:number;supportLength:number }
export const designFields = [
  {key:'seatWidth',label:'示意座宽',min:24,max:70,step:1}, {key:'seatDepth',label:'示意座深',min:25,max:60,step:1},
  {key:'seatHeight',label:'示意座高',min:25,max:65,step:1}, {key:'backHeight',label:'示意靠背高',min:20,max:65,step:1},
  {key:'handleHeight',label:'示意握把高',min:50,max:125,step:1}, {key:'supportLength',label:'示意腕托长',min:8,max:30,step:1},
] as const
export interface FitCandidate { id:string;name:string;aid:AidId;url:string;source:string;checkedAt:string;seatWidth:string;seatDepth:string;loadKg:string;outerWidth:string;weightKg:string;confirmed:boolean;sample?:boolean }
export interface FittingDraft {
  version:1;allowSave:boolean;updatedAt:number;body:BodyDraft;measurementSource:'self'|'assisted'|'professional'|'unknown';
  aids:AidId[];pose:'auto'|'seated'|'standing';side:'left'|'right'|'both';parameters:DesignParameters;
  view:{azimuth:number;polar:number;distance:number};showDimensions:boolean;tab:'fit'|'shop'|'travel';
  candidates:FitCandidate[];selectedCandidate:string;notes:string;
  transport:{lengthCm:string;widthCm:string;heightCm:string;weightKg:string;batteryType:'unknown'|'none'|'lithium'|'other';batteryWh:string;source:string;confirmed:boolean};
}
export function initialFitting():FittingDraft { return {version:1,allowSave:false,updatedAt:0,body:Object.fromEntries(bodyFields.map(f=>[f.key,''])) as BodyDraft,measurementSource:'unknown',aids:['wheelchair','wrist'],pose:'auto',side:'right',parameters:{seatWidth:42,seatDepth:40,seatHeight:48,backHeight:38,handleHeight:92,supportLength:17},view:{azimuth:.65,polar:1.28,distance:3.15},showDimensions:false,tab:'fit',candidates:[],selectedCandidate:'',notes:'',transport:{lengthCm:'',widthCm:'',heightCm:'',weightKg:'',batteryType:'unknown',batteryWh:'',source:'',confirmed:false}} }
export function validBodyValue(body:BodyDraft,key:BodyKey):number|undefined { const field=bodyFields.find(f=>f.key===key)!,raw=body[key];if(!raw?.trim())return;const n=Number(raw);return Number.isFinite(n)&&n>=field.min&&n<=field.max?n:undefined }
export function bodyErrors(body:BodyDraft) { return bodyFields.filter(f=>body[f.key]?.trim()&&validBodyValue(body,f.key)===undefined).map(f=>({key:f.key,message:`${f.label}请输入${f.min}至${f.max}${f.unit}；不确定时请留空。`})) }
export function sceneBody(body:BodyDraft) { return Object.fromEntries(bodyFields.map(field=>[field.key,validBodyValue(body,field.key)??field.example])) as Record<BodyKey,number> }
export function filledMeasurements(body:BodyDraft) { return bodyFields.filter(f=>validBodyValue(body,f.key)!==undefined).length }
export function draftFromMeasurements(draft:FittingDraft){
  const parameters={...draft.parameters},used:string[]=[],notes:string[]=[]
  for(const [bodyKey,designKey]of [['hipWidthCm','seatWidth'],['thighLengthCm','seatDepth'],['lowerLegCm','seatHeight']] as const){
    const n=validBodyValue(draft.body,bodyKey),field=designFields.find(f=>f.key===designKey)!
    if(n===undefined)continue
    if(n<field.min||n>field.max){notes.push(`${bodyFields.find(f=>f.key===bodyKey)!.label}${n}cm超出当前示意模型的调节范围，未自动改写。`);continue}
    parameters[designKey]=n;used.push(field.label)
  }
  return {parameters,used,notes:[...notes,'仅把已填写的对应尺寸复制为可编辑示意目标；没有计算选配余量、坐垫、皮肤压力或足踏板条件，不能直接作为成品尺寸。']}
}
export function safeShoppingLink(raw:string) { try { const url=new URL(raw);return url.protocol==='https:'&&!url.username&&!url.password&&['jd.com','taobao.com','tmall.com','1688.com'].some(d=>url.hostname===d||url.hostname.endsWith('.'+d))?url.toString():'' } catch{return ''} }
export function readFitting(raw:string|null):FittingDraft|null {
  try {
    if(!raw||raw.length>80000)return null
    const data=JSON.parse(raw),base=initialFitting()
    if(data?.version!==1||data.allowSave!==true)return null
    const body=Object.fromEntries(bodyFields.map(field=>[field.key,typeof data.body?.[field.key]==='string'?data.body[field.key].slice(0,8):''])) as BodyDraft
    const parameters={...base.parameters};for(const field of designFields){const n=data.parameters?.[field.key];if(typeof n==='number'&&Number.isFinite(n))parameters[field.key]=Math.min(field.max,Math.max(field.min,n))}
    const text=(v:unknown,max=100)=>typeof v==='string'?v.slice(0,max):''
    const candidates:FitCandidate[]=Array.isArray(data.candidates)?data.candidates.slice(0,30).filter((c:FitCandidate)=>c&&aidOptions.some(a=>a.id===c.aid)).map((c:FitCandidate)=>({id:text(c.id),name:text(c.name),aid:c.aid,url:safeShoppingLink(text(c.url,1500)),source:text(c.source,500),checkedAt:text(c.checkedAt),seatWidth:text(c.seatWidth,8),seatDepth:text(c.seatDepth,8),loadKg:text(c.loadKg,8),outerWidth:text(c.outerWidth,8),weightKg:text(c.weightKg,8),confirmed:c.confirmed===true,sample:c.sample===true})):[]
    const view={...base.view};for(const key of ['azimuth','polar','distance'] as const){const n=data.view?.[key];if(typeof n==='number'&&Number.isFinite(n))view[key]=key==='polar'?Math.min(2.8,Math.max(.1,n)):key==='distance'?Math.min(7,Math.max(1.3,n)):n%(Math.PI*2)}
    return {...base,allowSave:true,updatedAt:typeof data.updatedAt==='number'?data.updatedAt:0,body,parameters,view,aids:Array.isArray(data.aids)?[...new Set<AidId>(data.aids.filter((id:AidId)=>aidOptions.some(a=>a.id===id)))]:base.aids,measurementSource:['self','assisted','professional'].includes(data.measurementSource)?data.measurementSource:'unknown',pose:['seated','standing'].includes(data.pose)?data.pose:'auto',side:['left','both'].includes(data.side)?data.side:'right',tab:['shop','travel'].includes(data.tab)?data.tab:'fit',showDimensions:data.showDimensions===true,candidates,selectedCandidate:text(data.selectedCandidate),notes:text(data.notes,1500),transport:{...base.transport,...Object.fromEntries(['lengthCm','widthCm','heightCm','weightKg','batteryWh'].map(key=>[key,text(data.transport?.[key],8)])),batteryType:['none','lithium','other'].includes(data.transport?.batteryType)?data.transport.batteryType:'unknown',source:text(data.transport?.source,500),confirmed:data.transport?.confirmed===true}}
  }catch{return null}
}
export function serializedFitting(draft:FittingDraft,now=Date.now()) { return JSON.stringify({...draft,updatedAt:now}) }
export interface FitCheck {label:string;state:'pass'|'mismatch'|'unknown';detail:string}
export function compareCandidate(draft:FittingDraft,candidate:FitCandidate) {
  const checks:FitCheck[]=[],number=(raw:string)=>{const value=Number(raw);return raw.trim()&&Number.isFinite(value)&&value>0?value:undefined}
  const primary=draft.aids[0]??'wheelchair';if(candidate.aid!==primary)checks.push({label:'辅具类别',state:'mismatch',detail:'与当前主要辅具类别不同，不参与本次同类款式排序。'})
  const trusted=candidate.confirmed&&!candidate.sample&&Boolean(candidate.source.trim())&&Number.isFinite(Date.parse(candidate.checkedAt))
  if(primary==='wheelchair')for(const [key,target,label] of [['seatWidth',draft.parameters.seatWidth,'座宽'],['seatDepth',draft.parameters.seatDepth,'座深']] as const){const value=number(candidate[key]);checks.push(!trusted||value===undefined?{label,state:'unknown',detail:'缺少本人核对的商品资料，暂不比较。'}:{label,state:value===target?'pass':'mismatch',detail:`商品标注${value}cm；本次示意目标${target}cm${value===target?'，数值一致；目标仍需专业复核':'，相差'+Math.abs(value-target)+'cm；不据此判断医学适配'}。`})}
  const weight=validBodyValue(draft.body,'weightKg'),load=number(candidate.loadKg)
  checks.push(!trusted||weight===undefined||load===undefined?{label:'标称承重资料',state:'unknown',detail:'需要体重及已核对的厂家标称承重；不得从外观推断。'}:{label:'标称承重资料',state:load<weight?'mismatch':'pass',detail:`填写体重${weight}kg，厂家标称${load}kg${load<weight?'，低于填写体重，应排除这个候选':'；仅作数值筛查，还需确认使用条件、随身物品与余量'}。`})
  const mismatch=checks.filter(c=>c.state==='mismatch').length,known=checks.filter(c=>c.state!=='unknown').length
  const excluded=candidate.aid!==primary||Boolean(trusted&&weight!==undefined&&load!==undefined&&load<weight)
  return {candidate,checks,mismatch,known,excluded,label:excluded?'排除本次推荐：类别或标称承重不符':!trusted?'待核对资料':mismatch?'存在参数差异':known<checks.length?'资料不足，尚不能排序':'已知参数更接近目标（不等于最适合）'}
}
export function rankedCandidates(draft:FittingDraft) { return draft.aids.length?draft.candidates.map(c=>compareCandidate(draft,c)).sort((a,b)=>Number(a.excluded)-Number(b.excluded)||a.mismatch-b.mismatch||b.known-a.known):[] }
export function candidateFromAnalysis(product:ProductAnalysis):FitCandidate|undefined {
  const aid=aidOptions.find(a=>a.type===product.deviceType)
  if(!product.insight||product.insight.mode==='sample'||!aid)return
  const number=(field:'widthCm'|'weightKg')=>{const fact=chosenFact(product.insight!,field);return fact?.confirmed?fact.value:''}
  return {id:'analysis-'+product.id,name:product.title,aid:aid.id,url:'',source:'本次商品解读；座宽、座深与承重仍需独立核对。',checkedAt:new Date().toISOString(),seatWidth:'',seatDepth:'',loadKg:'',outerWidth:number('widthCm'),weightKg:number('weightKg'),confirmed:false}
}
export function transportCard(draft:FittingDraft):DeviceCard|undefined {
  const t=draft.transport
  if(!t.confirmed||!t.source.trim())return
  if(t.batteryType==='none'&&t.batteryWh.trim())return
  const values:DeviceCard['values']={},evidence:DeviceCard['evidence']={}
  for(const key of ['lengthCm','widthCm','heightCm','weightKg','batteryWh'] as const){const value=Number(t[key]);if(t[key].trim()&&(!Number.isFinite(value)||value<=0||value>100000))return;if(t[key].trim()){values[key]=String(value);evidence[key]={origin:'measurement',confirmed:true,note:t.source.trim()}}}
  if(t.batteryType!=='unknown'){values.batteryType=t.batteryType;evidence.batteryType={origin:'measurement',confirmed:true,note:t.source.trim()}}
  if(!Object.keys(values).length)return
  const aid=aidOptions.find(a=>a.id===draft.aids[0])??aidOptions[0]
  return {id:'fitting-actual-device',name:aid.label+'（已核对实物资料）',type:aid.type,source:'manual',battery:'',dimensions:'',weight:'',values,evidence,prospective:true,transportState:'use'}
}
