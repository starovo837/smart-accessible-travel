import { copyDictionary } from "../../app/copyDictionary.ts";
import { useEffect, useRef, useState } from 'react';
import { Modal, PageHeader, PrimaryButton } from '../../components/UI';
import { copyText, readText, stopReading } from '../../app/accessibility';
import { isStudio } from '../../app/deployment';
import { prepareService, service } from '../../app/service';
import { helpState, helpStatusText, helpUrl, type HelpCreatedRecord, type HelpLocation, type HelpPublicRecord, type HelpSessionRecord } from '../../app/liveHelp';
interface Preview {
    text: string;
    recipientLabel: string;
    minutes: number;
    location?: HelpLocation;
}
export function LiveHelp({ records, onRecordsChange }: {
    records: HelpSessionRecord[];
    onRecordsChange: (records: HelpSessionRecord[]) => void;
}) {
    const [message, setMessage] = useState(''), [text, setText] = useState(copyDictionary.ce4d7550d4d3be065), [recipient, setRecipient] = useState(''), [minutes, setMinutes] = useState(30), [includeLocation, setIncludeLocation] = useState(false), [locationLabel, setLocationLabel] = useState(''), [position, setPosition] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null), [locating, setLocating] = useState(false), [preview, setPreview] = useState<Preview | null>(null), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [selected, setSelected] = useState(''), [now, setNow] = useState(Date.now());
    const [base, setBase] = useState(location.origin + location.pathname), [addresses, setAddresses] = useState<{
        name: string;
        url: string;
    }[]>([]);
    const latest = useRef(records), busyRef = useRef(false), epoch = useRef(0), mounted = useRef(true), request = useRef<AbortController | null>(null);
    latest.current = records;
    useEffect(() => { mounted.current = true; const timer = setInterval(() => setNow(Date.now()), 15000); return () => { mounted.current = false; epoch.current++; request.current?.abort(); clearInterval(timer); stopReading(); }; }, []);
    useEffect(() => { if (isStudio || !['localhost', '127.0.0.1'].includes(location.hostname))
        return; service<{
        addresses: {
            name: string;
            url: string;
        }[];
    }>('connection').then(value => { if (!mounted.current)
        return; setAddresses(value.addresses ?? []); }).catch(() => { }); }, []);
    const update = (id: string, change: Partial<HelpSessionRecord>) => onRecordsChange(latest.current.map(record => record.id === id ? { ...record, ...change } : record));
    const perform = async (work: (signal: AbortSignal) => Promise<void>) => { if (busyRef.current)
        return; busyRef.current = true; setBusy(true); const version = ++epoch.current, controller = new AbortController(); request.current = controller; try {
        await work(controller.signal);
    }
    catch (error) {
        if (mounted.current && version === epoch.current && (error as Error).name !== 'AbortError')
            setMessage((error as Error).message);
    }
    finally {
        busyRef.current = false;
        if (mounted.current && version === epoch.current)
            setBusy(false);
    } };
    const refresh = async (record: HelpSessionRecord, signal?: AbortSignal) => {
        if (helpState(record) === 'expired' || record.lastStatus === 'revoked') {
            setNow(Date.now());
            return;
        }
        const next = await service<HelpPublicRecord>('help/' + record.id + '/owner', undefined, record.ownerToken, signal);
        if (!mounted.current || signal?.aborted)
            return;
        update(record.id, { lastStatus: next.status, response: next.response });
        setMessage(next.status === 'acknowledged' ? copyDictionary.cf4bb7ec12ce82255 : next.status === 'declined' ? copyDictionary.cc8d9105ac20a0998 : copyDictionary.c08f61b1b1ebe4553);
    };
    useEffect(() => { if (!selected)
        return; const timer = setInterval(() => { const record = latest.current.find(item => item.id === selected); if (record && !busyRef.current)
        void perform(signal => refresh(record, signal)); }, 15000); return () => clearInterval(timer); }, [selected]);
    const locate = () => { if (!includeLocation)
        return; if (!navigator.geolocation || !window.isSecureContext) {
        setMessage(copyDictionary.cdb7f0fac8e8b2e3e);
        return;
    } setLocating(true); const version = epoch.current; navigator.geolocation.getCurrentPosition(result => { if (!mounted.current)
        return; setLocating(false); if (version !== epoch.current)
        return; setPosition({ latitude: Math.round(result.coords.latitude * 1e5) / 1e5, longitude: Math.round(result.coords.longitude * 1e5) / 1e5 }); setLocating(false); setMessage(copyDictionary.cf91da21e3785ec13); }, () => { if (!mounted.current)
        return; setLocating(false); if (version !== epoch.current)
        return; setMessage(copyDictionary.cb47732b0a151e343); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }); };
    const makePreview = () => { if (!text.trim())
        return setMessage(copyDictionary.c08086b8ad0b10cc9); if (text.length > 1000 || recipient.length > 60 || locationLabel.length > 200)
        return setMessage(copyDictionary.c603011c6c5d2ab8c); if (includeLocation && !locationLabel.trim() && !position)
        return setMessage(copyDictionary.ca87fa37aa42a01d7); setPreview({ text: text.trim(), recipientLabel: recipient.trim(), minutes, ...(includeLocation ? { location: { label: locationLabel.trim(), ...(position ?? {}) } } : {}) }); setConsent(false); setMessage(''); };
    return <section className="live-help"><p>{copyDictionary.c7e236b71f2a9e1bb}</p><label>{copyDictionary.cf8bf98b163adf7fb}<textarea aria-label={copyDictionary.cf8bf98b163adf7fb} maxLength={1000} value={text} onChange={event => setText(event.target.value)}/></label><label>{copyDictionary.cd5ac64808a46739e}<input aria-label={copyDictionary.cd5ac64808a46739e} maxLength={60} value={recipient} onChange={event => setRecipient(event.target.value)} placeholder={copyDictionary.c2af07527f14538e5}/></label><label>{copyDictionary.c67d6a09eddc27523}<select aria-label={copyDictionary.c67d6a09eddc27523} value={minutes} onChange={event => setMinutes(Number(event.target.value))}><option value={15}>{copyDictionary.cdbaa1c565cb1f108}</option><option value={30}>{copyDictionary.c859757ea792a73da}</option><option value={60}>{copyDictionary.cfd70a9cdcc5cab82}</option></select></label><label className="switch-line"><input type="checkbox" checked={includeLocation} onChange={event => { setIncludeLocation(event.target.checked); if (!event.target.checked) {
        setPosition(null);
        setLocationLabel('');
    } }}/>{copyDictionary.cdf5cbe30ff4dde54}</label>{includeLocation && <><label>{copyDictionary.c347be32af388a11f}<input aria-label={copyDictionary.c347be32af388a11f} maxLength={200} value={locationLabel} onChange={event => setLocationLabel(event.target.value)} placeholder={copyDictionary.caf546e38f9d0fa98}/></label><div className="daily-actions"><button disabled={locating || busy} onClick={locate}>{locating ? copyDictionary.c86b6d0d63062ba81 : copyDictionary.cfff93bae672b691f}</button>{position && <button onClick={() => { setPosition(null); setMessage(copyDictionary.c2ba1732115c2c446); }}>{copyDictionary.c4f3ff3f95897dd79}</button>}</div>{position && <p>{copyDictionary.cd45e40398357546f}{position.latitude}，{position.longitude}</p>}</>}{addresses.length > 0 && <label>{copyDictionary.cef49a67424b01a08}<select aria-label={copyDictionary.cef49a67424b01a08} value={base} onChange={event => setBase(event.target.value)}><option value={location.origin + location.pathname}>{copyDictionary.ccc73b4b30037824d}</option>{addresses.map(item => <option key={item.url} value={item.url}>{item.name} · {item.url}{copyDictionary.c47e3c2b720e0ad62}</option>)}</select></label>}{/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base) && <p>{copyDictionary.cc2e496f12dd12a12}</p>}<PrimaryButton disabled={busy} onClick={makePreview}>{copyDictionary.c0d595543fcf8ef82}</PrimaryButton><p>{copyDictionary.ce3e49670ffee581d}</p><h2>{copyDictionary.c10ec9bea6e19ac10}</h2><p>{copyDictionary.c6157a68f2e3edd76}</p>{!records.length && <p>{copyDictionary.c9387d19390be15f4}</p>}{records.map(record => { const state = helpState(record, now), active = !['revoked', 'expired'].includes(state); return <article className="live-help-record" key={record.id}><h3>{record.recipientLabel || copyDictionary.c1570d8d412df3572}</h3><p>{copyDictionary.ca9c570046168acc6}{helpStatusText[state]}{copyDictionary.c4e50171043a3f415}{new Date(record.expiresAt).toLocaleString('zh-CN')}</p>{record.linkAction && <p>{record.linkAction === 'copied' ? copyDictionary.cd8b63978cdfda13f : copyDictionary.c0257e5d517c88fe0}</p>}{record.response && <p>{copyDictionary.ce503a2081cbd06da}{record.response.status === 'acknowledged' ? copyDictionary.c3d63c5ccb9dbe2c3 : copyDictionary.c38acc71950f9b263} · {record.response.name || copyDictionary.c03142d24859618fb}{copyDictionary.c64560368aad10b4a}{new Date(record.response.at).toLocaleString('zh-CN')}</p>}<div className="daily-actions"><button disabled={busy || !active} onClick={() => void perform(async () => { const copied = await copyText(record.viewUrl); if (!mounted.current)
        return; if (copied) {
        update(record.id, { linkAction: 'copied' });
        setMessage(copyDictionary.c0a0981abcba57a0e);
    }
    else
        setMessage(copyDictionary.c8cd5825c75f7d53a); })}>{copyDictionary.c899bf90c3de412d5}</button><button disabled={busy || !active || !navigator.share} onClick={() => void perform(async () => { await navigator.share({ title: copyDictionary.ce2a638bc382a3563, text: copyDictionary.c24e609f9861c96af, url: record.viewUrl }); if (mounted.current) {
        update(record.id, { linkAction: 'shared' });
        setMessage(copyDictionary.ccd3add89b1ac9616);
    } })}>{copyDictionary.c13a1c63fb5dc36ed}</button><button disabled={busy || !active} onClick={() => { setSelected(record.id); void perform(signal => refresh(record, signal)); }}>{copyDictionary.ca0d1e6c147b809f0}</button><button disabled={busy || !active} onClick={() => void perform(async (signal) => { await service('help/' + record.id + '/owner', undefined, record.ownerToken, signal, 'DELETE'); if (mounted.current) {
        update(record.id, { lastStatus: 'revoked' });
        if (selected === record.id)
            setSelected('');
        setMessage(copyDictionary.c78dd3dc244952b2f);
    } })}>{copyDictionary.cb4d6edeb57a8f080}</button></div>{active && <details><summary>{copyDictionary.c1c66d512431eff08}</summary><p style={{ overflowWrap: 'anywhere' }}>{record.viewUrl}</p></details>}</article>; })}<p role="status">{message}</p>{preview && <Modal title={copyDictionary.cf806c081ed1b67e3} onClose={() => { if (!busy)
        setPreview(null); }}><h3>{copyDictionary.ce0c36a479d90662f}</h3><p>{preview.recipientLabel || copyDictionary.c4e7936a868b7c3de}</p><h3>{copyDictionary.c50da12eb42154bc6}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{preview.text}</p><h3>{copyDictionary.c1fb4d574da92f1c1}</h3><p>{preview.location ? [preview.location.label, preview.location.latitude === undefined ? '' : `${preview.location.latitude}，${preview.location.longitude}`].filter(Boolean).join(' · ') : copyDictionary.c06f7f4b5fdf764b9}</p><p>{copyDictionary.c9c2a28e8f98fb5df}{preview.minutes}{copyDictionary.cde2e5d01cde90eb8}</p><label className="switch-line"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy}/>{copyDictionary.c782c1808014c7358}</label><PrimaryButton disabled={!consent || busy} onClick={() => void perform(async (signal) => { if (latest.current.filter(record => helpState(record) === 'waiting' || helpState(record) === 'acknowledged' || helpState(record) === 'declined').length >= 30)
        throw Error(copyDictionary.cf03d44ac55ad0612); await prepareService(); signal.throwIfAborted(); const result = await service<HelpCreatedRecord>('help', { ...preview, consent: true, previewed: true }, undefined, signal); if (!mounted.current || signal.aborted)
        return; const viewUrl = helpUrl(base, result.id, result.viewToken); const record: HelpSessionRecord = { id: result.id, ownerToken: result.ownerToken, viewUrl, expiresAt: result.expiresAt, recipientLabel: result.recipientLabel, lastStatus: result.status }; onRecordsChange([...latest.current.filter(item => !['expired', 'revoked'].includes(helpState(item))), record]); setPreview(null); setSelected(record.id); setMessage(copyDictionary.c637431bf1025adda); })}>{busy ? copyDictionary.c7c0305bc0ce607b2 : copyDictionary.cbd8391c0010292af}</PrimaryButton></Modal>}</section>;
}
export function LiveHelpViewer({ id, token }: {
    id: string;
    token: string;
}) {
    const [record, setRecord] = useState<HelpPublicRecord | null>(null), [name, setName] = useState(''), [message, setMessage] = useState(copyDictionary.c55a34c5384b7b2c9), [busy, setBusy] = useState(false), [now, setNow] = useState(Date.now()), version = useRef(0);
    const load = async (signal?: AbortSignal) => { const current = ++version.current; try {
        const result = await service<HelpPublicRecord>('help/' + id, undefined, token, signal);
        if (!signal?.aborted && current === version.current) {
            setRecord(result);
            setNow(Date.now());
            setMessage(copyDictionary.ca7eed6d23effcba3);
        }
    }
    catch (error) {
        if (!signal?.aborted && current === version.current) {
            setRecord(null);
            setMessage((error as Error).message);
        }
    } };
    useEffect(() => { const controller = new AbortController(); void load(controller.signal); const timer = setInterval(() => void load(controller.signal), 15000); return () => { version.current++; controller.abort(); clearInterval(timer); stopReading(); }; }, [id, token]);
    const respond = async (response: 'acknowledged' | 'declined') => { if (busy)
        return; setBusy(true); version.current++; try {
        const result = await service<HelpPublicRecord>('help/' + id + '/respond', { response, name }, token);
        version.current++;
        setRecord(result);
        setMessage(response === 'acknowledged' ? copyDictionary.c6543afb27fe6664a : copyDictionary.cbb6c01855295b6d8);
    }
    catch (error) {
        setMessage((error as Error).message);
    }
    finally {
        setBusy(false);
    } };
    const expired = record && record.expiresAt <= now;
    return <main className="app-shell"><section className="app-frame screen support-tool-page"><PageHeader title={copyDictionary.c1e99017abaf5553e} subtitle={copyDictionary.c3ec3fc0ab1acf41c}/><p role="status">{message}</p>{record && !expired && <><p>{copyDictionary.c1c2302f92551a9ff}{new Date(record.expiresAt).toLocaleString('zh-CN')}{copyDictionary.cf5adbcfd389c8d2f}</p><h2>{copyDictionary.ce030b94ebd49077a}</h2><p style={{ whiteSpace: 'pre-wrap' }}>{record.text}</p>{record.recipientLabel && <p>{copyDictionary.c1d97ba65ad766226}{record.recipientLabel}</p>}{record.location && <section><h2>{copyDictionary.c258c11d75860507d}</h2><p>{record.location.label || copyDictionary.c8a2b8357717c7711}</p>{record.location.latitude !== undefined && <p>{copyDictionary.c9c11bd8446723806}{record.location.latitude}{copyDictionary.c24eafdf752af9804}{record.location.longitude}</p>}</section>}<button onClick={() => readText([record.text, record.location?.label ?? ''].join('。'))}>{copyDictionary.cc9369c555ca59ce1}</button><button onClick={stopReading}>{copyDictionary.c6113d2b22a57df3a}</button>{record.response ? <article><h2>{copyDictionary.cb649ab2f64899cff}</h2><p>{record.response.status === 'acknowledged' ? copyDictionary.caa71bc2a980a7bf3 : copyDictionary.cffdc87d4b46ad19e} · {record.response.name || copyDictionary.c03142d24859618fb}</p><p>{copyDictionary.c7f97bd5ee8149baa}</p></article> : <><label>{copyDictionary.c84e7bc76682eb11e}<input aria-label={copyDictionary.c84e7bc76682eb11e} maxLength={40} value={name} onChange={event => setName(event.target.value)}/></label><p>{copyDictionary.cb37302868bd0a135}</p><div className="daily-actions"><button disabled={busy} onClick={() => void respond('acknowledged')}>{copyDictionary.c7e47471b7d929318}</button><button disabled={busy} onClick={() => void respond('declined')}>{copyDictionary.c2f553bd5c29bb9dc}</button></div></>}</>}{expired && <p>{copyDictionary.c6c5cbc95a8ddee48}</p>}<button disabled={busy} onClick={() => void load()}>{copyDictionary.c994c429210ba61c4}</button><button onClick={() => { location.hash = '#home'; location.reload(); }}>{copyDictionary.c0ae3398f4a3cc7f0}</button></section></main>;
}
