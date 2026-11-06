import { useState } from 'react'
import { Modal, PageHeader, PrimaryButton, SectionTitle } from '../components/UI'
import { ManagementBackup } from './ManagementBackup'
import { CaseTracking } from './CaseTracking'
import { moduleMeta } from '../app/mock'
import { downloadText } from '../app/accessibility'
import type { AppSettings, ConsentState, Device, Feedback, JourneyData, ModuleId, PrivacyPreferences } from '../app/types'

export const initialPrivacy = (): PrivacyPreferences => ({ profile: false, devices: false, life: false, retainDays: 30 })
export function PrivacyOptions({ value, onChange, disabled=false }: { value: PrivacyPreferences; onChange: (value: PrivacyPreferences) => void; disabled?:boolean }) {
  return <div className="privacy-options" aria-busy={disabled}>
    {([['profile', '保存我选择的辅助版块'], ['devices', '保存设备参数与商品设备卡'], ['life', '保存生活任务、常用话语、居家行程与服务记录']] as const).map(([id, label]) => <label key={id} className="switch-line"><input type="checkbox" disabled={disabled} checked={value[id]} onChange={event => onChange({ ...value, [id]: event.target.checked })} />{label}</label>)}
    <p>生活与服务记录包括提醒、设施档案、就医和办事需求、参与活动、居家联动计划及限时求助的本机管理凭据。不保存时仍可临时使用。</p>
    <label>保存期限（从最近一次保存起）<select disabled={disabled} value={value.retainDays} onChange={event => onChange({ ...value, retainDays: Number(event.target.value) as PrivacyPreferences['retainDays'] })}><option value="7">7 天</option><option value="30">30 天</option><option value="0">直到我删除</option></select></label>
  </div>
}
export function NeedsDialog({ settings, setSettings, onClose }: { settings: AppSettings; setSettings: (value: AppSettings) => void; onClose: () => void }) {
  return <Modal title="按我的操作需要调整" onClose={onClose}>
    <p>可以自由组合，不必填写诊断或证明。</p>
    {([['elderMode', '老年模式（大字、大按钮与简化步骤）'], ['largeText', '放大文字和触控区'], ['textOnly', '优先显示文字（不影响朗读）'], ['stepMode', '一次只做一步'], ['reducedMotion', '减少动画与滚动效果'], ['readAloud', '自动朗读页面标题与助手回复'], ['encouragement', '显示温和的鼓励短句']] as const).map(([key, label]) => <label className="switch-line" key={key}><input type="checkbox" checked={key==='encouragement'?settings.encouragement!==false:Boolean(settings[key])} onChange={event => setSettings({ ...settings, [key]: event.target.checked, ...(key==='elderMode'?{largeText:event.target.checked,stepMode:event.target.checked,reducedMotion:event.target.checked}:{}) })} />{label}</label>)}
    <p className="prototype-note">所有操作都可以单次点击。支持键盘，不要求长按或拖动。</p>
    <PrimaryButton onClick={onClose}>完成</PrimaryButton>
  </Modal>
}

interface Props {
  modules: ModuleId[]; devices: Device[]; journey: JourneyData; consent: ConsentState; privacy: PrivacyPreferences;
  settings: AppSettings; feedback: Feedback[]; storageError: string; savedAt: number | null;
  onBack: () => void; onModules: () => void; onDevices: () => void; onCards: () => void; onLife: () => void; onOffline: () => void;
  onImportManagement:(cases:Feedback[],shares:import('../app/types').LocalShare[])=>void; onNeeds: () => void; onPrivacy: (value: PrivacyPreferences) => void|Promise<void>; onDelete: (scope: 'profile' | 'devices' | 'life' | 'all') => Promise<void>;
}
export function ProfilePage(props: Props) {
  const [view, setView] = useState<'privacy' | 'feedback' | null>(null)
  const [confirm, setConfirm] = useState<'profile' | 'devices' | 'life' | 'all' | null>(null)
  const [deleting,setDeleting]=useState(false),[deleteError,setDeleteError]=useState('')
  const [savingPrivacy,setSavingPrivacy]=useState(false)
  return <section className="screen profile-screen"><PageHeader title="我的" subtitle="资料、辅助设置和隐私都由你决定" onBack={props.onBack} />
    <p className="prototype-note">{props.consent === 'granted' ? '已授权的档案按你勾选的范围保存到当前浏览器。' : '基础模式：身份和健康档案只在当前运行中使用。'}本次出行行动清单和参数默认保存在本机，可在出行页导出或清除。</p>
    <PrimaryButton variant="secondary" onClick={props.onNeeds}>调整文字、朗读与操作方式</PrimaryButton>
    <section className="profile-section"><SectionTitle title="我的辅助版块" /><p>{props.modules.map(id => moduleMeta[id].label).join('、') || '未填写也可以使用基础功能'}</p><button className="text-action" onClick={props.onModules}>切换或叠加版块</button></section>
    <div className="profile-menu"><button onClick={props.onDevices}>我的设备与参数来源 <span>{props.devices.length} 台</span></button><button onClick={props.onLife}>生活便利工具</button><button onClick={props.onOffline}>离线随身包</button><button onClick={() => setView('feedback')}>纠错记录与处理进度 <span>{props.feedback.length} 条</span></button><button onClick={() => setView('privacy')}>隐私与数据</button></div>
    {props.storageError && <p role="alert" className="form-error">{props.storageError}</p>}
    {view === 'privacy' && <Modal title="隐私与数据" onClose={() => {if(!savingPrivacy)setView(null)}}>
      <p>本次出行行动清单、设备参数与勾选进度独立保存在此浏览器，不需要登录。在出行结果页可导出或一键清除；删除全部数据也会一并清除。</p>
      <p>取消勾选会移除对应的浏览器保存副本；当前运行中的资料仍可使用。本次AI资料不写入长期服务器档案；主动提交的纠错和限时分享会保存到当前服务，并可删除。</p>
      <PrivacyOptions value={props.privacy} disabled={savingPrivacy} onChange={async value=>{setSavingPrivacy(true);try{await props.onPrivacy(value)}finally{setSavingPrivacy(false)}}} />
      {savingPrivacy&&<p role="status">正在撤销相关服务分享并更新保存范围，请稍候。</p>}
      {props.storageError&&<p role="alert">{props.storageError}</p>}
      <p>最近保存：{props.savedAt ? new Date(props.savedAt).toLocaleString('zh-CN') : '未保存'}</p>
      <p>本地保存适合个人演示使用。当前没有账号隔离或端到端加密，公共设备上请使用基础模式。</p>
      <p>三维身体尺寸与方案使用独立的本地保存开关。下方删除版块与三维方案，或删除全部数据时，也会清除此浏览器中的三维尺寸、视角和候选款式；已导出的文件需自行删除。</p><div className="profile-menu"><button onClick={() => { setView(null); setConfirm('profile') }}>删除版块信息与三维尺寸、方案</button><button onClick={() => { setView(null); setConfirm('devices') }}>删除设备和商品设备卡</button><button onClick={() => { setView(null); setConfirm('life') }}>删除生活资料、联系人、分享和纠错记录</button><button className="danger-link" onClick={() => { setView(null); setConfirm('all') }}>一键删除全部数据</button></div>
      <p className="prototype-note">已下载或交给他人的离线文件需要自行删除，浏览器内删除不会撤回那些副本。</p>
    </Modal>}
    {view==='feedback'&&<Modal title="纠错记录与处理进度" onClose={()=>setView(null)}><CaseTracking items={props.feedback}/><ManagementBackup cases={props.feedback} shares={props.journey.shares} onImport={props.onImportManagement}/><p>导出文件包含追踪凭据，请妥善保管，不要发给家属查看。</p><PrimaryButton disabled={!props.feedback.length} onClick={()=>downloadText(JSON.stringify(props.feedback,null,2),'智能无碍行-纠错管理凭据.json','application/json')}>导出纠错记录（仅供查看）</PrimaryButton></Modal>}
    {confirm && <Modal title="确认删除这些资料？" onClose={() => {if(!deleting)setConfirm(null)}}><p>会清除浏览器中的相应资料。{confirm === 'all' ? '全部删除后返回工作台，资料和辅助设置都会重置。' : '其他资料继续保留。'}已导出的文件不会自动删除。</p><div className="action-row"><PrimaryButton variant="ghost" onClick={() => setConfirm(null)}>暂不删除</PrimaryButton><PrimaryButton variant="danger" disabled={deleting} onClick={async () => {setDeleting(true);setDeleteError('');try{await props.onDelete(confirm);setConfirm(null);setView(null)}catch(error){setDeleteError((error as Error).message)}finally{setDeleting(false)}}}>{deleting?'正在删除并核对……':'确认删除'}</PrimaryButton></div>{deleteError&&<p role="alert">{deleteError}</p>}</Modal>}
    <details className="campus-credit"><summary>背景照片来源</summary><p>东南大学四牌楼校区大礼堂及喷泉。摄影：<a href="https://commons.wikimedia.org/wiki/File:Auditorium_and_Fountain_in_Southeast_University_2012-09.JPG" target="_blank" rel="noopener noreferrer">猫猫的日记本</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>。原照片保留，页面叠加淡色层。</p></details>
  </section>
}
