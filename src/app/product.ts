import type { CardField, DeviceCard, ProductAnalysis } from './types.ts'
import { checkEnumClaim, checkNumericClaim, instructionClaim, modelKey, modelKeys } from './evidence.ts'

export type SourceKind = 'merchant' | 'manual' | 'reply' | 'review'
export interface ProductSource { id: string; name: string; kind: SourceKind; text: string; image?: string; sample?: boolean; modelKey?: string; transcript?: string; imageQuality?: string }
export type FactField = CardField | 'foldHands' | 'weightIncludesBattery' | 'batteryWeightKg' | 'foldable' | 'operation' | 'compatibility'
export interface ProductFact { id: string; field: FactField; label: string; value: string; unit: string; sourceId: string; quote: string; location: string; verification: 'quoted' | 'image' | 'unverified'; confirmed: boolean; modelKey?: string; validationNote?: string; reviewMethod?: string; independentQuote?: string }
export interface ProductConflict { field: FactField; label: string; factIds: string[] }
export interface ProductInsight { mode: 'ai' | 'sample' | 'local'; engine?: 'ollama' | 'webllm'; model?: string; selectedModel?: string; sources: ProductSource[]; facts: ProductFact[]; modelNote: string; resolutions: Partial<Record<FactField,string>>; needs: ProductNeeds }
export const inSelectedModel = (insight: ProductInsight, fact: ProductFact) => insight.selectedModel === undefined || (fact.modelKey||'') === insight.selectedModel
export interface ProductNeeds { doorCm?: number; elevatorDoorCm?: number; liftKg?: number; oneHand: boolean; canFold: 'unknown' | 'yes' | 'no'; usabilityPriorities?:string[] }
export const initialNeeds = (): ProductNeeds => ({ oneHand: false, canFold: 'unknown' })
export const sourceNames: Record<SourceKind,string> = { merchant: '商品详情', manual: '说明书', reply: '商家回复 / 本人补充', review: '已选用户反馈' }
export const factLabels: Record<FactField,string> = { lengthCm:'使用长度',widthCm:'使用宽度',heightCm:'使用高度',weightKg:'设备重量',foldLengthCm:'折叠长度',foldWidthCm:'折叠宽度',foldHeightCm:'折叠高度',batteryWh:'标称每块电池能量',batteryType:'电池类型',removable:'电池是否可拆',batteryCount:'驱动电池数量',foldHands:'折叠所需操作',weightIncludesBattery:'整机重量是否含电池',batteryWeightKg:'电池重量',foldable:'是否可折叠',operation:'操控方式',compatibility:'兼容条件' }
export const productCategories = ['wheelchair','manual-wheelchair','mobility-scooter','cane','electronic-cane','hearing-aid','oxygen','pump','walker','rollator','crutches','communication-board','aac-device','magnifier','braille-display','reading-device','cpap','other'] as const
export function conflictsOf(insight: ProductInsight): ProductConflict[] {
  return (Object.keys(factLabels) as FactField[]).flatMap(field => {
    const facts = insight.facts.filter(fact => inSelectedModel(insight,fact) && fact.field === field && fact.verification !== 'unverified' && insight.sources.find(source => source.id === fact.sourceId)?.kind !== 'review')
    return new Set(facts.map(fact => fact.value.trim().toLowerCase())).size > 1 ? [{ field, label: factLabels[field], factIds: facts.map(fact => fact.id) }] : []
  })
}
export function chosenFact(insight: ProductInsight, field: FactField): ProductFact | undefined {
  const conflict = conflictsOf(insight).find(item => item.field === field)
  const facts = insight.facts.filter(fact => inSelectedModel(insight,fact) && fact.field === field && fact.verification !== 'unverified' && insight.sources.find(source => source.id === fact.sourceId)?.kind !== 'review')
  return conflict ? facts.find(fact => fact.id === insight.resolutions[field]) : facts.find(fact => fact.confirmed) ?? facts[0]
}
export function reviewTopics(insight: ProductInsight) {
  const sources=insight.sources.filter(source=>source.kind==='review')
  const excerpts=sources.flatMap(source=>{
    const quoted=insight.facts.filter(fact=>fact.sourceId===source.id&&fact.verification!=='unverified').map(fact=>({sourceId:source.id,quote:fact.quote,location:fact.location}))
    const text=source.text.split(/(?<=[。！？!?；;\n])/).map(quote=>quote.trim()).filter(Boolean).map(quote=>({sourceId:source.id,quote,location:source.name+' · 原文对应段落'}))
    const key=(quote:string)=>compact(quote).replace(/[。！？!?；;]+$/g,'')
    return [...quoted,...text].filter((entry,index,all)=>all.findIndex(other=>key(other.quote)===key(entry.quote))===index)
  })
  return ([['折叠与收纳',/折叠|收纳|展开/],['搬运与通行',/搬运|抬|重量|过门|门槛|电梯/],['操控与沟通',/操控|操作|按钮|握|语音|配对|听清|音量/],['维护与售后',/维修|维护|售后|保修|更换|充电|清洁/]] as const).map(([title,pattern])=>({title,quotes:excerpts.filter(entry=>pattern.test(entry.quote))}))
}
export function missingQuestions(product: ProductAnalysis) {
  const insight = product.insight
  if (!insight) return []
  const large = ['wheelchair','manual-wheelchair','mobility-scooter','walker','rollator'].includes(product.deviceType ?? '')
  const powered = ['wheelchair','mobility-scooter','hearing-aid','oxygen','pump','aac-device','cpap','magnifier','reading-device'].includes(product.deviceType ?? '')
  const fields: FactField[] = large ? ['widthCm','lengthCm','heightCm','weightKg','weightIncludesBattery','foldHands'] : ['operation']
  if(['cane','electronic-cane'].includes(product.deviceType??''))fields.push('lengthCm','weightKg')
  if(['hearing-aid','aac-device','braille-display','reading-device'].includes(product.deviceType??''))fields.push('compatibility')
  if (powered && chosenFact(insight,'batteryType')?.value !== 'none') {fields.push('batteryType');if(chosenFact(insight,'batteryType')?.value==='lithium')fields.push('batteryWh');if(['wheelchair','mobility-scooter'].includes(product.deviceType??''))fields.push('batteryWh','batteryCount','removable')}
  return Array.from(new Set(fields)).filter(field => !chosenFact(insight,field)).map(field => ({ field, label: factLabels[field], question: `请补充或核对“${factLabels[field]}”，并提供商品说明、铭牌或实测依据。` }))
}
export function productImpacts(product: ProductAnalysis) {
  const insight = product.insight
  if (!insight) return []
  const rows: { title:string; detail:string; tone:'warn'|'danger'|'good' }[] = []
  const large=['wheelchair','manual-wheelchair','mobility-scooter','walker','rollator'].includes(product.deviceType??'')
  const width = Number(chosenFact(insight,'widthCm')?.value), weight = Number(chosenFact(insight,'weightKg')?.value)
  const openings = [insight.needs.doorCm,insight.needs.elevatorDoorCm].filter((value):value is number => Number.isFinite(value) && !!value && value > 0)
  if (width > 0 && openings.length) { const opening=Math.min(...openings), gap=+(opening-width).toFixed(2); rows.push({title:'最窄入口与设备宽度',detail:gap<0 ? `资料标注宽 ${width} cm，你填写的最窄入口 ${opening} cm，相差 ${Math.abs(gap)} cm；按该使用状态不能直线通过。折叠状态需另查。` : `资料标注宽 ${width} cm，最窄入口 ${opening} cm，剩余 ${gap} cm。仅为直线比较，还需核实转弯、手部操作和轿厢空间。`,tone:gap<0?'danger':'warn'}) }
  else if(large) rows.push({title:'过门与电梯',detail:'补齐设备使用宽度和入口净宽后，才能比较通行空间；没有资料不代表适配。',tone:'warn'})
  const hands=chosenFact(insight,'foldHands')?.value
  if (insight.needs.oneHand) rows.push({title:'单手操作需要',detail:!large&&!hands?'请核对按钮、连接与耗材更换能否单手完成；不能用设备体积小代替本人可操作。':conflictsOf(insight).some(conflict=>conflict.field==='foldHands'&&!insight.resolutions.foldHands) ? '资料对单手 / 双手折叠描述不一致，先核对实际步骤，当前不能认定可独立折叠。' : hands?.includes('双手') ? '资料要求双手折叠，与你的单手操作需要有冲突。请确认能否由陪同者帮助或选择其他结构。' : hands ? `资料写明“${hands}”，还需结合本人握力、动作与试用确认。` : '还没有折叠操作依据，请询问是否需要双手、弯腰或持续握持。',tone:'warn'})
  if (weight>0) {
    const excludesBattery=chosenFact(insight,'weightIncludesBattery')?.value==='no',lift=insight.needs.liftKg,hasLift=Number.isFinite(lift)&&!!lift&&lift>0
    rows.push({title:'搬运与重量口径',detail:`资料重量 ${weight} kg${excludesBattery?'，未包含电池，不能当成完整搬运重量':''}。${hasLift ? weight>lift?`超过你填写的可搬运重量 ${lift} kg，需安排协助。`:excludesBattery?'还缺完整设备重量，当前不能判断是否在你的搬运范围内。':`在你填写的重量范围内，仍需核对完整重量、握持和平衡。`:'请按需要补充可搬运重量和协助安排。'}`,tone:hasLift&&weight>lift?'danger':'warn'})
  }
  if (insight.needs.canFold==='no') rows.push({title:'本人无法独立折叠',detail:'即使商品支持折叠，也不能据此认定你能独立完成；出行应提前安排陪同或工作人员协助。',tone:'warn'})
  return rows
}
const compact=(text:string)=>text.replace(/\s+/g,'').toLowerCase()
export function quoteRange(text:string,quote:string) {
  const target=compact(quote);if(!target)return null
  const positions:number[]=[],characters:string[]=[]
  for(let index=0;index<text.length;index++)if(!/\s/.test(text[index])){positions.push(index);characters.push(text[index].toLowerCase())}
  const start=characters.join('').indexOf(target)
  return start<0?null:{start:positions[start],end:positions[start+target.length-1]+1}
}
export function preserveConfirmations(previous:ProductAnalysis,next:ProductAnalysis):ProductAnalysis {
  if(!previous.insight||!next.insight)return next
  const same=(a:ProductFact,b:ProductFact)=>a.field===b.field&&a.sourceId===b.sourceId&&a.value===b.value&&a.quote===b.quote&&a.modelKey===b.modelKey
  const facts=next.insight.facts.map(fact=>({...fact,confirmed:fact.verification!=='unverified'&&previous.insight!.facts.some(old=>same(old,fact)&&old.confirmed)}))
  const resolutions:ProductInsight['resolutions']={}
  for(const [field,id] of Object.entries(previous.insight.resolutions)) {
    const prior=previous.insight.facts.find(fact=>fact.id===id),replacement=prior?facts.find(fact=>same(fact,prior)):undefined
    const oldSet=previous.insight.facts.filter(fact=>fact.field===field).map(fact=>fact.value).sort().join('|'),newSet=facts.filter(fact=>fact.field===field).map(fact=>fact.value).sort().join('|')
    if(replacement&&oldSet===newSet)resolutions[field as FactField]=replacement.id
  }
  return {...next,insight:{...next.insight,facts,resolutions}}
}
export function normalizeAnalysis(raw: unknown, sources: ProductSource[], mode: ProductInsight['mode'], needs=initialNeeds()): ProductAnalysis {
  const value = raw as { title?:unknown; category?:unknown; facts?:unknown; note?:unknown }
  if (!value || !Array.isArray(value.facts)) throw Error('解读结果不完整，请重试或补充更清晰的资料。')
  const facts: ProductFact[]=[]
  for (const entry of value.facts.slice(0,60)) {
    if (!entry || typeof entry!=='object') continue
    const fact=entry as Record<string,unknown>, source=sources.find(item=>item.id===fact.sourceId)
    if (!source || !Object.hasOwn(factLabels,String(fact.field)) || typeof fact.value!=='string' || !fact.value.trim() || typeof fact.quote!=='string') continue
    const quote=fact.quote.slice(0,800), matched=quote.trim().length>0&&compact(source.text).includes(compact(quote))
    const field=fact.field as FactField
    const numeric=/Cm$|Kg$|Wh$/.test(field)||field==='batteryCount'
    if (numeric && (!Number.isFinite(Number(fact.value)) || Number(fact.value)<=0)) continue
    if (field==='batteryCount'&&!['1','2'].includes(fact.value)) continue
    if (field==='batteryType'&&!['none','lithium','other','unknown'].includes(fact.value)) continue
    if (['removable','weightIncludesBattery','foldable'].includes(field)&&!['yes','no','unknown'].includes(fact.value)) continue
    const numericCheck=numeric?checkNumericClaim(field,fact.value,String(fact.unit??''),quote,source.text):null
    const variants=modelKeys(source.text),quotedModel=modelKey(quote),ambiguous=variants.length>1&&!quotedModel
    const directed=instructionClaim(quote,source.text)
    const supported=(numericCheck?.ok??checkEnumClaim(field,fact.value,quote))&&source.imageQuality!=='unreadable'&&!ambiguous&&!directed
    const verification=supported&&matched?'quoted':supported&&source.image&&quote.trim()?'image':'unverified'
    const normalized: ProductFact={id:'fact-'+facts.length,field,label:factLabels[field],value:(numericCheck?.ok?numericCheck.value:fact.value.trim()).slice(0,160),unit:numeric?numericCheck?.unit??'':'',sourceId:source.id,quote,location:typeof fact.location==='string'?fact.location.slice(0,150):source.name,verification,confirmed:false,modelKey:source.modelKey?.trim().toUpperCase()||modelKey(source.text)||String(fact.modelKey??''),validationNote:!supported?numericCheck?.reason??'引用不足以支持此字段的结论，请补充独立依据。':undefined}
    if(variants.length>1){normalized.modelKey=quotedModel;normalized.validationNote=ambiguous?'同一资料包含多个型号，本项引用未指明型号；请按型号拆分资料再解读。':normalized.validationNote}
    if(directed)normalized.validationNote='引用位于诱导执行或假设性指令中，不作为商品事实采用。'
    if (!facts.some(item=>item.field===field&&item.value===normalized.value&&item.sourceId===source.id&&item.modelKey===normalized.modelKey)) facts.push(normalized)
  }
  const insight:ProductInsight={mode,sources,facts,selectedModel:facts.find(fact=>fact.modelKey)?.modelKey,modelNote:typeof value.note==='string'?value.note.slice(0,600):'',resolutions:{},needs}
  if(mode==='ai')insight.modelNote=`本次AI提取 ${facts.length} 项；其中 ${facts.filter(fact=>fact.verification==='unverified').length} 项未通过依据校验。下方逐项引用需本人核对，未提供的参数保持待补充。模型自由备注不作为参数或运输判断。`
  const number=(field:FactField)=>Number(chosenFact(insight,field)?.value)||0
  const deviceType=productCategories.includes(value.category as typeof productCategories[number])?String(value.category):'other'
  return {id:'analysis-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),title:typeof value.title==='string'?value.title.slice(0,160):'待核对的辅具',deviceType,sourceLabel:sources.map(source=>source.name).join('、'),width:number('widthCm'),length:number('lengthCm'),weight:number('weightKg'),merchantClaims:facts.filter(fact=>sources.find(source=>source.id===fact.sourceId)?.kind!=='review').map(fact=>fact.quote),userFeedback:facts.filter(fact=>sources.find(source=>source.id===fact.sourceId)?.kind==='review').map(fact=>fact.quote),conclusion:'先核对资料中的参数、冲突与缺项，再结合本人需要决定是否试用。',evidence:facts.map(fact=>`${fact.label}：${fact.value}${fact.unit}（${fact.location}，待本人核对）`),nextSteps:[],insight}
}
export function insightCard(product: ProductAnalysis): DeviceCard {
  const insight=product.insight!, values:DeviceCard['values']={}, evidence:DeviceCard['evidence']={}
  for (const field of ['lengthCm','widthCm','heightCm','weightKg','foldLengthCm','foldWidthCm','foldHeightCm','batteryWh','batteryType','removable','batteryCount'] as CardField[]) {
    const fact=chosenFact(insight,field)
    if (!fact || fact.verification==='unverified') continue
    values[field]=fact.value
    const source=insight.sources.find(item=>item.id===fact.sourceId)!
    const excludesBattery=field==='weightKg'&&chosenFact(insight,'weightIncludesBattery')?.value==='no'
    evidence[field]={origin:source.kind==='reply'?'reply':'merchant',confirmed:fact.confirmed&&!excludesBattery,note:`${source.name} · ${fact.location}：${fact.quote}${source.sample?'（预置示例）':''}${excludesBattery?'。此重量不含电池，完整设备重量待补充，暂不用于出行重量核验。':''}`}
  }
  return {id:'card-'+product.id,type:product.deviceType??'other',name:product.title,battery:values.batteryType==='none'?'无':values.batteryWh?values.batteryWh+' Wh':'',dimensions:[values.lengthCm??'?',values.widthCm??'?',values.heightCm??'?'].join(' × ')+' cm',weight:values.weightKg?values.weightKg+' kg':'',source:'manual',prospective:true,productId:product.id,values,evidence}
}

export const sampleBundles: { id:string;title:string;sources:ProductSource[] }[] = [
  {id:'chair',title:'轮椅：门宽不适配与折叠描述冲突',sources:[
    {id:'sample-detail',name:'示例商品详情',kind:'merchant',sample:true,text:'折行 X1 电动轮椅。使用尺寸（长×宽×高）105×68×98 cm；折叠尺寸（长×宽×高）75×35×70 cm；整车重量 32 kg（不含电池）。宣传：单手快速折叠。电池：24V 20Ah 锂电池。'},
    {id:'sample-manual',name:'示例说明书第2页',kind:'manual',sample:true,text:'X1 折叠需要双手操作，建议陪同者协助。电池可拆卸，驱动电池1块，电池重量4 kg。运输前请核对铭牌标称能量（Wh）；本页未提供Wh。'},
    {id:'sample-reviews',name:'示例用户反馈（2条，非真实评价）',kind:'review',sample:true,text:'预置的同型号使用反馈：1. 我折叠时需要两只手。2. 搬运时要把电池重量一起考虑。这两条仅用于演示，不代表真实用户评价。'},
  ]},
  {id:'cane',title:'盲杖：区分展开与收纳状态',sources:[{id:'sample-cane',name:'示例盲杖说明',kind:'manual',sample:true,text:'轻行折叠盲杖。展开长度120 cm，收纳长度30 cm，重量300 g，无电池。操作说明：折叠时使用双手拉开节杆，不要求电子设备配对。'}]},
]
export function localAnalysis(sources:ProductSource[], mode:'sample'|'local',needs=initialNeeds()) {
  const facts:Record<string,string>[]=[]
  const add=(source:ProductSource,field:FactField,value:string,quote:string,unit='')=>facts.push({field,value,quote,unit,sourceId:source.id,location:source.name+' · 原文对应段落'})
  for (const source of sources) {
    const text=source.text
    for (const [prefix,fields] of [['使用',['lengthCm','widthCm','heightCm']],['折叠',['foldLengthCm','foldWidthCm','foldHeightCm']]] as const) { const match=text.match(new RegExp(prefix+'(?:后)?尺寸[：:\\s]*[（(]长[×xX*]宽[×xX*]高[）)][：:\\s]*(\\d+(?:\\.\\d+)?)\\s*[×xX*]\\s*(\\d+(?:\\.\\d+)?)\\s*[×xX*]\\s*(\\d+(?:\\.\\d+)?)\\s*cm','i')); if(match) fields.forEach((field,index)=>add(source,field,match[index+1],match[0],'cm')) }
    const weight=text.match(/(?<!电池)(?:整车重量|重量)[：:\s]*(\d+(?:\.\d+)?)\s*(kg|g)/i); if(weight)add(source,'weightKg',String(Number(weight[1])/(weight[2].toLowerCase()==='g'?1000:1)),weight[0],'kg')
    const batteryWeight=text.match(/电池重量[：:\s]*(\d+(?:\.\d+)?)\s*kg/i);if(batteryWeight)add(source,'batteryWeightKg',batteryWeight[1],batteryWeight[0],'kg')
    if(/不含电池/.test(text))add(source,'weightIncludesBattery','no','不含电池')
    else if(/含电池重量|重量[^。；]*含电池/.test(text))add(source,'weightIncludesBattery','yes',text.match(/含电池重量|重量[^。；]*含电池/)![0])
    for(const [pattern,field] of [[/展开长度[：:\s]*(\d+(?:\.\d+)?)\s*cm/,'lengthCm'],[/收纳长度[：:\s]*(\d+(?:\.\d+)?)\s*cm/,'foldLengthCm'],[/(?:额定能量|标称能量|电池能量)[：:\s]*(\d+(?:\.\d+)?)\s*Wh/i,'batteryWh']] as const) {const match=text.match(pattern);if(match)add(source,field,match[1],match[0],field==='batteryWh'?'Wh':'cm')}
    if(/双手|两只手/.test(text))add(source,'foldHands','双手',text.match(/[^。；]*?(?:双手|两只手)[^。；]*/)?.[0]??'双手')
    if(/单手/.test(text))add(source,'foldHands','单手',text.match(/[^。；]*?单手[^。；]*/)?.[0]??'单手')
    if(/无电池/.test(text))add(source,'batteryType','none','无电池');else if(/锂电池/.test(text))add(source,'batteryType','lithium','锂电池')
    if(/电池可拆卸/.test(text))add(source,'removable','yes','电池可拆卸')
    const count=text.match(/驱动电池\s*([12])\s*块/);if(count)add(source,'batteryCount',count[1],count[0],'块')
    if(/操作说明[：:]/.test(text))add(source,'operation',text.split(/操作说明[：:]/)[1].slice(0,120),text.split(/操作说明[：:]/)[1].slice(0,120))
  }
  const all=sources.filter(source=>source.kind!=='review').map(source=>source.text).join(' '),category=/电动轮椅/.test(all)?'wheelchair':/手动轮椅/.test(all)?'manual-wheelchair':/盲杖/.test(all)?'cane':/助听器/.test(all)?'hearing-aid':/制氧机/.test(all)?'oxygen':/助行器/.test(all)?'walker':'other'
  const title=sources.find(source=>source.kind!=='review'&&source.text.trim())?.text.trim().split(/[。\n；;]/)[0].slice(0,60)
  return normalizeAnalysis({title:title?title+' · 资料解读':'辅具资料解读',category,facts,note:mode==='sample'?'预置资料案例，未调用模型。':'本地文字规则整理，未调用AI；不支持图片识别和自由语义理解。三维尺寸须标明长×宽×高顺序才会整理。'},sources,mode,needs)
}
