import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, PrimaryButton } from './components/UI'
import { isStudio } from './app/deployment'
import { Welcome, SelectSituation, Consent, Home } from './features/Basics'
import { TravelQuery, travelOptions } from './features/TravelQuery'
import { TravelResultPage } from './features/Results'
import { AssistantPage } from './features/Assistant'
import { HelpCard } from './features/HelpCard'
import { Equipment } from './features/Equipment'
import { FeedbackDialog } from './features/Feedback'
import { LifeTools } from './features/LifeWorkspace'
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

const defaultSettings = (): AppSettings => ({ elderMode: false, stepMode: false, readAloud: false, largeText: false, textOnly: false, voiceInput:true, reducedMotion: false })
function load() { try { const portable=document.getElementById('portable-data');if(portable){const data=readSnapshot(portable.textContent);return data?{...data,consent:'skipped' as const}:null}return readSnapshot(localStorage.getItem(STORAGE_KEY)) } catch { return null } }
export default function App() {
  const [ruleDocuments,setRuleDocuments]=useState<RuleDocument[]>(ruleCatalog),[ruleMessage,setRuleMessage]=useState(''),[ruleLoading,setRuleLoading]=useState(false),[assistantContext,setAssistantContext]=useState<'product'|'travel'|'none'>('none'),[aiProgress,setAiProgress]=useState('')
  useEffect(()=>{service<{documents:RuleDocument[]}>('rules').then(value=>setRuleDocuments(value.documents)).catch(()=>setRuleMessage('当前未连接规则服务，未使用过期阈值判断许可。'))},[])
  const requestVersion = useRef(0)
  const productRequest = useRef<AbortController|null>(null)
  const [saved, setSaved] = useState(load)
  const [screen, setScreen] = useState<Screen>(saved ? 'home' : 'welcome'), [modules, setModules] = useState<ModuleId[]>(saved?.modules ?? [])
  const [consent, setConsent] = useState<ConsentState>(saved?.consent ?? 'undecided'), [privacy, setPrivacy] = useState<PrivacyPreferences>(saved?.privacy ?? initialPrivacy)
  const [devices, setDevices] = useState<Device[]>(saved?.devices ?? []), [journey, setJourney] = useState<JourneyData>(saved?.journey ?? initialJourney)
  const [settings, setSettings] = useState<AppSettings>(saved?.settings ?? defaultSettings), [customModes, setCustomModes] = useState<CustomTravelMode[]>(saved?.customModes ?? []), [customDevices, setCustomDevices] = useState<CustomTravelDevice[]>(saved?.customDevices ?? [])
  const [feedback, setFeedback] = useState<Feedback[]>(saved?.feedback ?? []), [storageError, setStorageError] = useState(''), [savedAt, setSavedAt] = useState<number | null>(saved?.savedAt ?? null)
  const [help, setHelp] = useState(false), [needs, setNeeds] = useState(false), [report, setReport] = useState<string | null>(null), [voiceDemo, setVoiceDemo] = useState(false), [voiceConfirm, setVoiceConfirm] = useState<'idle' | 'confirm'>('idle')
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
    window.scrollTo({ top: 0, behavior: 'instant' }); const pageHeading = document.querySelector<HTMLElement>('h1'); if (pageHeading) { pageHeading.tabIndex = -1; pageHeading.focus() }
    if (settings.readAloud) { const heading = document.querySelector('h1'); if (heading) readText(heading.textContent ?? '', settings.elderMode ? .8 : 1) }
    return stopReading
  }, [screen, settings.readAloud, settings.textOnly, settings.elderMode])
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
    if(scope!=='profile'){for(const share of journey.shares.filter(item=>item.serverId&&item.ownerToken)){await service('shares/'+share.serverId+'/owner',undefined,share.ownerToken,undefined,'DELETE')}if(scope==='life'||scope==='all')for(const item of feedback.filter(item=>item.serverId&&item.accessToken)){await service('cases/'+item.serverId,undefined,item.accessToken,undefined,'DELETE')}}
    requestVersion.current++; productRequest.current?.abort(); setProductLoading(false); setSaved(null)
    if (scope === 'profile' || scope === 'all') { setModules([]); setPrivacy(current => ({ ...current, profile: false })) }
    if (scope === 'devices' || scope === 'all') { setDevices([]); setCustomDevices([]); setSelected([]); setSpecs({}); setResults([]); setChecklist([]); setProduct(productAnalysis);setIntakeDraft(null);setAssistantContext('none');setAssistantDevice('*'); setProductValue(''); setJourney(current => ({ ...current, cards: [], comparisons: [], records: [], packet: null, shares: [], life: { ...current.life, care: [], emergency: { ...current.life.emergency, medicalIds: [] } } })); setPrivacy(current => ({ ...current, devices: false })) }
    if (scope === 'life' || scope === 'all') {setAssistantContext(product.insight?'product':'none');setAssistantDevice('*');setProduct(current=>({...current,insight:current.insight?{...current.insight,needs:initialNeeds()}:undefined})); const base = initialJourney(); setJourney(current => ({ ...base, cards: current.cards, comparisons: current.comparisons.map(item=>({...item,insight:item.insight?{...item.insight,needs:initialNeeds()}:undefined})) })); setFeedback([]); setCustomModes([]); setChecklist([]); setResults([]); setContext({ carrier: 'unspecified' }); setPrivacy(current => ({ ...current, life: false })) }
    if (scope === 'all') { stopReading(); setJourney(initialJourney()); setSettings(defaultSettings()); setConsent('undecided'); setPrivacy(initialPrivacy()); setScreen('welcome'); setHelp(false); setNeeds(false); setReport(null); setVoiceDemo(false); setVoiceConfirm('idle'); setProductInput('link'); setProductError(''); setShoppingQuery('电动轮椅'); setTravelMode('rail'); try { localStorage.removeItem(STORAGE_KEY) } catch { setStorageError('浏览器拒绝删除保存数据，请在浏览器设置中清除本网站数据。') } }
  }
  const cancelProduct = () => { requestVersion.current++; productRequest.current?.abort(); setProductLoading(false);setAiProgress('') }
  const runProduct = async (sources:ProductSource[],mode:'ai'|'browser'|'local'|'sample') => {
    productRequest.current?.abort(); const controller = new AbortController(); productRequest.current=controller
    const version=++requestVersion.current; setProductError('');setAiProgress(''); setProductLoading(true)
    const needs=screen==='product-result'&&product.insight?product.insight.needs:{...initialNeeds(),doorCm:journey.life.home.doorCm,elevatorDoorCm:journey.life.home.elevatorDoorCm,liftKg:journey.living.liftKg,canFold:journey.living.canFold}
    try {
      const progress=(message:string)=>{if(version===requestVersion.current)setAiProgress(message)}
      const result=mode==='ai'?await analyzeSources(sources,controller.signal,progress):mode==='browser'?await analyzeInBrowser(sources,progress,controller.signal):localAnalysis(sources,mode,needs)
      if(version===requestVersion.current) { const next={...result,id:screen==='product-result'?product.id:result.id,insight:result.insight?{...result.insight,needs:screen==='product-result'||['wheelchair','manual-wheelchair','mobility-scooter','walker','rollator'].includes(result.deviceType??'')?needs:initialNeeds()}:undefined}; setProduct(screen==='product-result'?preserveConfirmations(product,next):next); setAssistantContext('product');setAssistantDevice('*');setScreen('product-result'); return true }
    } catch(error) { if(version===requestVersion.current&&(error as Error).name!=='AbortError')setProductError((error as Error).message) }
    finally { if(version===requestVersion.current){setProductLoading(false);setAiProgress('')} }
    return false
  }
  const runTravel = () => { const options = travelOptions(allDevices, customDevices); const chosen = selected.map(id => options.find(item => item.id === id)).filter((item): item is typeof options[number] => Boolean(item)); setResults(buildTravelResults(travelMode, chosen, specs, context, ruleDocuments)); setChecklist([]);setAssistantContext('travel');setAssistantDevice('*'); setScreen('travel-result') }
  const toggleSetting = (key: keyof AppSettings) => setSettings(current => ({ ...current, [key]: !current[key], ...(key === 'elderMode' ? { largeText: !current.elderMode, stepMode: !current.elderMode, reducedMotion: !current.elderMode } : {}) }))
  const changePrivacy = async (value: PrivacyPreferences) => { try{if(!value.life){for(const item of journey.shares.filter(item=>item.serverId&&item.ownerToken))await service('shares/'+item.serverId+'/owner',undefined,item.ownerToken,undefined,'DELETE');for(const item of feedback.filter(item=>item.serverId&&item.accessToken))await service('cases/'+item.serverId,undefined,item.accessToken,undefined,'DELETE');setJourney(current=>({...current,shares:[]}));setFeedback(current=>current.filter(item=>!item.serverId))}setPrivacy(value); setConsent('granted')}catch(error){setStorageError('服务端删除未完成，已保留原保存选择和管理凭据。'+(error as Error).message)} }
  return <main className={`app-shell ${settings.elderMode ? 'elder-mode' : ''}`}><a className="skip-content" href="#main-content">跳到主要内容</a><div className="app-frame" id="main-content">
    {isStudio&&<aside className="prototype-note" aria-label="在线体验与资料处理说明"><strong>魔搭创空间 · 在线体验</strong><p>商品AI由创空间服务端开源模型处理，无需模型API密钥。仅在你同意后发送本次资料；个人档案默认留在此浏览器。请勿上传病历、证件等敏感资料。</p></aside>}
    {document.getElementById('portable-data')&&<p className="prototype-note">独立文件中的资料仅在本次运行使用；如需保存到此浏览器，请在“我的”中单独授权。</p>}
    {screen === 'welcome' && <Welcome onSelect={() => { setVoiceConfirm('idle'); setScreen('select') }} onVoice={() => setVoiceDemo(true)} />}
    {(screen === 'select' || screen === 'switch-modules') && <SelectSituation modules={modules} toggleModule={id => setModules(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])} voiceState={voiceConfirm} onVoiceConfirm={() => setVoiceConfirm('idle')} onNext={() => { setScreen(screen === 'switch-modules' ? 'profile' : 'consent') }} onBack={() => setScreen(screen === 'switch-modules' ? 'profile' : 'welcome')} title={screen === 'switch-modules' ? '切换版块' : undefined} />}
    {screen === 'consent' && <Consent modules={modules} privacy={privacy} setPrivacy={setPrivacy} onConsent={() => { setConsent('granted'); setScreen('devices') }} onSkip={() => { setConsent('skipped'); setPrivacy(initialPrivacy()); setScreen('devices') }} onBack={() => setScreen('select')} />}
    {(screen === 'devices' || screen === 'device-cards') && <Equipment devices={allDevices} cards={journey.cards} onSave={saveCard} onRemove={removeDevice} onTravel={travelWithCard} onBack={() => setScreen(screen === 'devices' ? 'home' : 'profile')} />}
    {screen === 'home' && <Home modules={modules} settings={settings} devices={allDevices} toggleSetting={toggleSetting} onProduct={() => setScreen('product-input')} onTravel={() => {setTravelEntryStep(1);setScreen('travel-input')}} onAssistant={() => setScreen('assistant')} onProfile={() => setScreen('profile')} onLifeTools={() => setScreen('life-tools')} onHelp={() => setHelp(true)} onNeeds={() => setNeeds(true)} />}
    {screen === 'product-input' && <ProductIntake progress={aiProgress} draft={intakeDraft} onDraftChange={setIntakeDraft} initialQuery={shoppingQuery} initialSources={product.insight?.sources} loading={productLoading} error={productError} onAnalyze={runProduct} onCancel={cancelProduct} onBack={() => setScreen('home')} />}
    {screen === 'product-result' && <ProductInsightView key={product.id} product={product} setProduct={setProduct} journey={journey} devices={allDevices} setJourney={setJourney} onSaveCard={saveCard} onAssistant={()=>{setAssistantContext('product');setScreen('assistant')}} onReport={() => setReport('商品解读：' + product.title)} onBack={() => setScreen('product-input')} onCards={() => setScreen('device-cards')} onTravel={card => { saveCard(card); travelWithCard(card) }} onReanalyze={runProduct} onCancel={cancelProduct} loading={productLoading} error={productError} stepMode={settings.stepMode} />}
    {screen === 'travel-input' && <TravelQuery initialStep={travelEntryStep} coverage={<TravelCoverage mode={travelMode} context={context} documents={ruleDocuments} loading={ruleLoading} message={ruleMessage} onRefresh={async()=>{setRuleLoading(true);try{await prepareService();const data=await service<{documents:RuleDocument[]}>('rules/refresh',{});setRuleDocuments(data.documents);setRuleMessage('来源核验完成，各条状态见下方及结果页。')}catch(error){setRuleMessage((error as Error).message)}finally{setRuleLoading(false)}}}/>} mode={travelMode} setMode={value => { setTravelMode(value); setChecklist([]) }} devices={allDevices} customModes={customModes} setCustomModes={setCustomModes} customDevices={customDevices} setCustomDevices={setCustomDevices} selected={selected} setSelected={selectDevices} specs={specs} setSpecs={setSpecs} context={context} setContext={setContext} stepMode={settings.stepMode} loading={false} onRemember={(device, value) => saveCard(rememberTravelSpecs(journey.cards.find(card => card.id === device.id) ?? deviceCard(device), value))} onStart={runTravel} onBack={() => setScreen('home')} />}
    {screen === 'travel-result' && <TravelResultPage onSupplement={()=>{setTravelEntryStep(3);setScreen('travel-input')}} onAssistant={()=>{setAssistantContext('travel');setScreen('assistant')}} mode={travelMode} results={results} checklist={checklist} setChecklist={setChecklist} journey={journey} setJourney={setJourney} devices={travelOptions(allDevices, customDevices).filter(item => selected.includes(item.id))} specs={specs} context={context} onBack={() => {setTravelEntryStep(3);setScreen('travel-input')}} onHelp={() => setHelp(true)} onReport={() => setReport('出行检查：' + results.map(item => item.deviceName).join('、'))} onOffline={() => setScreen('offline-pack')} stepMode={settings.stepMode} />}
    {screen === 'assistant' && <AssistantPage onProduct={query => { setShoppingQuery(query); setScreen('product-input') }} readAloud={settings.readAloud} voiceInput={settings.voiceInput!==false} preferBrowser={product.insight?.engine==='webllm'} evidence={evidencePack.items} contextKey={assistantKey} contextLabel={contextLabel} omitted={evidencePack.omitted} evidenceTotal={evidencePack.total} requiresNarrowing={evidencePack.requiresNarrowing} contextControls={<section className="task-panel"><label>本次解释哪份资料<select value={assistantContext} onChange={e=>{setAssistantContext(e.target.value as typeof assistantContext);setAssistantDevice('*')}}><option value="none">只做流程引导，不使用商品或出行资料</option>{product.insight&&<option value="product">最近的商品：{product.title}</option>}{results.length>0&&<option value="travel">最近的出行检查</option>}</select></label>{assistantContext==='travel'&&results.length>1&&<label>解释哪台设备<select value={assistantDevice} onChange={e=>setAssistantDevice(e.target.value)}><option value="*">全部设备（超出依据限制时需选择单台）</option>{results.map(item=><option key={item.deviceId} value={item.deviceId}>{item.deviceName}</option>)}</select></label>}</section>} onBack={() => setScreen('home')} onTravel={slots => { if (slots.mode) setTravelMode(slots.mode); const option = travelOptions(allDevices, customDevices).find(item => slots.device && item.name.includes(slots.device)); selectDevices(option ? [option.id] : []); setTravelEntryStep(1);setScreen('travel-input') }} />}
    {screen === 'profile' && <ProfilePage onImportManagement={(cases,shares)=>{setFeedback(current=>[...current,...cases.filter(item=>!current.some(row=>row.serverId===item.serverId))]);setJourney(current=>({...current,shares:[...current.shares,...shares.filter(item=>!current.shares.some(row=>row.serverId===item.serverId))]}))}} modules={modules} devices={allDevices} journey={journey} consent={consent} privacy={privacy} settings={settings} feedback={feedback} storageError={storageError} savedAt={savedAt} onBack={() => setScreen('home')} onModules={() => setScreen('switch-modules')} onDevices={() => setScreen('device-cards')} onCards={() => setScreen('device-cards')} onLife={() => setScreen('life-tools')} onOffline={() => setScreen('offline-pack')} onNeeds={() => setNeeds(true)} onPrivacy={changePrivacy} onDelete={deleteScope} />}
    {screen === 'life-tools' && <LifeTools life={journey.life} setLife={updateLife} journey={journey} setJourney={setJourney} devices={allDevices} onBack={() => setScreen('home')} onHelp={() => setHelp(true)} onOffline={() => setScreen('offline-pack')} />}
    {screen === 'offline-pack' && <OfflineWorkspace journey={journey} devices={allDevices} onBack={() => setScreen('profile')} />}
    {productLoading&&aiProgress&&screen==='product-result'&&<p className="operation-status" role="status">{aiProgress}</p>}
    {storageError && screen !== 'profile' && <p className="storage-error" role="alert">{storageError}</p>}
  </div>
    {help && <HelpCard life={journey.life} setLife={updateLife} devices={allDevices} onClose={() => setHelp(false)} />}
    {needs && <NeedsDialog settings={settings} setSettings={setSettings} onClose={() => setNeeds(false)} />}
    {report && <FeedbackDialog subject={report} onSave={item => setFeedback(current => [...current, item])} onClose={() => setReport(null)} />}
    {voiceDemo && <Modal title="语音输入演示" onClose={() => setVoiceDemo(false)}><p>首次情况录入使用固定模拟语音，不会启动麦克风。你可以核对并修改识别结果，也可全程手动选择。</p><PrimaryButton onClick={() => { setVoiceDemo(false); setModules(['vision','mobility']); setVoiceConfirm('confirm'); setScreen('select') }}>试用模拟识别：视障、肢体</PrimaryButton><PrimaryButton variant="ghost" onClick={() => { setVoiceDemo(false); setScreen('select') }}>直接手动选择</PrimaryButton></Modal>}
  </main>
}



