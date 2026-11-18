import { copyDictionary } from "../app/copyDictionary.ts";
import { useEffect, useRef, useState } from 'react';
import { PrimaryButton } from '../components/UI';
import { travelQuestions, type TravelQuestion } from '../app/dailyFlow';
import type { Device, TravelDeviceSpecs } from '../app/types';
import {sampleDeviceField} from '../app/travelSpecEvidence';
export function TravelParameterGuide({ mode, devices, specs, onChange, onCheck, invalid }: {
    mode: string;
    devices: Device[];
    specs: Record<string, TravelDeviceSpecs>;
    onChange: (id: string, field: keyof TravelDeviceSpecs, value: unknown) => void;
    onCheck: () => void;
    invalid: boolean;
}) {
    const [active, setActive] = useState<TravelQuestion | null>(null), [skipped, setSkipped] = useState<TravelQuestion[]>([]), [message, setMessage] = useState('');
    const questionHeading = useRef<HTMLHeadingElement>(null), advanceFocus = useRef(false);
    const pending = travelQuestions(mode, devices, specs), question = active ?? pending.find(row => !skipped.some(item => item.id === row.id)), value = question ? specs[question.deviceId]?.[question.field] : undefined;
    const valid = question?.choices ? question.choices.some(([id]) => id === String(value)) : typeof value === 'number' && Number.isFinite(value) && value > 0;
    useEffect(() => { if (advanceFocus.current) {
        questionHeading.current?.focus();
        advanceFocus.current = false;
    } }, [question?.id]);
    if(devices.length&&devices.every(device=>sampleDeviceField(device)))return null;
    return <section className="parameter-guide"><p>{copyDictionary.travelGuideReview}</p>
    {question ? <article className="question-card"><p className="source-kind">{question.name}</p><h3 ref={questionHeading} tabIndex={-1}>{question.label}</h3><p>{question.hint}</p><label htmlFor="guided-travel-value">{question.label}</label>{question.choices ? <select id="guided-travel-value" value={value === undefined || value === 'unknown' ? '' : String(value)} onChange={e => { setActive(question); onChange(question.deviceId, question.field, question.field === 'batteryCount' ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value || undefined); setMessage(''); }}><option value="">{copyDictionary.c452a69c25597e6c6}</option>{question.choices.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select> : <input id="guided-travel-value" type="number" min="0.01" step="any" inputMode="decimal" value={typeof value === 'number' ? value : ''} onChange={e => { setActive(question); onChange(question.deviceId, question.field, e.target.value === '' ? undefined : Number(e.target.value)); setMessage(''); }}/>}<PrimaryButton disabled={!valid} onClick={() => { onChange(question.deviceId,'confirmed',{[question.field]:true}); advanceFocus.current = true; setSkipped(rows => rows.filter(row => row.id !== question.id)); setActive(null); setMessage(copyDictionary.cbdaf92136d321d2a); }}>{copyDictionary.c8f274b78bcd73c1e}</PrimaryButton><button onClick={() => { advanceFocus.current = true; onChange(question.deviceId, question.field, undefined); setSkipped(rows => [...rows.filter(row => row.id !== question.id), question]); setActive(null); setMessage(copyDictionary.c832dd719a80a8521); }}>{copyDictionary.cd9a4f36f5b2c6cda}</button><button disabled={invalid} onClick={onCheck}>{copyDictionary.cf850393584f12892}</button></article> : <article className="task-panel"><h3>{pending.length ? copyDictionary.c8b5e0cc81617217a : copyDictionary.cdd56ae39821b5236}</h3><p>{pending.length ? copyDictionary.c1a1f6f3d0815afa1 + pending.length + copyDictionary.cb43d842fea186ee0 : copyDictionary.c7979932b1d5f1a91}</p><PrimaryButton disabled={invalid} onClick={onCheck}>{copyDictionary.cc91bb3788eaf08e1}</PrimaryButton></article>}
    {skipped.filter(row => pending.some(item => item.id === row.id)).length > 0 && <details><summary>{copyDictionary.c4f067cc8e08d602b}</summary>{skipped.filter(row => pending.some(item => item.id === row.id)).map(row => <button key={row.id} onClick={() => { setActive(row); setMessage(''); }}>{row.name}：{row.label}</button>)}</details>}<p role="status">{message}</p>
  </section>;
}
