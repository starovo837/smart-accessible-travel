import type { Device, TravelContext, TravelDeviceSpecs } from './types'
import { rulesFor, ruleCurrent } from './ruleCatalog.ts'
import { travelPlanSources, safeOfficialTravelUrl, sourceEvidence, type TravelPlanSource } from './travelPlanSources.ts'
import type { TravelActionEvidence, TravelPlanAction, TravelPlanInput, TravelTaskPlan } from './travelTaskTypes'

const largeTypes = new Set(['wheelchair', 'manual-wheelchair', 'mobility-scooter', 'walker', 'rollator', 'transfer-board'])
const poweredTypes = new Set(['wheelchair', 'mobility-scooter', 'oxygen', 'pump', 'cpap', 'hearing-aid', 'aac-device', 'electronic-cane', 'magnifier', 'cochlear-processor'])
const text = (value: unknown, max = 120) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const positive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined

/** Only normalize actual supplied measurements; unknown is never interpreted as zero or no battery. */
export function taskDeviceSpecs(device: Device, supplied: TravelDeviceSpecs = {}): TravelDeviceSpecs {
  const result: TravelDeviceSpecs = {}
  for (const key of ['lengthCm', 'widthCm', 'heightCm', 'weightKg', 'batteryWh'] as const) {
    const value = positive(supplied[key]); if (value !== undefined) result[key] = value
  }
  if (['yes', 'no', 'unknown'].includes(supplied.folded ?? '')) result.folded = supplied.folded
  if (['none', 'lithium', 'other', 'unknown'].includes(supplied.batteryType ?? '')) result.batteryType = supplied.batteryType
  if (['yes', 'no', 'unknown'].includes(supplied.removable ?? '')) result.removable = supplied.removable
  if (supplied.batteryCount === 1 || supplied.batteryCount === 2) result.batteryCount = supplied.batteryCount
  // Legacy manual device descriptions are shown as supplied information, not validated limits.
  if (!result.batteryType && device.battery.trim() === '无') result.batteryType = 'none'
  return result
}

function primaryContact(mode: string, context: TravelContext) {
  if (mode === 'rail' || mode === 'train') return { name: '中国铁路12306 / 出发站重点旅客服务', phone: '12306', source: travelPlanSources.railAssistance }
  if (mode === 'plane') {
    if (context.carrier === 'airchina') return { name: '中国国际航空特殊旅客服务', phone: '95583', source: travelPlanSources.airchina }
    if (context.carrier === 'ceair') return { name: '中国东方航空特殊旅客服务', phone: '95530', source: travelPlanSources.ceair }
    if (context.carrier === 'csair') return { name: '中国南方航空特殊旅客服务', phone: '95539', source: travelPlanSources.csair }
    return { name: '民航服务质量监督（查询／投诉，不代办航司预约）', phone: '12326', source: travelPlanSources.civilAviation }
  }
  const place = [context.city, context.from, context.to].join(' ')
  if (mode === 'metro' && /上海|虹桥/.test(place)) return { name: '上海地铁服务', phone: '021-64370000', source: travelPlanSources.shanghaiMetro }
  if (mode === 'metro' && /杭州/.test(place)) return { name: '杭州地铁爱心预约', phone: '0571-96600', source: travelPlanSources.hangzhouMetro }
  return { name: '当地运营方（可向12328询问所属线路或服务单位）', phone: '12328', source: travelPlanSources.transport }
}

function planIdentity(input: unknown) {
  const serialized = JSON.stringify(input); let hash = 2166136261
  for (let i = 0; i < serialized.length; i++) hash = Math.imul(hash ^ serialized.charCodeAt(i), 16777619)
  return 'travel-task-' + (hash >>> 0).toString(16)
}

/** Always builds a usable task route, even without measurements or a currently verified rule. */
export function buildTravelTaskPlan(input: TravelPlanInput): TravelTaskPlan {
  const now = Number.isFinite(input.now) ? input.now! : Date.now(), generatedAt = new Date(now).toISOString()
  const mode = text(input.mode, 80) || 'rail', context = input.context ?? { carrier: 'unspecified' }
  const rail = mode === 'rail' || mode === 'train', plane = mode === 'plane'
  const unknownAirline = plane && !['airchina', 'ceair', 'csair'].includes(context.carrier)
  const from = text(context.from) || text(context.city) || '出发站点待填写', to = text(context.to) || '到达站点待填写'
  const route = { from, to, date: text(context.journeyDate, 32) || '出发日期待填写' }
  const devices = input.devices.map(device => ({ id: device.id, name: text(device.name) || '随行辅具', type: device.type, specs: taskDeviceSpecs(device, input.specs?.[device.id]) }))
  const names = devices.length ? devices.map(device => device.name).join('、') : '随行辅具（暂未选择）'
  const large = input.devices.some(device => largeTypes.has(device.type)), powered = input.devices.some(device => poweredTypes.has(device.type)) || devices.some(device => device.specs.batteryType && !['none', 'unknown'].includes(device.specs.batteryType))
  const contact = primaryContact(mode, context), verify = (question: string) => ({ contact: contact.name, phone: contact.phone, question })
  const indirectContact = !rail && !plane && contact.phone === '12328'
  const official = (source: TravelPlanSource = contact.source) => sourceEvidence(source, now)
  const inferred = (): TravelActionEvidence => ({ level: 'inference', status: 'unverified', updatedAt: '编排建议生成：' + generatedAt, officialUrl: contact.source.url, officialLabel: contact.source.title, sourceTitle: '本地任务编排建议，不代表实时模型或承运许可' })
  const action = (id: string, title: string, detail: string, evidence = inferred(), question?: string): TravelPlanAction => ({ id, title, detail, evidence, ...(question || evidence.status !== 'current' ? { verification: verify(question || '这项安排当前是否适用于我的行程？请说明办理地点、条件和下一步。') } : {}) })
  const summary = unknownAirline
    ? '先从机票订单找到实际承运航司的官方客服，申请辅助设备运输与机场协助，再逐项落实托运、电池和乘降安排；12326用于民航服务质量咨询或投诉，不代办预约。'
    : indirectContact
    ? `先与${mode === 'private-car' ? '驾驶员或车辆服务方' : '本次实际运营方'}落实${large ? '大型辅具装载、固定与乘降' : '辅具携带与存放'}安排；不知道联系渠道时可拨12328咨询公共交通服务渠道，12328不代办车辆预约。按下方五段清单逐项完成。`
    : large
    ? `按大型辅具准备：联系${contact.phone}落实携带与乘降协助，${rail ? '建议提前60分钟到站' : plane ? '按航司要求预留托运与特殊协助时间' : '出发前确认车辆、坡道及固定位置'}；尺寸可以稍后逐项补充，先按下方清单行动。`
    : `清单已就绪：先联系${contact.phone}说明${names}与行程，落实安检、存放和所需协助，再按五段清单逐项完成。`
  const before: TravelPlanAction[] = [
    action('before-carry', large ? '按大型辅具办理本次携带与协助' : '先向运营方说明所带辅具', plane && large
      ? `将${names}按辅助设备运输申请办理，询问是否需要托运、机型货舱装载空间与归还位置；不要按普通随身小件直接进客舱。待核实。`
      : `说明携带${names}，${large ? '按大型行动辅具说明用途，不把普通行李限额直接套用到轮椅' : '说明是否佩戴使用、随身存放或需要辅助搬运'}。长宽高未知时先出示设备照片，申请人员核对乘降空间。待核实。`, inferred(), `我从${from}到${to}，携带${names}。请确认本次能如何携带、应在哪个服务点办理，并告知不符合时的替代安排。`),
    action('before-pack', '按设备说明书整理、拍照与打包', '出发前拍摄设备完整外观和电池铭牌；把容易脱落的坐垫、附件分装并标注。只按制造商说明收折或拆解，不熟悉的电池不要自行强拆；向运营方询问是否需防短路或专用包装。待核实。', inferred(), '这台设备哪些部件要拆下或单独包装？电池是否保持安装、需要怎样防短路？请按我的具体型号说明。'),
    action('before-documents', '随身带好证件、订单和设备资料', '准备购票使用的有效身份证件、车次或航班订单、设备说明书或铭牌照片。申请特殊协助时向服务方核对具体证明材料；不预设所有旅客必须提供残疾证，也不要在本应用上传证件。', rail ? official(travelPlanSources.railAssistance) : inferred(), '申请我所需的协助具体要带哪些证明？电子照片是否可用？哪些材料并非必需？'),
    action('before-arrival-time', rail ? '建议提前60分钟到站，预约不足6小时改走现场受理' : plane ? '先确认值机截止时间，再预留设备托运时间' : '出发前留出协助和候车余量', rail
      ? '编排建议：为大型辅具安检、核对和协助预留时间，建议提前60分钟到站。12306页面另列：线上重点旅客申请须乘车前6小时提交；不足6小时到站现场申请，受理时限不晚于开车前60分钟。先电话确认是否需要更早到达。'
      : plane ? '编排建议：提前联系实际承运航司确认本机场值机、特殊协助与设备交运各自截止时间，再安排到达时间；没有统一适用所有机场和设备的提前时长。待核实。'
      : '编排建议：先向运营方约定接应地点和时间，给坡道操作、等候适用车型及设备固定留出余量；未得到接应确认前安排备用接驳。待核实。', inferred(), rail ? '我这趟车携带大型辅具，是否应早于开车前60分钟到站？不足6小时预约应到哪个现场服务点？' : '本次需提前多久到、最迟何时交运或报到？请给出具体时限和接应地点。'),
    action('before-assistance', rail ? '联系12306申请重点旅客服务' : '联系实际运营方约定协助', rail
      ? `现在拨12306说明${route.date}、${from}→${to}、车次及${names}，申请便利进出站、乘降协助和到达交接。可从12306温馨服务进入预约；外部平台可能需登录，电话和现场渠道也可办理。记录回复与受理编号。`
      : unknownAirline ? `先在机票订单查明实际承运公司及其官网电话，向航司报出日期、航班和${names}，申请辅助设备运输与机场协助。找不到官方联系渠道时可向12326咨询；12326不代为预约。记录航司回复与受理编号。`
      : indirectContact ? `先与${mode === 'private-car' ? '驾驶员或车辆服务方' : '本次实际公交、客运、船运或车辆服务方'}确认日期、线路、设备和上下车需要。查不到公开联系渠道时可拨12328询问所属运营单位或适用公共接驳；12328不代办车辆预约，也不确认本次车辆可用。记录实际服务方回复。`
      : `向${contact.name}报出日期、线路或航班、${names}及上下车需要，核实受理条件、对接人员和到达交接。记录联系人、回复及受理编号，不把打开页面当作预约成功。`, indirectContact ? inferred() : official(), rail ? '请帮我预约这趟车的重点旅客协助，并确认出发站接应点、乘降安排及到达站交接方式。' : unknownAirline ? '请告知如何查找我这张机票实际承运公司的官方客服渠道，我需要直接向航司申请辅助设备运输。' : indirectContact ? '请告知本地这条线路或适用无障碍接驳的实际运营单位及其官方联系方式，我需要直接确认车辆和协助。' : '请确认本次协助申请是否已受理，在哪里、什么时间与谁对接？'),
  ]
  if (devices.length) {
    const dimensions = devices.map(device => `${device.name}：${[device.specs.lengthCm, device.specs.widthCm, device.specs.heightCm].map(value => value === undefined ? '未填写' : value).join(' × ')} cm；${device.specs.weightKg === undefined ? '重量未填写' : device.specs.weightKg + ' kg'}`).join('；')
    before.push(action('before-device-record', '核对已从我的设备带出的参数', dimensions + '。已知参数保留，缺项可逐项补；补充后清单即时更新。待核实的尺寸不阻止先申请协助。', { ...inferred(), level: 'user', updatedAt: '本次用户资料整理：' + generatedAt, originalText: dimensions, sourceTitle: '本人填写或设备档案，未经承运方核验' }, '以上是我现有的设备参数。缺失参数能否到站核量？办理前还需要补哪一项？'))
  }
  const applicable = rulesFor(mode, context, input.documents ?? [])
  const travelTime = Math.max(now, Date.parse(context.journeyDate ?? '') || 0)
  for (const rule of applicable) {
    const url = safeOfficialTravelUrl(rule.url)
    if (!url) continue
    const current = ruleCurrent(rule, travelTime)
    const historical = !current && (rule.status === 'verified' || Boolean(rule.checkedAt))
    before.push(action('before-source-' + rule.id, current ? '核对适用于本次行程的官方条款' : historical ? '历史条款，可能已变更：打开官方页面核验' : '打开官方页面核对尚未核验的条款', current
      ? `已保留${rule.title}对应版本。请结合本人使用的辅具类别，逐条核对携带、包装及办理要求；条款存在不代表本次已获运输许可。`
      : `${rule.title}作为${historical ? '历史' : '待核验'}材料保留，不以其中旧阈值作本次许可结论。打开官方页面核对最新版本，并向${contact.name}确认适用条件；清单其余动作继续可用。`, {
        level: 'official-rule', status: current ? 'current' : historical ? 'historical' : 'unverified',
        updatedAt: rule.publishedAt ? '原文发布日期：' + rule.publishedAt : rule.checkedAt ? '上次来源核验：' + rule.checkedAt : '原文更新时间与核验时间未提供',
        officialUrl: url, officialLabel: rule.title, sourceTitle: rule.title, effectiveDate: rule.effectiveAt, expiresAt: rule.expiresAt,
        originalText: rule.excerpts.map(excerpt => `${excerpt.label}：${excerpt.text}`).join('\n'),
      }, '这份条款当前是否仍有效、是否适用我的辅具和本次线路？如已变更，请告知新条款入口及可办理的替代方式。'))
  }
  const station = [
    action('station-entrance', '确认可通行入口、坡道与电梯', `到${from}前，向接应点询问能到站厅或候车处的无台阶入口编号、坡道和垂直电梯是否运行。到站先找工作人员，不用楼梯或普通扶梯搬运载人轮椅。具体入口待核实。`, inferred(), `从${from}哪个入口能全程避开台阶？坡道与电梯今天是否开放？若停运请提供替代入口并安排引导。`),
    action('station-service-point', '先到问询处、协助受理点确认接应', '到达后出示本清单与预约回复，寻找问询处、重点旅客服务台或综合服务中心，确认负责人员、候车区及到检票口的引导方式。受理点准确位置待核实。', rail ? official(travelPlanSources.railAssistance) : inferred(), '请问协助受理点在哪里？能否由工作人员接应，并告知我到候车区和检票口的路线？'),
    action('station-restroom', '核对无障碍卫生间与站内设施', '候车前询问最近的无障碍卫生间、门是否可开、是否需钥匙，以及沿途电梯是否能到达。若关闭或无法通行，请工作人员给出可实际使用的替代设施；不把地图标记当作当天可用。待核实。', inferred(), '最近可用的无障碍卫生间在哪一层、怎么走？是否需要开门协助？这条路的电梯现在可用吗？'),
    action('station-companion', '确认陪同人员的进站和乘车规则', '有陪同者时先说明其是否持本次车票；核对能否陪至候车区、站台或车厢，以及是否需额外通行凭证。不要预设陪同者可免费进站或乘车。待核实。', inferred(), '我的陪同者持票／不持票，可以陪到哪里？需要办理哪种凭证，在哪个服务台办理？'),
  ]
  const batteryLabels = { none: '无电池', lithium: '锂电池', other: '其他类型电池', unknown: '电池类型待读取铭牌' }
  const batteryText = devices.length ? devices.map(device => `${device.name}：${batteryLabels[device.specs.batteryType ?? 'unknown']}${device.specs.batteryWh ? '，每块' + device.specs.batteryWh + ' Wh' : ''}${device.specs.batteryCount ? '，' + device.specs.batteryCount + '块' : ''}`).join('；') : '设备与电池情况尚未填写'
  const onboard = [
    action('onboard-position', '由工作人员确认轮椅区、座位与设备固定', '按工作人员指引到本车实际可用的轮椅位置或座位，确认设备停放、刹车、断电及固定方式；不要占用车门和疏散通道，不自行把固定带系在不适用部件上。不能安全固定时先让工作人员调整方案。待核实。', inferred(), '这趟车的轮椅区或合适座位在哪里？我的设备应如何固定、是否需要转移到座椅，若无法固定有什么替代安排？'),
    action('onboard-battery', powered || devices.some(device => device.specs.batteryType !== 'none') ? '主动说明电池信息及使用需要' : '按已填无电池信息配合安检', `${batteryText}。主动向安检及工作人员展示铭牌，核对电池是否保持安装、是否需申报和途中能否使用。电池未知时先提供照片，请其明确下一项核对要求；不自动套用航空电池限值到其他交通方式。待核实。`, inferred(), '我的设备电池信息如上。应怎样申报和存放？途中能否使用？如需拆卸，请说明适用要求和安全操作方式。'),
    action('onboard-help', rail ? '向乘务员确认途中协助和到站交接' : '向工作人员确认途中可申请的协助', '上车后告知工作人员自己的具体需要，确认途中如何联络、可提供哪些协助，以及到达前如何联系目的地接应人员。需要如厕、转移或使用设备时先沟通；不假定工作人员提供持续个人护理。', rail ? official(travelPlanSources.railAssistance) : inferred(), '途中需要帮助时如何联系您？下车前能否帮我对接目的地工作人员，并确认渡板或乘降辅助？'),
  ]
  const arrival = [
    action('arrival-exit', '下车前确认出口与接力人员', `到${to}前请工作人员确认下车车门、接应人、垂直电梯与无台阶出口。电梯停用或无人接应时，先在安全位置等待并请求站方安排替代路线；不虚构具体出口编号。待核实。`, inferred(), `请确认${to}从我的下车位置到地面哪个出口能全程无台阶？接应人员在哪里，电梯若停用走哪条替代路？`),
    action('arrival-transfer', '需要换乘时逐段落实无障碍路径', rail ? '如还有下一段列车，请分别提交每段重点旅客协助申请，并向接应人员核对换乘通道、电梯、安检与接力时间；不只依靠普通步行导航给出的换乘分钟数。' : '换乘地铁、公交或其他车辆前，分别确认上下车点、无台阶路径、坡道／电梯和下一段接应；设施无法使用时改到经工作人员确认的备用路径。待核实。', rail ? official(travelPlanSources.railAssistance) : inferred(), '下一段换乘是否需要重新预约协助、安检或出站？请给出可通行路径和接力地点，时间不足如何调整？'),
  ]
  const destination = to + ' ' + text(context.city)
  const local = /杭州/.test(destination) ? { name: '杭州地铁爱心预约', phone: '0571-96600', source: travelPlanSources.hangzhouMetro } : /上海|虹桥/.test(destination) ? { name: '上海地铁服务', phone: '021-64370000', source: travelPlanSources.shanghaiMetro } : null
  arrival.push(action('arrival-connection', local ? `提前联系${local.name}落实接驳` : '确认接驳车辆和上车点', local
    ? `若到达后乘坐地铁，可拨${local.phone}询问爱心预约、无台阶出入口、换乘与渡板协助。若改坐出租车／网约车，应先向服务方确认能容纳设备的车型、坡道、固定点和实际接送地点。当天可用性待核实。`
    : '向接驳公交、出租车、网约车或无障碍车服务方说明设备外廓及能否转移，确认车型、车门、坡道承重、轮椅固定点和无台阶上车点。普通车型不合适时改约明确提供所需设施的车辆。待核实。', local ? official(local.source) : inferred(), local ? `我将到达${to}，携带${names}，需接驳地铁。请确认可用的无障碍入口、渡板、接应地点与预约方式。` : '请确认这台设备是否能装入本次车辆、能否保持坐轮椅乘坐、如何固定，以及上车点是否无台阶。'))
  if (local) arrival[arrival.length - 1].verification = { contact: local.name, phone: local.phone, question: arrival[arrival.length - 1].verification!.question }
  const complaint = rail ? { name: '中国铁路12306服务投诉', phone: '12306', source: travelPlanSources.railComplaint } : plane ? { name: '民航服务质量监督', phone: '12326', source: travelPlanSources.civilAviation } : { name: '当地交通运输服务监督', phone: '12328', source: travelPlanSources.transportScope }
  const fallback = [
    action('fallback-refusal', '被拒时先向现场负责人说明并记录', `可直接出示：“我携带${names}，需要按本次设备情况核对。请说明拒绝原因、适用的现行条款，并请值班负责人协助；如当前车辆或入口不适用，请提供可执行的替代办理方式。”记录时间、地点、工作人员答复及受理编号，先留在安全区域，不强行通行。`, inferred(), '请联系值班负责人，明确拒绝所依据的现行条款、可补正材料，以及今天还能采用哪种替代方案。'),
    action('fallback-contact', `需要进一步协调时拨${complaint.phone}`, `${rail ? '铁路行程先找站方负责人，再通过12306咨询或投诉；12328不代替铁路客服。' : plane ? `先联系${contact.name}，仍未解决可通过12326反映民航服务质量问题。` : '先联系本次运营单位；涉及公路、水路、道路运输或城市客运的咨询、投诉可拨12328，由当地渠道受理或转办。'} 提供车次／航班／线路、时间、设备情况与具体诉求，保存工单号。`, official(complaint.source), '请记录本次设备乘降或无障碍服务问题，告知受理编号、后续联系对象，以及现在可行的解决方式。'),
    action('fallback-ticket', '先查看退改条件，再办理改签或退票', rail ? '打开12306或原购票渠道的订单，先查看当前退改条件与费用；临近发车或线上不能办理时，到车站售票服务台询问。若因站车安排未能成行，先请求保存客运记录并确认适用处理方式，不默认可免费退改。' : '打开原购票渠道的订单或到运营方服务柜台，先查看本票种的变更、取消、退款条件与费用；如因设备运输安排无法出行，说明原因并索取受理记录，再决定改期、换车型或退票。', rail ? official(travelPlanSources.railEntry) : inferred(), '本次因辅具或协助安排不能按计划出行，当前车票可如何改签或退票？费用、最迟办理时间及应保留的证明分别是什么？'),
    action('fallback-backup', '落实替代路线后再出发', '若原方案当场无法落实，先到工作人员确认的安全等候区，请其协助联系下一班适用交通或备用无障碍接驳，并核对设备空间、坡道与固定条件。身体不适或需要休息时先暂停行程；不仓促让陌生人搬抬载人设备。待核实。', inferred(), '原安排暂时不可行，请提供安全等候地点，以及下一班可提供所需协助或其他无障碍接驳的具体联系方式。'),
  ]
  fallback[1].verification = { contact: complaint.name, phone: complaint.phone, question: fallback[1].verification!.question }
  const contacts = [{ name: contact.name, phone: contact.phone, url: contact.source.url }, { name: complaint.name, phone: complaint.phone, url: complaint.source.url }, ...(local ? [{ name: local.name, phone: local.phone, url: local.source.url }] : [])].filter((item, index, rows) => rows.findIndex(row => row.phone === item.phone && row.name === item.name) === index)
  return {
    version: 1, id: planIdentity({ mode, route, devices, carrier: context.carrier }), generatedAt, mode, summary, route, devices, contacts,
    stages: [
      { id: 'before', title: 'A 出发前', actions: before },
      { id: 'station', title: 'B 进站与站内', actions: station },
      { id: 'onboard', title: 'C 乘车中', actions: onboard },
      { id: 'arrival', title: 'D 到达与接驳', actions: arrival },
      { id: 'fallback', title: 'E 兜底', actions: fallback },
    ],
  }
}
