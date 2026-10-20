import { useState, type Dispatch, type SetStateAction } from 'react'
import { Modal, PrimaryButton } from '../components/UI'
import { copyText, downloadText, phoneLink, readText, stopReading } from '../app/accessibility'
import type { Device, LifeData } from '../app/types'

const phrases = ['请用文字与我沟通。', '请给我一点时间，不要催促。', '我需要无障碍通道，请告诉我入口在哪里。', '这是我的辅助设备，请说明检查步骤。', '请把重要信息写下来。', '请协助我联系家属。']
export function HelpCard({ life, setLife, devices, onClose }: { life: LifeData; setLife: Dispatch<SetStateAction<LifeData>>; devices: Device[]; onClose: () => void }) {
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState('')
  const profile = life.emergency
  const update = (fields: Partial<LifeData['emergency']>) => setLife(current => ({ ...current, emergency: { ...current.emergency, ...fields } }))
  const medical = devices.filter(device => (profile.medicalIds ?? []).includes(device.id))
  const content = [profile.helpText, profile.location ? `位置说明：${profile.location}` : '', profile.caregiver ? `联系人：${profile.caregiver}` : '', profile.phone ? `电话：${profile.phone}` : '', profile.showMedical && medical.length ? `我同意展示的设备：${medical.map(device => `${device.name}；${device.dimensions || '尺寸未填'}；${device.battery || '电池未填'}`).join('\n')}` : '', profile.staffReply ? `工作人员回复：${profile.staffReply}` : ''].filter(Boolean).join('\n')
  const dial = phoneLink(profile.phone)
  return <Modal title={editing ? '编辑求助资料' : '我的求助沟通卡'} onClose={() => { stopReading(); onClose() }} fullScreen>
    {editing ? <>
      <p>资料由你决定。未填写联系人也可以使用沟通卡。</p>
      <label>希望对方知道什么<textarea value={profile.helpText} onChange={event => update({ helpText: event.target.value })} /></label>
      <label>家属或联系人姓名<input value={profile.caregiver} onChange={event => update({ caregiver: event.target.value })} /></label>
      <label>联系电话<input inputMode="tel" value={profile.phone} onChange={event => update({ phone: event.target.value })} placeholder="用于你点击拨号，不会自动发送" /></label>
      <label>所在位置说明<input value={profile.location ?? ''} onChange={event => update({ location: event.target.value })} placeholder="例如：车站东入口旁" /></label>
      <label className="switch-line"><input type="checkbox" checked={profile.showMedical} onChange={event => update({ showMedical: event.target.checked })} />同意在这张卡展示我选择的设备</label>
      {profile.showMedical && (devices.length ? devices.map(device => <label className="switch-line" key={device.id}><input type="checkbox" checked={(profile.medicalIds ?? []).includes(device.id)} onChange={event => update({ medicalIds: event.target.checked ? [...(profile.medicalIds ?? []), device.id] : (profile.medicalIds ?? []).filter(id => id !== device.id) })} />{device.name}</label>) : <p>没有设备资料，可稍后在“我的”里添加。</p>)}
      <PrimaryButton onClick={() => setEditing(false)}>完成，展示沟通卡</PrimaryButton>
    </> : <>
      <div className="help-display" role="region" aria-label="给工作人员看的大字沟通卡"><p>{profile.helpText || '请协助我，谢谢。'}</p>{profile.location && <p>{profile.location}</p>}{profile.caregiver && <p>联系人：{profile.caregiver}</p>}{profile.phone && <p>{profile.phone}</p>}{profile.showMedical && medical.map(device => <p key={device.id}>{device.name} · {device.dimensions || '尺寸未填写'}</p>)}</div>
      <div className="phrase-list" aria-label="常用沟通语句">{phrases.map(phrase => <button key={phrase} aria-pressed={profile.helpText === phrase} onClick={() => update({ helpText: phrase })}>{phrase}</button>)}</div>
      <label>工作人员可以在这里回复<textarea value={profile.staffReply ?? ''} onChange={event => update({ staffReply: event.target.value })} placeholder="请把回复写在这里" /></label>
      <div className="action-row"><PrimaryButton icon="volume" onClick={() => setStatus(readText(content) ? '正在朗读卡片，可以点击停止。' : '此浏览器暂不支持朗读，仍可展示文字。')}>朗读卡片</PrimaryButton><PrimaryButton variant="ghost" onClick={() => { stopReading(); setStatus('已停止朗读。') }}>停止朗读</PrimaryButton></div>
      {dial ? <a className="button button-primary" href={dial}>拨打联系人电话</a> : <p>尚未填写有效联系人电话。可以先展示沟通卡，或请工作人员帮助联系。</p>}
      <PrimaryButton variant="secondary" icon="copy" onClick={async () => setStatus(await copyText(content) ? '内容已复制。尚未发送给任何人。' : '复制失败，请直接展示卡片或导出文件。')}>复制沟通内容</PrimaryButton>
      <PrimaryButton variant="ghost" onClick={() => { downloadText(content, '智能无碍行-离线沟通卡.txt'); setStatus('已请求下载。请确认文件保存成功，之后可在手机文件管理器离线打开。') }}>下载离线沟通卡</PrimaryButton>
      <button className="text-action" onClick={() => setEditing(true)}>编辑联系人与展示范围</button>
    </>}
    <p className="operation-status" role="status">{status}</p>
    <p className="prototype-note">这是现场沟通工具，不会自动呼叫救援或通知家属。拨号是否接通以手机显示为准。</p>
  </Modal>
}
