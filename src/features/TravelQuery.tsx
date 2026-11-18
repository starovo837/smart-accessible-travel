import { copyDictionary } from "../app/copyDictionary.ts";
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '../components/Icons';
import { PageHeader, PrimaryButton } from '../components/UI';
import { catalogDevice, extraEquipment, getTravelMeta, makeCustomId, normalizeLabel, travelModes } from '../app/catalog';
import { deviceMeta } from '../app/mock';
import { TravelParameterGuide } from './TravelParameterGuide';
import { largeDeviceTypes } from '../app/travelRules';
import {sampleDeviceField,updateTravelSpec} from '../app/travelSpecEvidence';
import {TravelSpecReview} from './travel/TravelSpecReview';
import type { CustomTravelDevice, CustomTravelMode, Device, TravelContext, TravelDeviceSpecs, TravelMode } from '../app/types';
export function travelOptions(devices: Device[], custom: CustomTravelDevice[]) {
    return [...devices.map(device => ({ ...device, icon: deviceMeta[device.type]?.icon ?? 'settings' as IconName })),
        ...Object.entries(deviceMeta).map(([type, meta]) => ({ ...catalogDevice(type, meta.label), id: `catalog-${type}`, icon: meta.icon })),
        ...extraEquipment.map(meta => ({ ...catalogDevice(meta.id, meta.label), id: meta.id, icon: meta.icon })),
        ...custom.map(meta => ({ ...catalogDevice(meta.type, meta.name), id: meta.id, icon: meta.icon }))].filter((item, index, all) => all.findIndex(row => row.id === item.id) === index);
}
interface Props {
    embedded?: boolean;
    coverage?: ReactNode;
    livePreview?: ReactNode;
    initialStep?: 1 | 2 | 3;
    mode: TravelMode;
    setMode: (mode: TravelMode) => void;
    devices: Device[];
    customModes: CustomTravelMode[];
    setCustomModes: (modes: CustomTravelMode[]) => void;
    customDevices: CustomTravelDevice[];
    setCustomDevices: (devices: CustomTravelDevice[]) => void;
    selected: string[];
    setSelected: (ids: string[]) => void;
    specs: Record<string, TravelDeviceSpecs>;
    setSpecs: (specs: Record<string, TravelDeviceSpecs>) => void;
    context: TravelContext;
    setContext: (context: TravelContext) => void;
    stepMode: boolean;
    loading: boolean;
    onStart: () => void;
    onBack: () => void;
    onRemember?: (device: Device, specs: TravelDeviceSpecs) => void;
}
export function TravelQuery(props: Props) {
    const { mode, setMode, selected, setSelected, specs, setSpecs, context, setContext, stepMode } = props;
    const [step, setStep] = useState<number>(props.initialStep ?? 1);
    const [expandedModes, setExpandedModes] = useState(false), [expandedDevices, setExpandedDevices] = useState(false);
    const [modeSearch, setModeSearch] = useState('');
    const [deviceSearch, setDeviceSearch] = useState('');
    const [newMode, setNewMode] = useState('');
    const [newDevice, setNewDevice] = useState('');
    const [saveStatus, setSaveStatus] = useState('');
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => { heading.current?.focus(); }, [step, stepMode]);
    const modes = [...travelModes, ...props.customModes];
    const options = travelOptions(props.devices, props.customDevices);
    const chosen = options.filter(item => selected.includes(item.id));
    const matches = options.filter(item => item.name.includes(deviceSearch.trim()));
    const visibleDevices = deviceSearch.trim() || expandedDevices ? matches : matches.filter((item, index) => index < 6 || selected.includes(item.id));
    const visibleModes = modes.filter((item, index) => (item.label.includes(modeSearch.trim())) && (modeSearch.trim() || expandedModes || index < 6 || item.id === mode));
    const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
    const addMode = () => {
        const label = normalizeLabel(newMode);
        if (!label)
            return;
        const match = modes.find(item => normalizeLabel(item.label).toLowerCase() === label.toLowerCase());
        const id = match?.id ?? makeCustomId(label);
        if (!match)
            props.setCustomModes([...props.customModes, { id, label, icon: 'car', contact: copyDictionary.c87903248b7b6eae4 }]);
        setMode(id);
        setNewMode('');
        setModeSearch('');
    };
    const addDevice = () => {
        const name = normalizeLabel(newDevice);
        if (!name)
            return;
        const match = options.find(item => normalizeLabel(item.name).toLowerCase() === name.toLowerCase());
        const type = makeCustomId(name);
        const id = match?.id ?? type;
        if (!match)
            props.setCustomDevices([...props.customDevices, { id: type, name, type, icon: 'settings' }]);
        if (!selected.includes(id))
            setSelected([...selected, id]);
        setNewDevice('');
        setDeviceSearch('');
    };
    const update = (id: string, field: keyof TravelDeviceSpecs, value: unknown) => setSpecs({ ...specs, [id]: updateTravelSpec(specs[id],field,value) });
    const numberValue = (value: string) => value === '' ? undefined : Number(value);
    const invalid = chosen.some(item => Object.values(specs[item.id] ?? {}).some(value => typeof value === 'number' && (!Number.isFinite(value) || value <= 0))) || Object.entries(context).some(([key, value]) => ['availableLengthCm', 'availableWidthCm', 'availableHeightCm', 'doorWidthCm', 'availableWeightKg'].includes(key) && value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value <= 0));
    const show = (n: number) => step === n;
    return <section className="screen travel-query">
    <PageHeader level={props.embedded ? 2 : 1} title={copyDictionary.c6e7604f9408c6b81} subtitle={copyDictionary.c4384ca763e3ff214} onBack={props.onBack}/>
    {props.livePreview}
    <details open><summary>{copyDictionary.cb6acb299fa4315f6}</summary>{props.coverage}</details>
    {<div className="guided-progress" aria-live="polite"><h2 ref={heading} tabIndex={-1}>{copyDictionary.caf50a0fe2a50a3d1}{step}{copyDictionary.c13e0a70c74079bd8}{[copyDictionary.c06e4cefb3309b6cf, copyDictionary.cb629bdddb965f0fd, copyDictionary.cc345745cff60e066][step - 1]}</h2><p>{step === 1 ? copyDictionary.c0d72b2463830d479 : step === 2 ? copyDictionary.cb549f7990250b223 : copyDictionary.c99855c09676d8e73}</p></div>}
    {show(1) && <section className="query-section" aria-label={copyDictionary.ce9b0e57eec5b8a99}><h2>{copyDictionary.c716b5a1f16ea6c78}</h2>
      <label className="catalog-search"><Icon name="search" size={18}/><input aria-label={copyDictionary.c18ea22328ed60d49} value={modeSearch} onChange={e => setModeSearch(e.target.value)} placeholder={copyDictionary.c18ea22328ed60d49}/></label>
      <div className="mode-switch expanded">{visibleModes.map(item => <button key={item.id} aria-pressed={mode === item.id} className={mode === item.id ? 'active' : ''} onClick={() => setMode(item.id)}><Icon name={item.icon} size={23}/>{item.label}</button>)}</div>
      {!modeSearch.trim() && <button aria-expanded={expandedModes} onClick={() => setExpandedModes(!expandedModes)}>{expandedModes ? copyDictionary.c1d572ecc4795acba : copyDictionary.c88ecf4f52cbd9d8a + modes.length + copyDictionary.c8e17932382d3c33e}</button>}
      {!modes.some(item => item.label.includes(modeSearch.trim())) && <p>{copyDictionary.c373ee3a346beb497}</p>}
      <div className="catalog-add"><input aria-label={copyDictionary.caf758738f962bb21} placeholder={copyDictionary.c63b54a98f5169500} value={newMode} onChange={e => setNewMode(e.target.value)}/><button aria-label={copyDictionary.c952609c3a5c68c1f} disabled={!newMode.trim()} onClick={addMode}>{copyDictionary.c7a8a11ead50742a2}</button></div>
      {mode === 'plane' && <label className="travel-field">{copyDictionary.ca02c172e61b3bc7c}<select value={context.carrier} onChange={e => setContext({ ...context, carrier: e.target.value as TravelContext['carrier'] })}><option value="unspecified">{copyDictionary.c4eaf22504838495c}</option><option value="airchina">{copyDictionary.c2addf82e80a9f862}</option><option value="ceair">{copyDictionary.c1527eaf6bb0579fd}</option><option value="csair">{copyDictionary.cf3adc2135b1c2c94}</option><option value="other">{copyDictionary.cb230e1522d29724b}</option></select></label>}
    <div className="field-grid two"><label>{copyDictionary.c2b14df28b29269e1}<input value={context.from ?? ''} maxLength={80} placeholder={copyDictionary.c75e7425c204600a1} onChange={e => setContext({ ...context, from: e.target.value })}/></label><label>{copyDictionary.c359f42573697625c}<input value={context.to ?? ''} maxLength={80} placeholder={copyDictionary.c1ebddba356cb1e4b} onChange={e => setContext({ ...context, to: e.target.value })}/></label><label>{copyDictionary.c26445e15ce46b2c8}<input value={context.city ?? ''} maxLength={40} onChange={e => setContext({ ...context, city: e.target.value })}/></label><label>{copyDictionary.c42a58bcbe9111bfd}<input value={context.line ?? ''} maxLength={80} onChange={e => setContext({ ...context, line: e.target.value })}/></label><label>{copyDictionary.c09203c9c7250e686}<input type="date" value={context.journeyDate ?? ''} onChange={e => setContext({ ...context, journeyDate: e.target.value })}/></label></div>
    <label className="travel-field">{copyDictionary.c1854e4341c6a7562}<input type="number" min="0" max="99" step="1" inputMode="numeric" value={context.companionCount ?? 0} onChange={e => setContext({ ...context, companionCount: e.target.value === '' ? undefined : Math.max(0, Math.min(99, Math.floor(Number(e.target.value) || 0))) })}/></label>
    <button onClick={() => { const date = new Date(); date.setDate(date.getDate() + 1); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); setContext({ ...context, journeyDate: local }); }}>{copyDictionary.c36fe4dfad0e7c30c}</button>
    </section>}
    {show(2) && <section className="query-section" aria-label={copyDictionary.c9bc8bcdf214c5c2e}><h2>{copyDictionary.c71382230c628edca}</h2>
      <label className="catalog-search"><Icon name="search" size={18}/><input aria-label={copyDictionary.cc21e12d69e053e63} placeholder={copyDictionary.c9f18d83abb4c3ade} value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)}/></label>
      <div className="travel-device-list expanded-device-list">{visibleDevices.map(item => <button key={item.id} className={`travel-device ${selected.includes(item.id) ? 'selected' : ''}`} aria-pressed={selected.includes(item.id)} onClick={() => toggle(item.id)}><span><Icon name={item.icon} size={23}/>{item.name}</span><span className="selection-mark">{selected.includes(item.id) && <Icon name="check" size={17}/>}</span></button>)}</div>
      {!deviceSearch.trim() && <button aria-expanded={expandedDevices} onClick={() => setExpandedDevices(!expandedDevices)}>{expandedDevices ? copyDictionary.cb6d7ca09b2691b49 : copyDictionary.c748b2a554f0185b2 + options.length + copyDictionary.c0cfa879c4de7105f}</button>}
      {!matches.length && <p>{copyDictionary.c2f0d91a2afe0f1e1}</p>}
      <div className="catalog-add"><input aria-label={copyDictionary.c0fcdeadc1bd911af} placeholder={copyDictionary.c63ac3c35b6907777} value={newDevice} onChange={e => setNewDevice(e.target.value)}/><button aria-label={copyDictionary.c3aea0927d0153234} disabled={!newDevice.trim()} onClick={addDevice}>{copyDictionary.c7a8a11ead50742a2}</button></div>
      <div className="selected-equipment">{chosen.map(item => <button key={item.id} aria-label={copyDictionary.c74966e20df2ea9fd + item.name} onClick={() => toggle(item.id)}>{item.name}<Icon name="close" size={16}/></button>)}</div>
    </section>}
    {show(3) && <section className="query-section" aria-label={copyDictionary.ce161143f3ee2bc33}><h2>{copyDictionary.c3d513e8a39b9ffcb}</h2><p className="catalog-hint">{copyDictionary.c822e9c8d23ead0a6}</p>
      {chosen.length === 0 && <p>{copyDictionary.c49ed8a3303ba7e99}</p>}
      <TravelSpecReview devices={chosen} specs={specs} onChange={update}/>
      {chosen.length > 0 && <TravelParameterGuide mode={mode} devices={chosen} specs={specs} onChange={update} onCheck={props.onStart} invalid={invalid}/>}
      <details><summary>{copyDictionary.c26d08befb271bc7a}</summary>
      {chosen.map(item => item.type === 'guide-dog' ? <fieldset className="transport-specs" key={item.id}><legend>{item.name}</legend><p>{copyDictionary.c6e2644ff5a52b534}</p></fieldset> : <fieldset className="transport-specs" key={item.id}><legend>{item.name}</legend>
        {largeDeviceTypes.has(item.type) && <p>{copyDictionary.cb9463f03f470fbe1}</p>}
        <details open={largeDeviceTypes.has(item.type)}><summary>{largeDeviceTypes.has(item.type) ? copyDictionary.cb7d06d4f5d98c0d3 : copyDictionary.c940c37d8f6588b08}</summary><div className="field-grid two">{([['lengthCm', copyDictionary.ccac59929ce2f0903], ['widthCm', copyDictionary.cba5eb67d22a0607a], ['heightCm', copyDictionary.cf21fa130719feb10], ['weightKg', copyDictionary.c0939e081280f022c]] as const).map(([field, label]) => <label key={field}>{label}<input aria-label={`${item.name}${label}`} type="number" min="0.01" step="any" value={specs[item.id]?.[field] ?? ''} placeholder={copyDictionary.c7f05190592e57c0e} onChange={e => update(item.id, field, numberValue(e.target.value))}/></label>)}</div>
        <label className="travel-field">{copyDictionary.c8c3461725ed3e3f8}<select aria-label={copyDictionary.ce3b0c44298fc1c14 + item.name + copyDictionary.c1a745390e3e4f8c2} value={specs[item.id]?.folded ?? 'unknown'} onChange={e => update(item.id, 'folded', e.target.value)}><option value="unknown">{copyDictionary.c8b9bc177d5663856}</option><option value="yes">{copyDictionary.c8f70d047ab6f0630}</option><option value="no">{copyDictionary.c6ef03cc71e8b36fc}</option></select></label>
        </details><label className="travel-field">{copyDictionary.ccc64d927855b9fde}<select aria-label={copyDictionary.ce3b0c44298fc1c14 + item.name + copyDictionary.ccc64d927855b9fde} value={specs[item.id]?.batteryType ?? 'unknown'} onChange={e => update(item.id, 'batteryType', e.target.value)}><option value="unknown">{copyDictionary.cc098e854e60b951a}</option><option value="none">{copyDictionary.cd0b98b6b5127b3fd}</option><option value="lithium">{copyDictionary.c0cad03728e492a1a}</option><option value="other">{copyDictionary.caa467456270985d6}</option></select></label>
        {specs[item.id]?.batteryType === 'lithium' && <div className="field-grid two"><label>{copyDictionary.c11e56f44f01e541d}<input aria-label={copyDictionary.ce3b0c44298fc1c14 + item.name + copyDictionary.cef3077b434e69a44} type="number" min="0.01" step="any" value={specs[item.id]?.batteryWh ?? ''} onChange={e => update(item.id, 'batteryWh', numberValue(e.target.value))}/></label><label>{copyDictionary.cc0c73dc664361a97}<select aria-label={copyDictionary.ce3b0c44298fc1c14 + item.name + copyDictionary.c7111167bc565a5c0} value={specs[item.id]?.batteryCount ?? ''} onChange={e => update(item.id, 'batteryCount', e.target.value ? Number(e.target.value) : undefined)}><option value="">{copyDictionary.cc098e854e60b951a}</option><option value={1}>{copyDictionary.c61e4a1d39b982d87}</option><option value={2}>{copyDictionary.cc5ffa29b91ea521f}</option></select></label><label>{copyDictionary.cd06fab1cad7bc932}<select aria-label={copyDictionary.ce3b0c44298fc1c14 + item.name + copyDictionary.ca237c132cc1845a6} value={specs[item.id]?.removable ?? 'unknown'} onChange={e => update(item.id, 'removable', e.target.value)}><option value="unknown">{copyDictionary.cc098e854e60b951a}</option><option value="yes">{copyDictionary.c653483205eea16ee}</option><option value="no">{copyDictionary.cb98f332026c596bb}</option></select></label></div>}
        {item.dimensions && !sampleDeviceField(item) && <p className="catalog-hint">{copyDictionary.c9bfc56e1dc835795}{item.dimensions} · {item.weight} · {item.battery}{copyDictionary.cc9cb6ab59dbd1850}</p>}
        <PrimaryButton variant="ghost" disabled={!specs[item.id] || invalid} onClick={() => { props.onRemember?.(item, specs[item.id]); setSaveStatus(item.name + copyDictionary.c977fe381f602f6f5); }}>{copyDictionary.c07e6b6703f637476}</PrimaryButton>
      </fieldset>)}
      {chosen.some(item => largeDeviceTypes.has(item.type)) && <fieldset className="transport-specs"><legend>{copyDictionary.c3729177e82fba8a2}</legend><p>{copyDictionary.ceee4511098124757}</p><div className="field-grid two">{([['availableLengthCm', copyDictionary.cfb33f8b91d02c9ee], ['availableWidthCm', copyDictionary.c48a0ee5d9c69e912], ['availableHeightCm', copyDictionary.c531532937111e72a], ['doorWidthCm', copyDictionary.c9f9ccffa13aefcd8], ['availableWeightKg', copyDictionary.c1ac4b0641c30288a]] as const).map(([field, label]) => <label key={field}>{label}<input aria-label={label} type="number" min="0.01" step="any" value={context[field] ?? ''} onChange={e => setContext({ ...context, [field]: numberValue(e.target.value) })}/></label>)}</div></fieldset>}
      </details>
      {invalid && <p role="alert" className="form-error">{copyDictionary.c90b3531faac1bc6d}</p>}
      <p role="status">{saveStatus}</p>
    </section>}
    <div className="bottom-sticky"><p aria-live="polite">{getTravelMeta(mode).label}{copyDictionary.c85da02fc14ae50d7}{selected.length}{copyDictionary.c134d70d351ac0a41}</p>
      {step > 1 && <PrimaryButton variant="ghost" onClick={() => setStep(step - 1)}>{copyDictionary.cda336fdc0dbd1818}</PrimaryButton>}
      {step < 3 && <PrimaryButton onClick={() => setStep(step + 1)}>{copyDictionary.cacfc4e74a650e7df}</PrimaryButton>}
      <PrimaryButton onClick={props.onStart}>{copyDictionary.cd7f7eae5e488f230}</PrimaryButton>
    </div>
  </section>;
}
