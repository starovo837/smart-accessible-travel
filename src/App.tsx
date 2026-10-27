import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, PrimaryButton } from './components/UI'
import { isStudio } from './app/deployment'
import { Welcome, SelectSituation, Consent, Home } from './features/Basics'
import { TravelQuery, travelOptions } from './features/TravelQuery'
import { TravelResultPage } from './features/Results'
import { AssistantPage } from './features/Assistant'
import { HelpCard } from './features/HelpCard'
import { FittingWorkspace } from './features/FittingWorkspace'
import { FitShopping } from './features/fitting/FitShopping'
import { FeatureNav } from './components/FeatureNav'
import { useFittingDraft } from './app/useFittingDraft'
import { Equipment } from './features/Equipment'
import { FeedbackDialog } from './features/Feedback'
import { LifeTools } from './features/LifeWorkspace'
import {NeedsPicker,SupportHub} from './features/SupportHub'
import {SupportToolPage} from './features/SupportToolPage'
import {supportTools,type SupportToolId} from './app/supportCatalog'
import {Icon} from './components/Icons'
import {ReminderNotice} from './features/support/Reminders'
import {LivingHub,ScenePage} from './features/living/LivingHub'
import {LivingServicesPage} from './features/living/LivingServicesPage'
import {FacilityMap} from './features/living/FacilityMap'
import {LiveHelp} from './features/living/LiveHelp'
import {livingEntries,livingScenes,type SceneId,type ServiceToolId} from './app/livingCatalog'
import {initialLivingServices,type LivingServicesData} from './app/livingServices'
import {PageHeader} from './components/UI'
import {Encouragement,type EncouragementContext} from './components/Encouragement'
import { OfflineWorkspace } from './features/Sharing'
import { initialPrivacy, NeedsDialog, ProfilePage } from './features/Profile'
import { analyzeInBrowser } from './app/browserAI'
import { assistantEvidence, packEvidence } from './app/assistantEvidence'
import { ruleCatalog, type RuleDocument } from './app/ruleCatalog'
import { prepareService, service } from './app/service'
import { productAnalysis } from './app/mock'
import { buildTravelResults } from './app/travelRules'
import { confirmedSpecs, deviceCard, initialJourney, rememberTravelSpecs } from './app/journey'
import { readSnapshot, scopeSnapshot, STORAGE_KEY } from './app/storage'
import { QuickProductIntake as ProductIntake } from './features/QuickProductIntake'
import type { IntakeDraft } from './app/intake'
import { TravelCoverage } from './features/TravelCoverage'
import { ProductInsightView } from './features/ProductInsight'
import { analyzeSources } from './app/product-api'
import { initialNeeds, localAnalysis, preserveConfirmations, type ProductSource } from './app/product'
import { readText, stopReading } from './app/accessibility'
import type { AppSettings, ChecklistItem, ConsentState, CustomTravelDevice, CustomTravelMode, Device, DeviceCard, Feedback, JourneyData, LifeData, ModuleId, PrivacyPreferences, ProductAnalysis, Screen, TravelCheckResult, TravelContext, TravelDeviceSpecs } from './app/types'

const defaultSettings = (): AppSettings => ({ elderMode: false, stepMode: false, readAloud: false, largeText: false, textOnly: false, reducedMotion: false, encouragement:true })
const hashScreens:Record<string,Screen>={'#fitting':'fitting-workspace','#home':'home','#shop':'product-input','#compare':'fit-shopping','#travel':'travel-input','#daily':'life-tools','#assistant':'assistant','#support':'support','#aid-voice':'support','#aid-captions':'support',...Object.fromEntries(supportTools.filter(tool=>!['help','needs','life'].includes(tool.id)).map(tool=>['#aid-'+tool.id,'support-tool'])), '#services':'living-hub',...Object.fromEntries(livingEntries.map(item=>['#aid-'+item.id,'living-service'])),...Object.fromEntries(livingScenes.map(scene=>['#scene-'+scene.id,'living-scene']))}
function load() { try { const portable=document.getElementById('portable-data');if(portable){const data=readSnapshot(portable.textContent);return data?{...data,consent:'skipped' as const}:null}return readSnapshot(localStorage.getItem(STORAGE_KEY)) } catch { return null } }
export default function App() {
  const fitting=useFittingDraft()
  const [serviceTool,setServiceTool]=useState<ServiceToolId>(()=>livingEntries.find(item=>'#aid-'+item.id===location.hash)?.id??'places'),[livingScene,setLivingScene]=useState<SceneId>(()=>livingScenes.find(scene=>'#scene-'+scene.id===location.hash)?.id??'hospital')
  const [chooseNeeds,setChooseNeeds]=useState(false),[supportTool,setSupportTool]=useState<SupportToolId>(()=>supportTools.find(tool=>'#aid-'+tool.id===location.hash)?.id??'vision')
  const [ruleDocuments,setRuleDocuments]=useState<RuleDocument[]>(ruleCatalog),[ruleMessage,setRuleMessage]=useState(''),[ruleLoading,setRuleLoading]=useState(false),[assistantContext,setAssistantContext]=useState<'product'|'travel'|'none'>('none'),[aiProgress,setAiProgress]=useState('')
  useEffect(()=>{service<{documents:RuleDocument[]}>('rules').then(value=>setRuleDocuments(value.documents)).catch(()=>setRuleMessage('当前未连接规则服务，未使用过期阈值判断许可。'))},[])
  const requestVersion = useRef(0)
  const productRequest = useRef<AbortController|null>(null)
  const [saved, setSaved] = useState(load)
  const [screen, setScreen] = useState<Screen>(()=>hashScreens[location.hash]??(saved||fitting.draft.allowSave?'home':'welcome')), [modules, setModules] = useState<ModuleId[]>(saved?.modules ?? [])
  useEffect(()=>{const navigate=()=>{const next=hashScreens[location.hash];if(next){if(next==='living-service'){const item=livingEntries.find(item=>'#aid-'+item.id===location.hash);if(item)setServiceTool(item.id)}if(next==='living-scene'){const scene=livingScenes.find(item=>'#scene-'+item.id===location.hash);if(scene)setLivingScene(scene.id)}if(next==='support-tool'){const tool=supportTools.find(tool=>'#aid-'+tool.id===location.hash);if(tool)setSupportTool(tool.id)}setScreen(next)}};window.addEventListener('hashchange',navigate);return()=>window.removeEventListener('hashchange',navigate)},[])
  const [consent, setConsent] = useState<ConsentState>(saved?.consent ?? 'undecided'), [privacy, setPrivacy] = useState<PrivacyPreferences>(saved?.privacy ?? initialPrivacy)
  const [devices, setDevices] = useState<Device[]>(saved?.devices ?? []), [journey, setJourney] = useState<JourneyData>(saved?.journey ?? initialJourney)
  const [settings, setSettings] = useState<AppSettings>(saved?.settings ?? defaultSettings), [customModes, setCustomModes] = useState<CustomTravelMode[]>(saved?.customModes ?? []), [customDevices, setCustomDevices] = useState<CustomTravelDevice[]>(saved?.customDevices ?? [])
  const [feedback, setFeedback] = useState<Feedback[]>(saved?.feedback ?? []), [storageError, setStorageError] = useState(''), [savedAt, setSavedAt] = useState<number | null>(saved?.savedAt ?? null)
  const [help, setHelp] = useState(false), [needs, setNeeds] = useState(false), [report, setReport] = useState<string | null>(null)
  const [intakeDraft,setIntakeDraft]=useState<IntakeDraft|null>(null),[assistantDevice,setAssistantDevice]=useState('*')
  const [shoppingQuery, setShoppingQuery] = useState('电动轮椅')
  const [product, setProduct] = useState<ProductAnalysis>(productAnalysis), [productInput, setProductInput] = useState<'link' | 'image'>('link'), [productValue, setProductValue] = useState(''), [productLoading, setProductLoading] = useState(false), [productError, setProductError] = useState('')
  const [travelEntryStep,setTravelEntryStep]=useState<1|2|3>(1)
  const [travelMode, setTravelMode] = useState('rail'), [selected, setSelected] = useState<string[]>([]), [specs, setSpecs] = useState<Record<string, TravelDeviceSpecs>>({}), [context, setContext] = useState<TravelContext>({ carrier: 'unspecified' }), [results, setResults] = useState<TravelCheckResult[]>([]), [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const allDevices = useMemo(() => [...devices.map(device => journey.cards.find(card => card.id === device.id) ?? device), ...journey.cards.filter(card => !devices.some(device => device.id === card.id))], [devices, journey.cards])

  const evidencePack=useMemo(()=>packEvidence(assistantEvidence(assistantContext==='product'?product:undefined,assistantContext==='travel'?results.filter(item=>assistantDevice==='*'||item.deviceId===assistantDevice):[])),[assistantContext,product,results,assistantDevice])
  const assistantKey=assistantContext==='product'?'product:'+product.id+':'+product.insight?.selectedModel:assistantContext==='travel'?'travel:'+assistantDevice+':'+results.map(item=>item.deviceId+item.summary+item.updatedAt).join('|'):'none'
  const contextLabel=assistantContext==='product'?product.title:assistantContext==='travel'?assistantDevice==='*'?'本次出行的全部设备':results.find(item=>item.deviceId===assistantDevice)?.deviceName??'当前设备':'尚未选择资料'
  useEffect(() => {
    try {
      if (consent !== 'granted') { localStorage.removeItem(STORAGE_KEY); setSavedAt(null); return }
      const snapshot = scopeSnapshot({ modules, devices, consent, settings, customModes, customDevices, journey, privacy, feedback })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); setSavedAt(snapshot.savedAt); setStorageError('')
    } catch { setStorageError('浏览器保存失败，资料目前仅在本次运行中可用。请导出需要的资料，或释放浏览器存储空间。') }
  }, [consent, modules, devices, settings, customModes, customDevices, journey, privacy, feedback])
  useEffect(() => {
    document.body.classList.toggle('large-text', Boolean(settings.largeText))
    document.body.classList.toggle('reduce-motion', Boolean(settings.reducedMotion))
    if (!settings.readAloud) stopReading()
  }, [settings])
  useEffect(() => {
    const route:Partial<Record<Screen,string>>={home:'home','fitting-workspace':'fitting','fit-shopping':'compare','product-input':'shop','product-result':'shop','travel-input':'travel','travel-result':'travel','life-tools':'daily',assistant:'assistant',welcome:'welcome',support:'support','support-tool':'aid-'+supportTool,'living-hub':'services','living-service':'aid-'+serviceTool,'living-scene':'scene-'+livingScene}
    if(route[screen])history.replaceState(null,'','#'+route[screen])
    window.scrollTo({ top: 0, behavior: 'instant' }); const pageHeading = document.querySelector<HTMLElement>('h1'); if (pageHeading) { pageHeading.tabIndex = -1; pageHeading.focus() }
    if (settings.readAloud) { const heading = document.querySelector('h1'); if (heading) readText(heading.textContent ?? '', settings.elderMode ? .8 : 1) }
    return stopReading
  }, [screen, supportTool, serviceTool, livingScene, settings.readAloud, settings.textOnly, settings.elderMode])
  const updateLife = (updater: LifeData | ((current: LifeData) => LifeData)) => setJourney(current => { const life = typeof updater === 'function' ? updater(current.life) : updater; return { ...current, life, living: { ...current.living, doorCm: life.home.doorCm, elevatorDoorCm: life.home.elevatorDoorCm } } })
  const saveCard = (input: DeviceCard) => {
    const v = input.values
    const card: DeviceCard = { ...input, dimensions: [v.lengthCm ?? '?', v.widthCm ?? '?', v.heightCm ?? '?'].join(' × ') + ' cm', weight: v.weightKg ? v.weightKg + ' kg' : '', battery: v.batteryType === 'none' ? '无' : v.batteryWh ? v.batteryWh + ' Wh' : '' }
    setJourney(current => ({ ...current, cards: [...current.cards.filter(item => item.id !== card.id), card] }))
    setSpecs(current => ({ ...current, [card.id]: confirmedSpecs(card) }))
    if (!card.prospective) setDevices(current => [...current.filter(item => item.id !== card.id), card])
    setResults([]); setChecklist([])
  }
  const travelWithCard = (card: DeviceCard) => { setSelected([card.id]); setSpecs(current => ({ ...current, [card.id]: confirmedSpecs(card) })); setTravelEntryStep(1);setScreen('travel-input') }
  const selectDevices = (ids: string[]) => { setSelected(ids); setSpecs(current => ({ ...Object.fromEntries(ids.map(id => { const device = allDevices.find(item => item.id === id); return [id, current[id] ?? (device ? confirmedSpecs(journey.cards.find(card => card.id === id) ?? deviceCard(device)) : {})] })) })) }
  const removeDevice = async (id: string) => {
    try{for(const item of journey.shares.filter(item=>item.serverId&&item.ownerToken))await service('shares/'+item.serverId+'/owner',undefined,item.ownerToken,undefined,'DELETE')}catch(error){setStorageError('分享删除未完成，已保留管理凭据。'+(error as Error).message);throw error}
    setDevices(current => current.filter(item => item.id !== id)); setSelected(current => current.filter(item => item !== id)); setSpecs(current => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id))); setResults([]); setChecklist([])
    setJourney(current => ({ ...current, cards: current.cards.filter(item => item.id !== id), life: { ...current.life, care: current.life.care.filter(item => item.deviceId !== id), emergency: { ...current.life.emergency, medicalIds: current.life.emergency.medicalIds?.filter(key => key !== id) } }, packet: null, records: [], shares: [] }))
  }
  const deleteScope = async (scope: 'profile' | 'devices' | 'life' | 'all') => {
    if(scope==='profile'||scope==='all')fitting.clear()
    if(scope==='life'||scope==='all')for(const item of journey.life.helpSessions??[]){if(item.lastStatus!=='revoked')await service('help/'+item.id+'/owner',undefined,item.ownerToken,undefined,'DELETE')}
    if(scope!=='profile'){for(const share of journey.shares.filter(item=>item.serverId&&item.ownerToken)){await service('shares/'+share.serverId+'/owner',undefined,share.ownerToken,undefined,'DELETE')}if(scope==='life'||scope==='all')for(const item of feedback.filter(item=>item.serverId&&item.accessToken)){await service('cases/'+item.serverId,undefined,item.accessToken,undefined,'DELETE')}}
    requestVersion.current++; productRequest.current?.abort(); setProductLoading(false); setSaved(null)
    if (scope === 'profile' || scope === 'all') { setModules([]); setPrivacy(current => ({ ...current, profile: false })) }
    if (scope === 'devices' || scope === 'all') { setDevices([]); setCustomDevices([]); setSelected([]); setSpecs({}); setResults([]); setChecklist([]); setProduct(productAnalysis);setIntakeDraft(null);setAssistantContext('none');setAssistantDevice('*'); setProductValue(''); setJourney(current => ({ ...current, cards: [], comparisons: [], records: [], packet: null, shares: [], life: { ...current.life, care: [], emergency: { ...current.life.emergency, medicalIds: [] } } })); setPrivacy(current => ({ ...current, devices: false })) }
    if (scope === 'life' || scope === 'all') {setAssistantContext(product.insight?'product':'none');setAssistantDevice('*');setProduct(current=>({...current,insight:current.insight?{...current.insight,needs:initialNeeds()}:undefined})); const base = initialJourney(); setJourney(current => ({ ...base, cards: current.cards, comparisons: current.comparisons.map(item=>({...item,insight:item.insight?{...item.insight,needs:initialNeeds()}:undefined})) })); setFeedback([]); setCustomModes([]); setChecklist([]); setResults([]); setContext({ carrier: 'unspecified' }); setPrivacy(current => ({ ...current, life: false })) }
    if (scope === 'all') { stopReading(); setJourney(initialJourney()); setSettings(defaultSettings()); setConsent('undecided'); setPrivacy(initialPrivacy()); setScreen('welcome'); setHelp(false); setNeeds(false); setReport(null); setProductInput('link'); setProductError(''); setShoppingQuery('电动轮椅'); setTravelMode('rail'); try { localStorage.removeItem(STORAGE_KEY) } catch { setStorageError('浏览器拒绝删除保存数据，请在浏览器设置中清除本网站数据。') } }
  }
  const cancelProduct = () => { requestVersion.current++; productRequest.current?.abort(); setProductLoading(false);setAiProgress('') }
  const runProduct = async (sources:ProductSource[],mode:'ai'|'browser'|'local'|'sample') => {
    productRequest.current?.abort(); const controller = new AbortController(); productRequest.current=controller
    const version=++requestVersion.current; setProductError('');setAiProgress(''); setProductLoading(true)
    const revisingProduct=screen==='product-result'
    const needs=revisingProduct&&product.insight?product.insight.needs:{...initialNeeds(),doorCm:journey.life.home.doorCm,elevatorDoorCm:journey.life.home.elevatorDoorCm,liftKg:journey.living.liftKg,canFold:journey.living.canFold}
    try {
      const progress=(message:string)=>{if(version===requestVersion.current)setAiProgress(message)}
      const result=mode==='ai'?await analyzeSources(sources,controller.signal,progress):mode==='browser'?await analyzeInBrowser(sources,progress,controller.signal):localAnalysis(sources,mode,needs)
      if(version===requestVersion.current) { const next={...result,id:revisingProduct?product.id:result.id,insight:result.insight?{...result.insight,needs:revisingProduct||['wheelchair','manual-wheelchair','mobility-scooter','walker','rollator'].includes(result.deviceType??'')?needs:initialNeeds()}:undefined}; setProduct(revisingProduct?preserveConfirmations(product,next):next); setAssistantContext('product');setAssistantDevice('*');setScreen('product-result'); return true }
    } catch(error) { if(version===requestVersion.current&&(error as Error).name!=='AbortError')setProductError((error as Error).message) }
    finally { if(version===requestVersion.current){setProductLoading(false);setAiProgress('')} }
    return false
  }
  const runTravel = () => { const options = travelOptions(allDevices, customDevices); const chosen = selected.map(id => options.find(item => item.id === id)).filter((item): item is typeof options[number] => Boolean(item)); setResults(buildTravelResults(travelMode, chosen, specs, context, ruleDocuments)); setChecklist([]);setAssistantContext('travel');setAssistantDevice('*');setScreen('travel-result') }
  const openService=(id:ServiceToolId)=>{setServiceTool(id);setScreen('living-service')}
  const openScene=(id:SceneId)=>{setLivingScene(id);setScreen('living-scene')}
  const updateServices=(update:LivingServicesData|((current:LivingServicesData)=>LivingServicesData))=>updateLife(current=>({...current,services:typeof update==='function'?update(current.services??initialLivingServices()):update}))
  const openSupportTool=(id:SupportToolId)=>{if(livingEntries.some(item=>item.id===id)){openService(id as ServiceToolId);return}if(id==='help'){setHelp(true);return}if(id==='needs'){setNeeds(true);return}if(id==='life'){setScreen('life-tools');return}setSupportTool(id);setScreen('support-tool')}
  const serviceAction=(id:SupportToolId|'fitting'|'shop'|'travel')=>{if(id==='fitting')setScreen('fitting-workspace');else if(id==='shop')setScreen('product-input');else if(id==='travel'){setTravelEntryStep(1);setScreen('travel-input')}else openSupportTool(id)}
  const encouragementContext:EncouragementContext|null=screen==='home'?'home':screen==='living-hub'?'services':screen==='living-scene'?'scene':screen==='living-service'&&serviceTool==='healthcare'?'hospital':screen==='fitting-workspace'?'fitting':null
  const toggleSetting = (key: keyof AppSettings) => setSettings(current => ({ ...current, [key]: !current[key], ...(key === 'elderMode' ? { largeText: !current.elderMode, stepMode: !current.elderMode, reducedMotion: !current.elderMode } : {}) }))
  const changePrivacy = async (value: PrivacyPreferences) => { try{if(!value.life){for(const item of journey.life.helpSessions??[]){if(item.lastStatus!=='revoked')await service('help/'+item.id+'/owner',undefined,item.ownerToken,undefined,'DELETE')}for(const item of journey.shares.filter(item=>item.serverId&&item.ownerToken))await service('shares/'+item.serverId+'/owner',undefined,item.ownerToken,undefined,'DELETE');for(const item of feedback.filter(item=>item.serverId&&item.accessToken))await service('cases/'+item.serverId,undefined,item.accessToken,undefined,'DELETE');setJourney(current=>({...current,shares:[],life:{...current.life,helpSessions:(current.life.helpSessions??[]).map(item=>({...item,lastStatus:'revoked' as const}))}}));setFeedback(current=>current.filter(item=>!item.serverId))}setPrivacy(value); setConsent('granted')}catch(error){setStorageError('服务端删除未完成，已保留原保存选择和管理凭据。'+(error as Error).message)} }
  return <main className={`app-shell ${settings.elderMode ? 'elder-mode' : ''} ${screen==='fitting-workspace'?'fit-wide-shell':''}`}><a className="skip-content" href="#main-content">跳到主要内容</a><div className="app-frame" id="main-content">
    {['home','fitting-workspace','fit-shopping','product-input','product-result','travel-input','travel-result'].includes(screen)&&<FeatureNav active={screen==='home'?'home':screen==='fitting-workspace'?'fitting':screen.startsWith('travel')?'travel':'shop'} onHome={()=>setScreen('home')} onFitting={()=>setScreen('fitting-workspace')} onShop={()=>setScreen('product-input')} onTravel={()=>{setTravelEntryStep(1);setScreen('travel-input')}}/>}
    {isStudio&&<aside className="prototype-note" aria-label="在线体验与资料处理说明"><strong>魔搭创空间 · 在线体验</strong><p>商品与图像AI由创空间服务端开源模型处理，无需模型API密钥。仅在你同意后发送本次资料；个人档案默认留在此浏览器。请勿上传病历、证件等敏感资料。</p></aside>}
    <ReminderNotice rows={journey.life.assistance?.reminders??[]} onOpen={()=>openSupportTool('reminders')}/>
    {document.getElementById('portable-data')&&<p className="prototype-note">独立文件中的资料仅在本次运行使用；如需保存到此浏览器，请在“我的”中单独授权。</p>}
    {screen === 'welcome' && <Welcome onSelect={() => setScreen('select')} />}
    {(screen === 'select' || screen === 'switch-modules') && <SelectSituation modules={modules} toggleModule={id => setModules(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])} onNext={() => { setScreen(screen === 'switch-modules' ? 'profile' : 'consent') }} onBack={() => setScreen(screen === 'switch-modules' ? 'profile' : 'welcome')} title={screen === 'switch-modules' ? '切换版块' : undefined} />}
    {screen === 'consent' && <Consent modules={modules} privacy={privacy} setPrivacy={setPrivacy} onConsent={() => { setConsent('granted'); setScreen('devices') }} onSkip={() => { setConsent('skipped'); setPrivacy(initialPrivacy()); setScreen('devices') }} onBack={() => setScreen('select')} />}
    {(screen === 'devices' || screen === 'device-cards') && <Equipment devices={allDevices} cards={journey.cards} onSave={saveCard} onRemove={removeDevice} onTravel={travelWithCard} onBack={() => setScreen(screen === 'devices' ? 'home' : 'profile')} />}
    {screen === 'home' && <Home modules={modules} settings={settings} devices={allDevices} toggleSetting={toggleSetting} onFitting={()=>setScreen('fitting-workspace')} onProduct={()=>setScreen('product-input')} onTravel={()=>{setTravelEntryStep(1);setScreen('travel-input')}} onAssistant={() => setScreen('assistant')} onProfile={() => setScreen('profile')} onLifeTools={() => setScreen('support')} onScene={openScene} onServices={()=>setScreen('living-hub')} profileSaved={consent==='granted'&&privacy.profile} onChoose={()=>setChooseNeeds(true)} onTool={openSupportTool} onHelp={() => setHelp(true)} onNeeds={() => setNeeds(true)} />}
    {screen==='living-hub'&&<LivingHub onBack={()=>setScreen('home')} onScene={openScene} onTool={openService}/>}
    {screen==='living-scene'&&<ScenePage scene={livingScene} checked={journey.life.sceneProgress?.[livingScene]??[]} onChecked={checked=>updateLife(current=>({...current,sceneProgress:{...current.sceneProgress,[livingScene]:checked}}))} onAction={serviceAction} onBack={()=>setScreen('living-hub')} saved={consent==='granted'&&privacy.life}/>}
    {screen==='living-service'&&(serviceTool==='live-help'?<section className="screen living-services-page support-tool-page"><PageHeader title="限时求助" subtitle="范围、对象和有效期由你决定" onBack={()=>setScreen('living-hub')}/><LiveHelp records={journey.life.helpSessions??[]} onRecordsChange={helpSessions=>updateLife(current=>({...current,helpSessions}))}/></section>:<LivingServicesPage key={serviceTool} tool={serviceTool} data={journey.life.services??initialLivingServices()} onChange={updateServices} onTool={serviceAction} onBack={()=>setScreen('living-hub')} saved={consent==='granted'&&privacy.life} mapSlot={<FacilityMap facilities={journey.life.services?.facilities??[]} onSave={record=>updateServices(current=>({...current,facilities:current.facilities.some(item=>item.id===record.id)?current.facilities.map(item=>item.id===record.id?{...item,source:record.source,notes:(item.notes+'\n地图来源已重新读取，现场核实结果保留。').slice(0,1500)}:item):[...current.facilities,record]}))}/>}/>) }
    {screen==='support'&&<SupportHub modules={modules} onToggle={id=>setModules(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])} onChoose={()=>setChooseNeeds(true)} onTool={openSupportTool} onBack={()=>setScreen('home')} saved={consent==='granted'&&privacy.profile}/>}
    {screen==='support-tool'&&<SupportToolPage key={supportTool} tool={supportTool} life={journey.life} setLife={updateLife} saved={consent==='granted'&&privacy.life} onBack={()=>setScreen('support')} onPrivacy={()=>setScreen('profile')} onHelp={()=>setHelp(true)}/>}
    {screen==='fitting-workspace'&&<FittingWorkspace draft={fitting.draft} setDraft={fitting.setDraft} saveStatus={fitting.saveStatus} onClear={fitting.clear} onBack={()=>setScreen('home')} onAssistant={()=>setScreen('assistant')} onProfile={()=>setScreen('profile')} onShop={()=>setScreen('fit-shopping')} onTravel={()=>{setTravelEntryStep(1);setScreen('travel-input')}}/>}
    {screen==='fit-shopping'&&<section className="screen fitting-workspace fit-shopping-page"><h1 tabIndex={-1}>比较辅具款式</h1><FitShopping draft={fitting.draft} setDraft={fitting.setDraft} products={[...journey.comparisons,...(product.insight?[product]:[])]} onFitting={()=>setScreen('fitting-workspace')} onAnalyze={()=>setScreen('product-input')}/><button onClick={()=>setScreen('product-input')}>返回商品解读</button></section>}
    {screen === 'product-input' && <div className="shopping-page"><div className="shopping-compare-entry"><button onClick={()=>setScreen('fit-shopping')}>比较候选款式与我的尺寸</button><p>已保存的试配尺寸会保留，无需重新填写。</p></div><ProductIntake progress={aiProgress} draft={intakeDraft} onDraftChange={setIntakeDraft} initialQuery={shoppingQuery} initialSources={product.insight?.sources} loading={productLoading} error={productError} onAnalyze={runProduct} onCancel={cancelProduct} onBack={() => setScreen('home')} /></div>}
    {screen === 'product-result' && <ProductInsightView key={product.id} product={product} setProduct={setProduct} journey={journey} devices={allDevices} setJourney={setJourney} onSaveCard={saveCard} onAssistant={()=>{setAssistantContext('product');setScreen('assistant')}} onReport={() => setReport('商品解读：' + product.title)} onBack={() => setScreen('product-input')} onCards={() => setScreen('device-cards')} onTravel={card => { saveCard(card); travelWithCard(card) }} onReanalyze={runProduct} onCancel={cancelProduct} loading={productLoading} error={productError} stepMode={settings.stepMode} />}
    {screen === 'travel-input' && <TravelQuery initialStep={travelEntryStep} coverage={<TravelCoverage mode={travelMode} context={context} documents={ruleDocuments} loading={ruleLoading} message={ruleMessage} onRefresh={async()=>{setRuleLoading(true);try{await prepareService();const data=await service<{documents:RuleDocument[]}>('rules/refresh',{});setRuleDocuments(data.documents);setRuleMessage('来源核验完成，各条状态见下方及结果页。')}catch(error){setRuleMessage((error as Error).message)}finally{setRuleLoading(false)}}}/>} mode={travelMode} setMode={value => { setTravelMode(value); setChecklist([]) }} devices={allDevices} customModes={customModes} setCustomModes={setCustomModes} customDevices={customDevices} setCustomDevices={setCustomDevices} selected={selected} setSelected={selectDevices} specs={specs} setSpecs={setSpecs} context={context} setContext={setContext} stepMode={settings.stepMode} loading={false} onRemember={(device, value) => saveCard(rememberTravelSpecs(journey.cards.find(card => card.id === device.id) ?? deviceCard(device), value))} onStart={()=>runTravel()} onBack={() => setScreen('home')} />}
    {screen === 'travel-result' && <TravelResultPage onSupplement={()=>{setTravelEntryStep(3);setScreen('travel-input')}} onAssistant={()=>{setAssistantContext('travel');setScreen('assistant')}} mode={travelMode} results={results} checklist={checklist} setChecklist={setChecklist} journey={journey} setJourney={setJourney} devices={travelOptions(allDevices, customDevices).filter(item => selected.includes(item.id))} specs={specs} context={context} onBack={() => {setTravelEntryStep(3);setScreen('travel-input')}} onHelp={() => setHelp(true)} onReport={() => setReport('出行检查：' + results.map(item => item.deviceName).join('、'))} onOffline={() => setScreen('offline-pack')} stepMode={settings.stepMode} />}
    {screen === 'assistant' && <AssistantPage onProduct={query => { setShoppingQuery(query); setScreen('product-input') }} readAloud={settings.readAloud} preferBrowser={product.insight?.engine==='webllm'} evidence={evidencePack.items} contextKey={assistantKey} contextLabel={contextLabel} omitted={evidencePack.omitted} evidenceTotal={evidencePack.total} requiresNarrowing={evidencePack.requiresNarrowing} contextControls={<section className="task-panel"><label>本次解释哪份资料<select value={assistantContext} onChange={e=>{setAssistantContext(e.target.value as typeof assistantContext);setAssistantDevice('*')}}><option value="none">只做流程引导，不使用商品或出行资料</option>{product.insight&&<option value="product">最近的商品：{product.title}</option>}{results.length>0&&<option value="travel">最近的出行检查</option>}</select></label>{assistantContext==='travel'&&results.length>1&&<label>解释哪台设备<select value={assistantDevice} onChange={e=>setAssistantDevice(e.target.value)}><option value="*">全部设备（超出依据限制时需选择单台）</option>{results.map(item=><option key={item.deviceId} value={item.deviceId}>{item.deviceName}</option>)}</select></label>}</section>} onBack={() => setScreen('home')} onTravel={slots => { if (slots.mode) setTravelMode(slots.mode); const option = travelOptions(allDevices, customDevices).find(item => slots.device && item.name.includes(slots.device)); selectDevices(option ? [option.id] : []); setTravelEntryStep(1);setScreen('travel-input') }} />}
    {encouragementContext&&<div className="page-encouragement"><Encouragement context={encouragementContext} enabled={settings.encouragement!==false} onDismiss={()=>setSettings(current=>({...current,encouragement:false}))}/></div>}
    {screen === 'profile' && <ProfilePage onImportManagement={(cases,shares)=>{setFeedback(current=>[...current,...cases.filter(item=>!current.some(row=>row.serverId===item.serverId))]);setJourney(current=>({...current,shares:[...current.shares,...shares.filter(item=>!current.shares.some(row=>row.serverId===item.serverId))]}))}} modules={modules} devices={allDevices} journey={journey} consent={consent} privacy={privacy} settings={settings} feedback={feedback} storageError={storageError} savedAt={savedAt} onBack={() => setScreen('home')} onModules={() => setScreen('switch-modules')} onDevices={() => setScreen('device-cards')} onCards={() => setScreen('device-cards')} onLife={() => setScreen('life-tools')} onOffline={() => setScreen('offline-pack')} onNeeds={() => setNeeds(true)} onPrivacy={changePrivacy} onDelete={deleteScope} />}
    {screen === 'life-tools' && <LifeTools saved={consent==='granted'&&privacy.life} onPrivacy={()=>setScreen('profile')} life={journey.life} setLife={updateLife} journey={journey} setJourney={setJourney} devices={allDevices} onBack={() => setScreen('home')} onHelp={() => setHelp(true)} onOffline={() => setScreen('offline-pack')} />}
    {screen === 'offline-pack' && <OfflineWorkspace journey={journey} devices={allDevices} onBack={() => setScreen('profile')} />}
    {productLoading&&aiProgress&&screen==='product-result'&&<p className="operation-status" role="status">{aiProgress}</p>}
    {['home','support','living-hub'].includes(screen)&&<nav className="support-bottom-nav" aria-label="底部导航"><button aria-current={screen==='home'?'page':undefined} onClick={()=>setScreen('home')}><Icon name="heart"/>首页</button><button aria-current={screen==='support'?'page':undefined} onClick={()=>setScreen('support')}><Icon name="list"/>辅助中心</button><button aria-current={screen==='living-hub'?'page':undefined} onClick={()=>setScreen('living-hub')}><Icon name="heart"/>生活</button><button onClick={()=>setScreen('profile')}><Icon name="user"/>我的</button></nav>}
    {storageError && screen !== 'profile' && <p className="storage-error" role="alert">{storageError}</p>}
  </div>
    {chooseNeeds&&<NeedsPicker modules={modules} onApply={setModules} onClose={()=>setChooseNeeds(false)}/>}
    {help && <HelpCard life={journey.life} setLife={updateLife} devices={allDevices} onClose={() => setHelp(false)} />}
    {needs && <NeedsDialog settings={settings} setSettings={setSettings} onClose={() => setNeeds(false)} />}
    {report && <FeedbackDialog subject={report} onSave={item => setFeedback(current => [...current, item])} onClose={() => setReport(null)} />}
  </main>
}



