import type { ProductAnalysis } from './types.ts'
import { modelKey, modelKeys } from './evidence.ts'
export interface UsabilityTopic {id:string;label:string;question:string;pattern:RegExp}
const controls:UsabilityTopic={id:'controls',label:'操作与辨识',question:'按钮、接口或开关能否通过触摸、文字或其他提示辨认？需要多大操作力度？',pattern:/按钮|按键|开关|触摸|接口|握持|操作力度|单手|双手/}
const alerts:UsabilityTopic={id:'alerts',label:'提醒方式',question:'关键状态和故障是否有文字、灯光、震动或语音提示？能否按我的需要关闭声音？',pattern:/震动|振动|灯光|指示灯|提示音|语音提示|文字提示|报警/}
const compatibility:UsabilityTopic={id:'compatibility',label:'连接与兼容',question:'支持哪些手机、系统、外接开关或配件？连接中断时还能完成哪些操作？',pattern:/兼容|适配系统|Android|安卓|iOS|蓝牙|外接开关|配对|手机系统/}
const consumables:UsabilityTopic={id:'consumables',label:'耗材更换',question:'耗材的型号、价格和供应渠道是什么？能否由我独立更换，是否需要工具？',pattern:/耗材|更换|电池仓|工具|滤芯|杖头|耳塞|管路|轮胎/}
const cleaning:UsabilityTopic={id:'cleaning',label:'清洁与维护',question:'哪些部件可清洁或拆卸？维护步骤是否有可读文字或视频字幕？',pattern:/清洁|清洗|消毒|维护|保养|防水/}
const service:UsabilityTopic={id:'service',label:'维修与长期费用',question:'保修覆盖哪些部件？当地能否维修，寄修期间有没有备用方案？耗材和维修如何收费？',pattern:/保修|维修|寄修|售后|收费|费用|价格|服务网点|备用/}
const offline:UsabilityTopic={id:'offline',label:'断网与备用操作',question:'断网、没电或无法发声时，是否还有可用的离线文字、沟通卡或手动操作？',pattern:/离线|断网|无网络|备用|沟通卡|手动|没电/}
const mobility:UsabilityTopic={id:'mobility',label:'握持、制动与转移',question:'握把、制动和折叠是否需要双手、弯腰或持续握持？怎样安排转移与协助？',pattern:/刹车|制动|握把|扶手|转移|折叠|弯腰|单手|双手/}
export function usabilityTopics(type:string):UsabilityTopic[]{
 if(['hearing-aid','cochlear-processor','hearing-transmitter','vibration-alert'].includes(type))return [controls,alerts,compatibility,consumables,cleaning,service]
 if(['cane','electronic-cane','magnifier','braille-display','reading-device'].includes(type))return [controls,alerts,compatibility,consumables,offline,service]
 if(['aac-device','communication-board','electrolarynx'].includes(type))return [controls,compatibility,offline,alerts,cleaning,service]
 if(['wheelchair','manual-wheelchair','mobility-scooter','walker','rollator','crutches','walking-stick','prosthesis','orthosis'].includes(type))return [mobility,controls,consumables,cleaning,service]
 if(['oxygen','pump','cpap','nebulizer','glucose-monitor','suction-device'].includes(type))return [alerts,controls,consumables,cleaning,offline,service]
 return [controls,alerts,compatibility,consumables,cleaning,service]
}
export function usabilityReview(product:ProductAnalysis){
 const insight=product.insight
 return usabilityTopics(product.deviceType??'other').map(topic=>{
   const quotes=insight?.sources.filter(source=>source.kind!=='review'&&source.imageQuality!=='unreadable').flatMap(source=>{
     const matchingFacts=insight.facts.filter(fact=>fact.sourceId===source.id&&fact.verification!=='unverified'&&(insight.selectedModel===undefined||(fact.modelKey??'')===insight.selectedModel)).map(fact=>fact.quote)
     const body=source.text||source.transcript||'',key=source.modelKey||modelKey(body),inScope=modelKeys(body).length<=1&&(insight.selectedModel===undefined||key===insight.selectedModel)
     const raw=inScope?body.split(/[。；;\n]+/).map(text=>text.trim()).filter(Boolean):[]
     return [...matchingFacts,...raw].filter(text=>text.length<=400&&topic.pattern.test(text)).map(text=>({sourceId:source.id,source:source.name,text,image:!!source.image||!!source.transcript,sample:!!source.sample}))
   }).filter((item,index,all)=>all.findIndex(row=>row.sourceId===item.sourceId&&row.text===item.text)===index)??[]
   return {...topic,quotes:quotes.slice(0,3)}
 })
}
