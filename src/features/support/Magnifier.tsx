import { copyDictionary } from "../../app/copyDictionary.ts";
import { useEffect, useRef, useState } from 'react';
export function Magnifier() {
    const [zoom, setZoom] = useState(2), [contrast, setContrast] = useState(1.2), [bright, setBright] = useState(1), [invert, setInvert] = useState(false), [camera, setCamera] = useState(false), [hasPhoto, setHasPhoto] = useState(false), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null), stream = useRef<MediaStream | null>(null), epoch = useRef(0);
    const stop = () => { epoch.current++; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setCamera(false); setBusy(false); };
    useEffect(() => { const hidden = () => { if (document.hidden)
        stop(); }; document.addEventListener('visibilitychange', hidden); return () => { epoch.current++; stream.current?.getTracks().forEach(track => track.stop()); document.removeEventListener('visibilitychange', hidden); }; }, []);
    const start = async () => { const version = ++epoch.current; setBusy(true); try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
            throw Error(copyDictionary.c895c084856d28b46);
        const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (version !== epoch.current) {
            next.getTracks().forEach(t => t.stop());
            return;
        }
        stream.current = next;
        video.current!.srcObject = next;
        await video.current!.play();
        setCamera(true);
        setMessage(copyDictionary.c91ca8e0a97f317f6);
    }
    catch (error) {
        if (version === epoch.current) {
            stream.current?.getTracks().forEach(t => t.stop());
            setMessage((error as Error).message);
        }
    }
    finally {
        if (version === epoch.current)
            setBusy(false);
    } };
    return <div className="support-magnifier"><p>{copyDictionary.cd7e895818ae153e1}</p><div className="magnifier-view" tabIndex={0} aria-label={copyDictionary.c190e2c9adb195262}><div style={{ width: zoom * 100 + '%', filter: `contrast(${contrast}) brightness(${bright}) invert(${invert ? 1 : 0})` }}><video ref={video} muted playsInline hidden={!camera} aria-label={copyDictionary.c561ab0b42fe15179}/><canvas ref={canvas} hidden={camera || !hasPhoto} aria-label={copyDictionary.c0b33f873f5d537ed}/></div>{!camera && !hasPhoto && <p>{copyDictionary.cf4de9d2a4ace30cc}</p>}</div><div className="daily-actions"><button disabled={camera || busy} onClick={start}>{busy ? copyDictionary.c821ffb8cd6a23594 : copyDictionary.cfe582aebd5e7f492}</button><button disabled={!camera} onClick={() => { if (video.current?.videoWidth) {
        const c = canvas.current!;
        c.width = 960;
        c.height = Math.round(960 * video.current.videoHeight / video.current.videoWidth);
        c.getContext('2d')!.drawImage(video.current, 0, 0, c.width, c.height);
        setHasPhoto(true);
    } stop(); setMessage(copyDictionary.c9190d8606415d05e); }}>{copyDictionary.c7404a360c95f009e}</button><button disabled={!camera} onClick={stop}>{copyDictionary.c6941fa50f54bad84}</button><label className="daily-photo-input">{copyDictionary.ccae3ab4bfdb21193}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; stop(); try {
        if (file.size > 8 * 1024 * 1024)
            throw Error(copyDictionary.cc274ee8b138828dc);
        const bitmap = await createImageBitmap(file, { resizeWidth: 1200 }), c = canvas.current!;
        c.width = bitmap.width;
        c.height = bitmap.height;
        c.getContext('2d')!.drawImage(bitmap, 0, 0);
        bitmap.close();
        setHasPhoto(true);
        setMessage(copyDictionary.ccf22e56ba0f8eaf9);
    }
    catch (error) {
        setMessage((error as Error).message);
    } e.target.value = ''; }}/></label></div><label>{copyDictionary.cc2a5e661f216a0ad}{zoom.toFixed(1)}{copyDictionary.c16729fb40af5af9b}<input type="range" min="1" max="5" step="0.25" value={zoom} onChange={e => setZoom(Number(e.target.value))}/></label><div className="daily-actions"><button onClick={() => setZoom(v => Math.max(1, v - .5))}>{copyDictionary.c290f68030501cd9c}</button><button onClick={() => setZoom(v => Math.min(5, v + .5))}>{copyDictionary.c80f8fbcfa0117633}</button><button onClick={() => { setZoom(2); setBright(1); setContrast(1.2); setInvert(false); }}>{copyDictionary.c95ac0ce3b08bf57c}</button></div><label>{copyDictionary.c4cbc753240e5f27d}<input type="range" min="0.8" max="3" step="0.1" value={contrast} onChange={e => setContrast(Number(e.target.value))}/></label><label>{copyDictionary.c751d6ddba1e955be}<input type="range" min="0.5" max="2" step="0.1" value={bright} onChange={e => setBright(Number(e.target.value))}/></label><label className="switch-line"><input type="checkbox" checked={invert} onChange={e => setInvert(e.target.checked)}/>{copyDictionary.c7184f0707d05d45a}</label><p role="status">{message}</p></div>;
}
