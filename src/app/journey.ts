import type { CardField, Device, DeviceCard, FieldEvidence, JourneyData, LivingProfile, LocalShare, OfflinePacket, ProductAnalysis, TravelDeviceSpecs } from './types'

export const fieldLabels: Record<CardField, string> = {
  lengthCm: '使用长（cm）', widthCm: '使用宽（cm）', heightCm: '使用高（cm）', weightKg: '重量（kg）',
  foldLengthCm: '折叠长（cm）', foldWidthCm: '折叠宽（cm）', foldHeightCm: '折叠高（cm）',
  batteryWh: '每块电池（Wh）', batteryType: '电池类型', removable: '电池能否拆下', batteryCount: '驱动电池数量',
}
export const originLabels: Record<FieldEvidence['origin'], string> = { merchant: '商家描述（示例）', plate: '铭牌识别（模拟）', measurement: '用户测量 / 填写', reply: '粘贴回复提取' }
export function formatCardValue(field: CardField, value?: string) {
  if (!value) return '未填'
  if (field === 'batteryType') return ({ none: '无电池', lithium: '锂电池', other: '其他电池', unknown: '待确认' } as Record<string,string>)[value] ?? value
  if (field === 'removable') return ({ yes: '可拆', no: '不可拆', unknown: '待确认' } as Record<string,string>)[value] ?? value
  return value
}
export function initialJourney(): JourneyData { return { cards: [], living: { canFold: 'unknown', usualModes: ['rail'] }, comparisons: [], records: [], packet: null, shares: [], life: { home: { lighting: 'unknown', alarm: 'unknown' }, daily: { energy: 'good', pain: 'none', companion: false, note: '' }, routes: [], care: [], emergency: { helpText: '我需要无障碍协助，请给我一点时间。', caregiver: '', phone: '', showMedical: false, offlineReady: false }, caregiverHelp: false } } }
export function productCard(product: ProductAnalysis): DeviceCard {
  const values = { lengthCm: String(product.length), widthCm: String(product.width), weightKg: String(product.weight) }
  return { id: 'card-' + product.id, type: 'wheelchair', name: product.title, battery: '', dimensions: `${product.length} × ${product.width} × ? cm`, weight: product.weight + ' kg', source: 'manual', prospective: true, productId: product.id, values, evidence: Object.fromEntries(Object.keys(values).map(field => [field, { origin: 'merchant', confirmed: false, note: '本地模拟商品参数，尚需向商家核对' }])) }
}
export function deviceCard(device: Device): DeviceCard {
  const values: DeviceCard['values'] = {}
  const dims = device.dimensions.match(/(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)/)
  if (dims) { values.lengthCm = dims[1]; values.widthCm = dims[2]; values.heightCm = dims[3] }
  const weight = device.weight.match(/(\d+(?:\.\d+)?)\s*kg/i)
  if (weight) values.weightKg = weight[1]
  if (device.battery === '无') values.batteryType = 'none'
  return { ...device, prospective: false, values, evidence: Object.fromEntries(Object.keys(values).map(field => [field, { origin: device.source === 'plate' ? 'plate' : 'measurement', confirmed: device.source !== 'plate', note: device.source === 'plate' ? '模拟识别，请对照铭牌确认' : '来自已保存的手动资料' }])) }
}
export function validCard(card: DeviceCard) {
  return Object.entries(card.values).every(([field,value]) => !value || (field === 'batteryCount' ? ['1','2'].includes(value) : field === 'batteryType' ? ['none','lithium','other','unknown'].includes(value) : field === 'removable' ? ['yes','no','unknown'].includes(value) : Number.isFinite(Number(value)) && Number(value) > 0)) && Boolean(card.name.trim())
}
export function confirmedSpecs(card: DeviceCard): TravelDeviceSpecs {
  const get = (field: CardField) => card.evidence[field]?.confirmed ? card.values[field] : undefined
  const num = (field: CardField) => get(field) && Number(get(field)) > 0 ? Number(get(field)) : undefined
  const folded = card.transportState !== 'use' && ['foldLengthCm','foldWidthCm','foldHeightCm'].every(field => num(field as CardField) !== undefined)
  return { lengthCm: num(folded ? 'foldLengthCm' : 'lengthCm'), widthCm: num(folded ? 'foldWidthCm' : 'widthCm'), heightCm: num(folded ? 'foldHeightCm' : 'heightCm'), weightKg: num('weightKg'), folded: folded ? 'yes' : 'unknown', batteryWh: num('batteryWh'), batteryType: (get('batteryType') ?? 'unknown') as TravelDeviceSpecs['batteryType'], removable: (get('removable') ?? 'unknown') as TravelDeviceSpecs['removable'], batteryCount: num('batteryCount') as 1 | 2 | undefined }
}
export function rememberTravelSpecs(card: DeviceCard, specs: TravelDeviceSpecs): DeviceCard {
  const values = { ...card.values }, evidence = { ...card.evidence }
  for (const field of ['lengthCm','widthCm','heightCm','weightKg','batteryWh','batteryType','removable','batteryCount'] as const) {
    const key: CardField = specs.folded === 'yes' && ['lengthCm','widthCm','heightCm'].includes(field) ? ('fold' + field[0].toUpperCase() + field.slice(1)) as CardField : field
    const value = specs[field]
    if (value === undefined || value === 'unknown') { delete values[key]; delete evidence[key]; continue }
    values[key] = String(value)
    evidence[key] = { origin: 'measurement', confirmed: true, note: '用户在出行查询中核对并明确保存' }
  }
  return { ...card, values, evidence, transportState: specs.folded === 'yes' ? 'folded' : 'use' }
}
export function missingCardFields(card: DeviceCard) { return (Object.keys(fieldLabels) as CardField[]).filter(field => !card.values[field] || !card.evidence[field]?.confirmed) }
export function merchantQuestion(card: DeviceCard) {
  const fields = missingCardFields(card).map(field=>fieldLabels[field]).join('、')
  return `您好，我想核对“${card.name}”的参数。请提供${fields || '完整规格及参数依据'}，注明使用状态与折叠状态，并提供说明书或铭牌照片。请说明折叠是否可由一人完成。谢谢。`
}
export function extractReply(text: string): DeviceCard['values'] {
  const values: DeviceCard['values'] = {}
  for (const [prefix, fields] of [['折叠', ['foldLengthCm','foldWidthCm','foldHeightCm']], ['使用', ['lengthCm','widthCm','heightCm']]] as const) {
    const match = text.match(new RegExp(prefix + '(?:后|时)?(?:尺寸)?\\s*[：:]?\\s*(\\d+(?:\\.\\d+)?)\\s*[×xX*]\\s*(\\d+(?:\\.\\d+)?)\\s*[×xX*]\\s*(\\d+(?:\\.\\d+)?)\\s*(?:cm|厘米)', 'i'))
    if (match) fields.forEach((field,index)=>{ if (Number(match[index+1]) > 0) values[field] = match[index+1] })
  }
  const weight = text.match(/(?:重量|重)\s*[：:]?\s*(\d+(?:\.\d+)?)\s*(?:kg|千克|公斤)/i)
  const wh = text.match(/(?:电池|容量|额定能量|每块电池)(?:容量)?\s*[：:]?\s*(\d+(?:\.\d+)?)\s*Wh/i)
  if (weight && Number(weight[1]) > 0) values.weightKg = weight[1]
  if (wh && Number(wh[1]) > 0) values.batteryWh = wh[1]
  if (/非锂电池/.test(text)) values.batteryType = 'other'
  else if (/锂电池/.test(text)) values.batteryType = 'lithium'
  if (/无电池|没有电池/.test(text)) values.batteryType = 'none'
  if (/电池(?:不可拆卸|不可拆下|不能拆)/.test(text)) values.removable = 'no'
  else if (/电池(?:可拆卸|可以拆下|可拆下)/.test(text)) values.removable = 'yes'
  return values
}
export function livingChecks(card: DeviceCard, home: LivingProfile): { label: string; detail: string; tone: 'good' | 'warn' | 'danger' }[] {
  const result: ReturnType<typeof livingChecks> = []
  const verified = (field: CardField) => card.evidence[field]?.confirmed && Number(card.values[field]) > 0 ? Number(card.values[field]) : undefined
  const width = verified('widthCm'), length = verified('lengthCm'), weight = verified('weightKg')
  const checkWidth = (label: string, opening?: number) => {
    if (!opening || !width) result.push({ label, detail: '请测量净宽并确认设备使用宽度。', tone: 'warn' })
    else result.push({ label, detail: width > opening ? `设备宽 ${width} cm，大于净宽 ${opening} cm；无法直接通过。折叠宽度另行核对。` : `宽度比较通过，剩余 ${+(opening-width).toFixed(2)} cm；还需确认转弯和操作余量。`, tone: width > opening ? 'danger' : 'good' })
  }
  checkWidth('家门能否通过', home.doorCm); checkWidth('电梯门能否通过', home.elevatorDoorCm)
  if (!length || !width || !home.elevatorLengthCm || !home.elevatorWidthCm) result.push({ label: '电梯轿厢', detail: '补齐设备使用长宽与轿厢净长宽；门宽通过不代表能转身。', tone: 'warn' })
  else { const fits = length <= home.elevatorLengthCm && width <= home.elevatorWidthCm; result.push({ label: '电梯轿厢', detail: fits ? '按当前朝向可放入；仍需实测转身和同行人员空间。' : '当前朝向尺寸不匹配，建议现场试用或选择更小设备。', tone: fits ? 'good' : 'danger' }) }
  result.push({ label: '独立搬运', detail: !weight || !home.liftKg ? '填写设备重量及自己可搬运的重量；不要勉强抬举。' : weight > home.liftKg ? `设备重 ${weight} kg，超过你填写的 ${home.liftKg} kg；需协助搬运。` : '重量在你填写的范围内，仍需考虑握持、平衡及台阶。', tone: weight && home.liftKg && weight > home.liftKg ? 'danger' : 'warn' })
  result.push({ label: '独立折叠', detail: home.canFold === 'no' ? '需要一人协助或选择更易折叠的型号。' : '请向商家确认是否能一人折叠、是否需要双手，再预约试用。', tone: 'warn' })
  return result
}
export function tripSignature(mode: string, carrier: string, devices: Device[], specs: Record<string,TravelDeviceSpecs>, context: object = {}) { return JSON.stringify({ mode, carrier, devices: devices.map(d=>({ id:d.id,type:d.type,name:d.name })), specs, context }) }
export function shareStatus(share: LocalShare, now = Date.now()) { return share.revoked ? '已撤销' : now >= share.expiresAt ? '已到期' : '有效' }
export function sharePayload(packet: OfflinePacket, share: LocalShare, now = Date.now()) { if (shareStatus(share,now) !== '有效') return null; return { devices: share.scopes.includes('devices') ? packet.cards : undefined, records: share.scopes.includes('records') ? packet.records : undefined, checklist: share.scopes.includes('checklist') ? packet.checklist : undefined } }
const esc = (text: string) => text.replace(/[&<>"']/g, char=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]!))
export function packetHtml(packet: OfflinePacket) {
  const block = (title:string,body:string) => `<section><h2>${esc(title)}</h2><pre>${esc(body)}</pre></section>`
  const cards = packet.cards.map(card=>card.name+'\n'+Object.entries(card.values).map(([field,value])=>`${fieldLabels[field as CardField]}：${formatCardValue(field as CardField,value)}（${card.evidence[field as CardField]?.confirmed ? '用户已确认' : '待确认'}）`).join('\n')).join('\n\n')
  const life = packet.life
  const servicesText=life?.services ? [
    '设施记录：',...life.services.facilities.map(row=>`${row.name} / ${row.address}\n入口净宽：${row.doorCm??'待核实'} cm；台阶：${row.steps==='none'?'本人记录无台阶':row.steps==='present'?'有台阶':'待核实'}；电梯：${row.elevator==='working'?'曾核对可用':row.elevator==='unavailable'?'记录不可用':'待核实'}\n来源：${row.source||'未填'}；核实时间：${row.checkedAt||'未填'}\n${row.notes}`),
    '就医、办事与服务资料：',...life.services.cases.map(row=>`${row.title} / ${row.region} / ${row.date}\n需要：${row.needs}\n${row.materials.map(item=>(item.checked?'☑ ':'☐ ')+item.label).join('\n')}\n本人记录的答复：${row.confirmation?row.confirmation.source+' / '+row.confirmation.reference:'尚无；打开渠道不表示预约成功'}`),
    '数字办事：',...life.services.digitalTasks.map(row=>`${row.title} / 期限：${row.deadline||'未填'}\n${row.steps.map(item=>(item.checked?'☑ ':'☐ ')+item.label).join('\n')}`),
    '居家联动准备：',...life.services.homeConnections.map(row=>`${row.name} / ${row.brandModel} / ${row.event}\n兼容依据：${row.compatibilitySource||'待核实'}；未建立设备连接`)
  ].join('\n\n') : '尚无新增生活服务资料'
  const lifeText = life ? `今日状态：体力 ${{good:'按平常节奏',limited:'需要多休息',rest:'以休息为主'}[life.daily.energy]}；不适 ${{none:'暂时没有',mild:'有些不适',strong:'明显不适'}[life.daily.pain]}；${life.daily.companion ? '选择了需要陪同' : '暂未选择陪同'}\n居家参数：家门 ${life.home.doorCm ?? '未填'} cm；电梯门 ${life.home.elevatorDoorCm ?? '未填'} cm；卫生间转身空间 ${life.home.bathroomTurnCm ?? '未填'} cm\n紧急沟通卡：${life.emergency.helpText}\n家属：${life.emergency.caregiver || '未填'} ${life.emergency.phone || ''}\n路线：${life.routes.map(route => `${route.from} → ${route.to}：${route.steps.join('；')}`).join('\n') || '尚无路线'}\n设备照护：${life.care.map(item => `${item.title}（${item.status === 'done' ? '已完成' : '待处理'}）`).join('；') || '尚无记录'}` : '未选择导出生活资料'
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>智能无碍行 · 离线随身包</title><style>body{font:20px/1.6 system-ui;margin:0 auto;padding:24px;max-width:700px;color:#123b63;background:#faf8f2}section{padding:16px;margin:14px 0;background:white;border:1px solid #cad5df;border-radius:14px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}h2{font-size:24px}</style><h1>我的离线出行随身包</h1><p>保存时间：${esc(packet.savedAt)} · 静态快照</p>${block('设备信息卡',cards)}${block('检查结果',packet.results.map(result=>result.deviceName+'：'+result.summary+'\n'+(result.handling ?? '')+'\n'+result.evidence).join('\n\n'))}${block('用户记录的承运方答复',packet.records.map(record=>record.carrier+' / '+record.itinerary+' / '+record.date+'\n'+record.reply).join('\n\n') || '尚无答复记录')}${block('准备清单',packet.checklist.map(item=>`${item.checked ? '☑' : '☐'} ${item.label}\n${item.detail}`).join('\n'))}${block('沟通卡',packet.communication)}${block('生活便利资料',lifeText)}${life?block('生活服务记录',servicesText):''}<p>仅供参考，以承运方书面确认为准</p><p>此文件可离线打开，无外部请求。导出副本无法远程撤销，请自行保管。</p></html>`
}
