import { copyDictionary } from "../../app/copyDictionary.ts";
import { assetUrl } from '../../app/assetUrl';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';
import { gestureOptions, confirmedGesture } from '../../app/supportCatalog';
import { readText, stopReading } from '../../app/accessibility';
import type { LifeData } from '../../app/types';
export default function Gestures({ life, setLife }: {
    life: LifeData;
    setLife: Dispatch<SetStateAction<LifeData>>;
}) {
    const [busy, setBusy] = useState(false), [camera, setCamera] = useState(false), [candidate, setCandidate] = useState(''), [manual, setManual] = useState(false), [message, setMessage] = useState(''), [practice, setPractice] = useState(false), [target, setTarget] = useState<string>('Thumb_Up'), [phrase, setPhrase] = useState(''), [saved, setSaved] = useState(false);
    const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null), recognizer = useRef<GestureRecognizer | null>(null), frame = useRef(0), epoch = useRef(0), stable = useRef({ id: '', count: 0 }), canvas = useRef<HTMLCanvasElement>(null);
    const selected = gestureOptions.find(g => g.id === candidate), expected = gestureOptions.find(g => g.id === target)!, spoken = selected ? (life.assistance?.gesturePhrases?.[selected.id] ?? selected.phrase) : '';
    const stop = () => { epoch.current++; cancelAnimationFrame(frame.current); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; recognizer.current?.close(); recognizer.current = null; setCamera(false); setBusy(false); stable.current = { id: '', count: 0 }; };
    useEffect(() => { const hidden = () => { if (document.hidden)
        stop(); }; document.addEventListener('visibilitychange', hidden); return () => { epoch.current++; cancelAnimationFrame(frame.current); stream.current?.getTracks().forEach(t => t.stop()); recognizer.current?.close(); stopReading(); document.removeEventListener('visibilitychange', hidden); }; }, []);
    const initialize = async (version: number) => { const { FilesetResolver, GestureRecognizer } = await import('@mediapipe/tasks-vision'), files = await FilesetResolver.forVisionTasks(assetUrl('mediapipe')); const model = await GestureRecognizer.createFromOptions(files, { baseOptions: { modelAssetPath: assetUrl('mediapipe/gesture_recognizer.task'), delegate: 'CPU' }, runningMode: 'IMAGE', numHands: 1, minHandDetectionConfidence: .6, minHandPresenceConfidence: .6, cannedGesturesClassifierOptions: { scoreThreshold: .7 } }); if (version !== epoch.current) {
        model.close();
        return null;
    } recognizer.current = model; return model; };
    const start = async () => { if (busy || camera)
        return; stop(); const version = ++epoch.current; setBusy(true); setCandidate(''); setMessage(copyDictionary.c7c95da020591056e); try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
            throw Error(copyDictionary.c9891b0da800d36b1);
        const model = await initialize(version);
        if (!model)
            return;
        const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } }, audio: false });
        if (version !== epoch.current) {
            next.getTracks().forEach(t => t.stop());
            return;
        }
        stream.current = next;
        video.current!.srcObject = next;
        await video.current!.play();
        await model.setOptions({ runningMode: 'VIDEO' });
        if (version !== epoch.current)
            return;
        setCamera(true);
        setMessage(copyDictionary.c8badc71daad26784);
        let last = 0, lastVideo = -1;
        const loop = (at: number) => { if (version !== epoch.current)
            return; try {
            if (at - last > 180 && video.current!.readyState >= 2 && video.current!.currentTime !== lastVideo) {
                last = at;
                lastVideo = video.current!.currentTime;
                const result = model.recognizeForVideo(video.current!, at), found = result.gestures[0]?.[0], id = found?.categoryName ?? '';
                stable.current = id === stable.current.id ? { id, count: stable.current.count + 1 } : { id, count: 1 };
                const accepted = confirmedGesture(id, found?.score ?? 0, stable.current.count);
                setCandidate(accepted?.id ?? '');
                setManual(false);
            }
        }
        catch {
            stop();
            setMessage(copyDictionary.c7bb1e7838ebe7cae);
            return;
        } frame.current = requestAnimationFrame(loop); };
        frame.current = requestAnimationFrame(loop);
    }
    catch (error) {
        if (version === epoch.current) {
            stop();
            setMessage((error as Error).message || copyDictionary.ca8c354e9b7505d40);
        }
    }
    finally {
        if (version === epoch.current)
            setBusy(false);
    } };
    return <div className="support-gestures"><p>{copyDictionary.c8c0cc1bc3e8d7de0}</p><div className="support-tabs"><button aria-pressed={!practice} onClick={() => setPractice(false)}>{copyDictionary.caadb2d9d805f9164}</button><button aria-pressed={practice} onClick={() => setPractice(true)}>{copyDictionary.c88883703fe55ae4b}</button></div>{practice && <><label>{copyDictionary.caee6cfec82ced5b7}<select value={target} onChange={e => setTarget(e.target.value)}>{gestureOptions.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label><p>{expected.hint}</p></>}<div className="gesture-view"><video ref={video} muted playsInline hidden={!camera} aria-label={copyDictionary.c3b3a522840141c76}/><canvas ref={canvas} hidden={camera} aria-label={copyDictionary.c09ef7e1ac39ebf56}/></div><div className="daily-actions"><button disabled={camera || busy} onClick={start}>{busy ? copyDictionary.c871be2654869720f : copyDictionary.cd53ea9d7fecc795d}</button><button disabled={!camera && !busy} onClick={() => { stop(); setCandidate(''); setMessage(copyDictionary.cb02204b30b772435); }}>{copyDictionary.c5ff20ad616feb4d3}</button><label className="daily-photo-input">{copyDictionary.cbaf638aa7f79328f}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; stop(); const version = ++epoch.current; setBusy(true); setCandidate(''); setMessage(copyDictionary.c5e9e27d10baebadc); try {
        if (file.size > 8 * 1024 * 1024)
            throw Error(copyDictionary.cb0e098ee352abfcf);
        const model = await initialize(version);
        if (!model)
            return;
        const bitmap = await createImageBitmap(file, { resizeWidth: 640 });
        if (version !== epoch.current) {
            bitmap.close();
            return;
        }
        const c = canvas.current!;
        c.width = bitmap.width;
        c.height = bitmap.height;
        c.dataset.loaded = 'true';
        c.getContext('2d')!.drawImage(bitmap, 0, 0);
        const result = model.recognize(bitmap), found = result.gestures[0]?.[0], accepted = confirmedGesture(found?.categoryName ?? '', found?.score ?? 0, 3);
        bitmap.close();
        setCandidate(accepted?.id ?? '');
        setManual(false);
        setMessage(accepted ? copyDictionary.cc44023619cfb2af8 : copyDictionary.c1f555ed447d47370);
    }
    catch (error) {
        if (version === epoch.current)
            setMessage((error as Error).message);
    }
    finally {
        if (version === epoch.current) {
            recognizer.current?.close();
            recognizer.current = null;
            setBusy(false);
        }
        e.target.value = '';
    } }}/></label></div><div className="gesture-result" role="status">{selected ? <><h2>{manual ? copyDictionary.c187b88cd44e46d10 : copyDictionary.cc2c536b6742e8851}：{selected.name}</h2>{practice && !manual && <p>{selected.id === target ? copyDictionary.ce9570264ed72c2e0 : copyDictionary.ca85dcbe0deca696a}</p>}<p>{spoken}</p><button onClick={() => readText(spoken)}>{copyDictionary.c9bd43a5017cc2431}</button></> : <p>{copyDictionary.cca13f3269f321c9d}</p>}</div><details><summary>{copyDictionary.ca555d5e258e99f3a}</summary><label>{copyDictionary.c2c9757561a9ebe86}<select value={target} onChange={e => { setTarget(e.target.value); setPhrase(''); setSaved(false); }}>{gestureOptions.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>{copyDictionary.c6733b4fe30097213}<input maxLength={120} value={phrase} onChange={e => { setPhrase(e.target.value); setSaved(false); }} placeholder={life.assistance?.gesturePhrases?.[target] ?? expected.phrase}/></label><button disabled={!phrase.trim()} onClick={() => { setLife(current => ({ ...current, assistance: { ...current.assistance, tasks: current.assistance?.tasks ?? [], progress: current.assistance?.progress ?? {}, gesturePhrases: { ...current.assistance?.gesturePhrases, [target]: phrase.trim() } } })); setSaved(true); }}>{copyDictionary.cbcdce89c04534325}</button>{saved && <p role="status">{copyDictionary.cb7fa084877b21550}</p>}</details><div className="daily-phrases">{gestureOptions.map(option => <button key={option.id} onClick={() => { setCandidate(option.id); setManual(true); setMessage(copyDictionary.c2eb28ad414d08333); }}>{option.name}：{life.assistance?.gesturePhrases?.[option.id] ?? option.phrase}</button>)}</div><p role="status">{message}</p><p className="support-storage-note">{copyDictionary.c9c5df36bd4ea98e3}</p></div>;
}
