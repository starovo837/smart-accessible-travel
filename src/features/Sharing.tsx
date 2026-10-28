import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { LiveFamilyPanel } from './LiveSharing'
import { RuntimeReadiness } from './RuntimeReadiness'
import { InstallHelp } from './InstallHelp'
import { embedPortable, exportableLife, portableSnapshot } from '../app/portable'
import { PrimaryButton } from '../components/UI'
import { downloadText, localTime } from '../app/accessibility'
import { deviceCard, fieldLabels, formatCardValue, packetHtml, sharePayload, shareStatus } from '../app/journey'
import type { CardField } from '../app/types'
import type { Device, JourneyData, LocalShare, OfflinePacket } from '../app/types'

export function makePacket(journey: JourneyData, devices: Device[]): OfflinePacket {
  return { savedAt: localTime(), mode: '待选择', cards: devices.map(device => journey.cards.find(card => card.id === device.id) ?? deviceCard(device)), results: [], records: journey.records, checklist: [], communication: journey.life.emergency.helpText }
}
function LocalFamilyPanel({ journey, setJourney, devices, packet }: { journey: JourneyData; setJourney: Dispatch<SetStateAction<JourneyData>>; devices: Device[]; packet?: OfflinePacket }) {
  const [scopes, setScopes] = useState<LocalShare['scopes']>(['checklist'])
  const [recipient, setRecipient] = useState(''), [days, setDays] = useState(1), [selected, setSelected] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now()), [status, setStatus] = useState('')
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  const snapshot = packet ?? journey.packet ?? makePacket(journey, devices)
  const share = journey.shares.find(item => item.id === selected)
  const payload = share ? sharePayload(snapshot, share, now) : null
  return <section className="task-panel"><h2>给家属准备资料</h2><p className="prototype-note">本机预览和文件导出。尚未接入账号、分享链接或家属同步，也不会自动通知对方。</p>
    <label>准备交给谁（选填）<input value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="例如：姐姐" /></label>
    {([['devices', '设备参数'], ['records', '我记录的承运方回复'], ['checklist', '出行清单进度']] as const).map(([id, label]) => <label key={id} className="switch-line"><input type="checkbox" checked={scopes.includes(id)} onChange={event => setScopes(current => event.target.checked ? [...current, id] : current.filter(scope => scope !== id))} />{label}</label>)}
    <label>本机预览期限<select value={days} onChange={event => setDays(Number(event.target.value))}><option value={1}>1 天</option><option value={3}>3 天</option><option value={7}>7 天</option></select></label>
    <PrimaryButton disabled={!scopes.length} onClick={() => { const item: LocalShare = { id: 'share-' + Date.now(), recipient: recipient.trim(), expiresAt: Date.now() + days * 86400000, revoked: false, scopes, previewedAt: localTime() }; setJourney(current => ({ ...current, shares: [...current.shares, item] })); setSelected(item.id); setNow(Date.now()) }}>生成范围预览</PrimaryButton>
    {journey.shares.map(item => <article className="record-row" key={item.id}><strong>{item.recipient || '未指定接收人'} · {shareStatus(item, now)}</strong><p>本机预览截至 {new Date(item.expiresAt).toLocaleString('zh-CN')}</p><button disabled={shareStatus(item, now) !== '有效'} onClick={() => setSelected(item.id)}>查看范围</button><button disabled={item.revoked} onClick={() => { setJourney(current => ({ ...current, shares: current.shares.map(row => row.id === item.id ? { ...row, revoked: true } : row) })); setStatus('已撤销本机预览；已经下载或发出的文件无法撤回。') }}>撤销本机预览</button></article>)}
    {share && <div className="share-preview"><h3>即将导出的内容</h3>{payload ? <>{payload.devices && <section><h3>设备资料</h3>{payload.devices.length ? payload.devices.map(card => <article key={card.id} className="record-row"><strong>{card.name}</strong>{Object.entries(card.values).map(([field,value]) => <p key={field}>{fieldLabels[field as CardField]}：{formatCardValue(field as CardField,value)}（{card.evidence[field as CardField]?.confirmed ? '本人已确认' : '待确认'}）</p>)}</article>) : <p>没有设备资料。</p>}</section>}{payload.records && <section><h3>承运方答复记录</h3>{payload.records.length ? payload.records.map(record => <article key={record.id} className="record-row"><strong>{record.carrier} · {record.itinerary}</strong><p>{record.date}</p><p>{record.reply}</p></article>) : <p>没有答复记录。</p>}</section>}{payload.checklist && <section><h3>清单进度</h3>{payload.checklist.length ? payload.checklist.map(item => <p key={item.id}>{item.checked ? '✓ 已完成' : '○ 待完成'}：{item.label}<br />{item.detail}</p>) : <p>还没有生成出行清单。可先到出行结果页生成。</p>}</section>}<PrimaryButton onClick={() => { const scoped: OfflinePacket = { savedAt: localTime(), mode: snapshot.mode, cards: payload.devices ?? [], results: [], records: payload.records ?? [], checklist: payload.checklist ?? [], communication: '' }; downloadText(packetHtml(scoped), '智能无碍行-家属资料.html', 'text/html;charset=utf-8'); setStatus('已请求下载所选内容，请检查文件后自行交给家属。文件是静态副本，不受预览到期或撤销影响。') }}>下载所选资料</PrimaryButton></> : <p>预览已到期或撤销，内容已隐藏。</p>}</div>}
    <label className="switch-line"><input type="checkbox" checked={journey.life.caregiverHelp} onChange={event => setJourney(current => ({ ...current, life: { ...current.life, caregiverHelp: event.target.checked } }))} />本机协助填写模式</label><p>允许陪同者在这台设备上帮助填写；关键确认仍由本人决定，不表示已建立远程协助。</p><p role="status">{status}</p>
  </section>
}

export function OfflineWorkspace({ journey, devices, onBack }: { journey: JourneyData; devices: Device[]; onBack: () => void }) {
  const [includeLife, setIncludeLife] = useState(false), [includeDevices, setIncludeDevices] = useState(false), [includeTrip, setIncludeTrip] = useState(false), [status, setStatus] = useState('')
  const packet = journey.packet ?? makePacket(journey, devices)
  const [offlineState, setOfflineState] = useState('离线应用状态正在检查')
  useEffect(() => {
    if (!window.isSecureContext || !('serviceWorker' in navigator)) { setOfflineState('当前连接不支持离线应用缓存；请下载下方独立文件。局域网 HTTP 地址通常属于此情况。'); return }
    let active = true
    navigator.serviceWorker.getRegistration().then(registration => { if (active) setOfflineState(registration?.active ? '应用代码已在当前浏览器缓存。个人资料只有授权后才会保存；文件导出仍需单独选择。' : '应用缓存尚未就绪，请保持联网使用，或下载独立文件。') }).catch(() => { if (active) setOfflineState('未能确认离线应用缓存，请使用下方文件导出。') })
    return () => { active = false }
  }, [])
  return <section className="screen"><button className="back-link" onClick={onBack}>返回首页</button><h1>离线随身包</h1><p className="prototype-note" role="status">{offlineState}</p><p>选择要下载的资料。HTML 文件可以在手机文件管理器中离线打开，无需连接这台电脑。</p>
    <label className="switch-line"><input type="checkbox" checked={includeDevices} onChange={event => setIncludeDevices(event.target.checked)} />设备资料（{devices.length} 台）</label>
    <label className="switch-line"><input type="checkbox" checked={includeTrip} onChange={event => setIncludeTrip(event.target.checked)} />最近出行结果、清单与承运方回复</label>
    <label className="switch-line"><input type="checkbox" checked={includeLife} onChange={event => setIncludeLife(event.target.checked)} />生活、办事资料和求助卡（含已填联系人，不含限时链接管理凭据）</label>
    <PrimaryButton disabled={!includeDevices && !includeLife && !includeTrip} onClick={() => { const content: OfflinePacket = { ...packet, savedAt: localTime(), cards: includeDevices ? makePacket(journey, devices).cards : [], results: includeTrip ? packet.results : [], records: includeTrip ? journey.records : [], checklist: includeTrip ? packet.checklist : [], communication: includeLife ? journey.life.emergency.helpText : '', life: includeLife ? exportableLife(journey.life) : undefined }; downloadText(packetHtml(content), '智能无碍行-离线随身包.html', 'text/html;charset=utf-8'); setStatus('已请求下载，请确认文件保存成功后再离线使用。') }}>下载可独立打开的文件</PrimaryButton>
    <PrimaryButton disabled={!includeDevices&&!includeLife&&!includeTrip} onClick={async()=>{try{const response=await fetch('/offline-app.html');if(!response.ok)throw Error('独立应用文件尚未生成，请先构建并运行桌面版。');const template=await response.text();if(!template.includes('独立离线应用'))throw Error('请从已构建的桌面版导出独立应用。');const snapshot=portableSnapshot(journey,devices,{devices:includeDevices,life:includeLife,trip:includeTrip});downloadText(embedPortable(template,snapshot),'智能无碍行-独立应用.html','text/html;charset=utf-8');setStatus('已请求下载完整独立应用。可在手机文件管理器用浏览器打开，基础查询、设备卡和清单不需连接电脑；实时核验、协作仍需服务，AI另有硬件要求。')}catch(error){setStatus((error as Error).message)}}}>下载完整独立应用（含所选资料）</PrimaryButton>
    <RuntimeReadiness/><InstallHelp/><p role="status">{status}</p><p className="prototype-note">导出文件无法撤销或实时更新。手机访问电脑的 HTTP 地址仍依赖电脑运行，不等于安装独立 App。</p>
  </section>
}

export function FamilyPanel({journey,setJourney,devices,packet,onChecklist}:{journey:JourneyData;setJourney:Dispatch<SetStateAction<JourneyData>>;devices:Device[];packet?:OfflinePacket;onChecklist?:(items:import('../app/types').ChecklistItem[])=>void}) {const snapshot=packet??journey.packet??makePacket(journey,devices);return <><LiveFamilyPanel snapshot={snapshot} shares={journey.shares} onShares={shares=>setJourney(current=>({...current,shares}))} onChecklist={items=>{onChecklist?.(items);setJourney(current=>({...current,packet:{...snapshot,checklist:items}}))}}/><details><summary>本机预览和静态文件导出</summary><LocalFamilyPanel journey={journey} setJourney={setJourney} devices={devices} packet={snapshot}/></details></>}
