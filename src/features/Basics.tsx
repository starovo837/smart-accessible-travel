import { CampusEmblem } from '../components/CampusEmblem'
import { useState } from 'react'
import { Icon } from '../components/Icons'
import { AppMark, PageHeader, PrimaryButton, ProgressDots } from '../components/UI'
import { moduleMeta } from '../app/mock'
import { shoppingPlatforms, shoppingUrl } from '../app/catalog'
import { PrivacyOptions } from './Profile'
import type {SupportToolId} from '../app/supportCatalog'
import {Workbench} from './Workbench'
import type {WorkbenchTarget} from '../app/workbench'
import type { AppSettings, ModuleId, PrivacyPreferences } from '../app/types'
const allModules: ModuleId[] = ['vision','hearing','mobility','speech','cognitive','chronic']
export function Welcome({ onSelect }: { onSelect: () => void }) {
  return <section className="screen welcome-screen"><div className="welcome-top"><AppMark /><span className="brand-name">智能无碍行</span><CampusEmblem/></div><div className="welcome-hero"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-illustration"><Icon name="wheelchair" size={74} /><Icon name="train" size={42} /></div><h1>让日常生活，<br /><strong>少一点阻碍</strong></h1><p>沟通、阅读、辅具与出行，从你需要的开始。</p></div><div className="welcome-actions"><PrimaryButton icon="list" onClick={onSelect}>选择我的情况<Icon name="chevron" size={20} /></PrimaryButton></div><p className="support-note"><Icon name="lock" size={16} />你的信息由你决定，随时可以删除</p></section>
}

export function SelectSituation({ modules, toggleModule, onNext, onBack, title = '选择我的情况', subtitle = '可以多选，之后也能随时调整' }: { modules: ModuleId[]; toggleModule: (id: ModuleId) => void; onNext: () => void; onBack: () => void; title?: string; subtitle?: string }) {
  return <section className="screen"><PageHeader title={title} subtitle={subtitle} onBack={onBack} /><ProgressDots step={1} /><div className="module-grid">{allModules.map((id) => { const meta = moduleMeta[id]; const active = modules.includes(id); return <button key={id} className={`module-card ${active ? 'selected' : ''}`} aria-pressed={active} onClick={() => toggleModule(id)}><div className="module-icon"><Icon name={meta.icon as any} size={30} /></div><div><strong>{meta.label}</strong><span>{meta.detail}</span></div><span className="selection-mark">{active ? <Icon name="check" size={18} /> : ''}</span></button> })}</div><div className="bottom-sticky"><p>{modules.length ? `已选择 ${modules.length} 个版块` : '可以暂不选择，继续使用基础功能'}</p><PrimaryButton onClick={onNext}>下一步<Icon name="arrow" size={19} /></PrimaryButton></div></section>
}

export function Consent({ modules, onConsent, onSkip, onBack, privacy, setPrivacy }: { modules: ModuleId[]; onConsent: () => void; onSkip: () => void; onBack: () => void; privacy: PrivacyPreferences; setPrivacy: (value: PrivacyPreferences) => void }) {
  return <section className="screen"><PageHeader title="隐私授权" subtitle="先了解，再决定是否保存" onBack={onBack} /><ProgressDots step={2} /><div className="consent-hero"><div className="privacy-symbol"><Icon name="lock" size={44} /></div><h2>你的情况只为你服务</h2><p>仅保存你勾选的资料到当前浏览器，没有上传或云端同步。没有勾选的资料只在本次运行使用；你可随时分项删除。</p></div><div className="consent-summary"><span>本次选择</span><div>{modules.map((id) => <span className="soft-chip" key={id}>{moduleMeta[id].label}</span>)}</div></div><PrivacyOptions value={privacy} onChange={setPrivacy} /><div className="consent-actions"><PrimaryButton icon="lock" onClick={onConsent}>同意并授权（可随时删除）</PrimaryButton><PrimaryButton variant="ghost" onClick={onSkip}>暂不填写，先看看基础功能</PrimaryButton></div></section>
}

interface HomeProps {
 modules:ModuleId[]; settings:AppSettings;
 encouragement?:import('react').ReactNode;
 onFitting:()=>void; onProduct:()=>void; onTravel:()=>void; onAssistant:()=>void;
 onProfile:()=>void; onDevices:()=>void; onOffline:()=>void; onChoose:()=>void;
 onTool:(id:SupportToolId)=>void;
}
export function Home({modules,settings,encouragement,onFitting,onProduct,onTravel,onAssistant,onProfile,onDevices,onOffline,onChoose,onTool}:HomeProps){
 const onAction=(target:WorkbenchTarget)=>{
  switch(target){
   case 'fitting':onFitting();break;
   case 'shop':onProduct();break;
   case 'travel':onTravel();break;
   case 'assistant':onAssistant();break;
   case 'profile':onProfile();break;
   case 'devices':onDevices();break;
   case 'offline':onOffline();break;
   case 'choose-needs':onChoose();break;
   default:onTool(target);
  }
 }
 return <Workbench modules={modules} settings={settings} encouragement={encouragement} onAction={onAction}/>;
}

export function ProductInput({ input, setInput, value, setValue, error, loading, onStart, onBack, initialQuery }: { input: 'link' | 'image'; setInput: (type: 'link' | 'image') => void; value: string; setValue: (value: string) => void; error?: string; loading: boolean; onStart: () => void; onBack: () => void; initialQuery?: string }) {
  const [shoppingQuery, setShoppingQuery] = useState(initialQuery ?? '电动轮椅')
  const [platform, setPlatform] = useState<typeof shoppingPlatforms[number]['id']>('jd')

  return <section className="screen"><PageHeader title="买辅具" subtitle="直接找辅具，也能帮你看懂商品" onBack={onBack} /><div className="shopping-entry"><div className="shopping-entry-head"><div className="preview-icon"><Icon name="cart" size={22} /></div><div><strong>直接打开购物平台</strong><p>可直接浏览和购买；需要解读时再返回本页。</p></div></div><label className="big-input">想找什么？<input value={shoppingQuery} onChange={(e) => setShoppingQuery(e.target.value)} placeholder="例如：助行器、便携制氧机" /></label><div className="shopping-presets" aria-label="常用辅具">{['电动轮椅', '助行器', '盲杖', '助听器', '沟通板', '便携制氧机'].map((name) => <button key={name} aria-pressed={shoppingQuery === name} onClick={() => setShoppingQuery(name)}>{name}</button>)}</div><div className="platform-grid">{shoppingPlatforms.map((item) => <button className={`platform-card ${platform === item.id ? 'active' : ''}`} key={item.id} onClick={() => setPlatform(item.id)} aria-pressed={platform === item.id}>{item.label}<small>{item.domain}</small></button>)}</div><a className="button button-primary button-link" href={shoppingUrl(shoppingPlatforms.find((item) => item.id === platform) ?? shoppingPlatforms[0], shoppingQuery || '辅具')} target="_blank" rel="noopener noreferrer"><Icon name="arrow" size={19} />打开 {shoppingPlatforms.find((item) => item.id === platform)?.label} 搜索（新标签页）</a><p className="catalog-hint">平台可能要求登录。这里只发送你输入的搜索词，不附带个人情况或设备档案。</p></div><button className="text-action" onClick={() => { setInput('link'); setValue('demo') }}>使用演示商品，先体验解读</button><div className="shopping-divider"><span>或者直接解读已有商品</span></div><div className="input-tabs" role="tablist"><button className={input === 'link' ? 'active' : ''} onClick={() => setInput('link')} aria-selected={input === 'link'} role="tab">粘贴商品链接</button><button className={input === 'image' ? 'active' : ''} onClick={() => setInput('image')} aria-selected={input === 'image'} role="tab">上传详情截图</button></div>{input === 'link' ? <label className="big-input">商品链接<input aria-invalid={Boolean(error)} value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://…" /><span className="input-hint"><Icon name="info" size={16} />本地演示：不会抓取实际网页或读取截图内容</span></label> : <label className="upload-box"><Icon name="upload" size={35} /><strong>{value || '点击上传商品详情截图'}</strong><span>支持 JPG、PNG，本原型演示固定样例</span><input type="file" accept="image/*" onChange={(e) => setValue(e.target.files?.[0]?.name || '')} /></label>}{error && <p role="alert" className="form-error">{error}</p>}<div className="analysis-preview"><div className="preview-icon"><Icon name="spark" size={24} /></div><div><strong>我会帮你看三件事</strong><p>商家说了什么 · 用户用得怎样 · 你家能不能用</p></div></div><div className="bottom-sticky"><PrimaryButton onClick={onStart} disabled={loading || !value}>{loading ? '正在解读商品…' : '开始解读'}<Icon name="arrow" size={19} /></PrimaryButton></div></section>
}


