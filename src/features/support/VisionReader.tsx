import { copyDictionary } from "../../app/copyDictionary.ts";
import { useEffect, useRef, useState } from 'react';
import { runInference } from '../../app/inference';
import { prepareService } from '../../app/service';
import { readText, stopReading } from '../../app/accessibility';
import { isStudio } from '../../app/deployment';
interface VisionResult {
    description: string;
    lines: string[];
    uncertainty: string;
    model: string;
}
export function VisionReader() {
    const [image, setImage] = useState(''), [consent, setConsent] = useState(false), [mode, setMode] = useState<'read' | 'describe'>('read'), [result, setResult] = useState<VisionResult | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), request = useRef<AbortController | null>(null), epoch = useRef(0), imageEpoch = useRef(0);
    useEffect(() => () => { epoch.current++; imageEpoch.current++; request.current?.abort(); stopReading(); }, []);
    const start = async () => { if (!image || !consent || busy)
        return; const version = ++epoch.current, controller = new AbortController(); request.current = controller; setBusy(true); setResult(null); setMessage(copyDictionary.c9edd160649069297); try {
        await prepareService();
        controller.signal.throwIfAborted();
        const next = await runInference<VisionResult>('vision/describe', { image, mode, consent: true }, controller.signal, value => { if (version === epoch.current)
            setMessage(value); });
        if (version === epoch.current) {
            setResult(next);
            setMessage(copyDictionary.cab045abef1b9e329);
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
    return <div className="support-vision"><p>{copyDictionary.cbdbc3cecc01c7954}</p><label className="vision-upload">{image ? <img src={image} alt={copyDictionary.c6bf669bc7fb0161c}/> : <span>{copyDictionary.c634d538455a0b317}</span>}<input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" disabled={busy} onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; const version = ++imageEpoch.current; try {
        if (file.size > 10 * 1024 * 1024)
            throw Error(copyDictionary.cf01cd12e5020f4e2);
        const bitmap = await createImageBitmap(file, { resizeWidth: 960 });
        if (version !== imageEpoch.current) {
            bitmap.close();
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
        bitmap.close();
        setImage(canvas.toDataURL('image/jpeg', .82));
        setResult(null);
        setConsent(false);
        setMessage(copyDictionary.c4a3952e8cf297d25);
    }
    catch (error) {
        setMessage((error as Error).message);
    } e.target.value = ''; }}/></label><div className="support-tabs"><button disabled={busy} aria-pressed={mode === 'read'} onClick={() => setMode('read')}>{copyDictionary.c5624c2103327072b}</button><button disabled={busy} aria-pressed={mode === 'describe'} onClick={() => setMode('describe')}>{copyDictionary.c5dc5290da976fa35}</button></div><label className="switch-line"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)}/>{copyDictionary.c290d249bda76d763}{isStudio ? copyDictionary.c7e8f14a316cc9796 : copyDictionary.c37a2af4ddf5d8da8}{copyDictionary.c093dfd795cc57c7f}</label><div className="daily-actions"><button disabled={!image || !consent || busy} onClick={start}>{busy ? copyDictionary.c7da7d047507dfe1e : copyDictionary.cbc3db46d52627a0f}</button><button disabled={!busy} onClick={() => { epoch.current++; request.current?.abort(); setBusy(false); setMessage(copyDictionary.c854289378025e7d5); }}>{copyDictionary.ca33c5979842a5c27}</button><button disabled={busy || !image} onClick={() => { imageEpoch.current++; setImage(''); setResult(null); setConsent(false); stopReading(); setMessage(copyDictionary.c545cdff07d2dbe61); }}>{copyDictionary.caff636eb860bcae2}</button></div><p role="status">{message}</p>{result && <article className="vision-result"><h2>{copyDictionary.cece094aef982fdf3}</h2><p>{result.description || copyDictionary.cb86e8e1b9238ead3}</p><h2>{copyDictionary.c4af98a7274d35270}</h2>{result.lines.length ? <div className="vision-lines">{result.lines.map((line, i) => <p key={i}>{line}</p>)}</div> : <p>{copyDictionary.ce4b9a3ea0f1594d4}</p>}<p>{copyDictionary.c2aa4d3c22f641856}{result.uncertainty || copyDictionary.c14287e9c172a35fe}</p><button onClick={() => readText([result.description, ...result.lines, result.uncertainty].join('。'))}>{copyDictionary.c4ba932414c0e4878}</button><button onClick={stopReading}>{copyDictionary.c6113d2b22a57df3a}</button></article>}</div>;
}
