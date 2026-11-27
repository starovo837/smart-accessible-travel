import { copyDictionary } from "../../app/copyDictionary.ts";
import { useEffect, useRef, useState } from 'react';
import { isPages } from '../../app/deployment';
import { Icon } from '../../components/Icons';
import { prepareService, service } from '../../app/service';
import { buildHospitalPlaceMapLinks, buildHospitalRegionMapLinks, buildNearbyHospitalMapLinks, formatHospitalDistance, HOSPITAL_SEARCH_RADII, type HospitalSearchRadius, type NearbyHealthcareResult, type NearbyHospital, type Wgs84Location } from '../../app/nearbyHealthcare';
import './nearby-healthcare.css';
export function NearbyHealthcare({ onChoose }: {
    onChoose: (hospital: NearbyHospital) => void;
}) {
    const [position, setPosition] = useState<Wgs84Location | null>(null), [radius, setRadius] = useState<HospitalSearchRadius>(2000), [result, setResult] = useState<NearbyHealthcareResult | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [region, setRegion] = useState(''), [manual, setManual] = useState(false);
    const epoch = useRef(0), request = useRef<AbortController | null>(null), lock = useRef(false);
    useEffect(() => () => { epoch.current++; request.current?.abort(); }, []);
    const finish = (version: number) => { if (version === epoch.current) {
        lock.current = false;
        setBusy(false);
    } };
    const query = async (point: Wgs84Location, version: number) => {
        const controller = new AbortController();
        request.current?.abort();
        request.current = controller;
        setMessage(copyDictionary.c0ae27c6815616924);
        setResult(null);
        try {
            await prepareService();
            controller.signal.throwIfAborted();
            const data = await service<NearbyHealthcareResult>('healthcare/nearby', { ...point, radius, consent: true }, undefined, controller.signal);
            if (version === epoch.current) {
                setResult(data);
                setMessage(data.hospitals.length ? copyDictionary.c0ccc285138ce0754 + data.hospitals.length + copyDictionary.c123868483eb192ca : data.notice);
            }
        }
        catch (error) {
            if (version === epoch.current && (error as Error).name !== 'AbortError')
                setMessage((error as Error).message);
        }
        finally {
            finish(version);
        }
    };
    const locate = () => {
        if (lock.current)
            return;
        if (!navigator.geolocation || !window.isSecureContext) {
            setMessage(copyDictionary.cc3769a3a3e4e99f0);
            setManual(true);
            return;
        }
        const version = ++epoch.current;
        lock.current = true;
        setBusy(true);
        setResult(null);
        setPosition(null);
        setMessage(copyDictionary.caa69b83b2610fa4c);
        navigator.geolocation.getCurrentPosition(value => { if (version !== epoch.current)
            return; const point = { latitude: Math.round(value.coords.latitude * 1e6) / 1e6, longitude: Math.round(value.coords.longitude * 1e6) / 1e6 }; setPosition(point); if (isPages) { setMessage(copyDictionary.pagesNearbyReady); finish(version); } else void query(point, version); }, error => { if (version !== epoch.current)
            return; setMessage(error.code === 1 ? copyDictionary.c82376df98a2b4c56 : copyDictionary.c126b0cac882731e2); setManual(true); finish(version); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 });
    };
    const clear = () => { epoch.current++; request.current?.abort(); lock.current = false; setBusy(false); setPosition(null); setResult(null); setMessage(copyDictionary.cd030b8519817383c); };
    const nearbyLinks = position ? buildNearbyHospitalMapLinks(position, radius) : [], regionLinks = buildHospitalRegionMapLinks(region);
    return <section className="nearby-healthcare" aria-labelledby="nearby-healthcare-title"><div className="nearby-heading"><span aria-hidden="true"><Icon name="hospital" size={27}/></span><div><h2 id="nearby-healthcare-title">{copyDictionary.cdf8f9a687b8248a2}</h2><p>{copyDictionary.cab06f199a91124ee}</p></div></div>
  <p id="hospital-location-explanation">{isPages ? copyDictionary.pagesNearbyLocal : copyDictionary.cc307b1a9a938ee1a}</p>
  <label>{copyDictionary.ca4abc4b5d2cd287d}<select aria-label={copyDictionary.ca4abc4b5d2cd287d} value={radius} disabled={busy} onChange={event => { setRadius(Number(event.target.value) as HospitalSearchRadius); setResult(null); }}>{HOSPITAL_SEARCH_RADII.map(value => <option key={value} value={value}>{value / 1000}{copyDictionary.ccc6d57236b8834e0}</option>)}</select></label>
  <button className="nearby-location-button" disabled={busy} onClick={locate} aria-describedby="hospital-location-explanation"><Icon name="map-pin" size={21}/>{busy ? copyDictionary.c1986994f30573b23 : copyDictionary.ca2053dbc4e4b149a}</button>
  <div className="living-actions nearby-secondary-actions"><button disabled={busy} onClick={() => setManual(value => !value)} aria-expanded={manual} aria-controls="hospital-region-search">{manual ? copyDictionary.ca7a338bafbbe178b : copyDictionary.caf0070f956a661ac}</button>{(busy || position) && <button onClick={clear}>{busy ? copyDictionary.c80d0d68566b75d59 : copyDictionary.c4eff975d764f0ca2}</button>}</div>
  {manual && <div id="hospital-region-search" className="hospital-region-search"><label>{copyDictionary.c0d5627382afbb2d7}<input value={region} maxLength={120} onChange={event => setRegion(event.target.value)} placeholder={copyDictionary.c9d3621d5c7880d8b} autoComplete="address-level2"/></label><p>{copyDictionary.c0a4e2b59b907f706}</p><div className="living-actions">{regionLinks.map(link => <a key={link.provider} href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{link.label} ↗</a>)}</div></div>}
  <p className="nearby-status" role="status">{message}</p>
  {position && <section className="hospital-domestic-maps"><h3>{copyDictionary.c313b787a3368b0fa}</h3><p>{copyDictionary.c6161058c9bacd2da}</p><div className="living-actions">{nearbyLinks.map(link => <a key={link.provider} href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{link.label} ↗</a>)}</div><p className="living-meta">{copyDictionary.c63bac93af0b0547c}</p>{!isPages && !busy && <button onClick={() => { if (lock.current)
        return; const version = ++epoch.current; lock.current = true; setBusy(true); void query(position, version); }}>{copyDictionary.ccb0451a41f6c64e5}</button>}</section>}
  {result && <section className="hospital-results"><h3>{copyDictionary.c081df8757b627d4b}</h3><p>{result.notice}</p>{result.hospitals.map(hospital => <article className="nearby-hospital-card" key={hospital.id}><div className="hospital-card-title"><h4>{hospital.name}</h4><span>{formatHospitalDistance(hospital.distanceMeters)}</span></div><p>{hospital.categoryLabel} · {hospital.address || copyDictionary.c5fe5d62f89a8c14d}</p><p className="living-meta">{hospital.source}{copyDictionary.cb960278132c51aa0}{new Date(hospital.fetchedAt).toLocaleString('zh-CN')}</p><div className="living-actions">{buildHospitalPlaceMapLinks(hospital).map(link => <a key={link.provider} href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{link.label} ↗</a>)}<button onClick={() => onChoose(hospital)}>{copyDictionary.c0e5025f2fcb62b90}</button></div><a className="hospital-source" href={hospital.sourceUrl} target="_blank" rel="noopener noreferrer">{copyDictionary.c4ec0457c98870b13}</a></article>)}</section>}
 </section>;
}
