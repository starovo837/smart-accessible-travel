import { extraEquipment, getTravelMeta } from './catalog.ts'
import { rulesFor, ruleCurrent } from './ruleCatalog.ts'
import { travelPlanSources, safeOfficialTravelUrl, sourceEvidence, type TravelPlanSource } from './travelPlanSources.ts'
import { canonicalTripKey, normalizeTripContext, normalizeTripSpecs, safeTripText } from './travelTripIdentity.ts'
import type { TravelActionEvidence, TravelPlanAction, TravelPlanInput, TravelTaskPlan, TravelStageId } from './travelTaskTypes'

export { normalizeTripSpecs as taskDeviceSpecs } from './travelTripIdentity.ts'
const largeTypes = new Set(['wheelchair','manual-wheelchair','mobility-scooter','walker','rollator','transfer-board'])
const stageTitles: [TravelStageId,string][] = [['before','A 出发前'],['station','B 进站与站内'],['onboard','C 乘车中'],['arrival','D 到达与接驳'],['fallback','E 兜底']]
const batteryLabels = {none:'无电池',lithium:'锂电池',other:'其他类型电池',unknown:'电池类型需读取铭牌'}
const hash = (value: string) => {let n=2166136261; for(let i=0;i<value.length;i++)n=Math.imul(n^value.charCodeAt(i),16777619);return(n>>>0).toString(16)}

/** Pure trip compiler. Unknown endpoints produce preparation, never invented station details. */
export function buildTravelTaskPlan(input: TravelPlanInput): TravelTaskPlan {
  const context=normalizeTripContext(input.context), mode=safeTripText(input.mode), label=safeTripText(getTravelMeta(mode).label,'出行')
  const hasClock=typeof input.now==='number'&&Number.isFinite(input.now)
  const generatedAt=hasClock?new Date(input.now!).toISOString():'生成时间未记录'
  // Without a caller clock, evidence uses a stable reference; departure is not a generation timestamp.
  const reference=hasClock?input.now!:Date.parse(context.journeyDate||'2026-11-07T00:00:00Z')
  const now=Number.isFinite(reference)?reference:Date.parse('2026-11-07T00:00:00Z')
  const devices=(input.devices??[]).map(device=>({id:device.id,name:safeTripText(device.name,'随行辅具'),type:safeTripText(device.type,'other'),specs:normalizeTripSpecs(device,input.specs?.[device.id])})).sort((a,b)=>JSON.stringify([a.name,a.type,a.specs]).localeCompare(JSON.stringify([b.name,b.type,b.specs]),'zh-CN'))
  const route={from:context.from,to:context.to,date:context.journeyDate},from=route.from,to=route.to
  const completeRoute=Boolean(mode&&from&&to)
  const readiness:TravelTaskPlan['readiness']=!completeRoute?'preparation':devices.length&&route.date?'complete':'station-only'
  const missingFields=[...(!mode?['mode']:[]),...(!from?['from']:[]),...(!to?['to']:[]),...(!route.date?['journeyDate']:[]),...(!devices.length?['devices']:[])]
  const rail=mode==='rail'||mode==='train',plane=mode==='plane',metro=mode==='metro',bus=mode==='bus',road=['taxi','ride-hailing','accessible-car','private-car'].includes(mode)
  const names=devices.map(device=>device.name).join('、'),large=devices.some(device=>largeTypes.has(device.type)),dog=devices.some(device=>device.type==='guide-dog')
  const powered=devices.some(device=>device.type!=='guide-dog'&&(device.specs.batteryType!=='none')&&(device.specs.batteryType||['wheelchair','mobility-scooter','oxygen','pump','cpap','hearing-aid','aac-device','electronic-cane','magnifier','cochlear-processor'].includes(device.type)))
  const manualUnfolded=devices.some(device=>device.type==='manual-wheelchair'&&device.specs.folded==='no')
  const contact=rail?{name:'中国铁路12306 / 出发站重点旅客服务',phone:'12306',source:travelPlanSources.railAssistance}
    :plane&&context.carrier==='airchina'?{name:'中国国际航空特殊旅客服务',phone:'95583',source:travelPlanSources.airchina}
    :plane&&context.carrier==='ceair'?{name:'中国东方航空特殊旅客服务',phone:'95530',source:travelPlanSources.ceair}
    :plane&&context.carrier==='csair'?{name:'中国南方航空特殊旅客服务',phone:'95539',source:travelPlanSources.csair}
    :plane?{name:'民航服务质量监督（查询／投诉，不代办航司预约）',phone:'12326',source:travelPlanSources.civilAviation}
    :metro&&/上海|虹桥/.test([context.city,from,to].join(' '))?{name:'上海地铁服务',phone:'021-64370000',source:travelPlanSources.shanghaiMetro}
    :metro&&/杭州/.test([context.city,from,to].join(' '))?{name:'杭州地铁爱心预约',phone:'0571-96600',source:travelPlanSources.hangzhouMetro}
    :{name:'当地实际运营方（可向12328查询所属单位）',phone:'12328',source:travelPlanSources.transport}
  const complaint=rail?{name:'中国铁路12306服务投诉',phone:'12306',source:travelPlanSources.railComplaint}:plane?{name:'民航服务质量监督',phone:'12326',source:travelPlanSources.civilAviation}:{name:'当地交通运输服务监督',phone:'12328',source:travelPlanSources.transportScope}
  const time=route.date?`${route.date}出发`:'计划出发时'
  const party=context.companionCount?`同行${context.companionCount}人（不含本人）`:'本人独自出行'
  const airline=plane?({airchina:'中国国际航空',ceair:'中国东方航空',csair:'中国南方航空',other:'订单实际承运航司',unspecified:''} as const)[context.carrier]:''
  const trip=completeRoute?`${label} ${from}→${to}${context.city?'，填写城市'+context.city:''}${context.line?'，线路'+context.line:''}${airline?'，'+airline:''}，${time}，${party}`:`${label}${context.city?' · '+context.city:''}`
  const equipmentPacket=devices.map(device=>{
    if(device.type==='guide-dog')return `${device.name}（服务犬，通行手续另向运营方核实）`
    const s=device.specs,dimensions=[s.lengthCm?`长${s.lengthCm}`:'长度需测量',s.widthCm?`宽${s.widthCm}`:'宽度需测量',s.heightCm?`高${s.heightCm}`:'高度需测量'].join('/')
    const category=extraEquipment.find(item=>item.id===device.type)?.label??({wheelchair:'电动轮椅',cane:'盲杖','hearing-aid':'助听器',oxygen:'便携制氧机',pump:'胰岛素泵'} as Record<string,string>)[device.type]??safeTripText(device.type.replace(/^custom:/u,''),'其他辅具')
    return `${device.name}（类别：${category}）：${dimensions} cm${s.weightKg?`，${s.weightKg} kg`:''}，${batteryLabels[s.batteryType??'unknown']}${s.batteryWh?` ${s.batteryWh} Wh`:''}${s.batteryCount?` ${s.batteryCount}块`:''}${s.removable?`，电池${s.removable==='yes'?'可拆卸':s.removable==='no'?'不可拆卸':'拆卸方式需核对'}`:''}${s.folded?`，${s.folded==='yes'?'可折叠':s.folded==='no'?'不可折叠':'折叠方式需核对'}`:''}`
  }).join('；')
  const available=[...(['availableLengthCm','availableWidthCm','availableHeightCm','doorWidthCm','availableWeightKg'] as const).flatMap((key)=>context[key]?[`${({availableLengthCm:'已填可用长度',availableWidthCm:'已填可用宽度',availableHeightCm:'已填可用高度',doorWidthCm:'已填门净宽',availableWeightKg:'已填承重'} as const)[key]}${context[key]}${key==='availableWeightKg'?' kg':' cm'}`]:[])].join('、')
  const conflicts=devices.flatMap(device=>([['lengthCm','availableLengthCm','长度'],['widthCm','availableWidthCm','宽度'],['heightCm','availableHeightCm','高度'],['widthCm','doorWidthCm','门净宽'],['weightKg','availableWeightKg','承重']] as const).flatMap(([field,limit,description])=>device.specs[field]&&context[limit]&&device.specs[field]!>Number(context[limit])?[`${device.name}${description}超出本人填写的可用值，需服务方实测并安排替代设备交运或接驳，不能直接判定适配`]:[])).join('；')
  const packet=[equipmentPacket,available,conflicts].filter(Boolean).join('；')
  const inferred=():TravelActionEvidence=>({level:'inference',status:'unverified',updatedAt:generatedAt,officialUrl:contact.source.url,officialLabel:contact.source.title,sourceTitle:'本地规则编排建议；非实时承运许可'})
  const official=(source:TravelPlanSource=contact.source)=>sourceEvidence(source,now)
  const stages=stageTitles.map(([id,title])=>({id,title,actions:[] as TravelPlanAction[],emptyReason:''})),generalActions:TravelPlanAction[]=[]
  const add=(stage:TravelStageId|'general',id:string,title:string,detail:string,question:string,evidence:TravelActionEvidence=inferred(),anchors:TravelPlanAction['anchors']=[])=>{
    if(readiness==='station-only'&&devices.length&&['request','timing','entrance'].includes(id)){
      detail+=` 日期确定前，先凭设备资料预核对受理与通行条件：${packet}。`
      question+=` 设备资料为${packet}，日期确定前可以先核对哪些空间、接应与办理要求？`
    }
    const visible=title+' '+detail+' '+question
    const inferredAnchors:TravelPlanAction['anchors']=[...(from&&visible.includes(from)?[{kind:'from' as const,value:from}]:[]),...(to&&visible.includes(to)?[{kind:'to' as const,value:to}]:[]),...devices.filter(device=>visible.includes(device.name)).map(device=>({kind:'device' as const,value:device.name})),...(route.date&&visible.includes(route.date)?[{kind:'date' as const,value:route.date}]:[])]
    const action:TravelPlanAction={id:`${mode||'prepare'}-${id}`,title,detail,evidence,verification:{contact:contact.name,phone:contact.phone,question},anchors:[...anchors,...inferredAnchors]}
    // A transport label or inferred city alone is not station-specific evidence.
    if(stage==='general'||!action.anchors.length)generalActions.push(action)
    else stages.find(row=>row.id===stage)!.actions.push(action)
    return action
  }
  const dateSentence=route.date?`办理时说明出发日期${route.date}。`:'先核对计划出发日期。'
  if(readiness==='preparation'){
    const known=[from?'出发地点'+from:'',to?'到达地点'+to:'',route.date?'出发日期'+route.date:'',context.city?'城市'+context.city:'',context.line?'线路'+context.line:'',airline,party].filter(Boolean).join('，')
    add('general','prepare-route','补齐出发与到达地点',`填写出发到达后，为你生成站内与接驳的专属行动。${context.city?'已有城市'+context.city+'的信息，仍需具体起终点，不能据此指定入口或站台。':''}`,'我需要安排一次无障碍出行，应该先向哪家实际运营单位确认服务？')
    add('general','prepare-contact',rail?'先咨询12306协助渠道':plane?'从订单查明实际承运航司':metro?'先问地铁运营方接应方式':bus?'先查公交线路与低地板车辆':road?'先问车辆装载与接送条件':'先找到本次运营单位',plane?'先在机票订单查找实际承运航司与官方客服；12326用于咨询或投诉，不代办预约。':metro?`可联系${contact.name}（${contact.phone}），询问本市无障碍入口、渡板与接应申请渠道，站名补齐后再核对路线。`:rail?'拨12306询问重点旅客预约；长宽高未知时先按大型辅具准备，建议提前60分钟到站，并问是否需要更早。':`拨${contact.phone}查询线路实际运营方，再向服务方确认适用车型及协助；12328不代办车辆预约。`,'请告知本次出行所需无障碍服务应向谁申请，需提供哪些行程资料？',official())
    if(devices.length)add('general','prepare-equipment',dog?'整理盲杖与导盲犬资料':'保存设备照片和实际外廓',`${packet}。${dog?'请运营方核对导盲犬所需证件、通行与停留位置，不能把服务犬按普通行李处理。':'拍摄设备及铭牌；尺寸未知时准备现场核量，不自行拆除不熟悉的结构。'}`,'我携带'+names+'，请说明办理前需补充哪项设备资料。')
    if(plane&&manualUnfolded)add('general','prepare-hold','不可折叠轮椅先问货舱装载',`携带${names}，先问航司机型货舱门和装载空间、交运及归还地点；不要按普通随身小件直接进客舱。`,'我的手动轮椅不可折叠，应如何申请交运与机场代用轮椅？')
    if(metro&&dog)add('general','prepare-dog','确认服务犬通行材料',`向${contact.name}询问导盲犬相关证件如何出示、安检配合方式与候车位置；实际要求待核实。`,'我使用盲杖并有导盲犬随行，需要出示什么材料、到哪个服务点接应？')
    // Partial facts still change the preparation task and the actual inquiry.
    const routeTask=generalActions[0],contactTask=generalActions[1]
    routeTask.detail=`已记录${known}。${routeTask.detail}`
    contactTask.detail=`咨询时说明${known}${names?'，携带'+names:''}。${contactTask.detail}`
    if(contactTask.verification)contactTask.verification.question=`我的出行资料为：${known}${packet?'，携带资料为'+packet:''}。${contactTask.verification.question}`
  } else {
    const deviceAsk=devices.length?`我携带${names}。`:'我需要无障碍乘降协助。'
    add('before','request',rail?'申请出发及到达接力服务':plane?'向实际航司申请机场协助':metro?'预约站点引导与渡板':bus?'确认本线路低地板车辆':road?'约定适用车型和接送点':'落实本次乘降协助',`${trip}。${deviceAsk}${rail?'拨12306分别确认'+from+'接应与'+to+'交接；线上预约须提前6小时，不足时咨询现场受理。':plane?'向实际承运航司确认'+from+'值机协助与'+to+'到达服务，记录受理编号；12326不代办预约。':metro?'联系运营方确认'+from+'到'+to+'所涉车站接应，不把网上设施标记当作当天可用。':bus?'向实际线路运营方查询'+from+'到'+to+'对应班次的无障碍车辆、站台和坡道。':'向服务方确认从'+from+'到'+to+'的装载空间、上车点和可提供协助。'}`,`${trip}，${deviceAsk}请确认接应地点、时间和到达交接，是否已受理？`,official())
    add('before','timing',rail?'安排到站及受理时间':plane?'核对值机与交运截止时刻':metro?'避开接应尚未落实的时段':bus?'确认可乘班次再到站':'预留接送和装载时间',`${time}从${from}出发，${party}。${rail?'大型辅具建议提前60分钟到站，再向12306确认是否需更早；不足6小时预约时询问现场申请点及受理时限。':plane?'向航司询问本航班的值机、设备交运与特殊协助截止时间，按最早的办理要求安排到机场。':metro?'向站方核对当日服务时段与电梯检修情况，未确认接应前保留备用交通。':'向服务方约定本次接应和装载所需时间，不把普通步行导航时长当作无障碍通行时间。'}`,`关于${from}本次出发，我${party}，应提前多久到、在哪里报到？`)
    add('station','entrance',plane?'确认机场无台阶值机路线':bus?'核实站台高度与候车位置':'询问出发点无台阶入口',`${trip}。向工作人员核实${from}当天可用的入口、坡道、垂直电梯及从入口至${plane?'值机柜台和安检区':'候乘点'}的连续路径；不预设具体入口编号。`,`${from}哪处入口能全程避开台阶？电梯停用时请安排可通行替代路线。`)
    add('station','facilities','到场先找受理点与卫生间',`到${from}后出示预约回复，确认问询处／协助受理点、无障碍卫生间位置与开门方式。${dateSentence}请站方核对当天开放情况。`,`${from}协助受理点和当前可用的无障碍卫生间在哪里？能否安排引导？`)
    if(context.companionCount)add('station','companion','核对同行者通行凭证',`${trip}。${from}出发时请确认${context.companionCount}名同行者各自是否持票、能陪同到哪里，不能预设可免票进站。`,`${from}有${context.companionCount}人陪同我，需要什么票证，可以陪到哪个区域？`)
    else add('station','solo','独行时约定接力人员',`${trip}。我独自出行，请${from}工作人员给出接应人员和联络方式，并落实到${to}的交接，不能把陪护责任默认交给陌生乘客。`,`${from}出发我没有同行者，谁负责引导至乘车处、怎样通知${to}接力？`)
    if(readiness==='complete'){
      add('before','device-record','复核档案中的设备运输参数',`${trip}。我的设备已自动带出：${packet}。这些是本人填写或设备档案数据，未经过承运方核验；只补充尚需测量的一项，不能把空值当零。`,`${packet}。办理前请确认最先要补充哪项数据，是否可以现场核量？`,{...inferred(),level:'user',sourceTitle:'本人填写或设备档案，未经承运方核验',originalText:packet})
      add('before','carry',plane?'核实辅助设备交运方式':metro?'说明随行设备与站台协助':'按实际设备确认携带安排',`${trip}。${packet}。${plane&&large?'先按辅助设备运输申请，核实机型货舱门与装载空间；大型轮椅不得被当作普通随身小件带入客舱。':rail&&large?'按大型辅具准备，缺尺寸先用照片申请协助，再逐项测量；不把普通行李限额直接套用到轮椅。':'说明设备是否佩戴使用、随身存放，以及所需空间，要求运营方明确本次适用条件。'}待核实。`,`${trip}。${packet}。这台设备应随身、交运还是按特殊设备办理？请给出可执行方案。`)
      if(devices.some(device=>device.type!=='guide-dog'))add('before','pack',manualUnfolded?'保留整椅结构安排交接':'按说明书准备包装与附件',`${trip}。设备资料：${packet}。${manualUnfolded?'不可折叠轮椅不强行折叠，先请航司确认整椅保护、装卸及到达归还。':'依据实际外廓选包装，对易脱落附件单独收纳并标注；仅按制造商说明收折或拆解。'}拍照记录外观，电池不熟悉时不要强拆。`,`${packet}。请确认${from}办理前哪些部件需分装、如何保护及防短路？`)
      add('before','documents',dog?'准备设备资料及服务犬文件':'随身保存订单和设备铭牌',`${trip}。带购票有效证件、订单及${names}说明书／铭牌照片；${dog?'向运营方核实导盲犬需出示的证件和安检配合方式。':'特殊协助所需证明逐项向运营方核对，不默认每人必须出示残疾证。'}`,`${from}办理${names}协助具体要哪些材料，电子照片能否使用？`,rail?official(travelPlanSources.railAssistance):inferred())
      add('station','screening',plane?'在安检与设备交接处核量':metro?'向站务说明设备安检需要':'向安检展示设备信息',`${trip}。向${from}安检人员展示：${packet}。${dog?'由工作人员说明导盲犬检查及通行方式。':'缺少数据先请求现场核量；不能安全通过时请安排人工检查或替代通道。'}不自行搬抬载人轮椅。`,`${packet}。在${from}应怎样配合安检，是否需要人工检查及协助？`)
      add('onboard','position',plane?'确认客舱座位与整椅归还':metro?'在指定位置等候并避开门缝':bus?'核对轮椅区和固定装置':'按实际空间停放并固定',`${trip}。设备资料：${packet}。${plane?'由机组确认适用座位及转移协助，交运轮椅与旅客在客舱的座位分开安排，不能假定可直接坐自带轮椅乘机。':dog?'向工作人员确认导盲犬停留及盲杖收纳位置，避免占用车门与疏散路径。':'由工作人员确认轮椅区／座位、刹车与固定带适用位置；空间不合适时先调整方案，不凭尺寸自行判定可安全固定。'}待核实。`,`${packet}。本次应安排在哪里，如何安全存放或固定，到${to}如何归还与接应？`)
      if(powered)add('onboard','battery','主动申报电池及途中使用',`${trip}。${packet}。向工作人员展示铭牌，核对电池是否保持安装、是否要隔离端子及途中可否使用；不把航空电池限值套用到高铁或地铁。待核实。`,`${packet}。请确认本次电池申报、拆卸、包装与途中使用要求。`)
      else if(plane)add('onboard','nonpowered','确认非电动轮椅装卸交接',`${trip}。${packet}。向航司说明无驱动电池，核对装载与到达交接；不因无电池而省去外廓和货舱门核对。`,`${packet}。到${to}是在舱门口还是行李处归还轮椅，谁负责交接？`)
      if(metro&&dog)add('onboard','dog','请站务协助导盲犬通行',`在${from}上车前说明盲杖与导盲犬随行，向站务核对候车、上车及${to}下车引导；相关通行材料与位置要求以运营方当前说明核实。`,`${from}到${to}有导盲犬随行，请确认接应、候车及停留位置。`)
      add('onboard','assistance','上车后约定途中求助方式',`${trip}。向乘务员／工作人员说明${names}相关需要，确认途中联络、如厕或转移协助范围及${to}交接；不默认工作人员提供持续个人护理。`,`${trip}。途中需要帮助时如何联系，能否在到达${to}前对接接力人员？`,rail?official(travelPlanSources.railAssistance):inferred())
    }
    add('arrival','exit',plane?'到达前落实机场轮椅交接':'下车前确认无台阶出口',`${trip}。到${to}前确认下车位置、接应人、电梯和地面出口；具体编号与设施当天可用性向现场核实。${party}，如无人接应先在安全区域等待。`,`${to}从下车处到出口怎样全程无台阶，电梯停运时由谁安排替代？`)
    add('arrival','transfer',metro?'逐段核实地铁换乘路径':'确认到达后的接驳条件',`${trip}。从${to}换乘前，分别确认下一段站点、连续无台阶路线和接应。${devices.length?'接驳时出示：'+packet+'。':'如需携带辅具，请选择后再核对车辆装载与固定要求。'}${rail?'多段列车分别申请协助。':plane?'给设备归还、行李领取与下一程留出余量。':'设施不可用时请工作人员给出备用路线。'}`,`${to}接驳怎样通行？${devices.length?packet+'。':''}应联系哪个实际运营方？`)
    const local=/杭州/.test(to)?{name:'杭州地铁爱心预约',phone:'0571-96600',source:travelPlanSources.hangzhouMetro}:/上海|虹桥/.test(to)?{name:'上海地铁服务',phone:'021-64370000',source:travelPlanSources.shanghaiMetro}:null
    if(local&&!metro){const row=add('arrival','local',`询问${local.name}接应`,`${time}抵达${to}后如需地铁接驳，拨${local.phone}核对无台阶入口、渡板与换乘接应；当天是否可用须落实，不把电话咨询当作预约成功。`,`${to}到达后需要地铁接驳，请确认接应地点和受理方式。`,official(local.source));row.verification={contact:local.name,phone:local.phone,question:row.verification!.question}}
    add('fallback','refusal','受阻时请值班负责人协调',`可出示：“我本次从${from}到${to}，${time}，${devices.length?'携带'+names:'需要无障碍协助'}。请说明当前拒绝的具体原因、现行条款、可补正材料，并请值班负责人给出可执行替代安排。”先留在安全区域，记录工单号。`,`${trip}，请说明拒绝依据、可补正事项及今天可执行的替代方案。`)
    const escalation=add('fallback','contact',`需进一步协调时拨${complaint.phone}`,`${trip}。先找现场负责人，仍未解决联系${complaint.name}。${rail?'12328不代替铁路客服。':plane?'先找实际航司，12326不代办预约。':'12328可受理或转办城市客运等服务问题，不代办车辆预约。'}提供具体时间、地点和诉求，保存受理编号。`,`${trip}发生无障碍服务问题，请记录诉求并告知现场解决途径和受理编号。`,official(complaint.source));escalation.verification={contact:complaint.name,phone:complaint.phone,question:escalation.verification!.question}
    if(rail||plane||mode==='coach'||mode==='ferry')add('fallback','ticket','核对本票种退改条件',`${trip}。打开原购票渠道订单或到${from}服务柜台，先核对退改时限、费用及证明；因设备安排未能成行时先保存客运记录，不默认可免费退改。`,`${from}本次因协助安排不能成行，如何改签退票、需保留什么证明？`,rail?official(travelPlanSources.railEntry):inferred())
    else add('fallback','backup','原线路受阻时安排备用接驳',`${trip}。请${from}工作人员确认安全等候处，再询问到${to}的下一班适用车辆或无障碍接驳。${devices.length?'说明'+packet+'，核实装载与固定。':''}先落实再变更路线。`,`${from}到${to}原方案无法落实，请提供可行备用接驳及实际服务方电话。`)
    for(const rule of rulesFor(mode,context,input.documents??[])){
      const url=safeOfficialTravelUrl(rule.url);if(!url)continue
      const current=ruleCurrent(rule,Math.max(now,Date.parse(route.date)||0)),historical=!current&&(rule.status==='verified'||Boolean(rule.checkedAt))
      const topic=/battery|电池/.test(rule.id+' '+rule.title)?'核验电池运输条件':/assistance|辅助/.test(rule.id+' '+rule.title)?'核验辅助设备交运要求':safeTripText(rule.title,'核验本次携带规则')
      add('before','source-'+rule.id,(historical?'历史条款，可能已变更：':'')+topic,`${trip}。保留${safeTripText(rule.title,'相关官方条款')}原文。${current?'结合实际辅具逐条核对；有条款不等于本次已获运输许可。':'不以其中旧阈值作本次许可；打开官方页面核验新版本，并落实替代方式。'}`,`${trip}，这份条款是否仍有效并适用？若有变更请说明新入口与可办方案。`,{level:'official-rule',status:current?'current':historical?'historical':'unverified',updatedAt:rule.publishedAt?'原文发布日期：'+rule.publishedAt:rule.checkedAt?'上次来源核验：'+rule.checkedAt:'原文更新时间与核验时间未提供',officialUrl:url,officialLabel:safeTripText(rule.title,'官方规则'),sourceTitle:safeTripText(rule.title,'官方规则'),effectiveDate:rule.effectiveAt,expiresAt:rule.expiresAt,originalText:rule.excerpts.map(excerpt=>safeTripText(excerpt.label)+'：'+safeTripText(excerpt.text)).join('\n')})
    }
  }
  for(const stage of stages)if(!stage.actions.length)stage.emptyReason=readiness==='preparation'?'出行方式或出发与到达地点尚不完整，请先完成通用预备。':readiness==='station-only'?(!devices.length?'选择本次设备后，再安排设备使用与乘车协助。':'补齐出发日期后，再安排设备使用与乘车协助。'):'当前交通方式及设备无需该环节。'
  const count=stages.reduce((sum,stage)=>sum+stage.actions.length,0)
  const summary=`本次为 ${[label,completeRoute?`${from} → ${to}`:context.city,route.date,names].filter(Boolean).join(' · ')} 生成 ${count} 项专属行动 + ${generalActions.length} 项通用建议${readiness==='preparation'?'；填写出发到达后，为你生成站内与接驳的专属行动':readiness==='station-only'?(!devices.length?'；当前为站点行动，设备相关内容将在选择后补充':'；当前为站点行动，补齐出发日期后生成完整行程行动'):''}`
  const contacts=[{name:contact.name,phone:contact.phone,url:contact.source.url},{name:complaint.name,phone:complaint.phone,url:complaint.source.url}]
  for(const action of [...stages.flatMap(stage=>stage.actions),...generalActions])if(action.verification&&!contacts.some(row=>row.phone===action.verification!.phone))contacts.push({name:action.verification.contact,phone:action.verification.phone,url:action.evidence.officialUrl})
  return {version:1,id:'travel-task-'+hash(canonicalTripKey(input)),generatedAt,mode,summary,readiness,route,devices,companionCount:context.companionCount,missingFields,stages,generalActions,contacts:contacts.filter((row,index)=>contacts.findIndex(other=>other.phone===row.phone&&other.name===row.name)===index)}
}
