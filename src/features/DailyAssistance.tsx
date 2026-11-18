import { copyDictionary } from "../app/copyDictionary.ts";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Modal, PageHeader } from '../components/UI';
import { readText, stopReading, copyText } from '../app/accessibility';
import { dailyTemplates, imageSummary } from '../app/dailyAssistance';
import type { LifeData } from '../app/types';
interface Props {
    life: LifeData;
    setLife: Dispatch<SetStateAction<LifeData>>;
    saved: boolean;
    onPrivacy: () => void;
    onHelp: () => void;
    initialTool?: 'menu' | 'camera' | 'talk' | 'steps';
    onExit?: () => void;
}
export function DailyAssistance({ life, setLife, saved, onPrivacy, onHelp, initialTool = 'menu', onExit }: Props) {
    const [tool, setTool] = useState<string>(initialTool), [message, setMessage] = useState(''), [text, setText] = useState(''), [card, setCard] = useState(false), [slow, setSlow] = useState(false);
    const [camera, setCamera] = useState(false), [opening, setOpening] = useState(false);
    const [customTitle, setCustomTitle] = useState(''), [customSteps, setCustomSteps] = useState(''), [task, setTask] = useState<string | null>(null);
    const video = useRef<HTMLVideoElement>(null), photo = useRef<HTMLCanvasElement>(null), stream = useRef<MediaStream | null>(null), epoch = useRef(0);
    const tasks = [...dailyTemplates, ...(life.assistance?.tasks ?? [])], active = tasks.find(item => item.id === task), progress = life.assistance?.progress ?? {}, index = active ? Math.min(progress[active.id] ?? 0, active.steps.length) : 0;
    const stopCamera = () => { epoch.current++; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; if (video.current)
        video.current.srcObject = null; setCamera(false); setOpening(false); };
    useEffect(() => { const hidden = () => { if (document.hidden) {
        stopCamera();
        stopReading();
    } }; document.addEventListener('visibilitychange', hidden); return () => { epoch.current++; stream.current?.getTracks().forEach(track => track.stop()); stopReading(); document.removeEventListener('visibilitychange', hidden); }; }, []);
    const open = (id: string) => { stopCamera(); stopReading(); setTool(id); setTask(null); setMessage(''); };
    const savedPhrases = life.assistance?.phrases ?? [];
    const speak = async (value = text) => { if (await readText(value, slow ? .75 : 1)) setMessage(copyDictionary.speechCompleted); };
    const startCamera = async () => { if (opening || camera)
        return; const version = ++epoch.current; setOpening(true); try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
            throw Error(copyDictionary.c9b47be687c91ee9b);
        const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 } }, audio: false });
        if (epoch.current !== version) {
            next.getTracks().forEach(t => t.stop());
            return;
        }
        stream.current = next;
        if (video.current) {
            video.current.srcObject = next;
            await video.current.play();
        }
        setCamera(true);
        setMessage(copyDictionary.c9627aef39582f407);
    }
    catch (error) {
        if (version === epoch.current) {
            stream.current?.getTracks().forEach(t => t.stop());
            stream.current = null;
            setMessage((error as Error).message);
        }
    }
    finally {
        if (version === epoch.current)
            setOpening(false);
    } };
    const analyze = (kind: 'color' | 'light') => { const canvas = photo.current, source = video.current; if (!canvas)
        return; if (camera && source?.videoWidth) {
        canvas.width = 320;
        canvas.height = 240;
        canvas.getContext('2d')!.drawImage(source, 0, 0, 320, 240);
    } if (!canvas.width || !canvas.dataset.loaded && !camera) {
        setMessage(copyDictionary.cdc4694402cdd4e5d);
        return;
    } const ctx = canvas.getContext('2d')!, result = imageSummary(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height), value = kind === 'color' ? copyDictionary.c9e6640d5e12bf39d + result.color + copyDictionary.ceb0d5884569b398e : copyDictionary.cf68e26558472982f + result.light + copyDictionary.ceb0d5884569b398e; setMessage(value); readText(value, slow ? .75 : 1); };
    const updateProgress = (step: number) => { if (!active)
        return; setLife(current => ({ ...current, assistance: { ...current.assistance, tasks: current.assistance?.tasks ?? [], progress: { ...current.assistance?.progress, [active.id]: step } } })); };
    return <section className="daily-assistance" aria-label={copyDictionary.c114c5c04c005c985}><PageHeader level={2} title={tool === 'menu' ? copyDictionary.ce56fb8dc776b927f : tool === 'camera' ? copyDictionary.cda40a134e9c84886 : tool === 'talk' ? copyDictionary.cb46982e5abfcf11f : copyDictionary.c30db6518cc83b35c} subtitle={tool === 'menu' ? copyDictionary.cdbe98b566bb10dac : undefined} onBack={onExit ?? (tool === 'menu' ? undefined : () => open('menu'))}/>
 {tool === 'menu' && <div className="daily-tool-menu"><button onClick={() => open('camera')}><strong>{copyDictionary.cda40a134e9c84886}</strong><span>{copyDictionary.c20ed1517eddcffe1}</span></button><button onClick={() => open('talk')}><strong>{copyDictionary.cb46982e5abfcf11f}</strong><span>{copyDictionary.c35b35201f60b1e6b}</span></button><button onClick={() => open('steps')}><strong>{copyDictionary.c30db6518cc83b35c}</strong><span>{copyDictionary.c99c1104ff6cc10ff}</span></button><button onClick={onHelp}><strong>{copyDictionary.c77fea22f2216bd42}</strong><span>{copyDictionary.cb69555eab55faaa7}</span></button></div>}
 {tool === 'camera' && <><p>{copyDictionary.c0cb91871b020fee6}</p><div className="daily-camera"><video ref={video} muted playsInline aria-label={copyDictionary.c0cad8bdbc53b2ca8} hidden={!camera}/><canvas ref={photo} aria-label={copyDictionary.cb69c1ccd00482ba4} hidden={camera}/>{!camera && <span>{copyDictionary.c2d5670ed4a734e9e}</span>}</div><div className="daily-actions"><button disabled={opening || camera} onClick={startCamera}>{opening ? copyDictionary.c821ffb8cd6a23594 : copyDictionary.cfe582aebd5e7f492}</button><button disabled={!camera} onClick={stopCamera}>{copyDictionary.c6941fa50f54bad84}</button><label className="daily-photo-input">{copyDictionary.ccae3ab4bfdb21193}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; stopCamera(); try {
        if (file.size > 8 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
            throw Error(copyDictionary.cc72b9c5711ec2462);
        const bitmap = await createImageBitmap(file), canvas = photo.current!;
        canvas.width = 320;
        canvas.height = Math.max(1, Math.round(320 * bitmap.height / bitmap.width));
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        canvas.dataset.loaded = 'true';
        bitmap.close();
        setMessage(copyDictionary.cda2aab5e9012bcc0);
    }
    catch (error) {
        setMessage((error as Error).message);
    } e.target.value = ''; }}/></label></div><div className="daily-actions"><button onClick={() => analyze('color')}>{copyDictionary.c97d788721a876126}</button><button onClick={() => analyze('light')}>{copyDictionary.c851d2f85131bc99f}</button></div><p>{copyDictionary.ccf65054af2e3e8ad}</p></>}
 {tool === 'talk' && <><label>{copyDictionary.cb79b8c6969520e29}<textarea maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder={copyDictionary.cbf3b7b31ed5847f4}/></label><div className="daily-phrases">{[...new Set([copyDictionary.c83f6acfc9525bcfe, copyDictionary.c819cbae18336cc49, copyDictionary.c0ee2bbb7a0d4e13e, copyDictionary.c404b5a8544901de4, ...savedPhrases])].map(phrase => <div className="daily-phrase-entry" key={phrase}>
        <button onClick={() => setText(phrase)}>{phrase}</button>
        {savedPhrases.includes(phrase) && <button aria-label={copyDictionary.removeSavedPhrase + "：" + phrase} onClick={() => {
        setLife(current => current.assistance ? { ...current, assistance: { ...current.assistance, phrases: (current.assistance.phrases ?? []).filter(item => item !== phrase) } } : current);
        setMessage(copyDictionary.savedPhraseRemoved);
    }}>{copyDictionary.removeSavedPhrase}</button>}
    </div>)}</div><button disabled={!text.trim() || savedPhrases.length >= 20} onClick={() => { setLife(current => ({ ...current, assistance: { ...current.assistance, tasks: current.assistance?.tasks ?? [], progress: current.assistance?.progress ?? {}, phrases: [...new Set([...(current.assistance?.phrases ?? []), text.trim().slice(0, 120)])] } })); setMessage(copyDictionary.c974023fa0568270a); }}>{copyDictionary.c0c9b03f607507cd1}</button>{savedPhrases.length >= 20 && <p role="status">{copyDictionary.savedPhraseLimit}</p>}<div className="daily-actions"><button disabled={!text.trim()} onClick={() => speak()}>{copyDictionary.cfb0c375a15005733}</button><button onClick={stopReading}>{copyDictionary.c6113d2b22a57df3a}</button><button disabled={!text.trim()} onClick={() => setCard(true)}>{copyDictionary.c04887c30f39bdddd}</button><button disabled={!text.trim()} onClick={async () => setMessage(await copyText(text) ? copyDictionary.c3bb8fb00d8dd284b : copyDictionary.cac287766821bf449)}>{copyDictionary.c29636e43fdb4f595}</button></div><label className="switch-line"><input type="checkbox" checked={slow} onChange={e => setSlow(e.target.checked)}/>{copyDictionary.c7c1a9ce293652550}</label></>}
 {tool === 'steps' && <>{active ? <><div className="daily-current-step" role="status"><span>{index < active.steps.length ? copyDictionary.c9552fe3bd366b214 + (index + 1) + copyDictionary.c005e1574a2b5c816 + active.steps.length + copyDictionary.ce010e3f578ccc221 : copyDictionary.c7bc40dc3cf575122}</span><h3>{active.title}</h3><p>{active.steps[index] ?? copyDictionary.c238653ea0de41629}</p></div><div className="daily-actions"><button disabled={!index} onClick={() => updateProgress(index - 1)}>{copyDictionary.cda336fdc0dbd1818}</button><button onClick={() => speak(active.steps[index] ?? copyDictionary.c7bc40dc3cf575122)}>{copyDictionary.cc7fc3b871df86092}</button><button onClick={() => updateProgress(index < active.steps.length ? index + 1 : 0)}>{index < active.steps.length ? copyDictionary.c3970f92d46b7235b : copyDictionary.ccc92cb4b8980dc15}</button><button onClick={() => setTask(null)}>{copyDictionary.c01974468b4e126bd}</button></div></> : <><div className="daily-tool-menu">{tasks.map(item => <button key={item.id} onClick={() => setTask(item.id)}><strong>{item.title}</strong><span>{progress[item.id] >= item.steps.length ? copyDictionary.cf28461bb49c85647 : progress[item.id] ? copyDictionary.c03517afb2407b71f + (progress[item.id] + 1) + copyDictionary.ce010e3f578ccc221 : copyDictionary.ce3b0c44298fc1c14 + item.steps.length + copyDictionary.ca178f38f6539f4ed}</span></button>)}</div><details><summary>{copyDictionary.cec3d8dde4c509998}</summary><label>{copyDictionary.c2479560deb339bea}<input maxLength={60} value={customTitle} onChange={e => setCustomTitle(e.target.value)}/></label><label>{copyDictionary.c9d0410ede5dabef2}<textarea maxLength={2500} value={customSteps} onChange={e => setCustomSteps(e.target.value)}/></label><button onClick={() => { const steps = customSteps.split('\n').map(s => s.trim()).filter(Boolean); if (!customTitle.trim() || steps.length < 2 || steps.length > 20) {
        setMessage(copyDictionary.cf8f3e41ca2ac3083);
        return;
    } if ((life.assistance?.tasks.length ?? 0) >= 30) {
        setMessage(copyDictionary.ce12a80fd361efc71);
        return;
    } setLife(current => ({ ...current, assistance: { ...current.assistance, tasks: [...(current.assistance?.tasks ?? []), { id: 'daily-' + Date.now(), title: customTitle.trim(), steps }], progress: current.assistance?.progress ?? {} } })); setCustomTitle(''); setCustomSteps(''); setMessage(copyDictionary.c552ed2279bb1c1c5); }}>{copyDictionary.c9baaedbedb6ae7e0}</button></details>{life.assistance?.tasks.map(item => <button key={item.id} onClick={() => setLife(current => ({ ...current, assistance: { ...current.assistance, tasks: current.assistance!.tasks.filter(t => t.id !== item.id), progress: Object.fromEntries(Object.entries(current.assistance!.progress).filter(([id]) => id !== item.id)) } }))}>{copyDictionary.ce86fe0345aef8a0f}{item.title}</button>)}</>}<p>{saved ? copyDictionary.c4c03c93bc47ad953 : copyDictionary.cdf4dc6e3856209a2}</p>{!saved && <button onClick={onPrivacy}>{copyDictionary.c055078c874caded0}</button>}</>}
 <p className="daily-message" role="status">{message}</p>{card && <Modal title={copyDictionary.c9e733bd4509ec66a} onClose={() => setCard(false)}><p className="daily-big-card">{text}</p><button onClick={() => speak()}>{copyDictionary.cfb0c375a15005733}</button><button onClick={() => setCard(false)}>{copyDictionary.c02168a6acb23d3a9}</button></Modal>}
 </section>;
}
