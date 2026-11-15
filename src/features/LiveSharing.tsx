import { copyDictionary } from "../app/copyDictionary.ts";
import { useEffect, useState } from 'react';
import { isStudio } from '../app/deployment';
import { fieldLabels, formatCardValue } from '../app/journey';
import type { CardField } from '../app/types';
import { copyText } from '../app/accessibility';
import { prepareService, service } from '../app/service';
import { PrimaryButton } from '../components/UI';
import type { ChecklistItem, LocalShare, OfflinePacket } from '../app/types';
interface ShareRecord {
    id: string;
    expiresAt: number;
    revision: number;
    updatedAt: string;
    permissions: 'view' | 'suggest';
    payload: {
        devices?: {
            id: string;
            name: string;
            values: Record<string, string>;
            evidence: Record<string, {
                confirmed: boolean;
            }>;
        }[];
        records?: {
            id: string;
            carrier: string;
            itinerary: string;
            date: string;
            reply: string;
        }[];
        checklist?: ChecklistItem[];
    };
    proposals: {
        itemId: string;
        checked: boolean;
        at: string;
    }[];
    ownerToken?: string;
    viewToken?: string;
}
const payloadOf = (packet: OfflinePacket) => ({ devices: packet.cards, records: packet.records, checklist: packet.checklist });
function Content({ record, onSuggest }: {
    record: ShareRecord;
    onSuggest?: (id: string, checked: boolean) => void;
}) { return <><p>{copyDictionary.cb6eb0a56169232ae}{new Date(record.updatedAt).toLocaleString('zh-CN')}{copyDictionary.c33ba2aacc7d33d48}{record.revision}</p>{record.payload.devices && <section><h3>{copyDictionary.c81e6da31ca2cd7cf}</h3>{record.payload.devices.map(card => <article className="record-row" key={card.id}><strong>{card.name}</strong>{Object.entries(card.values).map(([key, value]) => <p key={key}>{fieldLabels[key as CardField] ?? key}：{formatCardValue(key as CardField, value)}（{card.evidence[key]?.confirmed ? copyDictionary.cf469a927b1bcdb32 : copyDictionary.c803aed43a6c2e9e6}）</p>)}</article>)}</section>}{record.payload.records && <section><h3>{copyDictionary.c560ecf8a6465932e}</h3>{record.payload.records.map(item => <article key={item.id}><h4>{item.carrier} · {item.itinerary}</h4><p>{item.date} · {item.reply}</p></article>)}</section>}{record.payload.checklist && <section><h3>{copyDictionary.ca9b6b5eae663376a}</h3>{record.payload.checklist.map(item => <article className="record-row" key={item.id}><p>{item.checked ? copyDictionary.c856989a3e63f11cb : copyDictionary.ca92e3ad66e20e7b7}：{item.label}</p><p>{item.detail}</p>{onSuggest && record.permissions === 'suggest' && <button onClick={() => onSuggest(item.id, !item.checked)}>{copyDictionary.c0114a4a07879b15b}{item.checked ? copyDictionary.c7f750504c5bac7d8 : copyDictionary.cf28461bb49c85647}{copyDictionary.c421c00ca0cc3270e}</button>}</article>)}</section>}</>; }
export function LiveFamilyPanel({ snapshot, shares, onShares, onChecklist }: {
    snapshot: OfflinePacket;
    shares: LocalShare[];
    onShares: (shares: LocalShare[]) => void;
    onChecklist?: (items: ChecklistItem[]) => void;
}) {
    const [shareBase, setShareBase] = useState(location.origin), [addresses, setAddresses] = useState<{
        name: string;
        url: string;
    }[]>([]);
    useEffect(() => { if (isStudio || !['localhost', '127.0.0.1'].includes(location.hostname))
        return; service<{
        addresses: {
            name: string;
            url: string;
        }[];
    }>('connection').then(value => { setAddresses(value.addresses); const preferred = value.addresses.find(item => /wlan|wi-fi|无线/i.test(item.name)) ?? value.addresses[0]; if (preferred)
        setShareBase(preferred.url); }).catch(() => { }); }, []);
    const [scopes, setScopes] = useState<LocalShare['scopes']>(['checklist']), [days, setDays] = useState(1), [allow, setAllow] = useState(false), [consent, setConsent] = useState(false), [status, setStatus] = useState(''), [active, setActive] = useState<ShareRecord | null>(null), [selected, setSelected] = useState<LocalShare | null>(null), [busy, setBusy] = useState(false);
    const load = async (item: LocalShare) => { try {
        setActive(await service<ShareRecord>('shares/' + item.serverId + '/owner', undefined, item.ownerToken));
        setSelected(item);
    }
    catch (error) {
        setStatus((error as Error).message);
    } };
    useEffect(() => { if (!selected)
        return; const timer = setInterval(() => void load(selected), 15000); return () => clearInterval(timer); }, [selected?.id]);
    const perform = async (task: () => Promise<void>) => { if (busy)
        return; setBusy(true); try {
        await task();
    }
    catch (error) {
        setStatus((error as Error).message);
    }
    finally {
        setBusy(false);
    } };
    return <section className="task-panel"><h2>{copyDictionary.c8716bd6629c88b04}</h2>{addresses.length > 0 && <label>{copyDictionary.c109e8f3bc80d2958}<select value={shareBase} onChange={e => setShareBase(e.target.value)}>{addresses.map(item => <option key={item.url} value={item.url}>{item.name} · {item.url}</option>)}</select></label>}{['localhost', '127.0.0.1'].some(item => shareBase.includes(item)) && <p>{copyDictionary.ceba627ab8411994e}</p>}<p>{copyDictionary.cb8b7b50ecfeeb658}{isStudio ? copyDictionary.ca04b2a001e4df75d : copyDictionary.c3b2b91444866aa48}</p>{([['devices', copyDictionary.ce161143f3ee2bc33], ['records', copyDictionary.c560ecf8a6465932e], ['checklist', copyDictionary.cc74033cb2a72d370]] as const).map(([key, label]) => <label className="switch-line" key={key}><input type="checkbox" checked={scopes.includes(key)} onChange={e => setScopes(e.target.checked ? [...scopes, key] : scopes.filter(item => item !== key))}/>{label}</label>)}<label>{copyDictionary.c9c2a28e8f98fb5df}<select value={days} onChange={e => setDays(Number(e.target.value))}><option value={1}>{copyDictionary.c7abd0228507e36a3}</option><option value={3}>{copyDictionary.ca03ff7dac33c833f}</option><option value={7}>{copyDictionary.cfbe4336d91e5da43}</option></select></label><label className="switch-line"><input type="checkbox" checked={allow} onChange={e => setAllow(e.target.checked)}/>{copyDictionary.c6877c4f46a4e5efa}</label><label className="switch-line"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>{copyDictionary.c7933372a009bc8e4}</label><p>{copyDictionary.cb060fb4e5f4b0640}</p><PrimaryButton disabled={!consent || !scopes.length || busy} onClick={() => void perform(async () => { await prepareService(); const record = await service<ShareRecord>('shares', { scopes, days, allowSuggestions: allow, consent: true, payload: payloadOf(snapshot) }); const item: LocalShare = { id: record.id, serverId: record.id, ownerToken: record.ownerToken, viewToken: record.viewToken, expiresAt: record.expiresAt, revoked: false, scopes, revision: record.revision, url: shareBase + location.pathname + '#family/' + record.id + '/' + record.viewToken }; onShares([...shares, item]); setSelected(item); setActive(record); setStatus(copyDictionary.c9f0b82539e449a44); })}>{copyDictionary.c89c473b21b24a465}</PrimaryButton>{shares.filter(item => item.serverId).map(item => <article className="record-row" key={item.id}><p>{item.revoked ? copyDictionary.cfef96e34f77b742b : Date.now() >= item.expiresAt ? copyDictionary.cb9d8853e0ce7e6ea : copyDictionary.c1761319287e97c1a} · {new Date(item.expiresAt).toLocaleString('zh-CN')}</p><button disabled={busy || item.revoked} onClick={() => void load(item)}>{copyDictionary.c0f8e1fd728043d6d}</button><button onClick={async () => setStatus(await copyText(item.url ?? '') ? copyDictionary.c8a132e28468c0517 : copyDictionary.cd665b7c78c04cd77)}>{copyDictionary.cfb9727ebf6dd8606}</button><button disabled={busy} onClick={() => void perform(async () => { await service('shares/' + item.serverId + '/owner', undefined, item.ownerToken, undefined, 'DELETE'); onShares(shares.filter(row => row.id !== item.id)); if (selected?.id === item.id) {
        setSelected(null);
        setActive(null);
    } setStatus(copyDictionary.c6dea3ab43e825bc6); })}>{copyDictionary.c04027cb234595160}</button></article>)}{active && selected && <><Content record={active}/><PrimaryButton disabled={busy} onClick={() => void perform(async () => { const updated = await service<ShareRecord>('shares/' + selected.serverId + '/owner', { revision: active.revision, payload: payloadOf(snapshot) }, selected.ownerToken); setActive(updated); setStatus(copyDictionary.c2a9c326b6fb13c78); })}>{copyDictionary.c067cbec20947450f}</PrimaryButton><button disabled={busy} onClick={() => void perform(async () => { await service('shares/' + selected.serverId + '/owner', { revision: active.revision, revoke: true }, selected.ownerToken); onShares(shares.map(item => item.id === selected.id ? { ...item, revoked: true } : item)); setActive(null); setSelected(null); setStatus(copyDictionary.c782ad627a1d21d57); })}>{copyDictionary.cf51eeade1aa02c9b}</button>{active.proposals.map(proposal => <article key={proposal.itemId}><p>{copyDictionary.c043ec60a3d249a9e}{active.payload.checklist?.find(item => item.id === proposal.itemId)?.label} → {proposal.checked ? copyDictionary.cf28461bb49c85647 : copyDictionary.c7f750504c5bac7d8}</p><button disabled={busy || !onChecklist} onClick={() => void perform(async () => { const items = snapshot.checklist.map(item => item.id === proposal.itemId ? { ...item, checked: proposal.checked } : item); const updated = await service<ShareRecord>('shares/' + selected.serverId + '/owner', { revision: active.revision, payload: { ...payloadOf(snapshot), checklist: items }, acceptedIds: [proposal.itemId] }, selected.ownerToken); onChecklist?.(items); setActive(updated); setStatus(copyDictionary.cdc5139535ff9ad40); })}>{copyDictionary.c72e420f2539d1f36}</button></article>)}</>}<p role="status">{status}</p></section>;
}
export function FamilyViewer({ id, token }: {
    id: string;
    token: string;
}) {
    const [record, setRecord] = useState<ShareRecord | null>(null), [status, setStatus] = useState(copyDictionary.c8b045d1e65e2ee01);
    const refresh = async () => { try {
        const value = await service<ShareRecord>('shares/' + id, undefined, token);
        setRecord(value);
        setStatus(copyDictionary.c44ba1326869f4566);
    }
    catch (error) {
        setRecord(null);
        setStatus((error as Error).message);
    } };
    useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 15000); return () => clearInterval(timer); }, [id, token]);
    return <main className="app-shell"><section className="app-frame screen"><h1>{copyDictionary.c399dca3bf5c25cc6}</h1><p>{copyDictionary.c428f3c44da8c2772}</p><button onClick={() => void refresh()}>{copyDictionary.cd4f1dfe69b992741}</button><p role="status">{status}</p>{record && <Content record={record} onSuggest={async (itemId, checked) => { try {
        setRecord(await service<ShareRecord>('shares/' + id + '/suggest', { revision: record.revision, itemId, checked }, token));
        setStatus(copyDictionary.cbc516a1c9f88de12);
    }
    catch (error) {
        setStatus((error as Error).message);
    } }}/>}<button onClick={() => { location.hash = ''; location.reload(); }}>{copyDictionary.c6a1c265f632627ef}</button></section></main>;
}
