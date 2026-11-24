import { copyDictionary } from "../app/copyDictionary.ts";
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { LiveFamilyPanel } from './LiveSharing';
import { RuntimeReadiness } from './RuntimeReadiness';
import { InstallHelp } from './InstallHelp';
import { embedPortable, exportableLife, portableSnapshot } from '../app/portable';
import { PrimaryButton } from '../components/UI';
import { downloadText, localTime } from '../app/accessibility';
import { deviceCard, fieldLabels, formatCardValue, packetHtml, sharePayload, shareStatus } from '../app/journey';
import type { CardField } from '../app/types';
import type { Device, JourneyData, LocalShare, OfflinePacket } from '../app/types';
export function makePacket(journey: JourneyData, devices: Device[]): OfflinePacket {
    return { savedAt: localTime(), mode: copyDictionary.c04fbe1f84206c14b, cards: devices.map(device => journey.cards.find(card => card.id === device.id) ?? deviceCard(device)), results: [], records: journey.records, checklist: [], communication: journey.life.emergency.helpText };
}
function LocalFamilyPanel({ journey, setJourney, devices, packet }: {
    journey: JourneyData;
    setJourney: Dispatch<SetStateAction<JourneyData>>;
    devices: Device[];
    packet?: OfflinePacket;
}) {
    const [scopes, setScopes] = useState<LocalShare['scopes']>(['checklist']);
    const [recipient, setRecipient] = useState(''), [days, setDays] = useState(1), [selected, setSelected] = useState<string | null>(null);
    const [now, setNow] = useState(Date.now()), [status, setStatus] = useState('');
    useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
    const snapshot = packet ?? journey.packet ?? makePacket(journey, devices);
    const share = journey.shares.find(item => item.id === selected);
    const payload = share ? sharePayload(snapshot, share, now) : null;
    return <section className="task-panel"><h2>{copyDictionary.cd953c0615ac3ca63}</h2><p className="prototype-note">{copyDictionary.cbacc5fa45313054a}</p>
    <label>{copyDictionary.c568f388351fd9ba1}<input value={recipient} onChange={event => setRecipient(event.target.value)} placeholder={copyDictionary.c3a27498dba0eab06}/></label>
    {([['devices', copyDictionary.ce161143f3ee2bc33], ['records', copyDictionary.c069de117974f0984], ['checklist', copyDictionary.ca9b6b5eae663376a]] as const).map(([id, label]) => <label key={id} className="switch-line"><input type="checkbox" checked={scopes.includes(id)} onChange={event => setScopes(current => event.target.checked ? [...current, id] : current.filter(scope => scope !== id))}/>{label}</label>)}
    <label>{copyDictionary.c197b45f9115c740d}<select value={days} onChange={event => setDays(Number(event.target.value))}><option value={1}>{copyDictionary.c30c21284df4feac6}</option><option value={3}>{copyDictionary.c0c3f03b97727bcb3}</option><option value={7}>{copyDictionary.c38eefacbb326e37f}</option></select></label>
    <PrimaryButton disabled={!scopes.length} onClick={() => { const item: LocalShare = { id: 'share-' + Date.now(), recipient: recipient.trim(), expiresAt: Date.now() + days * 86400000, revoked: false, scopes, previewedAt: localTime() }; setJourney(current => ({ ...current, shares: [...current.shares, item] })); setSelected(item.id); setNow(Date.now()); }}>{copyDictionary.c5827bca3c90a5615}</PrimaryButton>
    {journey.shares.map(item => <article className="record-row" key={item.id}><strong>{item.recipient || copyDictionary.cb3c69ff0fe9209dc} · {shareStatus(item, now)}</strong><p>{copyDictionary.cd42f771111002de2}{new Date(item.expiresAt).toLocaleString('zh-CN')}</p><button disabled={shareStatus(item, now) !== copyDictionary.c11afd2a534395b18} onClick={() => setSelected(item.id)}>{copyDictionary.ca9c1deca85be9050}</button><button disabled={item.revoked} onClick={() => { setJourney(current => ({ ...current, shares: current.shares.map(row => row.id === item.id ? { ...row, revoked: true } : row) })); setStatus(copyDictionary.cc1c16042fdff09e4); }}>{copyDictionary.c61a9516bfbf4cdf1}</button></article>)}
    {share && <div className="share-preview"><h3>{copyDictionary.c2e3c2940b8d01947}</h3>{payload ? <>{payload.devices && <section><h3>{copyDictionary.c8f89fd78dd48f8cf}</h3>{payload.devices.length ? payload.devices.map(card => <article key={card.id} className="record-row"><strong>{card.name}</strong>{Object.entries(card.values).map(([field, value]) => <p key={field}>{fieldLabels[field as CardField]}：{formatCardValue(field as CardField, value)}（{card.evidence[field as CardField]?.confirmed ? copyDictionary.cf469a927b1bcdb32 : copyDictionary.ca8b0bd9c65f7fad5}）</p>)}</article>) : <p>{copyDictionary.cd541f9cf7a3cfb33}</p>}</section>}{payload.records && <section><h3>{copyDictionary.c15ac5c60740f0b50}</h3>{payload.records.length ? payload.records.map(record => <article key={record.id} className="record-row"><strong>{record.carrier} · {record.itinerary}</strong><p>{record.date}</p><p>{record.reply}</p></article>) : <p>{copyDictionary.cf9aee684dc631e21}</p>}</section>}{payload.checklist && <section><h3>{copyDictionary.cf05ebc79ecb3f639}</h3>{payload.checklist.length ? payload.checklist.map(item => <p key={item.id}>{item.checked ? copyDictionary.c856989a3e63f11cb : copyDictionary.ca92e3ad66e20e7b7}：{item.label}<br />{item.detail}</p>) : <p>{copyDictionary.cdd22b693762d3547}</p>}</section>}<PrimaryButton onClick={() => { const scoped: OfflinePacket = { savedAt: localTime(), mode: snapshot.mode, cards: payload.devices ?? [], results: [], records: payload.records ?? [], checklist: payload.checklist ?? [], communication: '' }; downloadText(packetHtml(scoped), copyDictionary.c06d5ab0a79e48a74, 'text/html;charset=utf-8'); setStatus(copyDictionary.c68df4b7b642e7375); }}>{copyDictionary.c22b7f4f31fcaf281}</PrimaryButton></> : <p>{copyDictionary.cfb33f228ac7ee053}</p>}</div>}
    <label className="switch-line"><input type="checkbox" checked={journey.life.caregiverHelp} onChange={event => setJourney(current => ({ ...current, life: { ...current.life, caregiverHelp: event.target.checked } }))}/>{copyDictionary.ca8b9732f26cd8901}</label><p>{copyDictionary.cb0c35ae79aa35c93}</p><p role="status">{status}</p>
  </section>;
}
export function OfflineWorkspace({ journey, devices, onBack }: {
    journey: JourneyData;
    devices: Device[];
    onBack: () => void;
}) {
    const [includeLife, setIncludeLife] = useState(false), [includeDevices, setIncludeDevices] = useState(false), [includeTrip, setIncludeTrip] = useState(false), [status, setStatus] = useState('');
    const packet = journey.packet ?? makePacket(journey, devices);
    const [offlineState, setOfflineState] = useState(copyDictionary.ca780aa8feb78f158);
    useEffect(() => {
        if (!window.isSecureContext || !('serviceWorker' in navigator)) {
            setOfflineState(copyDictionary.c82712b4eb8c2aa92);
            return;
        }
        let active = true;
        navigator.serviceWorker.getRegistration().then(registration => { if (active)
            setOfflineState(registration?.active ? copyDictionary.c59b0fd36fa233c70 : copyDictionary.c75dd3a0c135653e8); }).catch(() => { if (active)
            setOfflineState(copyDictionary.cc7bed0dbab9ef464); });
        return () => { active = false; };
    }, []);
    return <section className="screen"><button className="back-link" onClick={onBack}>{copyDictionary.c572cf45ba43634b3}</button><h1>{copyDictionary.c93f004ab9ea94276}</h1><p className="prototype-note" role="status">{offlineState}</p><p>{copyDictionary.cc63562b4bd451335}</p>
    <label className="switch-line"><input type="checkbox" checked={includeDevices} onChange={event => setIncludeDevices(event.target.checked)}/>{copyDictionary.c6f82f7368c23184e}{devices.length}{copyDictionary.c2885f75d18ff9762}</label>
    <label className="switch-line"><input type="checkbox" checked={includeTrip} onChange={event => setIncludeTrip(event.target.checked)}/>{copyDictionary.c811937ab78cfdb1d}</label>
    <label className="switch-line"><input type="checkbox" checked={includeLife} onChange={event => setIncludeLife(event.target.checked)}/>{copyDictionary.c49e520727acf285e}</label>
    <PrimaryButton disabled={!includeDevices && !includeLife && !includeTrip} onClick={() => { const content: OfflinePacket = { ...packet, savedAt: localTime(), cards: includeDevices ? makePacket(journey, devices).cards : [], results: includeTrip ? packet.results : [], records: includeTrip ? journey.records : [], checklist: includeTrip ? packet.checklist : [], communication: includeLife ? journey.life.emergency.helpText : '', life: includeLife ? exportableLife(journey.life) : undefined }; downloadText(packetHtml(content), copyDictionary.c609646e0db3b5a93, 'text/html;charset=utf-8'); setStatus(copyDictionary.cd4f44ce731ce9cdb); }}>{copyDictionary.cb88ef4c4abe01bac}</PrimaryButton>
    <PrimaryButton disabled={!includeDevices && !includeLife && !includeTrip} onClick={async () => { try {
        const response = await fetch('/offline-app.html');
        if (!response.ok)
            throw Error(copyDictionary.cd18be9bd8fcf2585);
        const template = await response.text();
        if (!template.includes(copyDictionary.c73d5a45deee889a3))
            throw Error(copyDictionary.ce43be162c5be712d);
        const snapshot = portableSnapshot(journey, devices, { devices: includeDevices, life: includeLife, trip: includeTrip });
        downloadText(embedPortable(template, snapshot), copyDictionary.cce423542bb699343, 'text/html;charset=utf-8');
        setStatus(copyDictionary.cebccede74ce7f5c2);
    }
    catch (error) {
        setStatus((error as Error).message);
    } }}>{copyDictionary.c19bbc3bb0b844ba7}</PrimaryButton>
    <RuntimeReadiness /><InstallHelp /><p role="status">{status}</p><p className="prototype-note">{copyDictionary.cb35ac51041f60dbb}</p>
  </section>;
}
export function FamilyPanel({ journey, setJourney, devices, packet, onChecklist }: {
    journey: JourneyData;
    setJourney: Dispatch<SetStateAction<JourneyData>>;
    devices: Device[];
    packet?: OfflinePacket;
    onChecklist?: (items: import('../app/types').ChecklistItem[]) => void;
}) { const snapshot = packet ?? journey.packet ?? makePacket(journey, devices); return <><LiveFamilyPanel snapshot={snapshot} shares={journey.shares} onShares={shares => setJourney(current => ({ ...current, shares }))} onChecklist={items => { onChecklist?.(items); setJourney(current => ({ ...current, packet: { ...snapshot, checklist: items } })); }}/><details><summary>{copyDictionary.c9e672120869409e5}</summary><LocalFamilyPanel journey={journey} setJourney={setJourney} devices={devices} packet={snapshot}/></details></>; }
