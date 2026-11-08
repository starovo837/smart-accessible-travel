import type { TravelContext, TravelMode } from './types.ts'
export interface RuleDocument {
  id:string; title:string; operator:string; modes:string[]; city?:string; line?:string;
  url:string; version:string; publishedAt:string|null; effectiveAt:string|null;
  checkedAt:string|null; expiresAt:string|null; status:'verified'|'unverified'|'changed'|'fetch-failed';
  excerpts:{label:string;text:string}[]; contentHash?:string; pendingHash?:string; anchorsMatch?:boolean; reviewNote?:string; lastFetchedAt?:string;
}
/** Reject an HTML fallback or malformed service payload before replacing offline sources. */
export function ruleDocumentsFromResponse(value:unknown):RuleDocument[]{
  const documents=(value&&typeof value==='object'?'documents' in value?value.documents:undefined:undefined)
  if(!Array.isArray(documents)||!documents.every(row=>row&&typeof row==='object'&&['id','title','operator','url','version'].every(key=>typeof row[key]==='string')&&Array.isArray(row.modes)&&row.modes.every((mode:unknown)=>typeof mode==='string')&&Array.isArray(row.excerpts)&&row.excerpts.every((excerpt:unknown)=>excerpt&&typeof excerpt==='object'&&'label' in excerpt&&typeof excerpt.label==='string'&&'text' in excerpt&&typeof excerpt.text==='string'))){throw new Error('规则服务未返回有效规则列表')}
  return documents as RuleDocument[]
}
// Source entry points are not automatically approved policy. The source service
// checks anchors and records versions; changed or expired text cannot supply limits.
export const ruleCatalog:RuleDocument[]=[
  {id:'rail-domestic',title:'铁路旅客运输规程 · 携带品',operator:'中国铁路12306',modes:['rail','train'],url:'https://kyfw.12306.cn/otn/gonggao/saleTicketMeans.html?linktypeid=means5',version:'2026-06-01-domestic',publishedAt:null,effectiveAt:'2026-06-01',checkedAt:null,expiresAt:null,status:'unverified',excerpts:[{label:'普通携带品范围',text:'每件物品外部尺寸长、宽、高之和不超过160厘米'},{label:'动车组条件',text:'但乘坐动车组列车均不超过130厘米'},{label:'重量',text:'每件重量不超过20千克'},{label:'轮椅例外',text:'旅行时代步的折叠式轮椅'}]},
  {id:'airchina-assistance',title:'国航特殊旅客服务方案 · 辅助设备',operator:'airchina',modes:['plane'],url:'https://m.airchina.com/ac/c/invoke/specialAssistance@pgzhcn?comeFrom=xlxx',version:'2026-10-18-import-1',publishedAt:null,effectiveAt:null,checkedAt:null,expiresAt:null,status:'unverified',excerpts:[{label:'电动轮椅办理',text:'电动轮椅或电动代步工具不得带入客舱'},{label:'手动折叠轮椅客舱条件',text:'33*91*106CM'}]},
  {id:'airchina-battery',title:'国航特殊旅客服务方案 · 轮椅锂电池',operator:'airchina',modes:['plane'],url:'https://m.airchina.com/ac/c/invoke/specialAssistance@pgzhcn?comeFrom=xlxx',version:'2026-10-18-import-1',publishedAt:null,effectiveAt:null,checkedAt:null,expiresAt:null,status:'unverified',excerpts:[{label:'单电池驱动条件',text:'其电池额定能量不得超过300Wh'},{label:'双电池驱动条件',text:'如果必须由两块电池驱动，则其中任何一块电池额定能量不得超过160Wh'}]},
]
export const ruleCurrent=(rule:RuleDocument,now=Date.now())=>rule.status==='verified'&&!!rule.checkedAt&&!!rule.expiresAt&&(!rule.effectiveAt||Date.parse(rule.effectiveAt)<=now)&&new Date(rule.checkedAt).getTime()<=now&&new Date(rule.expiresAt).getTime()>now
export function rulesFor(mode:TravelMode,context:TravelContext,catalog=ruleCatalog) {
  return catalog.filter(rule=>rule.modes.includes(mode)&&(!['airchina','ceair','csair'].includes(rule.operator)||context.carrier===rule.operator)&&(!rule.city||rule.city===context.city)&&(!rule.line||rule.line===context.line))
}
export const ruleStatusLabel=(rule:RuleDocument,now=Date.now())=>rule.status==='changed'?'来源发生变化，待人工复核':rule.status==='fetch-failed'?'本次来源核验失败':ruleCurrent(rule,now)?'已核对公开来源，仍需确认具体行程':rule.status==='verified'?'来源核验已过期':'来源尚未核验'
