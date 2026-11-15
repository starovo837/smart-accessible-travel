import { copyDictionary } from "../../app/copyDictionary.ts";
import { useEffect, useRef, useState } from 'react';
import { prepareService, service } from '../../app/service';
import type { FacilityRecord } from '../../app/livingServices';
interface OnlineFacility {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    kind: string;
    wheelchair: string;
    sourceUrl: string;
    source: string;
    sourceCheckedAt: string;
    fetchedAt: string;
    notes: string;
}
export function FacilityMap({ facilities, onSave }: {
    facilities: FacilityRecord[];
    onSave: (record: FacilityRecord) => void;
}) {
    const [lat, setLat] = useState(''), [lon, setLon] = useState(''), [radius, setRadius] = useState(1000), [consent, setConsent] = useState(false), [center, setCenter] = useState<[
        number,
        number
    ] | null>(null), [rows, setRows] = useState<OnlineFacility[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [mapFailed, setMapFailed] = useState(false);
    const epoch = useRef(0), request = useRef<AbortController | null>(null);
    useEffect(() => () => { epoch.current++; request.current?.abort(); }, []);
    const coords = () => { const a = Number(lat), b = Number(lon); return lat.trim() && lon.trim() && Number.isFinite(a) && Number.isFinite(b) && a >= -85 && a <= 85 && b >= -180 && b <= 180 ? [a, b] as [
        number,
        number
    ] : null; };
    const load = async () => { const c = coords(); if (!c) {
        setMessage(copyDictionary.c7a4c66a1869ffb68);
        return;
    } if (!consent) {
        setMessage(copyDictionary.c2e23bf3edbe2d598);
        return;
    } const version = ++epoch.current, controller = new AbortController(); request.current?.abort(); request.current = controller; setBusy(true); setCenter(c); setRows([]); setMapFailed(false); setMessage(copyDictionary.ce09425f8a9698865); try {
        await prepareService();
        controller.signal.throwIfAborted();
        const data = await service<{
            facilities: OnlineFacility[];
        }>('facilities/query', { latitude: c[0], longitude: c[1], radius, consent: true }, undefined, controller.signal);
        if (version === epoch.current) {
            setRows(data.facilities);
            setMessage(data.facilities.length ? copyDictionary.c42f96160d3a51f9c + data.facilities.length + copyDictionary.ce7976ea91f549797 : copyDictionary.c26f794d5768d1fcd);
        }
    }
    catch (error) {
        if (version === epoch.current && (error as Error).name !== 'AbortError')
            setMessage((error as Error).message);
    }
    finally {
        if (version === epoch.current)
            setBusy(false);
    } };
    const mapUrl = center ? `https://www.openstreetmap.org/export/embed.html?bbox=${center[1] - .012}%2C${center[0] - .009}%2C${center[1] + .012}%2C${center[0] + .009}&layer=mapnik&marker=${center[0]}%2C${center[1]}` : '';
    return <details className="online-facility-map"><summary>{copyDictionary.cef89d00fec6f55f8}</summary><p>{copyDictionary.cd5878287167e4875}</p><div className="living-field-grid"><label>{copyDictionary.cd988d9f8dfa8c2a4}<input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder={copyDictionary.cefecb65edcd0199a}/></label><label>{copyDictionary.ca65dc98874a42a39}<input type="number" step="any" value={lon} onChange={e => setLon(e.target.value)} placeholder={copyDictionary.c54b685874e68a09f}/></label></div><button onClick={() => { if (!navigator.geolocation) {
        setMessage(copyDictionary.c5e3af2424e636394);
        return;
    } const version = ++epoch.current; setMessage(copyDictionary.c4e39fca62100d8ce); navigator.geolocation.getCurrentPosition(pos => { if (version !== epoch.current)
        return; setLat(pos.coords.latitude.toFixed(5)); setLon(pos.coords.longitude.toFixed(5)); setMessage(copyDictionary.c11e9ef31bb23cd97); }, () => { if (version === epoch.current)
        setMessage(copyDictionary.c25833a62cbfd652b); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }); }}>{copyDictionary.c5712d994931dd2fe}</button><label>{copyDictionary.c97fb2b32ee0f5efe}<select value={radius} onChange={e => setRadius(Number(e.target.value))}><option value={500}>{copyDictionary.c0ce6c0d38e86f656}</option><option value={1000}>{copyDictionary.c69e52daa7bf91e81}</option><option value={2000}>{copyDictionary.cf28b4c7533831b20}</option></select></label><label className="switch-line"><input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); if (!e.target.checked) {
        epoch.current++;
        request.current?.abort();
        setCenter(null);
        setRows([]);
        setBusy(false);
    } }}/>{copyDictionary.ce76754d478aa4ebb}</label><div className="living-actions"><button disabled={busy || !consent} onClick={load}>{busy ? copyDictionary.c8bbb38569df143b3 : copyDictionary.cd0fdb1bae0d1d686}</button><button disabled={!busy} onClick={() => { epoch.current++; request.current?.abort(); setBusy(false); setMessage(copyDictionary.cf0fc4b9e8db4fea8); }}>{copyDictionary.ccaf06adff4f18c9e}</button></div>{center && <><iframe className="facility-map-frame" title={copyDictionary.c6107204697c7e96d} src={mapUrl} loading="lazy" onError={() => setMapFailed(true)} referrerPolicy="strict-origin-when-cross-origin"/><p>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{copyDictionary.caabf3d0702b056d2}</a> · ODbL。<a href={'https://www.openstreetmap.org/?mlat=' + center[0] + '&mlon=' + center[1] + '#map=16/' + center.join('/')} target="_blank" rel="noopener noreferrer">{copyDictionary.c90469166113455a5}</a></p>{mapFailed && <p>{copyDictionary.c3d8563b7ad6c7118}</p>}</>}<p role="status">{message}</p>{rows.map(row => <article className="living-record" key={row.id}><h3>{row.name}</h3><p>{row.kind}{copyDictionary.c73ba38531b3dd2e2}{row.wheelchair === 'yes' ? copyDictionary.ce9676c3868a7407c : row.wheelchair === 'limited' ? copyDictionary.cf5b0342abdf7d62a : row.wheelchair === 'no' ? copyDictionary.cc6b21833089882eb : copyDictionary.c756762e293f2aaff}</p><p>{row.notes}</p><p>{copyDictionary.c14fcdc91216a055a}{row.sourceCheckedAt || copyDictionary.c756762e293f2aaff}{copyDictionary.c517ea4c099cc673f}{new Date(row.fetchedAt).toLocaleString('zh-CN')}。</p><a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">{copyDictionary.c731046b553cdc464}</a><button onClick={() => { onSave({ id: row.id, name: row.name, address: row.address || copyDictionary.cb0b81885cfad4cc8, latitude: row.latitude, longitude: row.longitude, steps: 'unknown', elevator: 'unknown', toilet: 'unknown', source: row.sourceUrl, checkedAt: '', notes: row.notes + copyDictionary.c26ec49fdf20c6245 + row.fetchedAt, feedback: [] }); setMessage(copyDictionary.cca601d4f216c4837); }}>{facilities.some(f => f.id === row.id) ? copyDictionary.c4d4d782f54bc094d : copyDictionary.c299b1a4a0ab58357}</button></article>)}</details>;
}
