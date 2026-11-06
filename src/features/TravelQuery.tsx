import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../components/Icons'
import { PageHeader, PrimaryButton } from '../components/UI'
import { catalogDevice, extraEquipment, getTravelMeta, makeCustomId, normalizeLabel, travelModes } from '../app/catalog'
import { deviceMeta } from '../app/mock'
import { TravelParameterGuide } from './TravelParameterGuide'
import { largeDeviceTypes } from '../app/travelRules'
import type { CustomTravelDevice, CustomTravelMode, Device, TravelContext, TravelDeviceSpecs, TravelMode } from '../app/types'

export function travelOptions(devices: Device[], custom: CustomTravelDevice[]) {
  return [...devices.map(device => ({ ...device, icon: deviceMeta[device.type]?.icon ?? 'settings' as IconName })),
    ...Object.entries(deviceMeta).map(([type, meta]) => ({ ...catalogDevice(type, meta.label), id: `catalog-${type}`, icon: meta.icon })),
    ...extraEquipment.map(meta => ({ ...catalogDevice(meta.id, meta.label), id: meta.id, icon: meta.icon })),
    ...custom.map(meta => ({ ...catalogDevice(meta.type, meta.name), id: meta.id, icon: meta.icon }))].filter((item,index,all) => all.findIndex(row => row.id === item.id) === index)
}

interface Props {
  embedded?:boolean;
  coverage?:ReactNode; livePreview?:ReactNode; initialStep?:1|2|3;
  mode: TravelMode; setMode: (mode: TravelMode) => void; devices: Device[];
  customModes: CustomTravelMode[]; setCustomModes: (modes: CustomTravelMode[]) => void;
  customDevices: CustomTravelDevice[]; setCustomDevices: (devices: CustomTravelDevice[]) => void;
  selected: string[]; setSelected: (ids: string[]) => void;
  specs: Record<string, TravelDeviceSpecs>; setSpecs: (specs: Record<string, TravelDeviceSpecs>) => void;
  context: TravelContext; setContext: (context: TravelContext) => void;
  stepMode: boolean; loading: boolean; onStart: () => void; onBack: () => void;
  onRemember?: (device: Device, specs: TravelDeviceSpecs) => void;
}
export function TravelQuery(props: Props) {
  const { mode, setMode, selected, setSelected, specs, setSpecs, context, setContext, stepMode } = props
  const [step, setStep] = useState<number>(props.initialStep??1)
  const [expandedModes,setExpandedModes]=useState(false),[expandedDevices,setExpandedDevices]=useState(false)
  const [modeSearch, setModeSearch] = useState('')
  const [deviceSearch, setDeviceSearch] = useState('')
  const [newMode, setNewMode] = useState('')
  const [newDevice, setNewDevice] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [step, stepMode])
  const modes = [...travelModes, ...props.customModes]
  const options = travelOptions(props.devices, props.customDevices)
  const chosen = options.filter(item => selected.includes(item.id))
  const matches = options.filter(item => item.name.includes(deviceSearch.trim()))
  const visibleDevices=deviceSearch.trim()||expandedDevices?matches:matches.filter((item,index)=>index<6||selected.includes(item.id))
  const visibleModes=modes.filter((item,index)=>(item.label.includes(modeSearch.trim()))&&(modeSearch.trim()||expandedModes||index<6||item.id===mode))
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id])
  const addMode = () => {
    const label = normalizeLabel(newMode); if (!label) return
    const match = modes.find(item => normalizeLabel(item.label).toLowerCase() === label.toLowerCase())
    const id = match?.id ?? makeCustomId(label)
    if (!match) props.setCustomModes([...props.customModes, { id, label, icon: 'car', contact: '运营方或服务人员' }])
    setMode(id); setNewMode(''); setModeSearch('')
  }
  const addDevice = () => {
    const name = normalizeLabel(newDevice); if (!name) return
    const match = options.find(item => normalizeLabel(item.name).toLowerCase() === name.toLowerCase())
    const type = makeCustomId(name); const id = match?.id ?? type
    if (!match) props.setCustomDevices([...props.customDevices, { id: type, name, type, icon: 'settings' }])
    if (!selected.includes(id)) setSelected([...selected, id])
    setNewDevice(''); setDeviceSearch('')
  }
  const update = (id: string, field: keyof TravelDeviceSpecs, value: unknown) => setSpecs({ ...specs, [id]: { ...specs[id], [field]: value } })
  const numberValue = (value: string) => value === '' ? undefined : Number(value)
  const invalid = chosen.some(item => Object.values(specs[item.id] ?? {}).some(value => typeof value === 'number' && (!Number.isFinite(value) || value <= 0))) || Object.entries(context).some(([key,value]) => ['availableLengthCm','availableWidthCm','availableHeightCm','doorWidthCm','availableWeightKg'].includes(key) && value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value <= 0))
  const show = (n: number) => step === n
  return <section className="screen travel-query">
    <PageHeader level={props.embedded?2:1} title="出行查询" subtitle="先拿到行动清单，再按需要补充" onBack={props.onBack} />
    {props.livePreview}
    <details><summary>本次规则范围与更新时间</summary>{props.coverage}</details>
    {<div className="guided-progress" aria-live="polite"><h2 ref={heading} tabIndex={-1}>第 {step} 步 / 3：{['选择出行方式', '选择所带设备', '核对设备参数'][step-1]}</h2><p>{step === 1 ? '先选择一种交通方式。' : step === 2 ? '选择本次要带的设备，可以多选。' : '复用已保存参数，只补影响本次判断的缺项。不知道可以跳过。'}</p></div>}
    {show(1) && <section className="query-section" aria-label="出行方式"><h2>1 · 怎么出行？</h2>
      <label className="catalog-search"><Icon name="search" size={18}/><input aria-label="搜索出行方式" value={modeSearch} onChange={e=>setModeSearch(e.target.value)} placeholder="搜索出行方式"/></label>
      <div className="mode-switch expanded">{visibleModes.map(item => <button key={item.id} aria-pressed={mode === item.id} className={mode === item.id ? 'active' : ''} onClick={()=>setMode(item.id)}><Icon name={item.icon} size={23}/>{item.label}</button>)}</div>
      {!modeSearch.trim()&&<button aria-expanded={expandedModes} onClick={()=>setExpandedModes(!expandedModes)}>{expandedModes?'收起其他方式':'查看全部出行方式（'+modes.length+'种）'}</button>}
      {!modes.some(item=>item.label.includes(modeSearch.trim())) && <p>没有找到，可以在下方添加。</p>}
      <div className="catalog-add"><input aria-label="自定义出行方式" placeholder="其他出行方式" value={newMode} onChange={e=>setNewMode(e.target.value)}/><button aria-label="添加出行方式" disabled={!newMode.trim()} onClick={addMode}>添加</button></div>
      {mode === 'plane' && <label className="travel-field">实际承运航空公司<select value={context.carrier} onChange={e=>setContext({ ...context, carrier: e.target.value as TravelContext['carrier'] })}><option value="unspecified">尚未确定</option><option value="airchina">中国国际航空</option><option value="ceair">中国东方航空</option><option value="csair">中国南方航空</option><option value="other">其他实际承运公司</option></select></label>}
    <div className="field-grid two"><label>出发站或地点（选填）<input value={context.from??''} maxLength={80} placeholder="例如：上海虹桥" onChange={e=>setContext({...context,from:e.target.value})}/></label><label>到达站或地点（选填）<input value={context.to??''} maxLength={80} placeholder="例如：杭州东" onChange={e=>setContext({...context,to:e.target.value})}/></label><label>城市（选填）<input value={context.city??''} maxLength={40} onChange={e=>setContext({...context,city:e.target.value})}/></label><label>线路／航班（选填）<input value={context.line??''} maxLength={80} onChange={e=>setContext({...context,line:e.target.value})}/></label><label>出行日期（选填）<input type="date" value={context.journeyDate??''} onChange={e=>setContext({...context,journeyDate:e.target.value})}/></label></div>
    <button onClick={()=>{const date=new Date();date.setDate(date.getDate()+1);const local=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10);setContext({...context,journeyDate:local})}}>明天出发</button>
    </section>}
    {show(2) && <section className="query-section" aria-label="所带设备"><h2>2 · 带什么设备？</h2>
      <label className="catalog-search"><Icon name="search" size={18}/><input aria-label="搜索设备" placeholder="搜索轮椅、助听器…" value={deviceSearch} onChange={e=>setDeviceSearch(e.target.value)}/></label>
      <div className="travel-device-list expanded-device-list">{visibleDevices.map(item=><button key={item.id} className={`travel-device ${selected.includes(item.id) ? 'selected' : ''}`} aria-pressed={selected.includes(item.id)} onClick={()=>toggle(item.id)}><span><Icon name={item.icon} size={23}/>{item.name}</span><span className="selection-mark">{selected.includes(item.id) && <Icon name="check" size={17}/>}</span></button>)}</div>
      {!deviceSearch.trim()&&<button aria-expanded={expandedDevices} onClick={()=>setExpandedDevices(!expandedDevices)}>{expandedDevices?'收起其他设备':'查看全部设备（'+options.length+'类）'}</button>}
      {!matches.length && <p>没有找到，可以添加自定义设备。</p>}
      <div className="catalog-add"><input aria-label="自定义设备" placeholder="其他设备名称" value={newDevice} onChange={e=>setNewDevice(e.target.value)}/><button aria-label="添加设备" disabled={!newDevice.trim()} onClick={addDevice}>添加</button></div>
      <div className="selected-equipment">{chosen.map(item=><button key={item.id} aria-label={`取消选择${item.name}`} onClick={()=>toggle(item.id)}>{item.name}<Icon name="close" size={16}/></button>)}</div>
    </section>}
    {show(3) && <section className="query-section" aria-label="设备参数"><h2>3 · 核对尺寸与电池</h2><p className="catalog-hint">填写实际运输状态的尺寸；折叠后的尺寸与使用时的尺寸可能不同。空白不代表符合限制。</p>
      {chosen.length === 0 && <p>尚未选择设备，可以先按基础行动清单准备，稍后再选择设备。</p>}
      {chosen.length>0&&<TravelParameterGuide mode={mode} devices={chosen} specs={specs} onChange={update} onCheck={props.onStart} invalid={invalid}/>}
      <details><summary>查看或修改全部参数与可用空间</summary>
      {chosen.map(item => <fieldset className="transport-specs" key={item.id}><legend>{item.name}</legend>
        {largeDeviceTypes.has(item.type) && <p>大型辅具：飞机需区分客舱存放与托运；地面交通需核对入口、空间与承重。</p>}
        <details open={largeDeviceTypes.has(item.type)}><summary>{largeDeviceTypes.has(item.type)?'尺寸和运输状态（大型设备重点填写）':'补充尺寸和重量（小型辅具可按需填写）'}</summary><div className="field-grid two">{([['lengthCm','长（cm）'],['widthCm','宽（cm）'],['heightCm','高（cm）'],['weightKg','重量（kg）']] as const).map(([field,label])=><label key={field}>{label}<input aria-label={`${item.name}${label}`} type="number" min="0.01" step="any" value={specs[item.id]?.[field] ?? ''} placeholder="未填写" onChange={e=>update(item.id,field,numberValue(e.target.value))}/></label>)}</div>
        <label className="travel-field">是否为折叠后尺寸<select aria-label={`${item.name}折叠状态`} value={specs[item.id]?.folded ?? 'unknown'} onChange={e=>update(item.id,'folded',e.target.value)}><option value="unknown">未确认 / 不适用</option><option value="yes">是，已折叠</option><option value="no">否，不可折叠或未折叠</option></select></label>
        </details><label className="travel-field">电池类型<select aria-label={`${item.name}电池类型`} value={specs[item.id]?.batteryType ?? 'unknown'} onChange={e=>update(item.id,'batteryType',e.target.value)}><option value="unknown">未确认</option><option value="none">没有电池</option><option value="lithium">锂电池</option><option value="other">其他电池（需核对化学类型）</option></select></label>
        {specs[item.id]?.batteryType === 'lithium' && <div className="field-grid two"><label>每块电池 Wh<input aria-label={`${item.name}每块电池Wh`} type="number" min="0.01" step="any" value={specs[item.id]?.batteryWh ?? ''} onChange={e=>update(item.id,'batteryWh',numberValue(e.target.value))}/></label><label>驱动电池数量<select aria-label={`${item.name}电池数量`} value={specs[item.id]?.batteryCount ?? ''} onChange={e=>update(item.id,'batteryCount',e.target.value ? Number(e.target.value) : undefined)}><option value="">未确认</option><option value={1}>1 块</option><option value={2}>2 块</option></select></label><label>能否拆下<select aria-label={`${item.name}电池可拆卸`} value={specs[item.id]?.removable ?? 'unknown'} onChange={e=>update(item.id,'removable',e.target.value)}><option value="unknown">未确认</option><option value="yes">可以拆下</option><option value="no">不可拆</option></select></label></div>}
        {item.dimensions && <p className="catalog-hint">已保存资料：{item.dimensions} · {item.weight} · {item.battery}。请核对运输状态后填写。</p>}
        <PrimaryButton variant="ghost" disabled={!specs[item.id] || invalid} onClick={() => { props.onRemember?.(item, specs[item.id]); setSaveStatus(item.name + '：已更新设备卡。仅保存本次明确填写并核对的参数。') }}>我已核对，保存这些参数到设备卡</PrimaryButton>
      </fieldset>)}
      {chosen.some(item=>largeDeviceTypes.has(item.type)) && <fieldset className="transport-specs"><legend>运营方告知的可用空间（选填）</legend><p>按同一朝向比较尺寸。只有拿到车门、货舱或车辆实际数据再填写，不使用虚构的统一上限。</p><div className="field-grid two">{([['availableLengthCm','可用长（cm）'],['availableWidthCm','可用宽（cm）'],['availableHeightCm','可用高（cm）'],['doorWidthCm','入口净宽（cm）'],['availableWeightKg','设备装载限重（kg）']] as const).map(([field,label])=><label key={field}>{label}<input aria-label={label} type="number" min="0.01" step="any" value={context[field] ?? ''} onChange={e=>setContext({ ...context, [field]: numberValue(e.target.value) })}/></label>)}</div></fieldset>}
      </details>
      {invalid && <p role="alert" className="form-error">尺寸、重量和容量必须是大于 0 的有效数字，也可以留空。</p>}
      <p role="status">{saveStatus}</p>
    </section>}
    <div className="bottom-sticky"><p aria-live="polite">{getTravelMeta(mode).label} · 已选 {selected.length} 项设备</p>
      {step > 1 && <PrimaryButton variant="ghost" onClick={()=>setStep(step-1)}>上一步</PrimaryButton>}
      {step < 3 && <PrimaryButton onClick={()=>setStep(step+1)}>下一步</PrimaryButton>}
      <PrimaryButton onClick={props.onStart}>查看出行行动清单</PrimaryButton>
    </div>
  </section>
}
