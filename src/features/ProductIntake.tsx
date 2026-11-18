import { copyDictionary } from "../app/copyDictionary.ts";
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { PageHeader, PrimaryButton } from '../components/UI';
import { sampleBundles, sourceNames, type ProductSource, type SourceKind } from '../app/product';
import { apiFetch } from '../app/transport';
import { isStudio, processingNotice, processingLocation } from '../app/deployment';
import { browserAIAvailable, clearBrowserAI } from '../app/browserAI';
import { shoppingPlatforms, shoppingUrl } from '../app/catalog';
export interface AIStatus {
    configured: boolean;
    authorized: boolean;
    provider?: string;
    localOnly?: boolean;
    model?: string;
    reason?: string;
    deployment?: string;
}
export class SessionRateLimitError extends Error {
    constructor() { super(copyDictionary.sessionRateLimited); }
}
export async function readAIStatus(): Promise<AIStatus> {
    const response = await apiFetch('/api/status', { credentials: 'same-origin', cache: 'no-store' });
    if (response.status === 429)
        throw new SessionRateLimitError();
    if (!response.ok)
        throw Error(copyDictionary.cbb9ea7c986783628);
    const status: AIStatus = await response.json();
    if (status.provider !== 'ollama' || status.localOnly !== true)
        throw Error(copyDictionary.c46facc6955cf1e31);
    if ((status.deployment === 'studio') !== isStudio)
        throw Error(copyDictionary.c2105801ee995960b);
    return status;
}
function modelStatus(status: AIStatus | null) {
    if (isStudio)
        return !status ? copyDictionary.c283cd9d6ce626ee4 : status.configured ? copyDictionary.c5c00a8663719f9c6 : copyDictionary.cbc4db2080fd88033;
    if (!status)
        return copyDictionary.c9e34203b43f39a89;
    if (status.configured)
        return status.authorized ? copyDictionary.ca639a7f7f7448646 : copyDictionary.ce742dcb846835d2c;
    if (status.reason === 'engine_starting')
        return copyDictionary.c4aeb89164a29817f;
    if (status.reason === 'model_missing')
        return copyDictionary.c0b1a530fc9994860;
    if (status.reason === 'cloud_disabled')
        return copyDictionary.c8e7eab666cb82c2d;
    if (status.reason === 'vision_missing')
        return copyDictionary.c12d96157ecce80a7;
    return copyDictionary.c0243e9ade36634ca;
}
export function ProductIntake({ onBack, onAnalyze, loading, error, onCancel, initialQuery = copyDictionary.c4157eed714966bbc, initialSources = [], onDraftChange }: {
    onBack: () => void;
    onAnalyze: (sources: ProductSource[], mode: 'ai' | 'browser' | 'local' | 'sample') => void;
    loading: boolean;
    error: string;
    onCancel: () => void;
    initialQuery?: string;
    initialSources?: ProductSource[];
    onDraftChange?: (draft: import('../app/intake').IntakeDraft) => void;
}) {
    const [cloudConsent, setCloudConsent] = useState(!isStudio);
    const [sources, setSources] = useState<ProductSource[]>(initialSources), [text, setText] = useState(''), [name, setName] = useState(''), [kind, setKind] = useState<SourceKind>('merchant');
    const [mode, setMode] = useState<'ai' | 'browser' | 'local'>('ai'), [status, setStatus] = useState<AIStatus | null>(null), [notice, setNotice] = useState(''), [link, setLink] = useState('');
    const [pair, setPair] = useState(''), [pairCode, setPairCode] = useState(''), [query, setQuery] = useState(initialQuery), [platform, setPlatform] = useState('jd'), [fileLoading, setFileLoading] = useState(false);
    useEffect(() => { onDraftChange?.({ sources, text }); }, [sources, text, onDraftChange]);
    const mounted = useRef(true);
    const [sourceModel, setSourceModel] = useState('');
    useEffect(() => {
        mounted.current = true;
        let timer: ReturnType<typeof setTimeout> | undefined, attempts = 0;
        const check = async () => { try {
            const value = await readAIStatus();
            if (!mounted.current)
                return;
            setStatus(value);
            if (!value.configured && ['engine_starting', 'engine_unavailable'].includes(value.reason ?? '') && ++attempts < 12)
                timer = setTimeout(() => void check(), 5000);
        }
        catch (error) {
            if (mounted.current)
                setNotice((error as Error).message);
        } };
        void check();
        return () => { mounted.current = false; clearTimeout(timer); };
    }, []);
    const refresh = async () => { try {
        setStatus(await readAIStatus());
        setNotice(copyDictionary.c4184502e73c4aa3b);
    }
    catch (error) {
        setStatus(null);
        setNotice((error as Error).message);
    } };
    const addText = () => {
        if (!text.trim())
            return;
        if (sources.length >= 5) {
            setNotice(copyDictionary.c1e74b64ae0384f8d);
            return;
        }
        setSources(current => [...current, { id: 'source-' + Date.now(), name: name.trim() || sourceNames[kind] + ' ' + (current.length + 1), kind, text: text.trim(), modelKey: sourceModel.trim().toUpperCase() }]);
        setText('');
        setName('');
        setNotice(copyDictionary.c60d50595360206f0);
    };
    const addFiles = async (files: FileList | null) => {
        if (!files?.length)
            return;
        setFileLoading(true);
        try {
            const selected = Array.from(files);
            if (selected.length + sources.length > 5)
                throw Error(copyDictionary.cb0b5c88aa47fcc7d);
            if (selected.length + sources.filter(source => source.image).length > 2)
                throw Error(copyDictionary.c06e50fed962de56b);
            if (selected.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024))
                throw Error(copyDictionary.cde5999de5d727980);
            const added = await Promise.all(selected.map((file, index) => new Promise<ProductSource>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ id: 'image-' + Date.now() + '-' + index, name: file.name, kind, text: '', image: String(reader.result), modelKey: sourceModel.trim().toUpperCase() });
                reader.onerror = () => reject(Error(copyDictionary.c4a95d2ba2846961a));
                reader.readAsDataURL(file);
            })));
            if (mounted.current) {
                setSources(current => [...current, ...added]);
                setNotice(copyDictionary.c40ebc85fb2c6ce81 + processingLocation + copyDictionary.cea52d477702cd077);
            }
        }
        catch (error) {
            setNotice((error as Error).message);
        }
        finally {
            if (mounted.current)
                setFileLoading(false);
        }
    };
    const currentPlatform = shoppingPlatforms.find(item => item.id === platform) ?? shoppingPlatforms[0];
    const overLimit = sources.reduce((sum, source) => sum + source.text.length, 0) > 6000;
    return <section className="screen product-intake">
    <PageHeader title={copyDictionary.cb4cab9c262b53d6a} subtitle={copyDictionary.cd8e4be48e16f5be6} onBack={() => { onCancel(); onBack(); }}/>
    <div className="insight-hero"><span className="insight-kicker"><Icon name="spark" size={19}/>{isStudio ? copyDictionary.c3d6bde583048a494 : copyDictionary.c43b85f6600369bc5}</span><h2>{copyDictionary.c501f69421dae4fe4}<br />{copyDictionary.c4445a67247f8b55b}</h2><p>{copyDictionary.c23c93a0ab5939948}</p><div className="insight-steps"><span>{copyDictionary.c4988073aa462b582}</span><span>{copyDictionary.cd8c58e4e264c6292}</span><span>{copyDictionary.c345496da3a13d7d1}</span></div></div>
    <section className="intake-panel"><h2>{copyDictionary.c3f6bd057f6f3d57d}</h2>
      <label>{copyDictionary.c36ca458a92bd722f}<select disabled={loading || fileLoading} value={kind} onChange={event => setKind(event.target.value as SourceKind)}>{Object.entries(sourceNames).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
      <label>{copyDictionary.c507ab679f7dafc86}<input value={name} onChange={event => setName(event.target.value)} placeholder={copyDictionary.cf50580c2de8cdf15} maxLength={120}/></label>
      <label>{copyDictionary.c2cc1b0e878c1f63a}<input value={sourceModel} onChange={event => setSourceModel(event.target.value)} maxLength={60} placeholder={copyDictionary.ca90bc03743068f06}/></label>
      <label>{copyDictionary.c7e60f7a5ccb07bc4}<textarea value={text} onChange={event => setText(event.target.value)} placeholder={copyDictionary.c6d60202d58b1dc93} maxLength={6000}/></label>
      <PrimaryButton variant="secondary" disabled={!text.trim() || loading || fileLoading} onClick={addText}>{copyDictionary.c622178dc30114645}</PrimaryButton>
      <label className="image-input"><Icon name="upload" size={22}/><span>{copyDictionary.ca2c883a4f97f73a9}</span><small>{copyDictionary.cf035be56e607a751}</small><input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={loading || fileLoading} onChange={event => { void addFiles(event.target.files); event.target.value = ''; }}/></label>
      <p className="prototype-note">{copyDictionary.c480c024c36474ede}</p>
      <details><summary>{copyDictionary.c9b7c689a8b966e7f}</summary><label>{copyDictionary.c282bbc888126f1b0}<input type="url" value={link} onChange={event => setLink(event.target.value)} placeholder="https://…"/></label><p>{copyDictionary.c0337a67108a362ff}</p></details>
    </section>
    <section aria-label={copyDictionary.c7961d416b0421b19} className="source-list"><h2>{copyDictionary.c4fbaacef960a8357}{sources.length} / 5</h2>{sources.length ? sources.map((source, index) => <article className="source-preview" key={source.id}><div><strong>{index + 1}．{source.name}</strong><small>{sourceNames[source.kind]} · {source.image ? copyDictionary.c9fe026070a131c82 : copyDictionary.ce3b0c44298fc1c14 + source.text.length + copyDictionary.cc55038b272b109b8}</small></div><button disabled={loading} onClick={() => setSources(current => current.filter(item => item.id !== source.id))} aria-label={copyDictionary.c6135d4159e892541 + source.name}>{copyDictionary.c6135d4159e892541}</button>{source.image ? <img src={source.image} alt={copyDictionary.ce3b0c44298fc1c14 + source.name + copyDictionary.ca65aa64a1e7f72d3}/> : <p>{source.text.slice(0, 220)}{source.text.length > 220 ? '……' : ''}</p>}</article>) : <p className="muted-copy">{copyDictionary.c9d8924ae795df43e}</p>}</section>
    <fieldset className="analysis-mode"><legend>{copyDictionary.caa6fbdd259989078}</legend>
      <label className="switch-line"><input type="radio" name="analysis-mode" checked={mode === 'ai'} onChange={() => setMode('ai')} disabled={loading}/>{isStudio ? copyDictionary.c9bb179dc6e26f894 : copyDictionary.c4f62d518a44b2669}</label>
      <label className="switch-line"><input type="radio" name="analysis-mode" checked={mode === 'browser'} onChange={() => setMode('browser')} disabled={loading}/>{copyDictionary.c9bf958687d11c087}</label>
      <label className="switch-line"><input type="radio" name="analysis-mode" checked={mode === 'local'} onChange={() => setMode('local')} disabled={loading}/>{copyDictionary.c2cd568b2627d4349}</label>
      {mode === 'ai' ? <><p role="status">{modelStatus(status)}</p><p className="prototype-note">{processingNotice}{copyDictionary.c35fb7bb7aac8d7c5}</p><p>{isStudio ? copyDictionary.cf5410900f95ccc32 : copyDictionary.c04ce81ea246c108b}</p><button disabled={loading} onClick={() => void refresh()}>{copyDictionary.c072e4203d39d4ad8}</button>
        {!isStudio && <>        <details><summary>{copyDictionary.c97456a22c83035d8}</summary><p>{copyDictionary.c2a845bd8e225c004}{status?.model ?? copyDictionary.c2329bc02cd048ac4}{copyDictionary.cb49c62967071e52e}</p>{status?.authorized ? <><button onClick={async () => { try {
            const response = await fetch('/api/pair-code', { method: 'POST' }), data = await response.json();
            if (!response.ok)
                throw Error(data.error);
            setPairCode(data.code);
        }
        catch (error) {
            setNotice((error as Error).message);
        } }}>{copyDictionary.cf0fa7d11ce802cab}</button>{pairCode && <p className="pair-code">{copyDictionary.c894e9b0b70acc58b}{pairCode}{copyDictionary.c6d5e78af34db933e}</p>}</> : <><label>{copyDictionary.c9d544e39f7714e8f}<input inputMode="numeric" maxLength={6} value={pair} onChange={event => setPair(event.target.value)}/></label><button onClick={async () => { try {
            const response = await fetch('/api/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: pair }) }), data = await response.json();
            if (!response.ok)
                throw Error(data.error);
            setStatus(await readAIStatus());
            setPair('');
            setNotice(copyDictionary.c2770d5ea45ff49bd);
        }
        catch (error) {
            setNotice((error as Error).message);
        } }}>{copyDictionary.c33d1486de88d6928}</button></>}</details></>}
      </> : mode === 'browser' ? <p>{copyDictionary.c4dce00e2b6dd177c}{browserAIAvailable() ? copyDictionary.cbbe3b99d1b508357 : copyDictionary.c7416710162a326a7}</p> : <p>{copyDictionary.ceb5e6827122f9095}</p>}
    </fieldset>
    <details><summary>{copyDictionary.c16a368fb42fdd125}</summary><p>{copyDictionary.c39d9e449dd7b49ba}</p><button disabled={loading} onClick={async () => { try {
        await clearBrowserAI();
        setNotice(copyDictionary.c74cba342ade72dc8);
    }
    catch (error) {
        setNotice((error as Error).message);
    } }}>{copyDictionary.c127efe9171999df1}</button></details>
    {notice && <p className="operation-status" role="status">{notice}</p>}{error && <p role="alert" className="form-error">{error}</p>}{mode === 'ai' && overLimit && <p role="alert" className="form-error">{copyDictionary.c4864838afd420b56}</p>}
    {isStudio && mode === 'ai' && <label className="switch-line"><input type="checkbox" checked={cloudConsent} onChange={e => setCloudConsent(e.target.checked)}/>{copyDictionary.ce726bee3b0d015db}</label>}
    <PrimaryButton icon="spark" disabled={(mode === 'ai' && !cloudConsent) || loading || fileLoading || !sources.length || (mode === 'ai' && (overLimit || !status?.configured || !status.authorized)) || (mode === 'browser' && (!browserAIAvailable() || sources.reduce((total, source) => total + source.text.length, 0) > 3500 || sources.some(source => source.image))) || (mode === 'local' && sources.every(source => !source.text.trim()))} onClick={() => onAnalyze(sources, mode)}>{loading ? copyDictionary.c2f1f31b10b0fdc94 : mode === 'ai' ? (isStudio ? copyDictionary.c7989ff3f8e8ff37e : copyDictionary.c4328b79d424669cd) : mode === 'browser' ? copyDictionary.c1a724672e37d4552 : copyDictionary.cdaad14b0665621f3}</PrimaryButton>
    {loading && <PrimaryButton variant="ghost" onClick={onCancel}>{copyDictionary.ca15c68d61100c9ff}</PrimaryButton>}
    <section className="sample-library"><h2>{copyDictionary.c9335c8ac41f79ab9}</h2><p>{copyDictionary.c9af29b6fbb2ba3ee}</p>{sampleBundles.map(bundle => <button className="task-link" disabled={loading} key={bundle.id} onClick={() => onAnalyze(bundle.sources, 'sample')}><strong>{bundle.title}</strong><span>{copyDictionary.cb9f595f7350ff1c2}</span></button>)}</section>
    <details className="shopping-secondary"><summary>{copyDictionary.cf86c02a4304d5f06}</summary><label>{copyDictionary.c8c98ecc3037bfcb9}<input value={query} onChange={event => setQuery(event.target.value)}/></label><label>{copyDictionary.c753a108c178145d5}<select value={platform} onChange={event => setPlatform(event.target.value)}>{shoppingPlatforms.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><a className="button button-secondary" href={shoppingUrl(currentPlatform, query || copyDictionary.cc0ef02c12f8eb71e)} target="_blank" rel="noopener noreferrer">{copyDictionary.cc771248e511fbf93}{currentPlatform.label}{copyDictionary.cb1479c4391e528cc}</a><p>{copyDictionary.ce593b251404af25b}</p></details>
  </section>;
}
