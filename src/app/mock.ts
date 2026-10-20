import type { IconName } from '../components/Icons'
import type { AppointmentScript, AssistantTurn, ChecklistItem, Device, DeviceType, ModuleId, ProductAnalysis, TravelCheckResult, TravelContext, TravelDeviceSpecs, TravelMode } from './types'
import { buildTravelResults as buildRuleResults } from './travelRules'

export const moduleMeta: Record<ModuleId, { label: string; icon: IconName; detail: string; support: string }> = {
  vision: { label: '视障', icon: 'eye', detail: '朗读信息与操作提示', support: '结果提供朗读，按钮具有读屏标签' },
  hearing: { label: '听障', icon: 'ear', detail: '文字提示与大字沟通卡', support: '所有语音都有文字，可出示沟通卡' },
  mobility: { label: '肢体', icon: 'wheelchair', detail: '设备尺寸与无障碍通行', support: '加大触控区域，优先核对通行尺寸' },
  speech: { label: '言语', icon: 'message', detail: '打字交流与沟通卡', support: '可全程文字输入，无需语音表达' },
  cognitive: { label: '认知', icon: 'steps', detail: '一次一步，清楚引导', support: '减少干扰，出行清单可逐步跟随' },
  chronic: { label: '慢病', icon: 'heart', detail: '医疗设备与随行准备', support: '清单补充医疗设备资料提醒' },
}
export const moduleIds = Object.keys(moduleMeta) as ModuleId[]
export const deviceMeta: Record<DeviceType, { label: string; icon: IconName; defaults: Pick<Device, 'battery' | 'dimensions' | 'weight'> }> = {
  wheelchair: { label: '电动轮椅', icon: 'wheelchair', defaults: { battery: '24V · 20Ah', dimensions: '105 × 68 × 98 cm', weight: '32 kg' } },
  cane: { label: '盲杖', icon: 'cane', defaults: { battery: '无', dimensions: '折叠后 31 cm', weight: '0.3 kg' } },
  'hearing-aid': { label: '助听器', icon: 'ear', defaults: { battery: '160mAh', dimensions: '4 × 2 × 1 cm', weight: '0.02 kg' } },
  oxygen: { label: '便携制氧机', icon: 'oxygen', defaults: { battery: '12V · 6Ah', dimensions: '19 × 10 × 24 cm', weight: '2.2 kg' } },
  pump: { label: '胰岛素泵', icon: 'heart', defaults: { battery: '1.5V · AAA', dimensions: '5 × 3 × 1.5 cm', weight: '0.1 kg' } },
}
export const deviceTypes = Object.keys(deviceMeta) as DeviceType[]
export const sampleDevices: Device[] = deviceTypes.map((type) => ({ id: 'sample-' + type, type, name: '示例' + deviceMeta[type].label, ...deviceMeta[type].defaults, source: 'plate' }))
export const emptyDevice = (type: DeviceType = 'wheelchair'): Device => ({ id: '', type, name: '', battery: '', dimensions: '', weight: '', source: 'manual' })
const delay = <T,>(value: T, ms = 450) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))
export const recognizeDevicePlate = (type: DeviceType) => delay({ ...sampleDevices.find((device) => device.type === type)!, name: deviceMeta[type].label })

export function makeProduct(sourceLabel: string): ProductAnalysis {
  const hash = Array.from(sourceLabel).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7)
  const compact = hash % 2 === 0
  const width = compact ? 62 : 68
  return {
    id: 'product-' + hash, sourceLabel, title: compact ? '轻便折叠电动轮椅 · 示例 A' : '城市通勤电动轮椅 · 示例 B', width, length: compact ? 98 : 105, weight: compact ? 26 : 32,
    merchantClaims: ['示例商家标注车宽 ' + width + 'cm，可折叠收纳', '示例标注：24V 电池；容量及检测文件未提供', '示例标注：可拆卸扶手'],
    userFeedback: ['模拟反馈：折叠需要双手完成', '模拟反馈：实际过门空间需要现场测量', '模拟反馈：建议购买前预约试用'],
    conclusion: '先核对尺寸，再决定是否试用。现有示例资料无法确认电池运输条件。',
    evidence: ['本示例车宽 ' + width + 'cm；适配检测仅比较直线尺寸。', '没有电池检测文件，不能据此判断是否可带上交通工具。', '用户反馈为演示文本，不代表真实评价。'],
    nextSteps: ['测量家门、电梯门及轿厢的净尺寸', '向商家索取完整设备与电池资料', '试用后再决定；出行前向承运方书面确认'],
    homeFit: { label: '还需要测量', detail: '输入门宽和电梯门宽后完成适配判断。', tone: 'warn' },
  }
}
export const fixtureDevice: Device = { id: 'demo-wheelchair', type: 'wheelchair', name: '轻便电动轮椅', ...deviceMeta.wheelchair.defaults, source: 'plate' }
export const productAnalysis: ProductAnalysis = makeProduct('https://example.com/wheelchair')
export const analyzeProduct = (input: string): Promise<ProductAnalysis> => delay(makeProduct(input), 650)
export function buildTravelResults(mode: TravelMode, devices: Device[], specs: Record<string, TravelDeviceSpecs> = {}, context: TravelContext = { carrier: 'unspecified' }) { return buildRuleResults(mode, devices, specs, context) }
export const checkTravelEligibility = (mode: TravelMode, devices: Device[] = [fixtureDevice, sampleDevices.find((device) => device.type === 'cane')!], specs: Record<string, TravelDeviceSpecs> = {}, context: TravelContext = { carrier: 'unspecified' }) => delay(buildRuleResults(mode, devices, specs, context), 600)
export function makeChecklist(mode: TravelMode, medical = false): ChecklistItem[] {
  const steps = [
    { id: 'materials', label: '整理必带材料', detail: '身份证件、票务信息、设备说明书与电池规格。具体文件清单需承运方确认。' },
    { id: 'contact', label: '联系承运方', detail: mode === 'rail' ? '联系 12306 或出发站重点旅客服务，询问协助与通道安排。' : mode === 'plane' ? '联系实际承运航空公司的特殊旅客服务，询问设备审批与协助安排。' : '联系该出行方式的运营方或客服，询问设备和现场协助安排。' },
    { id: 'timing', label: '确认提前时间', detail: '询问最晚预约时限和建议到场时间，记录书面答复；本原型不设统一时限。' },
    { id: 'arrival', label: '按约定流程到场', detail: '前往约定服务点 → 出示资料 → 安检 → 在工作人员指引下登机或上车。' },
  ]
  if (medical) steps.splice(1, 0, { id: 'medical', label: '核对医疗设备与用品', detail: '准备设备型号和所需用品清单，向承运方询问相关文件要求。' })
  return steps.map((step) => ({ ...step, checked: false }))
}
export function makeAppointment(mode: TravelMode, results: TravelCheckResult[]): AppointmentScript {
  const label = mode === 'rail' ? '高铁' : mode === 'plane' ? '飞机' : (travelModeLabel(mode) || '该出行方式')
  return { subject: label + '辅助设备与协助预约', body: '您好，我计划乘坐' + label + '出行，需要携带：' + results.map((result) => result.deviceName).join('、') + '。\n请帮我书面确认：\n1. 设备和电池能否携带，需要哪些材料？\n2. 最晚预约时间和建议到场时间？\n3. 服务点位置、安检与登乘流程？\n4. 可提供哪些无障碍协助？\n我会补充具体日期、车次或航班号。谢谢。' }
}
function travelModeLabel(mode: TravelMode) { return ({ bus: '公交', metro: '地铁', train: '普通火车', taxi: '出租车', 'ride-hailing': '网约车', 'accessible-car': '无障碍专车', coach: '长途客车', ferry: '轮渡 / 客船', 'private-car': '私家车' } as Record<string, string>)[mode] ?? (mode.startsWith('custom:') ? mode.slice(7) : '') }
export function runAssistantTurn(step: number, text: string): AssistantTurn {
  const questions = ['你想坐飞机还是高铁？', '你要携带哪种设备？', '你的出发城市是哪里？']
  return { speaker: 'assistant', text: text.trim() ? questions[step] ?? '信息已收齐。可以进入出行查询，选择设备查看示例检查结果。' : '请先输入或说出你的问题，我一次只问一项。', confidence: 'high' }
}


