import { copyDictionary } from "../app/copyDictionary.ts";
import { lazy, Suspense, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Modal, PageHeader } from '../components/UI';
import { aidOptions, bodyErrors, bodyFields, designFields, draftFromMeasurements, filledMeasurements, readFitting, serializedFitting, type FittingDraft } from '../app/fitting';
import { downloadText, readText } from '../app/accessibility';
import '../fitting.css';
const FittingScene = lazy(() => import('./fitting/FittingScene'));
interface Props {
    draft: FittingDraft;
    setDraft: Dispatch<SetStateAction<FittingDraft>>;
    saveStatus: string;
    onClear: () => void;
    onBack: () => void;
    onAssistant: () => void;
    onProfile: () => void;
    onShop: () => void;
    onTravel: () => void;
}
export function FittingWorkspace({ draft, setDraft, saveStatus, onClear, onBack, onAssistant, onProfile, onShop, onTravel }: Props) {
    const [inspector, setInspector] = useState<'body' | 'aids'>('body'), [clearConfirm, setClearConfirm] = useState(false), [notice, setNotice] = useState(''), file = useRef<HTMLInputElement>(null);
    const errors = bodyErrors(draft.body), selected = draft.candidates.find(c => c.id === draft.selectedCandidate), primary = aidOptions.find(a => a.id === draft.aids[0]) ?? aidOptions[0];
    const preview = selected ? { ...draft, aids: [selected.aid, ...draft.aids.filter(id => id !== selected.aid && id !== 'wheelchair' && id !== 'walker')], parameters: { ...draft.parameters, ...(Number(selected.seatWidth) > 0 && Number(selected.seatWidth) < 120 ? { seatWidth: Number(selected.seatWidth) } : {}), ...(Number(selected.seatDepth) > 0 && Number(selected.seatDepth) < 100 ? { seatDepth: Number(selected.seatDepth) } : {}) } } : draft;
    const toggleWheelchairPose = (seated: boolean) => setDraft(previous => {
        const otherAids = previous.aids.filter(id => id !== 'wheelchair');
        return { ...previous, pose: seated ? 'seated' : 'standing', aids: seated ? ['wheelchair', ...otherAids] : otherAids, selectedCandidate: '' };
    });
    const renderBodyField = (field: typeof bodyFields[number]) => <label key={field.key} htmlFor={'body-' + field.key}><span>{field.label}<small>{field.unit}</small></span><input id={'body-' + field.key} type="number" inputMode="decimal" aria-label={field.label + '（' + field.unit + '）'} min={field.min} max={field.max} step="0.1" placeholder={copyDictionary.c64747fab2c8f817d} value={draft.body[field.key]} aria-invalid={errors.some(e => e.key === field.key)} aria-describedby={'help-' + field.key} onChange={e => setDraft(d => ({ ...d, body: { ...d.body, [field.key]: e.target.value } }))}/><span id={'help-' + field.key} className="sr-only">{field.help}</span></label>;
    return <section className="fitting-workspace" aria-label={copyDictionary.cbfc50e32f27a32dc}><PageHeader title={copyDictionary.cbfc50e32f27a32dc} subtitle={copyDictionary.c8fb944e0f1aa7711} onBack={onBack}/>
    <div className="fit-topline"><p>{filledMeasurements(draft.body) ? copyDictionary.ce3b0c44298fc1c14 + filledMeasurements(draft.body) + copyDictionary.c1210e51dbe8dcc08 : copyDictionary.cd4d0fd2fb7443b6c}</p><span role="status">{saveStatus}</span></div><div className="fit-utility-nav"><button onClick={onAssistant}>{copyDictionary.c613f4eaa42519a01}</button><button onClick={onProfile}>{copyDictionary.c0cef169cc5639cf5}</button></div>
    <div className="fit-main-grid"><div><Suspense fallback={<div className="fit-loading" role="status">{copyDictionary.c15993317b96f5a14}</div>}><FittingScene draft={preview} onTogglePose={toggleWheelchairPose} onView={view => setDraft(d => ({ ...d, view }))} onDimensions={() => setDraft(d => ({ ...d, showDimensions: !d.showDimensions }))}/></Suspense>{selected && <p className="fit-warning">{copyDictionary.cd1ade19d7f2b0a3f}{selected.name}{copyDictionary.c65be6f29d03e4a9e}<button onClick={() => setDraft(d => ({ ...d, selectedCandidate: '' }))}>{copyDictionary.c09a542656dacb602}</button></p>}</div>
      <aside className="fit-inspector" aria-label={copyDictionary.c4fdfc56b56b9ad08}><h2>{copyDictionary.ccb7ea2d35270a57c}</h2><div className="fit-inspector-tabs" role="group" aria-label={copyDictionary.ce59a65d4513fb67b}><button aria-pressed={inspector === 'body'} onClick={() => setInspector('body')}>{copyDictionary.cc7b052e68a888075}</button><button aria-pressed={inspector === 'aids'} onClick={() => setInspector('aids')}>{copyDictionary.c834ace557324c332}</button></div>
      {inspector === 'body' ? <><p className="fit-subtle">{copyDictionary.cb1606d01acb31bf5}</p><label>{copyDictionary.c1b58ff2484267294}<select value={draft.measurementSource} onChange={e => setDraft(d => ({ ...d, measurementSource: e.target.value as FittingDraft['measurementSource'] }))}><option value="unknown">{copyDictionary.c3f041f1caf11dc68}</option><option value="self">{copyDictionary.c037612b52bc27c34}</option><option value="assisted">{copyDictionary.c6f07854ff40f0b58}</option><option value="professional">{copyDictionary.cd11dcc52ff66b192}</option></select></label><div className="fit-body-fields">{bodyFields.slice(0, 5).map(renderBodyField)}</div><details><summary>{copyDictionary.cc434b005ae7f29e2}</summary><div className="fit-body-fields">{bodyFields.slice(5).map(renderBodyField)}</div></details>{errors.map(error => <p key={error.key} className="form-error" role="alert">{error.message}</p>)}<details><summary>{copyDictionary.cc533e95b10bc4222}</summary>{bodyFields.map(field => <p key={field.key}><strong>{field.label}：</strong>{field.help}</p>)}<p>{copyDictionary.c92c9a503ea9c287b}</p></details></> : <><p className="fit-subtle">{copyDictionary.c2dba4fb82b4a43d7}</p><fieldset className="fit-aid-list"><legend>{copyDictionary.c500922e88d5035c6}</legend>{aidOptions.map(aid => <label key={aid.id}><input type="checkbox" checked={draft.aids.includes(aid.id)} onChange={e => setDraft(d => ({ ...d, aids: e.target.checked ? [...d.aids, aid.id] : d.aids.filter(id => id !== aid.id), selectedCandidate: '' }))}/>{aid.label}</label>)}</fieldset><label>{copyDictionary.cbea8337e8a580c2b}<select value={draft.aids[0] ?? ''} onChange={e => { const id = e.target.value as FittingDraft['aids'][number]; setDraft(d => ({ ...d, aids: [id, ...d.aids.filter(a => a !== id)], selectedCandidate: '' })); }}><option value="" disabled>{copyDictionary.c98812e50272cd3a2}</option>{aidOptions.map(aid => <option key={aid.id} value={aid.id}>{aid.label}</option>)}</select></label><label>{copyDictionary.c2561c97146595067}<select value={draft.pose} onChange={e => setDraft(d => ({ ...d, pose: e.target.value as FittingDraft['pose'] }))}><option value="auto">{copyDictionary.c7eb336e42cb5076b}</option><option value="seated">{copyDictionary.c9f5a6eca33997fcf}</option><option value="standing">{copyDictionary.c2c61b1b954017a17}</option></select></label><label>{copyDictionary.c21bda831ee766b20}<select value={draft.side} onChange={e => setDraft(d => ({ ...d, side: e.target.value as FittingDraft['side'] }))}><option value="right">{copyDictionary.c1cf1d4d0b24b0b16}</option><option value="left">{copyDictionary.c6a24b14f33c72be4}</option><option value="both">{copyDictionary.c1aaf161623b5d59e}</option></select></label></>}
      <p className="fit-inspector-note">{copyDictionary.c5480fe881b179028}</p></aside></div>
    <div className="fit-workflow-content">
    <section aria-label={copyDictionary.c275d99b8d11c2bbe}><h2>{copyDictionary.ca7b17455bf887199}</h2><p>{copyDictionary.c57ad4a18862b2d7d}</p><button onClick={() => { const generated = draftFromMeasurements(draft); setDraft(d => ({ ...d, parameters: generated.parameters, selectedCandidate: '' })); setNotice((generated.used.length ? copyDictionary.c97f2f7671059dbd4 + generated.used.join('、') + '。' : copyDictionary.ceeeaaded0ce53113) + generated.notes.join('')); }}>{copyDictionary.c8591843a4466a95b}</button><p className="fit-subtle">{copyDictionary.c8c0fa46158042c55}</p><div className="fit-design-grid">{designFields.filter(field => draft.aids.includes('wheelchair') ? field.key !== 'handleHeight' : draft.aids.includes('walker') || draft.aids.includes('crutch') ? ['handleHeight', 'supportLength'].includes(field.key) : field.key === 'supportLength').map(field => <label key={field.key}><span>{field.label}<strong>{draft.parameters[field.key]} cm</strong></span><input type="range" min={field.min} max={field.max} step={field.step} value={draft.parameters[field.key]} onChange={e => setDraft(d => ({ ...d, selectedCandidate: '', parameters: { ...d.parameters, [field.key]: Number(e.target.value) } }))}/></label>)}</div><label>{copyDictionary.c28d12f958c02a062}<textarea value={draft.notes} maxLength={1500} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder={copyDictionary.c42b5da094a3a1c16}/></label><div className="fit-inline-actions"><button onClick={onShop}>{copyDictionary.c10a893785d022d26}</button><button onClick={onTravel}>{copyDictionary.cc71ee958fcc167b5}</button><button onClick={async () => { if (await readText(copyDictionary.ca1f4e187b2a4af09 + primary.label + copyDictionary.cc0c9c64c12ff427f + filledMeasurements(draft.body) + copyDictionary.c084d1a3244414737 + draft.parameters.seatWidth + copyDictionary.cbfa0e96c256a2407 + draft.parameters.seatDepth + copyDictionary.c8af13af129c5d8cf)) setNotice(copyDictionary.speechCompleted); }}>{copyDictionary.c0cf86a27448cbac5}</button></div><details className="fit-boundary"><summary>{copyDictionary.c08ca2c866c8163ef}</summary><p>{copyDictionary.cc5cf80b1dfb2f649}</p><p>{copyDictionary.cc2e0a099e0e82b82}<a href="https://www.who.int/publications/b/63432" target="_blank" rel="noopener noreferrer">{copyDictionary.c539559ff6f4972b4}</a>{copyDictionary.c3492cb990a77492d}</p></details></section>
    </div>
    <section className="fit-save-panel" aria-label={copyDictionary.c140bb6e08eaec7de}><h2>{copyDictionary.cc89acc89007a97ad}</h2><label className="switch-line"><input type="checkbox" checked={draft.allowSave} onChange={e => setDraft(d => ({ ...d, allowSave: e.target.checked }))}/>{copyDictionary.cc8829bf1bb662f24}</label><p>{copyDictionary.c103eb8d7539dc49f}</p><div className="fit-inline-actions"><button onClick={() => { downloadText(serializedFitting({ ...draft, allowSave: true }), copyDictionary.c8d7f2a6a6124037f, 'application/json'); setNotice(copyDictionary.cc20ecbc856c8df85); }}>{copyDictionary.c62902176e5dfe654}</button><button onClick={() => file.current?.click()}>{copyDictionary.c3f49e22ba1e24170}</button><button onClick={() => setClearConfirm(true)}>{copyDictionary.cccd07e100f20fda4}</button></div><input className="sr-only" tabIndex={-1} ref={file} type="file" accept="application/json,.json" aria-label={copyDictionary.c8967f5eb748982bf} onChange={async (e) => { const uploaded = e.target.files?.[0]; if (!uploaded)
        return; try {
        if (uploaded.size > 80000)
            throw Error(copyDictionary.c5bfcab76a6014596);
        const restored = readFitting(await uploaded.text());
        if (!restored)
            throw Error(copyDictionary.c38056cf30c2d2720);
        setDraft({ ...restored, allowSave: false });
        setNotice(copyDictionary.cc0546967cec9e801);
    }
    catch {
        setNotice(copyDictionary.cb831ecfef95e2e7b);
    }
    finally {
        e.target.value = '';
    } }}/><p role="status">{notice}</p></section>
    {clearConfirm && <Modal title={copyDictionary.ca0e1f07713ddf908} onClose={() => setClearConfirm(false)}><p>{copyDictionary.cf1c5b6ca4743c864}</p><div className="fit-inline-actions"><button onClick={() => { try {
        onClear();
        setClearConfirm(false);
        setNotice(copyDictionary.ce0ee95d8ccecb0a0);
    }
    catch {
        setNotice(copyDictionary.c03c48edc4d7c7587);
    } }}>{copyDictionary.ca142e8e50823a070}</button><button onClick={() => setClearConfirm(false)}>{copyDictionary.c64ee9cbe590d7e7f}</button></div></Modal>}
  </section>;
}
