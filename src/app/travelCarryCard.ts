import { getTravelMeta } from './catalog.ts'
import type { TravelTaskPlan } from './travelTaskTypes'
import { allTravelActions } from './travelTaskTypes.ts'
import { requiresTravelDimensions, requiresTravelBattery } from './travelCompleteness.ts'

export interface TravelCarryDevice {
  name: string
  dimensions: string
  weight: string
  battery: string
}
export interface TravelCarryCardContent {
  completionStatement: string
  title: string
  itinerary: string
  date: string
  mode: string
  generatedAt: string
  summary: string
  nextStep: string
  devices: TravelCarryDevice[]
  contacts: { name: string; phone: string }[]
  notice: string
}
export interface TravelCarryImage { blob: Blob; width: number; height: number; page: number; pages: number }

const readable = (value: string | undefined, fallback: string) => value && !/（?(未选择|待填写|暂未)/u.test(value) ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim() || fallback : fallback
const measurement = (value: number | undefined, unit: string) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? `${value} ${unit}` : '未测量'

/** A local projection of the selected travel task only; no health profile or contact book is read. */
export function travelCarryCardContent(plan: TravelTaskPlan): TravelCarryCardContent {
  const date = plan.route.date && /^\d{4}-\d{2}-\d{2}$/.test(plan.route.date) ? plan.route.date : ''
  const generated = Date.parse(plan.generatedAt)
  const firstAction = allTravelActions(plan)[0]
  const from=readable(plan.route.from,''),to=readable(plan.route.to,'')
  return {
    completionStatement: plan.completion?.statement??'本清单资料覆盖尚未核对，请补齐设备信息后再使用。',
    title: plan.readiness==='preparation'?'出行预备卡':'随身携带卡',
    itinerary: from&&to?`${from} → ${to}`:from||to||'出行准备',
    date,
    mode: readable(getTravelMeta(plan.mode).label,'出行'),
    generatedAt: Number.isFinite(generated) ? new Date(generated).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '生成时间未记录',
    summary: readable(plan.summary, '按出行清单联系服务方，核对设备运输与上下车协助。'),
    nextStep: firstAction ? `${firstAction.title}：${firstAction.detail}` : '出发前联系承运方，说明设备与需要的协助，核对进站和乘车安排。',
    devices: plan.devices.map(device => {
      if(device.type==='guide-dog')return {name:readable(device.name,'导盲犬'),dimensions:'通行及停留空间向运营方确认',weight:'不适用',battery:'不适用（服务犬）'}
      const specs = device.specs
      const battery = ({ none: '无电池（用户填写）', lithium: '锂电池', other: '其他电池', unknown: '电池类型待核实' } as const)[specs.batteryType ?? 'unknown']
      const energy = typeof specs.batteryWh === 'number' && Number.isFinite(specs.batteryWh) && specs.batteryWh > 0 ? `；${specs.batteryWh} Wh` : ''
      const removable = specs.removable === 'yes' ? '；可拆卸（用户填写）' : specs.removable === 'no' ? '；不可拆卸（用户填写）' : ''
      return {
        name: readable(device.name, '辅助设备'),
        dimensions: !requiresTravelDimensions(device.type)&&!specs.lengthCm&&!specs.widthCm&&!specs.heightCm?'此类辅具尺寸不作为本次解锁前提；有特殊空间需要请另行说明。':`长 ${measurement(specs.lengthCm, 'cm')} × 宽 ${measurement(specs.widthCm, 'cm')} × 高 ${measurement(specs.heightCm, 'cm')}`,
        weight: measurement(specs.weightKg, 'kg'),
        battery: !requiresTravelBattery(device.type)&&!specs.batteryType?'非电动辅具，电池类型不适用；如带电子附件请另行申报。':battery + energy + removable,
      }
    }),
    contacts: plan.contacts.filter(contact => /^\+?[\d\s-]{3,24}$/.test(contact.phone.trim())).map(contact => ({ name: readable(contact.name, '服务渠道'), phone: contact.phone.replace(/\s/g, '') })),
    notice: '设备与协助沟通卡，不是运输许可或预约回执。请工作人员核对设备实物及本次行程，协助确认上下车与交接安排。',
  }
}

/** Character wrapping supports Chinese text without depending on remote fonts. */
export function wrapCarryCardText(value: string, maxWidth: number, measure: (text: string) => number): string[] {
  if (!(maxWidth > 0)) throw new Error('图片排版宽度无效。')
  const result: string[] = []
  for (const paragraph of value.split(/\r?\n/)) {
    let line = ''
    const tokens=paragraph.match(/\d+(?:\.\d+)?[ \u00a0]*(?:cm|kg|Wh)\b|[A-Za-z0-9]+(?:[-:./+][A-Za-z0-9]+)*|[\s\S]/gu)??[]
    for (const token of tokens) {
      // Keep dates and number/unit pairs together whenever they fit a whole row.
      for(const piece of measure(token)>maxWidth?Array.from(token):[token]){
        if (line && measure(line + piece) > maxWidth) { result.push(line); line = piece }
        else line += piece
      }
    }
    result.push(line)
  }
  return result
}

export type TravelCarryCardRow = { text: string; kind: 'section' | 'body' | 'notice' | 'phone' }
export function travelCarryCardRows(content: TravelCarryCardContent): TravelCarryCardRow[] {
  const rows: TravelCarryCardRow[] = []
  const section = (title: string, values: string[]) => { rows.push({ text: title, kind: 'section' }, ...values.map(text => ({ text, kind: 'body' as const }))) }
  section('清单资料覆盖', [content.completionStatement])
  section('本次行程', [content.itinerary, [content.date,content.mode].filter(Boolean).join(' · ')])
  section('设备信息 · 按用户填写', content.devices.length ? content.devices.flatMap((device, index) => [`${index + 1}. ${device.name}`, `运输尺寸：${device.dimensions}`, `重量：${device.weight}`, `电池：${device.battery}`]) : ['如携带辅具，请向工作人员说明设备与所需协助。'])
  section('结论摘要与下一步', [content.summary, content.nextStep])
  rows.push({ text: '承运方与官方联系渠道', kind: 'section' })
  if (content.contacts.length) for (const contact of content.contacts) rows.push({ text: contact.name, kind: 'body' }, { text: contact.phone, kind: 'phone' })
  else rows.push({ text: '联系本次承运方或现场问询处，核对协助受理点与设备安排。', kind: 'body' })
  rows.push({ text: content.notice, kind: 'notice' }, { text: `清单生成时间（北京时间）：${content.generatedAt}`, kind: 'notice' })
  return rows
}

/** Generates PNG pages locally. Long multi-device plans are paged instead of clipping details. */
export async function createTravelCarryCard(plan: TravelTaskPlan): Promise<TravelCarryImage[]> {
  if (typeof document === 'undefined') throw new Error('请在浏览器中生成携带卡。')
  const content = travelCarryCardContent(plan)
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器暂不支持生成图片，可使用下方文字设备卡联系工作人员。')
  const width = 1080, padding = 64, textWidth = width - padding * 2
  const family = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif'
  context.font=`400 42px ${family}`
  const coverageLines=wrapCarryCardText(content.completionStatement,textWidth,text=>context.measureText(text).width)
  const coverageHeight=coverageLines.length*70+24
  const lines = travelCarryCardRows(content).slice(2).flatMap(row => {
    const fontSize = row.kind === 'phone' ? 56 : row.kind === 'section' ? 48 : row.kind === 'notice' ? 40 : 46
    context.font = `${row.kind === 'section' ? '700' : '400'} ${fontSize}px ${family}`
    // Phone numbers occupy their own row and never pass through character wrapping.
    const wrapped = row.kind === 'phone' ? [row.text] : wrapCarryCardText(row.text, textWidth, text => context.measureText(text).width)
    return wrapped.map((text, index) => ({ text, fontSize, kind: row.kind, gap: index === 0 ? row.kind === 'section' ? 38 : 8 : 0, lineHeight: Math.ceil(fontSize * 1.65) }))
  })
  const pages: typeof lines[] = [], headerHeight = 230+coverageHeight, footerHeight = 80, maxHeight = 12000
  let current: typeof lines = [], height = headerHeight + footerHeight
  for (const line of lines) {
    const nextHeight = line.gap + line.lineHeight
    if (current.length && height + nextHeight > maxHeight) { pages.push(current); current = []; height = headerHeight + footerHeight }
    current.push(line); height += nextHeight
  }
  if (current.length) pages.push(current)
  const images: TravelCarryImage[] = []
  for (const [index, page] of pages.entries()) {
    canvas.width = width; canvas.height = Math.ceil(headerHeight + footerHeight + page.reduce((sum, line) => sum + line.gap + line.lineHeight, 0))
    context.fillStyle = '#fffef8'; context.fillRect(0, 0, width, canvas.height)
    context.fillStyle = '#214d38'; context.fillRect(0, 0, width, 14)
    context.textBaseline = 'top'; context.fillStyle = '#214d38'
    context.font = `700 38px ${family}`; context.fillText('智能无碍行', padding, 48)
    context.font = `700 64px ${family}`; context.fillText(content.title, padding, 108)
    context.font = `400 30px ${family}`; context.textAlign = 'right'; context.fillText(`${index + 1} / ${pages.length}`, width - padding, 58); context.textAlign = 'left'
    context.fillStyle=plan.completion?.locked?'#f8efcf':'#edf4e8';context.fillRect(padding-16,200,textWidth+32,coverageHeight)
    context.fillStyle='#193c2c';context.font=`400 42px ${family}`
    coverageLines.forEach((text,line)=>context.fillText(text,padding,214+line*70))
    let y = headerHeight
    for (const line of page) {
      y += line.gap
      context.font = `${line.kind === 'section' ? '700' : '400'} ${line.fontSize}px ${family}`
      context.fillStyle = line.kind === 'notice' ? '#46594d' : line.kind === 'section' ? '#214d38' : '#193c2c'
      context.fillText(line.text, padding, y); y += line.lineHeight
    }
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片生成未完成，请重试。')), 'image/png'))
    images.push({ blob, width, height: canvas.height, page: index + 1, pages: pages.length })
  }
  return images
}

export function carryCardFileName(plan: TravelTaskPlan, page = 1, pages = 1): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(plan.route.date) ? plan.route.date : '本次行程'
  return `智能无碍行-随身携带卡-${date}${pages > 1 ? `-${page}共${pages}张` : ''}.png`
}
