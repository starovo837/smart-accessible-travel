import type {IconName} from '../components/Icons'
import type {SupportToolId} from './supportCatalog'
export type ServiceToolId='places'|'healthcare'|'live-help'|'benefits'|'equipment-service'|'digital-help'|'home-connect'|'participation'
export type SceneId='hospital'|'errands'|'home'|'work'|'activity'|'assistance'
export const livingEntries:{id:ServiceToolId;title:string;detail:string;icon:IconName}[]=[
 {id:'places',title:'地图与设施',detail:'查真实地点，记录入口与通行条件',icon:'map-pin'},
 {id:'healthcare',title:'就医协助',detail:'准备需求卡、材料与官方预约渠道',icon:'hospital'},
 {id:'live-help',title:'限时求助',detail:'本人选择范围，接收方主动回应',icon:'handshake'},
 {id:'benefits',title:'福利与办事',detail:'找到官方入口，逐项准备材料',icon:'documents'},
 {id:'equipment-service',title:'辅具专业服务',detail:'评估、试用、适配、维修与租借',icon:'equipment-care'},
 {id:'digital-help',title:'数字办事',detail:'读通知、整理期限、核对行动清单',icon:'digital-form'},
 {id:'home-connect',title:'居家联动',detail:'设备渠道、提醒设置与本机测试',icon:'home-connect'},
 {id:'participation',title:'学习工作与休闲',detail:'表达协助需要，寻找真实资源与活动',icon:'book-open'}
]
export const livingScenes:{id:SceneId;title:string;icon:IconName;detail:string}[]=[
 {id:'hospital',title:'去医院',icon:'hospital',detail:'预约、沟通与到院准备'},
 {id:'errands',title:'出门办事',icon:'briefcase',detail:'材料、地点与办理步骤'},
 {id:'home',title:'在家生活',icon:'home',detail:'居家环境、设备与提醒'},
 {id:'work',title:'学习工作',icon:'book-open',detail:'阅读、沟通与合理便利'},
 {id:'activity',title:'参加活动',icon:'leaf',detail:'场馆设施与参与方式'},
 {id:'assistance',title:'获得协助',icon:'handshake',detail:'把需要交给你选择的人'}
]
export interface SceneStep {id:string;title:string;detail:string;action:SupportToolId|'fitting'|'shop'|'travel';button:string}
export const sceneSteps:Record<SceneId,SceneStep[]>={
 hospital:[{id:'needs',title:'准备一张就医需求卡',detail:'写下沟通、转移、陪同或设备方面的需要，不必填写完整病历。',action:'healthcare',button:'准备就医资料与预约渠道'},{id:'place',title:'核对医院入口与设施',detail:'确认入口、服务台和电梯；不清楚的保留待核实。',action:'places',button:'查看地图与设施'},{id:'talk',title:'选好现场沟通方式',detail:'按需要使用字幕、打字或大字卡。',action:'communication',button:'打开沟通工具'},{id:'help',title:'需要时联系可信的人',detail:'求助内容、位置与有效期由你预览后决定。',action:'live-help',button:'准备限时求助'}],
 errands:[{id:'matter',title:'找到对应官方渠道',detail:'选择地区与事项，核对材料、费用说明与办理时间。',action:'benefits',button:'准备办事清单'},{id:'notice',title:'读懂通知和表单',detail:'先保留原文，再核对期限与需要完成的操作。',action:'digital-help',button:'整理通知与行动'},{id:'route',title:'确认去哪里和怎么进入',detail:'地图位置和无障碍设施需要分别确认。',action:'places',button:'查地点与通行条件'},{id:'travel',title:'携带设备时核对交通要求',detail:'使用实物设备参数，不把三维草案当运输规格。',action:'travel',button:'进入出行查询'}],
 home:[{id:'space',title:'看一看居家使用条件',detail:'记录门宽、电梯、照明与常用位置，按自己的动作方式核对。',action:'life',button:'打开居家与设备工具'},{id:'alerts',title:'选择合适的提醒通道',detail:'先核对真实设备与平台支持，再测试声音、文字或振动。',action:'home-connect',button:'准备居家联动'},{id:'routine',title:'把常做的事拆成小步骤',detail:'可以暂停，也可以删除不适用的步骤。',action:'steps',button:'写一个生活任务'},{id:'reminder',title:'记下已有的重要安排',detail:'时间和内容由你决定；网页关闭后不保证后台推送。',action:'reminders',button:'设置日常提醒'}],
 work:[{id:'needs',title:'表达学习或工作的协助需要',detail:'整理资料格式、字幕、座位或操作方式等需求。',action:'participation',button:'准备参与需求卡'},{id:'read',title:'阅读需要处理的材料',detail:'拍清楚的局部图或整理文字，再核对AI阅读结果。',action:'vision',button:'看图读字'},{id:'captions',title:'按需使用交流字幕',detail:'先确认对方愿意使用浏览器语音服务，再开始识别。',action:'captions',button:'打开实时字幕'},{id:'task',title:'按自己的节奏推进任务',detail:'将事项拆成可暂停的小步骤，不按残障类型替你限定能力。',action:'steps',button:'创建逐步任务'}],
 activity:[{id:'resource',title:'寻找真实活动与场馆',detail:'查看官方资源，询问字幕、口述、席位及陪同安排。',action:'participation',button:'查看活动与文娱渠道'},{id:'access',title:'核对场馆入口和设施',detail:'记录地点、来源与核实时间，不以一个标签概括全部条件。',action:'places',button:'核对场馆设施'},{id:'talk',title:'准备现场沟通内容',detail:'把需要的协助写成清楚短句，随时展示或朗读。',action:'communication',button:'准备沟通卡'},{id:'transport',title:'带上辅具也能提前准备',detail:'结合交通方式和实物设备资料检查携带要求。',action:'travel',button:'检查这次出行'}],
 assistance:[{id:'message',title:'先说清这次需要什么',detail:'选择愿意联系的对象，预览求助内容，不自动通知家属。',action:'live-help',button:'创建限时求助'},{id:'card',title:'也可以直接向身边人出示',detail:'没有网络时，仍可使用大字沟通卡。',action:'help',button:'展示求助卡'},{id:'service',title:'设备问题寻找专业服务',detail:'查看真实机构的服务范围与预约渠道，再记录对方回复。',action:'equipment-service',button:'寻找辅具专业服务'}]
}
