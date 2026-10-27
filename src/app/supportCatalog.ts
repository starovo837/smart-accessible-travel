import type { ModuleId } from './types'
import type { IconName } from '../components/Icons'
export type SupportToolId=import('./livingCatalog').ServiceToolId|'vision'|'magnifier'|'color'|'communication'|'gestures'|'steps'|'reminders'|'help'|'life'|'needs'
export interface SupportTool {id:SupportToolId;title:string;detail:string;icon:IconName;modules:ModuleId[]}
export const supportTools:SupportTool[]=[
 {id:'vision',title:'看图读字',detail:'拍照读文字，了解画面中的物品与场景',icon:'camera',modules:['vision','cognitive']},
 {id:'magnifier',title:'放大镜',detail:'放大细节，调整对比与明暗',icon:'search',modules:['vision']},
 {id:'color',title:'颜色与明暗',detail:'辨认画面中央颜色与整体亮度',icon:'eye',modules:['vision']},
 {id:'communication',title:'打字沟通',detail:'常用话语、朗读与大字沟通卡',icon:'message',modules:['speech','hearing']},
 {id:'gestures',title:'基础手势沟通',detail:'7种手势识别、练习与自设短语',icon:'hand',modules:['speech','hearing','mobility']},
 {id:'steps',title:'一步一步做',detail:'生活任务拆成小步骤，可以暂停续做',icon:'steps',modules:['cognitive','chronic']},
 {id:'reminders',title:'日常提醒',detail:'按你自己的安排记下重要事项',icon:'clock',modules:['chronic','cognitive']},
 {id:'help',title:'求助沟通卡',detail:'把需要的协助清楚展示给对方',icon:'heart',modules:['speech','hearing','mobility','vision']},
 {id:'life',title:'我的生活工具',detail:'居家适配、设备照护、行程和家属协助',icon:'list',modules:['mobility','chronic']},
 {id:'places',title:'地图与设施',detail:'真实地图与本人核实的通行记录',icon:'search',modules:['mobility','vision']},
 {id:'healthcare',title:'就医协助',detail:'需求卡、材料清单与官方预约渠道',icon:'heart',modules:['chronic','mobility','hearing','speech']},
 {id:'live-help',title:'限时求助',detail:'预览后分享，接收方主动回应',icon:'message',modules:['vision','hearing','mobility','speech','cognitive','chronic']},
 {id:'benefits',title:'福利与办事',detail:'地区与事项的官方办理入口',icon:'list',modules:['chronic','mobility']},
 {id:'equipment-service',title:'辅具专业服务',detail:'评估、试用、维修与租借渠道',icon:'wheelchair',modules:['vision','hearing','mobility']},
 {id:'digital-help',title:'数字办事',detail:'读原文、核对期限和行动清单',icon:'eye',modules:['vision','cognitive']},
 {id:'home-connect',title:'居家联动',detail:'设备渠道与提醒通道测试',icon:'volume',modules:['hearing','mobility']},
 {id:'participation',title:'学习工作与休闲',detail:'合理便利需求卡与真实资源',icon:'user',modules:['hearing','speech','cognitive','mobility']},
 {id:'needs',title:'辅助设置',detail:'字号、朗读、简化步骤与老年模式',icon:'settings',modules:['vision','mobility','cognitive']}
]
export function recommendedTools(modules:ModuleId[]){
 const ids=[...new Set(modules)].filter(id=>['vision','hearing','mobility','speech','cognitive','chronic'].includes(id))
 if(!ids.length)return supportTools.filter(tool=>['communication','steps','help'].includes(tool.id))
 const primary:Record<ModuleId,SupportToolId>={vision:'vision',hearing:'communication',mobility:'equipment-service',speech:'communication',cognitive:'steps',chronic:'reminders'}
 const first=[...new Set(ids.map(id=>primary[id]))].map(id=>supportTools.find(tool=>tool.id===id)!),rest=supportTools.map((tool,order)=>({tool,score:tool.modules.filter(id=>ids.includes(id)).length,order})).filter(row=>row.score>0&&!first.some(tool=>tool.id===row.tool.id)).sort((a,b)=>b.score-a.score||a.order-b.order).map(row=>row.tool)
 return [...first,...rest]
}
export const gestureOptions=[
 {id:'Open_Palm',name:'张开手掌',hint:'五指自然张开，手掌朝向摄像头。',phrase:'请等一下，我需要一点时间。'},
 {id:'Closed_Fist',name:'握拳',hint:'手指收拢握拳，正面朝向摄像头。',phrase:'我需要帮助。'},
 {id:'Pointing_Up',name:'食指向上',hint:'伸出食指朝上，其余手指自然收拢。',phrase:'我想问一个问题。'},
 {id:'Thumb_Up',name:'拇指向上',hint:'伸出拇指朝上，其余手指收拢。',phrase:'好的，谢谢。'},
 {id:'Thumb_Down',name:'拇指向下',hint:'伸出拇指朝下，其余手指收拢。',phrase:'不合适，请换一种方式。'},
 {id:'Victory',name:'V形手势',hint:'食指和中指展开成V形。',phrase:'请把内容写下来。'},
 {id:'ILoveYou',name:'拇指食指小指展开',hint:'展开拇指、食指和小指，其他两指收拢。',phrase:'谢谢你的理解。'}
] as const
export function confirmedGesture(category:string,score:number,consecutive:number){return score>=.7&&consecutive>=3?gestureOptions.find(option=>option.id===category):undefined}
export interface DailyReminder {id:string;title:string;dueAt:string;done:boolean;note:string}
export function dueReminders(rows:DailyReminder[],now=Date.now()){return rows.filter(row=>!row.done&&row.title.trim()&&Number.isFinite(Date.parse(row.dueAt))&&Date.parse(row.dueAt)<=now)}
