import { copyDictionary } from "../app/copyDictionary.ts";
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, PageHeader, PrimaryButton, ResultDisclaimer } from '../components/UI';
import { Icon } from '../components/Icons';
import { assistantReply, type AssistantSlots } from '../app/logic';
import { readText, stopReading } from '../app/accessibility';
import { isPages, isStudio, processingLocation } from '../app/deployment';
import { service } from '../app/service';
import { runInference } from '../app/inference';
import { answerInBrowser, browserAIAvailable, browserAIReady } from '../app/browserAI';
import { renderAssistantSelection, type AssistantEvidence } from '../app/assistantEvidence';
import type { AssistantTurn } from '../app/types';
export function AssistantPage({ readAloud, evidence, preferBrowser, contextKey, contextLabel, contextControls, omitted, evidenceTotal, requiresNarrowing, onBack, onTravel, onProduct }: {
    readAloud: boolean;
    evidence: AssistantEvidence[];
    preferBrowser: boolean;
    contextKey: string;
    contextLabel: string;
    contextControls: ReactNode;
    omitted: string[];
    evidenceTotal: number;
    requiresNarrowing: boolean;
    onBack: () => void;
    onTravel: (slots: AssistantSlots) => void;
    onProduct: (query: string) => void;
}) {
    const [turns, setTurns] = useState<AssistantTurn[]>([{ speaker: 'assistant', text: copyDictionary.c815734fff77cd9a8 }]);
    const [grounded, setGrounded] = useState(evidence.length > 0), [agreed, setAgreed] = useState(false), [busy, setBusy] = useState(false), [engineChoice, setEngineChoice] = useState<'auto' | 'computer' | 'device'>(isPages ? 'device' : 'auto'), [pendingBrowser, setPendingBrowser] = useState<string | null>(null);
    const request = useRef<AbortController | null>(null), epoch = useRef(0);
    const [draft, setDraft] = useState('');
    const [slots, setSlots] = useState<AssistantSlots>({});
    const [complete, setComplete] = useState(false);
    const [slow, setSlow] = useState(false);
    const [status, setStatus] = useState('');
    const latest = turns.filter(turn => turn.speaker === 'assistant').at(-1)?.text ?? '';
    useEffect(() => () => { epoch.current++; request.current?.abort(); stopReading(); }, []);
    useEffect(() => { epoch.current++; request.current?.abort(); setBusy(false); setGrounded(evidence.length > 0); setAgreed(false); setPendingBrowser(null); setDraft(''); setTurns([{ speaker: 'assistant', text: evidence.length ? copyDictionary.ce4d4a8f6df5a9b6a + contextLabel + copyDictionary.c896ab92f4045e5cc : copyDictionary.ce42ea1ea9351b716 }]); setStatus(''); }, [contextKey]);
    const submit = async (text = draft, forceDevice = false) => {
        if (busy) {
            setStatus(copyDictionary.cc0ec798cb3e8a78e);
            return;
        }
        if (!text.trim()) {
            setStatus(copyDictionary.c9cfd45277ce5e0b5);
            return;
        }
        stopReading();
        if (grounded) {
            if (requiresNarrowing) {
                setStatus(copyDictionary.c6c8975d77446c00e);
                return;
            }
            if (!agreed) {
                setStatus(copyDictionary.c45f1d277ce9db9c6);
                return;
            }
            if (!evidence.length) {
                setStatus(copyDictionary.c70f9f2294342694d);
                return;
            }
            request.current?.abort();
            let controller = new AbortController();
            request.current = controller;
            const version = ++epoch.current;
            setBusy(true);
            setStatus(isStudio ? copyDictionary.c73eb79979101eb33 : copyDictionary.ceb349c701f0fa3d2);
            try {
                let useDevice = forceDevice || engineChoice === 'device' || engineChoice === 'auto' && preferBrowser && browserAIReady();
                if (!useDevice) {
                    let ready: {
                        configured?: boolean;
                        authorized?: boolean;
                    } | null = null;
                    const timeout = setTimeout(() => controller.abort(), 8000);
                    try {
                        ready = await service('status', undefined, undefined, controller.signal);
                    }
                    catch {
                        if (version !== epoch.current)
                            return;
                    }
                    finally {
                        clearTimeout(timeout);
                    }
                    if (version !== epoch.current)
                        return;
                    if (!ready?.configured || !ready?.authorized) {
                        if (engineChoice === 'auto' && browserAIReady())
                            useDevice = true;
                        else if (engineChoice === 'auto' && browserAIAvailable()) {
                            setPendingBrowser(text);
                            setStatus(copyDictionary.c765ae06ea4651cfa);
                            return;
                        }
                        else
                            throw Error(ready?.configured ? (isStudio ? copyDictionary.cea3745d97df3582c : copyDictionary.c265707dbea55102b) : copyDictionary.cd7373af78cc5b8bb);
                    }
                }
                if (useDevice && !browserAIReady() && !forceDevice) {
                    if (!browserAIAvailable())
                        throw Error(isPages ? copyDictionary.pagesBrowserUnavailable : copyDictionary.cc79a0109161dbd1a);
                    setPendingBrowser(text);
                    setStatus(copyDictionary.c80d1c7155315e5b9);
                    return;
                }
                if (controller.signal.aborted) {
                    controller = new AbortController();
                    request.current = controller;
                }
                setDraft('');
                setStatus(useDevice ? copyDictionary.c19f8076d6c55b8e1 : copyDictionary.cbe8fbacc7ff7f1cd + processingLocation + copyDictionary.c27de8128e4bcbd99);
                setTurns(current => [...current, { speaker: 'user', text: text.trim() }]);
                const progress = (message: string) => { if (version === epoch.current)
                    setStatus(message); };
                const selected = useDevice ? await answerInBrowser(text, evidence, progress, controller.signal) : await runInference<ReturnType<typeof renderAssistantSelection>>('assistant/answer', { question: text, evidence, consent: true }, controller.signal, progress);
                if (version !== epoch.current)
                    return;
                const output = renderAssistantSelection({ statementIds: selected.statementIds, questionId: selected.questionId }, evidence);
                const answer = output.answer + (output.followUp ? copyDictionary.c5028e9f26f419c25 + output.followUp : '');
                setTurns(current => [...current, { speaker: 'assistant', text: answer, citations: evidence.filter(item => output.factIds.includes(item.id)) }]);
                setStatus(copyDictionary.cf1abbd148cb8dab8);
                if (readAloud)
                    readText(answer, slow ? .75 : 1);
            }
            catch (error) {
                if (version === epoch.current && (error as Error).name !== 'AbortError') {
                    setDraft(text);
                    setStatus((error as Error).message);
                }
            }
            finally {
                if (version === epoch.current)
                    setBusy(false);
            }
            return;
        }
        const result = assistantReply(text, slots);
        setTurns(current => [...current, { speaker: 'user', text: text.trim() }, { speaker: 'assistant', text: result.text }]);
        setSlots(result.slots);
        setComplete(result.complete);
        setDraft('');
        setStatus('');
        if (readAloud) void readText(result.text, slow ? 0.75 : 1);
    };
    const repeat = (rate: number) => void readText(latest, rate);
    const interrupt = () => { epoch.current++; request.current?.abort(); setBusy(false); stopReading(); setStatus(copyDictionary.cec354ec8a199d2d3); };
    return <section className="screen assistant-screen corrected-assistant">
    <PageHeader title={copyDictionary.c613f4eaa42519a01} subtitle={copyDictionary.c4135ae0c522a9724} onBack={onBack}/>
    <p className="assistant-context">{evidence.length ? copyDictionary.ceec1728037b66681 + contextLabel + copyDictionary.c629cbd8d1e92fe7c : copyDictionary.c5447743101c4e817}</p>
    <div className="chat-thread" role="log" aria-live="polite" aria-label={copyDictionary.cb53654e6b37c7c8f}>{turns.map((turn, index) => <div className={`chat-bubble ${turn.speaker}`} key={index}><strong className="sr-only">{turn.speaker === 'user' ? copyDictionary.c6a064a843e7508c7 : copyDictionary.cd3cd0e041a5fea11}</strong><span>{turn.text}</span>{turn.citations?.map(item => <details key={item.id}><summary>{copyDictionary.cd81daaf47d557919}{item.label} · {item.source}</summary><p>{item.text}</p>{item.quote && <blockquote>{item.quote}</blockquote>}</details>)}</div>)}</div>
    <div className="assistant-presets" aria-busy={busy}>{(grounded ? contextKey.startsWith('product:') ? [copyDictionary.c2dedc5f6c1859b25, copyDictionary.c6d192b18d23a3c93] : [copyDictionary.c2d993c25e5232090, copyDictionary.c97944f005e1c749b] : [copyDictionary.c0a2df46ac8934baa, copyDictionary.c60b61883e363be2e, copyDictionary.cfb3033de8b94fbad]).map(question => <button disabled={busy} key={question} onClick={() => void submit(question)}>{question}</button>)}</div>
    {grounded && <label className="switch-line"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} disabled={busy}/>{isStudio ? copyDictionary.cd8ab2bbcff1ee2e0 : copyDictionary.c16cf5cad77e55ecb}</label>}
    <form className="assistant-input" onSubmit={event => { event.preventDefault(); submit(); }}><label htmlFor="assistant-text">{copyDictionary.c4ba9c85905bf2965}<input id="assistant-text" value={draft} onChange={event => setDraft(event.target.value)} placeholder={copyDictionary.cd497df8f42caf23b}/></label><PrimaryButton type="submit" disabled={!draft.trim() || busy || (grounded && requiresNarrowing)} icon="send">{copyDictionary.c9e651013593c5a3c}</PrimaryButton></form>
    <div className="assistant-shortcuts"><button onClick={() => repeat(slow ? 0.75 : 1)}><Icon name="volume" size={18}/>{copyDictionary.c0f1f5f5ee475d8ea}</button><button aria-pressed={slow} onClick={() => { setSlow(current => !current); repeat(slow ? 1 : 0.75); }}>{slow ? copyDictionary.c7691797c75ad24ea : copyDictionary.c7c1a9ce293652550}</button><button onClick={interrupt}>{copyDictionary.ccbaab57be5db0633}</button></div>
    <p role="status" className="operation-status">{status}</p>
    {complete && <PrimaryButton onClick={() => slots.intent === 'product' ? onProduct(slots.product ?? copyDictionary.cc0ef02c12f8eb71e) : onTravel(slots)}>{slots.intent === 'product' ? copyDictionary.ced95681d2af1eaac : copyDictionary.c6804684345187a14}</PrimaryButton>}
    <button className="text-action" onClick={() => { interrupt(); setSlots({}); setComplete(false); setStatus(copyDictionary.c30088b0d3eae4e41); setTurns([{ speaker: 'assistant', text: copyDictionary.c9c8643b3a37e8ee3 }]); }}>{copyDictionary.c077f54de5ae01d29}</button>
    <details className="assistant-settings"><summary>{copyDictionary.c8e3a82dcdcba16af}</summary>{contextControls}<p>{copyDictionary.c5ae158045e573344}{evidence.length} / {evidenceTotal}{copyDictionary.c55d491c0458c41e7}</p>{omitted.length > 0 && <details><summary>{copyDictionary.ce76cf9ce3de92e76}{omitted.length}{copyDictionary.c6ad2faeaf7466290}</summary><p>{copyDictionary.c08a4bb6876ec17bd}</p><ul>{[...new Set(omitted)].map(label => <li key={label}>{label}</li>)}</ul></details>}
      <label className="switch-line"><input type="checkbox" checked={grounded} disabled={busy} onChange={e => { interrupt(); setGrounded(e.target.checked); }}/>{copyDictionary.c643ee3a405a37bb4}</label>{!grounded && <p>{copyDictionary.c4fdabdbaeb0e03bb}</p>}
      <label htmlFor="assistant-engine">{copyDictionary.c64921f10575ae6d8}</label><select id="assistant-engine" disabled={busy} value={engineChoice} onChange={e => setEngineChoice(e.target.value as typeof engineChoice)}>{!isPages && <><option value="auto">{isStudio ? copyDictionary.c04ce09e0e8ad6580 : copyDictionary.c266feadbd4b10161}</option><option value="computer">{isStudio ? copyDictionary.c62a379384eaad192 : copyDictionary.ce8045bb251187fba}</option></>}<option value="device">{copyDictionary.c25d90aa0049b3cc4}</option></select>
      <details><summary>{copyDictionary.c41327ffa9b6eac3e}</summary>{evidence.map(item => <article key={item.id}><h3>{item.label} · {item.source}</h3><p>{item.text}</p></article>)}<p>{copyDictionary.c97e5a7ee2c7727c0}</p></details>
    </details>
    {requiresNarrowing && grounded && <p role="alert">{copyDictionary.c7e9a39abfd1c38c3}</p>}
    {pendingBrowser !== null && <Modal title={copyDictionary.cc084596d934c5505} onClose={() => setPendingBrowser(null)}><p>{copyDictionary.c3b852d9ce3a60e2d}</p><PrimaryButton onClick={() => { const text = pendingBrowser; setPendingBrowser(null); void submit(text, true); }}>{copyDictionary.cd0aea21bad5d03a8}</PrimaryButton><PrimaryButton variant="ghost" onClick={() => { setDraft(pendingBrowser); setPendingBrowser(null); setStatus(copyDictionary.ca9a1aa774dfc05d1); }}>{copyDictionary.c35786441f953fc0c}</PrimaryButton></Modal>}
    <ResultDisclaimer />
  </section>;
}
