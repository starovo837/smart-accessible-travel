import type { Device, TravelCheckResult, TravelContext, TravelDeviceSpecs, TravelMode } from './types'
import { ruleCatalog, ruleCurrent, rulesFor, type RuleDocument } from './ruleCatalog.ts'

export const largeDeviceTypes = new Set(['wheelchair', 'manual-wheelchair', 'mobility-scooter', 'walker', 'rollator', 'transfer-board'])
const poweredTypes = new Set(['wheelchair', 'mobility-scooter', 'hearing-aid', 'oxygen', 'pump', 'electronic-cane', 'magnifier', 'braille-display', 'reading-device', 'cochlear-processor', 'hearing-transmitter', 'vibration-alert', 'aac-device', 'electrolarynx', 'reminder', 'cpap', 'nebulizer', 'glucose-monitor', 'suction-device'])
const medicalTypes = new Set(['oxygen', 'pump', 'cpap', 'nebulizer', 'suction-device'])
const knownTypes = new Set([...largeDeviceTypes, ...poweredTypes, 'cane', 'crutches', 'walking-stick', 'prosthesis', 'orthosis', 'pressure-cushion', 'communication-board', 'pill-organizer'])
const airlineUrl = 'https://m.airchina.com.cn/c/invoke/specialAssistance@pgzhcn?comeFrom=xlxx'
const airlineBatteryUrl = 'https://bj.airchina.com.cn/cn/ysztjzw/497660.shtml'
const caacUrl = 'https://www.caac.gov.cn/HDJL/GDYM/CJWTTY/'
const railUrl = 'https://kyfw.12306.cn/otn/gonggao/luggage.html'

export function buildTravelResults(mode: TravelMode, devices: Device[], specs: Record<string, TravelDeviceSpecs> = {}, context: TravelContext = { carrier: 'unspecified' }, documents:RuleDocument[]=ruleCatalog, now=Date.now()): TravelCheckResult[] {
  const applicable=rulesFor(mode,context,documents), current=applicable.filter(rule=>ruleCurrent(rule,Math.max(now,Date.parse(context.journeyDate||'')||0)))
  const active=(id:string)=>current.some(rule=>rule.id===id)
  return devices.map((device) => {
    const detail = specs[device.id] ?? {}
    const large = largeDeviceTypes.has(device.type)
    const powered = poweredTypes.has(device.type) || (device.battery.trim() !== '' && device.battery.trim() !== '无') || (detail.batteryType && !['none', 'unknown'].includes(detail.batteryType))
    const electronic = powered || detail.batteryType === 'lithium'
    const medical = medicalTypes.has(device.type)
    const checks: string[] = []
    const nextSteps: string[] = []
    let eligibility: TravelCheckResult['eligibility'] = 'conditional'
    let summary = '小型辅具按需配合安全检查并安全存放；请向具体运营方核实适用要求，当前未确认运输许可。'
    let handling = '随身携带 / 安全检查'
    let source = '出行准备建议（运营方及线路待指定）'
    let sourceLinks: { label: string; url: string }[] = []
    const conditional = (message: string) => { if (eligibility !== 'restricted' && eligibility !== 'unknown') { eligibility = 'conditional'; summary = message } }
    const restrict = (message: string) => { eligibility = 'restricted'; summary = message }
    const dims = [detail.lengthCm, detail.widthCm, detail.heightCm]
    const hasDims = dims.every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)
    checks.push(mode === 'bus' || ['taxi', 'ride-hailing', 'accessible-car', 'private-car'].includes(mode) ? '上车前配合工作人员检查；不应阻挡车门、通道或其他乘客。' : '配合安检；佩戴或使用中的辅具可提前说明，必要时请工作人员人工检查。')
    if (!knownTypes.has(device.type)) {
      eligibility = 'unknown'; summary = '自定义设备尚未分类，需要说明用途、尺寸及电池或气瓶情况。'
      nextSteps.push('向运营方提供设备照片、说明书及用途，确认适用类别。')
    }
    if (large) {
      checks.push(hasDims ? `运输状态尺寸：${dims.join(' × ')} cm；重量：${detail.weightKg ?? '未填'} kg。` : '请填写折叠或实际运输状态的长、宽、高和重量；不能只凭设备名称判断是否装得下。')
      nextSteps.push('测量折叠后外廓，并核对车门、升降设备或货舱门的净尺寸及承重。')
      conditional('大型设备需确认运输空间、承重和协助安排，不能直接按随身小件处理。')
    }
    if (mode === 'plane') {
      source = context.carrier === 'airchina' ? '国航：特殊旅客服务方案及国内运输总条件' : '中国民航局：携带辅助设备与锂电池提示'
      sourceLinks = context.carrier === 'airchina' ? [{ label: '国航辅助设备运输要求', url: airlineUrl }, { label: '国航国内运输总条件', url: airlineBatteryUrl }] : [{ label: '民航局相关提示', url: caacUrl }]
      if (['wheelchair', 'mobility-scooter'].includes(device.type)) {
        handling = '设备托运；电池处理按承运方要求'
        conditional('电动轮椅 / 代步车不能作为普通随身物品进入客舱；需申请托运并确认电池和货舱装载条件。')
        if(active('airchina-assistance'))checks.push('已核对国航服务方案：电动轮椅及电动代步工具需托运，不得带入客舱。此要求仅适用所选国航范围。')
        checks.push('航空公司和机型未确定时，没有统一的轮椅货舱尺寸上限；请索取该机型货舱门及装载尺寸。')
        nextSteps.push('购买机票前向实际承运航空公司申请辅助设备运输与登机协助。')
        if (detail.batteryType === 'lithium' && detail.removable === 'yes' && detail.batteryWh !== undefined && detail.batteryCount !== undefined && context.carrier === 'airchina' && active('airchina-battery')) {
          const limit = detail.batteryCount === 2 ? 160 : 300
          checks.push(`所选国航条款：${detail.batteryCount === 2 ? '双电池驱动时每块' : '拆下的单块'}锂电池不超过 ${limit} Wh；当前每块 ${detail.batteryWh} Wh。`)
          if (detail.batteryWh > limit) restrict(`当前可拆锂电池 ${detail.batteryWh} Wh 超出所选国航条件 ${limit} Wh，不能按这组参数办理。`)
        } else {
          checks.push('补充电池化学类型、每块 Wh、数量及是否可拆；固定电池与可拆电池规则不同，不能一概套用 300 Wh。')
        }
      } else if (device.type === 'manual-wheelchair') {
        handling = '折叠尺寸满足时可申请客舱存放，否则托运'
        conditional('手动轮椅通常需安排托运；可折叠小型轮椅能否放入客舱须确认尺寸、存放位置及承运方许可。')
        if (context.carrier === 'airchina' && active('airchina-assistance')) {
          checks.push('所选国航条款中的客舱折叠轮椅尺寸：33 × 91 × 106 cm，还需能安全放入行李架或前排座椅下；此数值不是通用托运上限。')
          if (hasDims) {
            const sorted = (dims as number[]).slice().sort((a,b) => a-b)
            const fits = sorted.every((value,index) => value <= [33,91,106][index])
            checks.push(detail.folded === 'yes' && fits ? '已填折叠尺寸通过所选国航条款尺寸比较；仍需确认可用存放位置。' : '当前尺寸或折叠状态不满足所选国航客舱条件；应联系航空公司安排托运。')
            if (!fits || detail.folded === 'no') handling = '客舱尺寸不符合；联系国航安排托运'
          }
        } else checks.push('先选实际承运航空公司；客舱存放尺寸与托运装载尺寸应分别核对。')
      } else if (large) {
        handling = '折叠存放或申请托运'
        conditional('助行器等大型辅具需核对折叠尺寸及安全存放位置，超出客舱存放条件时申请托运。')
      }
      if (electronic && !['wheelchair', 'mobility-scooter'].includes(device.type)) {
        checks.push('小型电子辅具也需安检；备用锂电池应防短路并按承运方要求随身携带。')
        if (device.type !== 'hearing-aid' && device.type !== 'cochlear-processor') conditional('电子或医疗设备需核对电池规格；机上使用还须另行向航空公司确认。')
      }
      if (medical) { conditional('便携医疗设备能否携带与能否机上使用是两项核验；需提前确认型号、电池及医疗使用安排。'); nextSteps.push('提供设备型号和说明书，单独询问机上使用条件；制氧机与氧气瓶不可混同。') }
    } else if (mode === 'rail' || mode === 'train') {
      source = '中国铁路 12306：携带品规定'
      sourceLinks = [{ label: '12306 携带品规定', url: railUrl }]
      if(active('rail-domestic'))checks.push(`普通携带品：长宽高之和不超过 ${mode === 'rail' ? '130' : '160'} cm，每件重量不超过 20 kg；旅行代步所用折叠轮椅适用例外，不直接套用普通行李限额。`)
      if (device.type === 'mobility-scooter') { conditional('电动代步车不自动按电动轮椅例外处理；需确认硬质包装、携带品规格和站内使用要求。'); checks.push('提供具体车型向车站确认，不能把电动代步车与轮椅当作同一类别。') }
      if (large) nextSteps.push('联系 12306 / 出发站预约重点旅客服务，确认车门、轮椅空间和上下车协助。')
      if (active('rail-domestic') && !['wheelchair', 'manual-wheelchair'].includes(device.type) && ((hasDims && (dims as number[]).reduce((a,b)=>a+b,0) > (mode === 'rail' ? 130 : 160)) || (detail.weightKg !== undefined && detail.weightKg > 20))) restrict('当前参数超过普通携带品尺寸或重量条件；需向铁路确认是否适用辅具例外或另行托运。')
    } else if (large || medical) {
      handling = large ? '预约可容纳设备的车辆 / 无障碍通道' : '核对携带与使用安排'
      conditional('需按城市、线路和车型确认可用空间及协助条件，当前没有全国统一尺寸值。')
      checks.push('建议预留操作余量，确认坡道承重、车门净宽及轮椅固定位置；这些是通行建议，不是官方统一限值。')
      nextSteps.push('公交 / 地铁联系当地运营方；出租车或网约车先确认后备厢，必要时预约无障碍车辆。')
    }
    if (large && hasDims) {
      const limits = [context.availableLengthCm, context.availableWidthCm, context.availableHeightCm]
      if (limits.some((value, i) => value !== undefined && (dims[i] as number) > value)) restrict('设备外廓超过你填写的可用空间，当前装载方案不适配；建议折叠、拆卸或更换车辆 / 航班。')
      if (context.doorWidthCm !== undefined && (detail.widthCm as number) > context.doorWidthCm) restrict('设备宽度超过你填写的入口净宽，当前通行方案不适配。')
      if (limits.some(value => value !== undefined) || context.doorWidthCm !== undefined) checks.push('可用空间由你根据运营方提供的信息填写；通过尺寸比较不等于通过承重、电池或安检。')
    }
    if (large && context.availableWeightKg !== undefined) {
      checks.push(`运营方提供的设备装载限重 ${context.availableWeightKg} kg；只比较设备重量，不代表已核实坡道与乘员合计承重。`)
      if (detail.weightKg === undefined) nextSteps.push('缺少设备重量，尚不能比较装载限重。')
      else if (detail.weightKg > context.availableWeightKg) restrict('设备重量超过你填写的装载限重，当前装载方案不适配。')
      nextSteps.push('如需本人坐在设备上通过升降设备，应另向运营方核对本人、设备与随行物品的合计承重。')
    }
    if (!nextSteps.length) nextSteps.push('妥善收纳辅具，到场时主动说明用途并配合安全检查。')
    if (large && (!hasDims || !detail.weightKg)) nextSteps.unshift('缺少运输状态完整长宽高或重量，请补齐后重新检查。')
    if (powered && detail.batteryType !== 'none' && (!detail.batteryType || detail.batteryType === 'unknown' || detail.batteryWh === undefined || detail.batteryCount === undefined)) nextSteps.unshift('补充电池类型、每块 Wh 和数量；未知项不会当成符合要求。')
    if (!['plane','rail','train','bus','metro','taxi','ride-hailing','accessible-car','private-car','coach','ferry'].includes(mode)) { eligibility = 'unknown'; summary = '此出行方式尚无匹配的本地规则，先向实际运营方核实。' }
    if(!current.length){nextSteps.unshift('当前没有适用且在核验期限内的官方条款。请更新来源或向实际运营方取得书面回复；未使用过期规则阈值判断许可。');checks.unshift('以下通行、装载与安检内容为准备建议，不是已经核实的运营方许可。')}
    const missingInformation:string[]=[]
    if(!current.length)missingInformation.push('适用于本次运营方和线路、且在复核期限内的正式条款')
    if(!knownTypes.has(device.type))missingInformation.push('设备用途及适用类别')
    if((large||mode==='rail'||mode==='train')&&!hasDims)missingInformation.push('设备实际运输状态的长、宽、高')
    if((large||mode==='rail'||mode==='train')&&!detail.weightKg)missingInformation.push('设备含所携部件的总重量')
    if(!detail.batteryType||detail.batteryType==='unknown')missingInformation.push('本次运输时是否含电池，以及电池类型')
    if(electronic&&detail.batteryType==='lithium'&&detail.batteryWh===undefined)missingInformation.push('铭牌标称的每块电池Wh')
    if(mode==='plane'&&['wheelchair','mobility-scooter'].includes(device.type)&&detail.batteryType!=='none'){
      if(detail.batteryCount===undefined)missingInformation.push('驱动电池数量')
      if(!detail.removable||detail.removable==='unknown')missingInformation.push('电池能否拆下')
      if(detail.batteryType!=='lithium'||detail.removable!=='yes'||!active('airchina-battery'))missingInformation.push('适用于该电池安装方式及化学类型的承运方条件')
    }
    const blocked=(eligibility as TravelCheckResult['eligibility'])==='restricted'
    let assessment:NonNullable<TravelCheckResult['assessment']>=blocked?'not-met':missingInformation.length?'information-needed':'assistance-required'
    // Green means only these enumerated conditions match. It is never a
    // booking, dangerous-goods, security or boarding approval.
    const ordinaryRail=(mode==='rail'||mode==='train')&&active('rail-domestic')&&!large&&!electronic&&!medical&&knownTypes.has(device.type)
    if(!blocked&&ordinaryRail&&!missingInformation.length){assessment='conditions-met';eligibility='allowed';summary='已填写的尺寸、重量和无电池状态满足本次所核验的普通携带品条件；仍需配合安检及安全存放，不代表承运方已批准本次行程。'}
    else if(!blocked&&assessment==='information-needed')eligibility='unknown'
    if(assessment==='assistance-required')nextSteps.unshift('参数核对不等于协助已预约，请向实际运营方办理并确认存放、托运或上下车安排。')
    const finalEligibility = eligibility as TravelCheckResult['eligibility']
    const status: TravelCheckResult['status'] = finalEligibility === 'restricted' ? 'restricted' : !current.length||finalEligibility === 'unknown' ? 'no-rule-found' : assessment==='conditions-met'?'official-allowed':'carrier-confirmation'
    const confidence = undefined
    const ruleDate = current.length?current.map(rule=>rule.checkedAt).join('、'):'没有适用且未过期的核验来源'
    sourceLinks=applicable.map(rule=>({label:rule.title,url:rule.url}))
    return { mode, deviceId: device.id, deviceName: device.name, eligibility, assessment,missingInformation,assessmentScope:assessment==='conditions-met'?'仅核验已填写的普通携带品尺寸、重量及无电池状态；不含安检结论或本次运输许可':'核对所列设备参数与适用条款；协助、机型和实际存放位置须另行确认', summary, handling, checks, nextSteps, source: current.length?current.map(rule=>rule.title).join('、'):'准备建议 · '+source, updatedAt: ruleDate, ruleDate, status, confidence, applicableTo: `${getModeLabel(mode)} · ${context.city||'城市未指定'} · ${context.line||'线路未指定'}`, sourceLinks,ruleEvidence:applicable, evidence: `规则摘要与准备建议（非官方原文）：\n${checks.join('\n')}\n来源核验不代表承运方已批准本次设备和行程。` }
  })
}

function getModeLabel(mode: TravelMode) {
  const labels: Record<string, string> = { plane: '飞机', rail: '高铁', train: '普通火车', bus: '公交', metro: '地铁', taxi: '出租车', 'ride-hailing': '网约车', 'accessible-car': '无障碍专车', coach: '长途客车', ferry: '轮渡 / 客船', 'private-car': '私家车' }
  return labels[mode] ?? mode
}
