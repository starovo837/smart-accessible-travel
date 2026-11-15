import { copyDictionary } from "../app/copyDictionary.ts";
import { useState } from 'react';
import { Modal, PageHeader, PrimaryButton } from '../components/UI';
import { deviceMeta, emptyDevice, recognizeDevicePlate } from '../app/mock';
import { largeDeviceTypes } from '../app/travelRules';
import { extraEquipment } from '../app/catalog';
import { deviceCard, fieldLabels, originLabels, validCard } from '../app/journey';
import type { CardField, Device, DeviceCard } from '../app/types';
const enums: Partial<Record<CardField, [
    string,
    string
][]>> = { batteryType: [['none', copyDictionary.caf0bea91f489b74c], ['lithium', copyDictionary.c0cad03728e492a1a], ['other', copyDictionary.c417bdbecdc24f0d5], ['unknown', copyDictionary.ca8b0bd9c65f7fad5]], removable: [['yes', copyDictionary.c18fbe3aef725614b], ['no', copyDictionary.cb98f332026c596bb], ['unknown', copyDictionary.ca8b0bd9c65f7fad5]], batteryCount: [['1', copyDictionary.c61e4a1d39b982d87], ['2', copyDictionary.cc5ffa29b91ea521f]] };
export function Equipment({ devices, cards, onSave, onRemove, onTravel, onBack }: {
    devices: Device[];
    cards: DeviceCard[];
    onSave: (card: DeviceCard) => void;
    onRemove: (id: string) => Promise<void>;
    onTravel: (card: DeviceCard) => void;
    onBack: () => void;
}) {
    const [draft, setDraft] = useState<DeviceCard | null>(null), [status, setStatus] = useState(''), [loading, setLoading] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [customName, setCustomName] = useState(''), [remove, setRemove] = useState<string | null>(null);
    const options = [...Object.entries(deviceMeta).map(([id, meta]) => ({ id, label: meta.label })), ...extraEquipment.map(item => ({ id: item.id, label: item.label })), { id: 'other', label: copyDictionary.cc4b7e1589caab18d }];
    const editValue = (field: CardField, value: string) => { if (!draft)
        return; setDraft({ ...draft, source: 'manual', values: { ...draft.values, [field]: value }, evidence: { ...draft.evidence, [field]: { origin: 'measurement', confirmed: false, note: copyDictionary.c6d58ec22096d1215 } } }); };
    return <section className="screen"><PageHeader title={copyDictionary.c725c307706c2ff5a} subtitle={copyDictionary.ccef938e64d680ca7} onBack={onBack}/>
    {devices.map(device => { const card = cards.find(item => item.id === device.id) ?? deviceCard(device); return <article className="record-row" key={device.id}><h2>{card.name}</h2><p>{card.prospective ? copyDictionary.c8ecf5b7f7443949f : copyDictionary.c0542b7f63404edef} · {Object.values(card.evidence).filter(item => item?.confirmed).length}{copyDictionary.ca7a500cddae9ccd3}</p><p>{card.dimensions || copyDictionary.c47babeed7cfbedbb} · {card.weight || copyDictionary.c15025d19325f34d6}</p><div className="action-row"><button onClick={() => { setDraft(structuredClone(card)); setStatus(''); }}>{copyDictionary.c82f9d126eec7fd2e}</button><button onClick={() => onTravel(card)}>{copyDictionary.cdf79e160c5798631}</button><button className="danger-link" onClick={() => setRemove(card.id)}>{copyDictionary.ce961c3f3e8751109}</button></div></article>; })}
    {!devices.length && <p className="empty-device">{copyDictionary.cbce4ba6a5670dfe3}</p>}
    {!draft ? <PrimaryButton onClick={() => { setDraft(deviceCard({ ...emptyDevice(), id: 'device-' + Date.now(), name: copyDictionary.c90d5ddbd7f5e112e })); setStatus(''); }}>{copyDictionary.c3aea0927d0153234}</PrimaryButton> : <form className="device-form" onSubmit={event => { event.preventDefault(); if (!validCard(draft))
            return setStatus(copyDictionary.c928ac5d39d9f9406); const v = draft.values; const next = { ...draft, type: draft.type === 'other' && customName.trim() ? 'custom:' + customName.trim() : draft.type, name: draft.name.trim(), dimensions: [v.lengthCm ?? '?', v.widthCm ?? '?', v.heightCm ?? '?'].join(' × ') + ' cm', weight: v.weightKg ? v.weightKg + ' kg' : '', battery: v.batteryType === 'none' ? copyDictionary.c484d55613910eb8c : v.batteryWh ? v.batteryWh + ' Wh' : '' }; onSave(next); setDraft(null); setStatus(copyDictionary.c484d27aa6fec1cda); }}>
      <h2>{devices.some(device => device.id === draft.id) ? copyDictionary.c894a3cd7021ee894 : copyDictionary.c3aea0927d0153234}</h2><label>{copyDictionary.c7ebed65070eec811}<select value={options.some(item => item.id === draft.type) ? draft.type : 'other'} onChange={event => setDraft({ ...deviceCard({ ...emptyDevice(event.target.value), id: draft.id, name: options.find(item => item.id === event.target.value)?.label ?? '' }), type: event.target.value })}>{options.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      {draft.type === 'other' && <label>{copyDictionary.c12cf78fe6dd5513b}<input required value={customName} onChange={event => setCustomName(event.target.value)} placeholder={copyDictionary.caad46c780e3c0d1f}/></label>}
      <label>{copyDictionary.c65d8f92232ae77b0}<input required value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>
      <PrimaryButton variant="secondary" disabled={loading || !deviceMeta[draft.type]} onClick={async () => { setLoading(true); const sample = await recognizeDevicePlate(draft.type); setDraft({ ...deviceCard(sample), id: draft.id, name: draft.name }); setLoading(false); setStatus(copyDictionary.c89ae5ada1ff53e09); }}>{loading ? copyDictionary.cb991de1551aa8429 : copyDictionary.cca8ccb94cea7a061}</PrimaryButton>
      <p className="prototype-note">{copyDictionary.c99b3a0b2e9959c9d}</p>
      <label className="switch-line"><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)}/>{copyDictionary.c15c02667607adbe9}</label>
      {(Object.entries(fieldLabels) as [
            CardField,
            string
        ][]).filter(([field]) => showAll || Boolean(draft.values[field]) || field === 'batteryType' || (largeDeviceTypes.has(draft.type) && ['lengthCm', 'widthCm', 'heightCm', 'weightKg'].includes(field)) || (draft.type === 'cane' && field === 'lengthCm') || (draft.values.batteryType === 'lithium' && ['batteryWh', 'batteryCount', 'removable'].includes(field))).map(([field, label]) => <div className="parameter-edit" key={field}><label>{label}{enums[field] ? <select value={draft.values[field] ?? ''} onChange={event => editValue(field, event.target.value)}><option value="">{copyDictionary.c7f05190592e57c0e}</option>{enums[field]!.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select> : <input type="number" min="0.01" step="any" value={draft.values[field] ?? ''} onChange={event => editValue(field, event.target.value)}/>}</label><small>{draft.evidence[field] ? originLabels[draft.evidence[field]!.origin] : copyDictionary.ca35ef95361b84d05} · {draft.evidence[field]?.note}</small><label className="switch-line"><input type="checkbox" disabled={!draft.values[field] || draft.values[field] === 'unknown'} checked={Boolean(draft.evidence[field]?.confirmed)} onChange={event => setDraft({ ...draft, evidence: { ...draft.evidence, [field]: { origin: draft.evidence[field]?.origin ?? 'measurement', note: draft.evidence[field]?.note ?? copyDictionary.ca9476988615ee60a, confirmed: event.target.checked } } })}/>{copyDictionary.c0499963b5143dda2}</label></div>)}
      <div className="action-row"><PrimaryButton type="submit" disabled={loading}>{copyDictionary.cf28abe871ada654f}</PrimaryButton><PrimaryButton variant="ghost" onClick={() => setDraft(null)}>{copyDictionary.c2cd0f3be8738a86c}</PrimaryButton></div>
    </form>}
    <p className="operation-status" role="status">{status}</p><PrimaryButton variant="ghost" onClick={onBack}>{copyDictionary.c3af988f872b16fa5}</PrimaryButton>
    {remove && <Modal title={copyDictionary.c03a751ab0a92bebd} onClose={() => setRemove(null)}><p>{copyDictionary.c0f3f3c212121a9c7}</p><PrimaryButton variant="danger" onClick={async () => { setLoading(true); try {
        await onRemove(remove);
        setDraft(null);
        setRemove(null);
        setStatus(copyDictionary.ce20b40e514039cc5);
    }
    catch (error) {
        setStatus((error as Error).message);
    }
    finally {
        setLoading(false);
    } }}>{copyDictionary.cee7dea070d88bb3c}</PrimaryButton></Modal>}
  </section>;
}
