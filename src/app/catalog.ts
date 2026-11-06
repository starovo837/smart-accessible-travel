import type { IconName } from '../components/Icons'
import type { Device, DeviceType, TravelMode } from './types'

export const travelModes: { id: TravelMode; label: string; icon: IconName; contact: string }[] = [
  { id: 'rail', label: '高铁', icon: 'train', contact: '12306 或出发站重点旅客服务' },
  { id: 'plane', label: '飞机', icon: 'plane', contact: '实际承运航空公司的特殊旅客服务' },
  { id: 'bus', label: '公交', icon: 'bus', contact: '当地公交运营单位或线路客服' },
  { id: 'metro', label: '地铁', icon: 'train', contact: '当地地铁客服或出发站工作人员' },
  { id: 'train', label: '普通火车', icon: 'train', contact: '12306 或出发站工作人员' },
  { id: 'taxi', label: '出租车', icon: 'car', contact: '出租车调度或驾驶员' },
  { id: 'ride-hailing', label: '网约车', icon: 'car', contact: '网约车平台客服及驾驶员' },
  { id: 'accessible-car', label: '无障碍专车', icon: 'wheelchair', contact: '无障碍车辆预约服务方' },
  { id: 'coach', label: '长途客车', icon: 'bus', contact: '客运站或客运公司' },
  { id: 'ferry', label: '轮渡 / 客船', icon: 'ship', contact: '轮渡码头或船运公司' },
  { id: 'private-car', label: '私家车', icon: 'car', contact: '驾驶员及车辆服务方' },
]
export function getTravelMeta(id: TravelMode) {
  return travelModes.find((mode) => mode.id === id) ?? { id, label: id.startsWith('custom:') ? id.slice(7) : id, icon: 'arrow' as IconName, contact: '该出行方式的运营方或服务人员' }
}
export const extraEquipment: { id: DeviceType; label: string; icon: IconName; group: string }[] = [
  { id: 'manual-wheelchair', label: '手动轮椅', icon: 'wheelchair', group: '行动支持' },
  { id: 'mobility-scooter', label: '电动代步车', icon: 'wheelchair', group: '行动支持' },
  { id: 'walker', label: '助行器', icon: 'cane', group: '行动支持' },
  { id: 'rollator', label: '四轮助行车', icon: 'wheelchair', group: '行动支持' },
  { id: 'crutches', label: '腋拐 / 肘拐', icon: 'cane', group: '行动支持' },
  { id: 'walking-stick', label: '手杖', icon: 'cane', group: '行动支持' },
  { id: 'prosthesis', label: '假肢', icon: 'user', group: '行动支持' },
  { id: 'orthosis', label: '矫形器 / 支具', icon: 'user', group: '行动支持' },
  { id: 'transfer-board', label: '移位板', icon: 'steps', group: '行动支持' },
  { id: 'pressure-cushion', label: '减压坐垫', icon: 'heart', group: '行动支持' },
  { id: 'electronic-cane', label: '电子盲杖', icon: 'cane', group: '视觉支持' },
  { id: 'guide-dog', label: '导盲犬', icon: 'eye', group: '视觉支持' },
  { id: 'magnifier', label: '电子助视器', icon: 'eye', group: '视觉支持' },
  { id: 'braille-display', label: '盲文点显器', icon: 'eye', group: '视觉支持' },
  { id: 'reading-device', label: '便携读书机', icon: 'volume', group: '视觉支持' },
  { id: 'cochlear-processor', label: '人工耳蜗外部处理器', icon: 'ear', group: '听觉支持' },
  { id: 'hearing-transmitter', label: '无线助听设备', icon: 'ear', group: '听觉支持' },
  { id: 'vibration-alert', label: '振动提醒器', icon: 'ear', group: '听觉支持' },
  { id: 'aac-device', label: '辅助沟通设备（AAC）', icon: 'message', group: '沟通与认知' },
  { id: 'communication-board', label: '沟通板', icon: 'message', group: '沟通与认知' },
  { id: 'electrolarynx', label: '电子喉', icon: 'mic', group: '沟通与认知' },
  { id: 'reminder', label: '认知提示器', icon: 'steps', group: '沟通与认知' },
  { id: 'pill-organizer', label: '提醒药盒', icon: 'heart', group: '沟通与认知' },
  { id: 'cpap', label: '呼吸机（CPAP）', icon: 'oxygen', group: '医疗支持' },
  { id: 'nebulizer', label: '便携雾化器', icon: 'oxygen', group: '医疗支持' },
  { id: 'glucose-monitor', label: '血糖监测仪', icon: 'heart', group: '医疗支持' },
  { id: 'suction-device', label: '便携吸痰器', icon: 'oxygen', group: '医疗支持' },
]
export function deviceGroup(type: DeviceType) {
  if (type.startsWith('custom:')) return '自定义'
  return extraEquipment.find((item) => item.id === type)?.group ?? ({ wheelchair: '行动支持', cane: '视觉支持', 'hearing-aid': '听觉支持', oxygen: '医疗支持', pump: '医疗支持' }[type] || '其他')
}
export function normalizeLabel(text: string) { return text.trim().replace(/\s+/gu, ' ') }
export function makeCustomId(label: string) { return 'custom:' + normalizeLabel(label) }
export function catalogDevice(type: DeviceType, label: string): Device {
  return { id: 'catalog:' + type, type, name: label, battery: '', dimensions: '', weight: '', source: 'manual' }
}

export const shoppingPlatforms = [
  { id: 'jd', label: '京东', domain: 'search.jd.com', url: 'https://search.jd.com/Search', parameter: 'keyword' },
  { id: 'taobao', label: '淘宝', domain: 's.taobao.com', url: 'https://s.taobao.com/search', parameter: 'q' },
  { id: 'tmall', label: '天猫', domain: 'list.tmall.com', url: 'https://list.tmall.com/search_product.htm', parameter: 'q' },
] as const
export function shoppingUrl(platform: typeof shoppingPlatforms[number], query: string): string {
  const url = new URL(platform.url)
  url.searchParams.set(platform.parameter, query.trim())
  if (platform.id === 'jd') url.searchParams.set('enc', 'utf-8')
  return url.toString()
}
