import type { DailyStatus, ProductAnalysis, RoutePlan, TravelMode } from './types'

export function fitProduct(product: Pick<ProductAnalysis, 'width' | 'length'>, door: string, elevator: string): string {
  const widths = [Number(door), Number(elevator)]
  if (widths.some(width => !Number.isFinite(width) || width <= 0)) return '请填写大于 0 的门净宽和电梯门净宽，单位为厘米。'
  const minimum = Math.min(...widths)
  if (product.width > minimum) return `按当前商家示例参数，设备宽 ${product.width} cm，超过最窄入口 ${minimum} cm，不能直线通过。请核实折叠宽度或选择更窄设备。`
  const margin = +(minimum - product.width).toFixed(1)
  return `按当前商家示例参数，设备宽 ${product.width} cm，入口剩余 ${margin} cm。仅直线尺寸比较通过；还需确认转弯、手部操作余量和电梯轿厢尺寸。此结果不等于实际可通行。`
}
export function prepareRoute(from: string, to: string, mode: TravelMode, daily: DailyStatus, now: string): RoutePlan {
  const groundCar = ['taxi', 'ride-hailing', 'accessible-car', 'private-car'].includes(mode)
  const steps = [
    daily.companion ? '确认陪同人员、集合地点和接应方式。' : '确认出发地到入口之间有连续可通行的道路。',
    groundCar ? '向司机确认车辆入口、装载空间和设备固定方式。' : '向运营方确认无障碍入口、电梯和上下车协助。',
    daily.energy !== 'good' || daily.pain !== 'none' ? '根据今天的体力和疼痛，确认休息位置并减少连续步行或久站。' : '按实际需要确认途中休息点和卫生间。',
    '核对协助预约、具体服务点和到场时间；保存对方答复。',
    '到达后核对出口和接应地点。现场有变化时启用备用方案。',
  ]
  return {
    id: `route-${Date.now()}`, from: from.trim(), to: to.trim(), mode, accessible: false, updatedAt: now, step: 0, paused: false, steps,
    alternatives: ['电梯或坡道不可用：联系现场工作人员，核实备用入口；不要按未核实路线继续。', '当前车辆无法容纳设备：核实无障碍车辆或可容纳设备的其他交通方案。'],
    restroom: '位置、开放时间和可用情况待核实', restStops: daily.energy === 'good' ? '按需要安排；具体位置待核实' : '优先核实可休息的位置，按自身需要暂停',
    facilities: [
      { id: 'entrance', label: '无障碍入口与连续通路', status: 'unknown', note: '' },
      { id: 'lift', label: groundCar ? '车辆入口与装载空间' : '电梯或坡道', status: 'unknown', note: '' },
      { id: 'restroom', label: '卫生间与休息位置', status: 'unknown', note: '' },
      { id: 'help', label: '协助人员与服务点', status: 'unknown', note: '' },
    ],
  }
}
export interface AssistantSlots { intent?: 'travel' | 'product'; product?: string; mode?: string; device?: string; city?: string }
const modes: [string, string][] = [['飞机', 'plane'], ['高铁', 'rail'], ['地铁', 'metro'], ['公交', 'bus'], ['火车', 'train'], ['出租车', 'taxi'], ['网约车', 'ride-hailing'], ['轮渡', 'ferry']]
const equipment = ['电动轮椅', '手动轮椅', '电动代步车', '轮椅', '盲杖', '助听器', '制氧机', '胰岛素泵', '助行器', '拐杖', '沟通板', '呼吸机']
export function assistantReply(input: string, previous: AssistantSlots): { slots: AssistantSlots; text: string; complete: boolean } {
  const slots = { ...previous }
  const normalized = input.trim()
  const foundMode = modes.find(([label]) => normalized.includes(label))
  if (foundMode) slots.mode = foundMode[1]
  const foundDevice = equipment.find(label => normalized.includes(label))
  if (/想买|购买|商品|买辅具|选购/.test(normalized)) slots.intent = 'product'
  if (slots.intent === 'product') {
    if (foundDevice) slots.product = foundDevice
    else if (previous.intent === 'product' && normalized) slots.product = normalized
    if (!slots.product) return { slots, text: '你想了解哪类辅具？可以输入设备名称。', complete: false }
    return { slots, text: `已记录想了解${slots.product}。可以进入买辅具，打开购物平台或体验示例解读；购买前请核对用途、尺寸、操控和试用退换条件。这里没有判断医疗适用性或推荐具体商家。`, complete: true }
  }
  slots.intent = 'travel'
  if (foundDevice) slots.device = foundDevice
  if (!slots.mode && /步行|专车|其他方式/.test(normalized)) slots.mode = normalized
  if (previous.mode && !previous.device && !foundMode && !foundDevice && normalized) slots.device = normalized
  if (previous.mode && previous.device && !previous.city && !foundMode && !foundDevice) slots.city = normalized
  if (/没有设备|不带设备/.test(normalized)) slots.device = '不带设备'
  if (!slots.mode) return { slots, text: '你准备怎么出行？可以输入飞机、高铁、公交、地铁或其他方式。', complete: false }
  if (!slots.device) return { slots, text: '这次要带什么设备？可以填写名称，或者说“不带设备”。', complete: false }
  if (!slots.city) return { slots, text: '你的出发城市是哪里？不知道时也可以输入“待确定”。', complete: false }
  return { slots, text: `已记录：${slots.city}出发，携带${slots.device}。接下来可以核对设备参数。这里是本地流程助手，还没有核实实际线路或承运方许可。`, complete: true }
}
