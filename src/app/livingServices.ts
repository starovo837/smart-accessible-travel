export type LivingToolId = 'places' | 'healthcare' | 'benefits' | 'equipment-service' | 'digital-help' | 'home-connect' | 'participation'
export type FacilityState = 'unknown' | 'available' | 'unavailable'
export interface FacilityRecord {
  id:string; name:string; address:string; latitude?:number; longitude?:number; doorCm?:number;
  steps:'unknown'|'none'|'present'; elevator:'unknown'|'working'|'unavailable'; toilet:FacilityState;
  source:string; checkedAt:string; notes:string; feedback:string[];
}
export interface MaterialItem {id:string;label:string;checked:boolean}
export interface ServiceConfirmation {source:string;reference:string;confirmedAt:string}
export interface ServiceCase {
  id:string; kind:'healthcare'|'benefits'|'equipment-service'|'participation'; title:string; region:string;
  date:string; needs:string; notes:string; providerId:string; openedAt:string;
  materials:MaterialItem[]; confirmation?:ServiceConfirmation;
}
export interface DigitalTask {id:string;title:string;sourceText:string;deadline:string;steps:MaterialItem[];confirmed:boolean;createdAt:string}
export interface HomeConnection {
  id:string;name:string;brandModel:string;event:string;channel:'text'|'voice'|'vibration';platformId:string;
  compatibility:'unknown'|'supported'|'unsupported';compatibilitySource:string;checkedAt:string;connected:false;
}
export interface LivingServicesData {version:1;facilities:FacilityRecord[];cases:ServiceCase[];digitalTasks:DigitalTask[];homeConnections:HomeConnection[]}
export const initialLivingServices=():LivingServicesData=>({version:1,facilities:[],cases:[],digitalTasks:[],homeConnections:[]})
export const livingToolMeta:Record<LivingToolId,{title:string;subtitle:string}>={
  places:{title:'设施地图与通行档案',subtitle:'先找地方，再核对真正需要的条件'},
  healthcare:{title:'就医协助',subtitle:'把需要说明白，让就医准备有条理'},
  benefits:{title:'福利与办事',subtitle:'按地区找到官方渠道，逐项准备材料'},
  'equipment-service':{title:'辅具专业服务',subtitle:'评估、试用、调整与维修，接着往下走'},
  'digital-help':{title:'数字办事助手',subtitle:'把通知和表单变成自己能核对的步骤'},
  'home-connect':{title:'居家提醒联动',subtitle:'先核对设备兼容，再选择适合的提醒方式'},
  participation:{title:'学习、工作与休闲',subtitle:'把想参加的事和需要的便利一起准备好'}
}
export function emptyFacility():FacilityRecord{return{id:'',name:'',address:'',steps:'unknown',elevator:'unknown',toilet:'unknown',source:'',checkedAt:'',notes:'',feedback:[]}}
export function facilitySummary(record:FacilityRecord){
 const labels=[record.doorCm?`入口净宽 ${record.doorCm}cm`:'入口宽度待核实',record.steps==='none'?'本人记录无台阶':record.steps==='present'?'有台阶，需确认替代入口':'台阶待核实',record.elevator==='working'?'电梯曾核对可用':record.elevator==='unavailable'?'电梯记录不可用':'电梯待核实',record.toilet==='available'?'有无障碍厕所记录':record.toilet==='unavailable'?'厕所记录不可用':'厕所待核实']
 return {labels,hasSource:Boolean(record.source.trim()&&Number.isFinite(Date.parse(record.checkedAt))),notice:'设施记录不等于整段路线可达，电梯状态可能变化。'}
}
export const defaultMaterials:Record<ServiceCase['kind'],string[]>={
 healthcare:['核对就诊科室、时间与院区','询问无障碍入口、沟通和转移协助','按医院要求准备证件与既有就医资料'],
 benefits:['查明所在地区的官方办理要求','核对适用对象、材料与期限','准备材料后从官方渠道办理'],
 'equipment-service':['整理现有辅具型号与使用需要','询问评估、试用、费用和服务地点','保留服务方回复并核对下一步'],
 participation:['核对活动地点、时间与参与方式','询问字幕、口述影像或无障碍入口','确认需要的合理便利与联系对象']
}
export function emptyServiceCase(kind:ServiceCase['kind']):ServiceCase{return{id:'',kind,title:'',region:'',date:'',needs:'',notes:'',providerId:'',openedAt:'',materials:defaultMaterials[kind].map((label,index)=>({id:'material-'+index,label,checked:false}))}}
export function caseStatus(record:ServiceCase){return record.confirmation?.source.trim()&&record.confirmation.reference.trim()&&Number.isFinite(Date.parse(record.confirmation.confirmedAt))?'本人已记录确认':record.openedAt?'已打开渠道，待本人核对':'尚未联系服务方'}
export function caseCard(record:ServiceCase){
 const title=record.kind==='healthcare'?'就医协助需求':record.kind==='benefits'?'办事咨询需求':record.kind==='equipment-service'?'辅具服务咨询需求':'学习工作与活动协助需求'
 return [title,`事项：${record.title}`,record.region&&`地区／地点：${record.region}`,record.date&&`计划时间：${record.date}`,record.needs&&`我需要的协助：${record.needs}`,record.notes&&`想确认的问题：${record.notes}`,'请说明服务范围、安排、费用与可用的无障碍条件。本站没有代替服务方确认预约。'].filter(Boolean).join('\n')
}
export function digitalDraft(sourceText:string):MaterialItem[]{
 const lines=sourceText.split(/[\n。；]/).map(line=>line.trim()).filter(Boolean).slice(0,12)
 return [{id:'verify-source',label:'先核对通知来源、适用对象和截止时间',checked:false},...lines.map((line,index)=>({id:'source-'+index,label:line,checked:false})),{id:'confirm-submit',label:'提交、签字或付款前，由我再次确认',checked:false}]
}
export function sanitizeLivingServices(raw:unknown):LivingServicesData {
 const base=initialLivingServices();if(!raw||typeof raw!=='object')return base
 const data=raw as Partial<LivingServicesData>,text=(value:unknown,max=1000)=>typeof value==='string'?value.slice(0,max):'',list=(value:unknown)=>Array.isArray(value)?value.slice(0,100):[]
 const checked=(value:unknown):MaterialItem[]=>list(value).filter(item=>item&&typeof item==='object').map((item,index)=>({id:text(item.id,100)||'item-'+index,label:text(item.label,300),checked:item.checked===true})).filter(item=>item.label)
 const coordinate=(value:unknown,limit:number)=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=limit?value:undefined
 return {version:1,
  facilities:list(data.facilities).filter(row=>row&&typeof row==='object').map(row=>({id:text(row.id,100),name:text(row.name,100),address:text(row.address,300),latitude:coordinate(row.latitude,90),longitude:coordinate(row.longitude,180),doorCm:typeof row.doorCm==='number'&&Number.isFinite(row.doorCm)&&row.doorCm>0&&row.doorCm<=1000?row.doorCm:undefined,steps:['none','present'].includes(row.steps)?row.steps:'unknown',elevator:['working','unavailable'].includes(row.elevator)?row.elevator:'unknown',toilet:['available','unavailable'].includes(row.toilet)?row.toilet:'unknown',source:text(row.source,500),checkedAt:text(row.checkedAt,60),notes:text(row.notes,1500),feedback:list(row.feedback).map(value=>text(value,500)).filter(Boolean)})),
  cases:list(data.cases).filter(row=>row&&['healthcare','benefits','equipment-service','participation'].includes(row.kind)).map(row=>({id:text(row.id,100),kind:row.kind,title:text(row.title,100),region:text(row.region,200),date:text(row.date,100),needs:text(row.needs,1000),notes:text(row.notes,1500),providerId:text(row.providerId,100),openedAt:text(row.openedAt,60),materials:checked(row.materials),...(row.confirmation?.source&&row.confirmation?.reference?{confirmation:{source:text(row.confirmation.source,300),reference:text(row.confirmation.reference,500),confirmedAt:text(row.confirmation.confirmedAt,60)}}:{})})),
  digitalTasks:list(data.digitalTasks).filter(row=>row&&typeof row==='object').map(row=>({id:text(row.id,100),title:text(row.title,100),sourceText:text(row.sourceText,6000),deadline:text(row.deadline,100),steps:checked(row.steps),confirmed:row.confirmed===true,createdAt:text(row.createdAt,60)})),
  homeConnections:list(data.homeConnections).filter(row=>row&&typeof row==='object').map(row=>({id:text(row.id,100),name:text(row.name,100),brandModel:text(row.brandModel,200),event:text(row.event,300),channel:['voice','vibration'].includes(row.channel)?row.channel:'text',platformId:text(row.platformId,100),compatibility:['supported','unsupported'].includes(row.compatibility)?row.compatibility:'unknown',compatibilitySource:text(row.compatibilitySource,500),checkedAt:text(row.checkedAt,60),connected:false}))
 }
}
