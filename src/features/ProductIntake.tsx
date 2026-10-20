import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { PageHeader, PrimaryButton } from '../components/UI'
import { sampleBundles, sourceNames, type ProductSource, type SourceKind } from '../app/product'
import { apiFetch } from '../app/transport'
import { isStudio, processingNotice, processingLocation } from '../app/deployment'
import { browserAIAvailable, clearBrowserAI } from '../app/browserAI'
import { shoppingPlatforms, shoppingUrl } from '../app/catalog'

export interface AIStatus { configured: boolean; authorized: boolean; provider?: string; localOnly?: boolean; model?: string; reason?: string; deployment?:string }
export async function readAIStatus(): Promise<AIStatus> {
  const response = await apiFetch('/api/status', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw Error('当前AI服务未响应，请稍后重试。')
  const status: AIStatus = await response.json()
  if (status.provider !== 'ollama' || status.localOnly !== true) throw Error('当前服务未提供所需的开源图文模型，请检查部署状态。')
  if((status.deployment==='studio')!==isStudio)throw Error('当前界面与服务部署模式不匹配，请刷新正确的软件页面。')
  return status
}
function modelStatus(status: AIStatus | null) {
  if(isStudio)return !status?'正在检查创空间图文模型……':status.configured?'创空间图文模型已就绪，无需模型API密钥。':'创空间模型正在准备或暂不可用；请保留资料稍后重试。'
  if (!status) return '正在检查电脑上的图文模型……'
  if (status.configured) return status.authorized ? '已检测到本机图文模型，无需密钥。首次解读会加载模型。' : '本机图文模型已就绪，请先授权这台手机使用电脑资源。'
  if(status.reason==='engine_starting')return '本机引擎首次启动，正在检查电脑硬件，通常需要数十秒；就绪后会更新状态。可先加入资料。'
  if (status.reason === 'model_missing') return '本机引擎已启动，模型尚未下载完成。请在电脑完成安装后重新检查。'
  if (status.reason === 'cloud_disabled') return '已阻止云端模型，请在电脑安装本地模型。'
  if (status.reason === 'vision_missing') return '当前模型缺少图片识别能力，请检查本地图文模型安装。'
  return '本机AI引擎未启动。请在电脑运行“安装本地AI”，或先使用下方规则整理与案例。'
}
export function ProductIntake({ onBack, onAnalyze, loading, error, onCancel, initialQuery = '电动轮椅', initialSources = [], onDraftChange }: { onBack: () => void; onAnalyze: (sources: ProductSource[], mode: 'ai' | 'browser' | 'local' | 'sample') => void; loading: boolean; error: string; onCancel: () => void; initialQuery?: string; initialSources?: ProductSource[];onDraftChange?:(draft:import('../app/intake').IntakeDraft)=>void }) {
  const [cloudConsent,setCloudConsent]=useState(!isStudio)
  const [sources, setSources] = useState<ProductSource[]>(initialSources), [text, setText] = useState(''), [name, setName] = useState(''), [kind, setKind] = useState<SourceKind>('merchant')
  const [mode, setMode] = useState<'ai' | 'browser' | 'local'>('ai'), [status, setStatus] = useState<AIStatus | null>(null), [notice, setNotice] = useState(''), [link, setLink] = useState('')
  const [pair, setPair] = useState(''), [pairCode, setPairCode] = useState(''), [query, setQuery] = useState(initialQuery), [platform, setPlatform] = useState('jd'), [fileLoading, setFileLoading] = useState(false)
  useEffect(()=>{onDraftChange?.({sources,text})},[sources,text,onDraftChange])
  const mounted = useRef(true)
  const [sourceModel,setSourceModel]=useState('')
  useEffect(() => {
    mounted.current = true
    let timer:ReturnType<typeof setTimeout>|undefined,attempts=0
    const check=async()=>{try{const value=await readAIStatus();if(!mounted.current)return;setStatus(value);if(!value.configured&&['engine_starting','engine_unavailable'].includes(value.reason??'')&&++attempts<12)timer=setTimeout(()=>void check(),5000)}catch(error){if(mounted.current)setNotice((error as Error).message)}}
    void check()
    return () => { mounted.current = false;clearTimeout(timer) }
  }, [])
  const refresh = async () => { try { setStatus(await readAIStatus()); setNotice('模型状态已更新。') } catch (error) { setStatus(null); setNotice((error as Error).message) } }
  const addText = () => {
    if (!text.trim()) return
    if (sources.length >= 5) { setNotice('最多保留5份资料，请先移除不需要的内容。'); return }
    setSources(current => [...current, { id: 'source-' + Date.now(), name: name.trim() || sourceNames[kind] + ' ' + (current.length + 1), kind, text: text.trim(),modelKey:sourceModel.trim().toUpperCase() }])
    setText(''); setName(''); setNotice('资料已加入。可继续补充说明书、商家回复或反馈，再统一解读。')
  }
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setFileLoading(true)
    try {
      const selected = Array.from(files)
      if (selected.length + sources.length > 5) throw Error('文字和图片合计最多5份资料。')
      if (selected.length + sources.filter(source => source.image).length > 2) throw Error('图文AI一次最多识别2张图片，请优先选择关键参数页。')
      if (selected.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024)) throw Error('请选择PNG、JPEG或WebP图片，每张不超过3MB。')
      const added = await Promise.all(selected.map((file, index) => new Promise<ProductSource>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve({ id: 'image-' + Date.now() + '-' + index, name: file.name, kind, text: '', image: String(reader.result),modelKey:sourceModel.trim().toUpperCase() })
        reader.onerror = () => reject(Error('图片读取失败，请重新选择。')); reader.readAsDataURL(file)
      })))
      if (mounted.current) { setSources(current => [...current, ...added]); setNotice('图片已加入。点击开始后，由'+processingLocation+'的模型处理。') }
    } catch (error) { setNotice((error as Error).message) } finally { if (mounted.current) setFileLoading(false) }
  }
  const currentPlatform = shoppingPlatforms.find(item => item.id === platform) ?? shoppingPlatforms[0]
  const overLimit = sources.reduce((sum, source) => sum + source.text.length, 0) > 6000
  return <section className="screen product-intake">
    <PageHeader title="买辅具 · AI帮你看懂" subtitle="读懂资料，找到依据，再决定下一步" onBack={() => { onCancel(); onBack() }} />
    <div className="insight-hero"><span className="insight-kicker"><Icon name="spark" size={19} />{isStudio?'创空间AI · 无需模型API密钥':'本机AI · 无需密钥'}</span><h2>这件辅具，<br />适合我的生活吗？</h2><p>用当前服务的图文模型读懂商品资料，整理参数、发现矛盾，再核对你的使用与出行需要。</p><div className="insight-steps"><span>1 加入资料</span><span>2 看懂依据</span><span>3 核对适配</span></div></div>
    <section className="intake-panel"><h2>先加入一份商品资料</h2>
      <label>资料来源<select disabled={loading || fileLoading} value={kind} onChange={event => setKind(event.target.value as SourceKind)}>{Object.entries(sourceNames).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
      <label>资料名称（选填）<input value={name} onChange={event => setName(event.target.value)} placeholder="例如：说明书第2页" maxLength={120} /></label>
      <label>资料对应型号／规格（选填）<input value={sourceModel} onChange={event=>setSourceModel(event.target.value)} maxLength={60} placeholder="同一型号的详情、说明书和图片填写相同内容"/></label>
      <label>商品文字、说明书或商家回复<textarea value={text} onChange={event => setText(event.target.value)} placeholder="例如：使用尺寸（长×宽×高）105×68×98 cm，整车32 kg不含电池，详情写单手折叠……" maxLength={6000} /></label>
      <PrimaryButton variant="secondary" disabled={!text.trim() || loading || fileLoading} onClick={addText}>加入这段文字</PrimaryButton>
      <label className="image-input"><Icon name="upload" size={22} /><span>上传详情图或说明书照片</span><small>PNG、JPEG、WebP；每张≤3MB；一次最多2张图片</small><input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={loading || fileLoading} onChange={event => { void addFiles(event.target.files); event.target.value = '' }} /></label>
      <p className="prototype-note">文字和图片合计最多5份资料；图文AI每次文字合计不超过6000字。长说明书可分批加入关键页。</p>
      <details><summary>只有商品链接？</summary><label>商品链接<input type="url" value={link} onChange={event => setLink(event.target.value)} placeholder="https://…" /></label><p>目前不会自动抓取商品平台。请把详情文字或截图加入上方资料；链接不会被当作已读取的依据。</p></details>
    </section>
    <section aria-label="本次资料" className="source-list"><h2>本次资料 · {sources.length} / 5</h2>{sources.length ? sources.map((source, index) => <article className="source-preview" key={source.id}><div><strong>{index + 1}．{source.name}</strong><small>{sourceNames[source.kind]} · {source.image ? '图片，待图文模型识别' : `${source.text.length}字`}</small></div><button disabled={loading} onClick={() => setSources(current => current.filter(item => item.id !== source.id))} aria-label={`移除${source.name}`}>移除</button>{source.image ? <img src={source.image} alt={`${source.name}，已选择但尚未解读`} /> : <p>{source.text.slice(0, 220)}{source.text.length > 220 ? '……' : ''}</p>}</article>) : <p className="muted-copy">尚未加入资料。也可以先体验下面的预置案例。</p>}</section>
    <fieldset className="analysis-mode"><legend>选择解读方式</legend>
      <label className="switch-line"><input type="radio" name="analysis-mode" checked={mode === 'ai'} onChange={() => setMode('ai')} disabled={loading} />{isStudio?'创空间AI解读（无需模型API密钥）':'本机AI解读（无需密钥）'}</label>
      <label className="switch-line"><input type="radio" name="analysis-mode" checked={mode === 'browser'} onChange={() => setMode('browser')} disabled={loading} />这台手机／浏览器独立AI（文字）</label>
      <label className="switch-line"><input type="radio" name="analysis-mode" checked={mode === 'local'} onChange={() => setMode('local')} disabled={loading} />规则整理（不用AI）</label>
      {mode === 'ai' ? <><p role="status">{modelStatus(status)}</p><p className="prototype-note">{processingNotice}原图不写入长期设备档案。</p><p>{isStudio?'首次加载或算力唤醒可能较慢，可取消并保留资料。':'首次加载可能较慢，可随时取消。电脑需保持开机；模型安装完成后无需互联网。'}</p><button disabled={loading} onClick={() => void refresh()}>重新检查AI状态</button>
        {!isStudio&&<>        <details><summary>手机首次授权 / 模型状态</summary><p>模型：{status?.model ?? '待检查'}。授权仅允许这台浏览器使用电脑资源，12小时后失效。</p>{status?.authorized ? <><button onClick={async () => { try { const response = await fetch('/api/pair-code', { method: 'POST' }), data = await response.json(); if (!response.ok) throw Error(data.error); setPairCode(data.code) } catch (error) { setNotice((error as Error).message) } }}>在电脑生成手机授权码</button>{pairCode && <p className="pair-code">授权码：{pairCode}（10分钟有效，仅可使用一次）</p>}</> : <><label>输入电脑生成的6位授权码<input inputMode="numeric" maxLength={6} value={pair} onChange={event => setPair(event.target.value)} /></label><button onClick={async () => { try { const response = await fetch('/api/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: pair }) }), data = await response.json(); if (!response.ok) throw Error(data.error); setStatus(await readAIStatus()); setPair(''); setNotice('已授权这台浏览器使用本机AI。') } catch (error) { setNotice((error as Error).message) } }}>授权这台浏览器</button></>}</details></>}
      </> : mode === 'browser' ? <p>首次点击将下载约数百MB模型到此浏览器缓存，需要安全连接、WebGPU和足够内存。资料不发给模型供应方；下载就绪后可在本设备处理文字，不依赖电脑。一次最多3500字，不支持图片。{browserAIAvailable()?'当前浏览器检测到WebGPU入口，实际加载仍需验证。':'当前环境不具备运行条件，请使用电脑AI或规则整理。'}</p> : <p>仅识别有限的文字格式，不识别图片，也不理解自由描述。三维尺寸需标明长×宽×高顺序。这与真实模型解读分开显示。</p>}
    </fieldset>
    <details><summary>管理本设备AI模型缓存</summary><p>只清理此浏览器下载的文字模型，不删除设备卡。服务端图文模型由运行服务的维护人单独管理。</p><button disabled={loading} onClick={async()=>{try{await clearBrowserAI();setNotice('已清理本浏览器文字模型缓存，下次使用需重新下载。')}catch(error){setNotice((error as Error).message)}}}>卸载本浏览器文字模型缓存</button></details>
    {notice && <p className="operation-status" role="status">{notice}</p>}{error && <p role="alert" className="form-error">{error}</p>}{mode === 'ai' && overLimit && <p role="alert" className="form-error">文字合计超过6000字，请精简或分批解读。</p>}
    {isStudio&&mode==='ai'&&<label className="switch-line"><input type="checkbox" checked={cloudConsent} onChange={e=>setCloudConsent(e.target.checked)}/>同意把本次公开商品资料发送到创空间服务端解读</label>}
    <PrimaryButton icon="spark" disabled={(mode==='ai'&&!cloudConsent)||loading || fileLoading || !sources.length || (mode === 'ai' && (overLimit || !status?.configured || !status.authorized)) || (mode === 'browser' && (!browserAIAvailable() || sources.reduce((total,source)=>total+source.text.length,0)>3500 || sources.some(source=>source.image))) || (mode === 'local' && sources.every(source => !source.text.trim()))} onClick={() => onAnalyze(sources, mode)}>{loading ? '模型正在解读……' : mode === 'ai' ? (isStudio?'开始创空间AI解读':'开始本机AI解读') : mode === 'browser' ? '下载／加载并在本设备AI解读' : '开始规则整理'}</PrimaryButton>
    {loading && <PrimaryButton variant="ghost" onClick={onCancel}>取消本次解读</PrimaryButton>}
    <section className="sample-library"><h2>先看一个完整案例</h2><p>下面是明确预置的资料，不调用模型，也不代表真实商品。</p>{sampleBundles.map(bundle => <button className="task-link" disabled={loading} key={bundle.id} onClick={() => onAnalyze(bundle.sources, 'sample')}><strong>{bundle.title}</strong><span>查看资料 → 解读依据 → 个性化核对 → 出行检查</span></button>)}</section>
    <details className="shopping-secondary"><summary>还没有商品？去购物平台找辅具</summary><label>想找什么<input value={query} onChange={event => setQuery(event.target.value)} /></label><label>购物平台<select value={platform} onChange={event => setPlatform(event.target.value)}>{shoppingPlatforms.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><a className="button button-secondary" href={shoppingUrl(currentPlatform, query || '辅具')} target="_blank" rel="noopener noreferrer">打开{currentPlatform.label}搜索（新标签页）</a><p>只发送搜索词。查看商品后，可回到本页加入资料。</p></details>
  </section>
}
