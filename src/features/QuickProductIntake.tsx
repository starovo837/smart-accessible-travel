import { copyDictionary } from "../app/copyDictionary.ts";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, PageHeader, PrimaryButton } from '../components/UI';
import { ProductIntake as AdvancedIntake, readAIStatus } from './ProductIntake';
import { isStudio, processingNotice } from '../app/deployment';
import { RuntimeReadiness } from './RuntimeReadiness';
import { browserAIAvailable } from '../app/browserAI';
import { inferSource, intakeSources, type IntakeDraft } from '../app/intake';
import { sampleBundles, sourceNames, type ProductSource } from '../app/product';
import { shoppingPlatforms, shoppingUrl } from '../app/catalog';
import { downloadText } from '../app/accessibility';
type Mode = 'ai' | 'browser' | 'local' | 'sample';
interface Props {
    embedded?: boolean;
    draft: IntakeDraft | null;
    onDraftChange: (draft: IntakeDraft) => void;
    onBack: () => void;
    onAnalyze: (sources: ProductSource[], mode: Mode) => Promise<boolean>;
    loading: boolean;
    error: string;
    progress?: string;
    onCancel: () => void;
    initialQuery?: string;
    initialSources?: ProductSource[];
}
export function QuickProductIntake(props: Props) {
    const [cloudConsent, setCloudConsent] = useState(!isStudio);
    const [sources, setSources] = useState(props.draft?.sources ?? props.initialSources ?? []), [text, setText] = useState(props.draft?.text ?? ''), [notice, setNotice] = useState(''), [checking, setChecking] = useState(false), [advanced, setAdvanced] = useState(false), [browserConsent, setBrowserConsent] = useState<ProductSource[] | null>(null);
    const [query, setQuery] = useState(props.initialQuery ?? copyDictionary.cc0ef02c12f8eb71e), [platform, setPlatform] = useState('jd'), mounted = useRef(false), busy = props.loading || checking;
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => { props.onDraftChange({ sources, text }); }, [sources, text, props.onDraftChange]);
    const advancedDraft = useCallback((next: IntakeDraft) => { setSources(next.sources); setText(next.text); }, []);
    const addFiles = async (files: FileList | null) => {
        if (!files?.length)
            return;
        setChecking(true);
        try {
            const list = Array.from(files);
            if (sources.length + list.length + (text.trim() ? 1 : 0) > 5 || list.length + sources.filter(source => source.image).length > 2)
                throw Error(copyDictionary.c54a3318eccd1e57f);
            if (list.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024))
                throw Error(copyDictionary.ceec2aa43cf7fcd9e);
            const added = await Promise.all(list.map((file, index) => new Promise<ProductSource>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ id: 'image-' + Date.now() + '-' + index, name: file.name, kind: inferSource('', file.name), text: '', image: String(reader.result) }); reader.onerror = () => reject(Error(copyDictionary.cb2709e4fc84a094d)); reader.readAsDataURL(file); })));
            if (mounted.current) {
                setSources(current => [...current, ...added]);
                setNotice(copyDictionary.cf963f8a7cb936060);
            }
        }
        catch (error) {
            if (mounted.current)
                setNotice((error as Error).message);
        }
        finally {
            if (mounted.current)
                setChecking(false);
        }
    };
    const start = async () => {
        if (busy)
            return;
        if (!cloudConsent) {
            setNotice(copyDictionary.cea8abed9060192a5);
            return;
        }
        let next: ProductSource[];
        try {
            next = intakeSources(sources, text);
            if (!next.length)
                throw Error(copyDictionary.cc075cc3afc60b17d);
        }
        catch (error) {
            setNotice((error as Error).message);
            return;
        }
        setChecking(true);
        try {
            const status = await readAIStatus();
            if (!mounted.current)
                return;
            if (status.configured && status.authorized) {
                await props.onAnalyze(next, 'ai');
                return;
            }
            if (browserAIAvailable() && !next.some(source => source.image)) {
                setBrowserConsent(next);
                return;
            }
            setNotice(isStudio ? copyDictionary.c5846a8eed9e3ea81 : status.configured ? copyDictionary.c27d38216a584878b : copyDictionary.c67eb448e463a87f3);
        }
        catch (error) {
            if (mounted.current) {
                if (browserAIAvailable() && !next.some(source => source.image))
                    setBrowserConsent(next);
                else
                    setNotice((error as Error).message);
            }
        }
        finally {
            if (mounted.current)
                setChecking(false);
        }
    };
    return <section className="screen product-intake"><PageHeader level={props.embedded ? 2 : 1} title={copyDictionary.cb4cab9c262b53d6a} subtitle={copyDictionary.cdea84b0fd005791d} onBack={() => { props.onCancel(); props.onBack(); }}/>
  <section className="intake-panel"><h2>{copyDictionary.c81bdac2103ded094}</h2><label htmlFor="quick-product-text">{copyDictionary.c7e60f7a5ccb07bc4}</label><textarea id="quick-product-text" disabled={busy} maxLength={6000} value={text} onChange={e => setText(e.target.value)} placeholder={copyDictionary.c60ad4811d3508af8}/><button disabled={busy} onClick={async () => { try {
        if (!navigator.clipboard?.readText)
            throw Error(copyDictionary.cdc14a27299f8d706);
        const value = await navigator.clipboard.readText();
        if (mounted.current) {
            setText(value.slice(0, 6000));
            setNotice(value.length > 6000 ? copyDictionary.ce03ed0fa63628e96 : copyDictionary.cebb9c887473eb606);
        }
    }
    catch (error) {
        setNotice((error as Error).message);
    } }}>{copyDictionary.c5d41e9a049bfcd8e}</button><label className="image-input">{copyDictionary.ca2c883a4f97f73a9}<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={e => { void addFiles(e.target.files); e.target.value = ''; }}/></label><p>{copyDictionary.cdbca681a9f193d22}{processingNotice}{copyDictionary.c09a905fbc8a6f40e}</p></section>
  {sources.map(source => <article className="source-preview" key={source.id}><strong>{source.name}</strong><p>{sourceNames[source.kind]}{copyDictionary.c992c5b8e4e7bfd3a}</p><button disabled={busy} aria-label={copyDictionary.c6135d4159e892541 + source.name} onClick={() => setSources(current => current.filter(item => item.id !== source.id))}>{copyDictionary.c6135d4159e892541}</button><details><summary>{copyDictionary.ca2cf0672eb259a1f}</summary><label>{copyDictionary.c36ca458a92bd722f}<select disabled={busy} value={source.kind} onChange={e => setSources(current => current.map(item => item.id === source.id ? { ...item, kind: e.target.value as ProductSource['kind'] } : item))}>{Object.entries(sourceNames).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label>{copyDictionary.c8018c96013e2271d}<input disabled={busy} maxLength={60} value={source.modelKey ?? ''} onChange={e => setSources(current => current.map(item => item.id === source.id ? { ...item, modelKey: e.target.value.trim().toUpperCase() } : item))}/></label></details></article>)}
  {isStudio && <label className="switch-line"><input type="checkbox" checked={cloudConsent} disabled={busy} onChange={e => setCloudConsent(e.target.checked)}/>{copyDictionary.cb2babf422d7bf8cb}</label>}
  <p role="status">{props.loading && props.progress ? props.progress : notice}</p>{props.error && <p role="alert" className="form-error">{props.error}</p>}<PrimaryButton disabled={busy || !cloudConsent || (!sources.length && !text.trim())} onClick={() => void start()}>{props.loading ? copyDictionary.cc98fe4fb01aac840 : checking ? copyDictionary.cd888ad993f785857 : copyDictionary.ca35bf3d0941627aa}</PrimaryButton>{props.loading && <PrimaryButton variant="ghost" onClick={props.onCancel}>{copyDictionary.ca15c68d61100c9ff}</PrimaryButton>}
  <details><summary>{isStudio ? copyDictionary.c0e29b626b39943db : copyDictionary.c22601ac215c61d1a}</summary><button disabled={busy || !text.trim()} onClick={() => { try {
        setSources(intakeSources(sources, text).map(source => source.id === 'draft-text' ? { ...source, id: 'text-' + Date.now() } : source));
        setText('');
    }
    catch (error) {
        setNotice((error as Error).message);
    } }}>{copyDictionary.c5f19c4f16c8c6fa0}</button><button disabled={!sources.length && !text.trim()} onClick={() => downloadText(JSON.stringify({ kind: 'accessible-product-draft', sources, text }, null, 2), copyDictionary.c82f7448b5517cebc, 'application/json')}>{copyDictionary.c3605d9762a586fee}</button><label>{copyDictionary.c41ab4b52b77875d9}<input type="file" accept=".json,application/json" disabled={busy} onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; try {
        if (file.size > 9 * 1024 * 1024)
            throw Error(copyDictionary.cb59c562448aa8770);
        const value = JSON.parse(await file.text());
        if (value.kind !== 'accessible-product-draft' || !Array.isArray(value.sources) || value.sources.length > 5 || typeof value.text !== 'string' || value.text.length > 6000)
            throw Error(copyDictionary.c1a45506a32201cbf);
        const restored: ProductSource[] = value.sources.map((source: ProductSource, index: number) => { if (!['merchant', 'manual', 'reply', 'review'].includes(source.kind) || typeof source.text !== 'string' || source.text.length > 18000 || source.image && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(source.image) || source.image.length > 4 * 1024 * 1024))
            throw Error(copyDictionary.c79b13c1105934f39); return { id: 'restore-' + index, name: String(source.name ?? copyDictionary.cd241dc8fbab192f8).slice(0, 120), kind: source.kind, text: source.text, image: source.image, modelKey: String(source.modelKey ?? '').slice(0, 60) }; });
        setSources(restored);
        setText(value.text);
        setNotice(copyDictionary.c7fb94488891cbbc4);
    }
    catch (error) {
        setNotice((error as Error).message);
    }
    finally {
        e.target.value = '';
    } }}/></label><button disabled={busy} onClick={() => { try {
        setSources(intakeSources(sources, text));
        setText('');
        setAdvanced(true);
    }
    catch (error) {
        setNotice((error as Error).message);
    } }}>{isStudio ? copyDictionary.ce48b5c460a6300f2 : copyDictionary.c3ade10c678a2f512}</button><button disabled={busy || (!sources.length && !text.trim())} onClick={() => { try {
        const next = intakeSources(sources, text);
        if (next.every(source => !source.text.trim()))
            throw Error(copyDictionary.ccb6b69e875ae8afb);
        void props.onAnalyze(next, 'local');
    }
    catch (error) {
        setNotice((error as Error).message);
    } }}>{copyDictionary.c9bea9f09011074f0}</button><p>{copyDictionary.ce6b93f7917334b9b}</p></details>
  <details><summary>{copyDictionary.c6e73488f90eda7a8}</summary><RuntimeReadiness /></details>
  <section className="sample-library"><h2>{copyDictionary.cd0705d6122297df7}</h2><p>{copyDictionary.c08d174f3252e6e76}</p>{sampleBundles.map(bundle => <button className="task-link" disabled={busy} key={bundle.id} onClick={() => void props.onAnalyze(bundle.sources, 'sample')}><strong>{bundle.title}</strong><span>{copyDictionary.c80fc60ee5b6e253b}</span></button>)}</section>
  <details className="shopping-secondary"><summary>{copyDictionary.cf86c02a4304d5f06}</summary><label>{copyDictionary.c8c98ecc3037bfcb9}<input value={query} onChange={e => setQuery(e.target.value)}/></label><label>{copyDictionary.c753a108c178145d5}<select value={platform} onChange={e => setPlatform(e.target.value)}>{shoppingPlatforms.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><a className="button button-secondary" href={shoppingUrl(shoppingPlatforms.find(item => item.id === platform) ?? shoppingPlatforms[0], query || copyDictionary.cc0ef02c12f8eb71e)} target="_blank" rel="noopener noreferrer">{copyDictionary.ccb5c875dd31d8221}</a><p>{copyDictionary.c21d7b737beca46e7}</p></details>
  {advanced && <Modal title={isStudio ? copyDictionary.ce48b5c460a6300f2 : copyDictionary.c3ade10c678a2f512} fullScreen onClose={() => setAdvanced(false)}><AdvancedIntake initialSources={sources} onDraftChange={advancedDraft} initialQuery={query} onBack={() => setAdvanced(false)} onAnalyze={async (next, mode) => { setSources(next); setText(''); setAdvanced(false); await props.onAnalyze(next, mode); }} loading={props.loading} error={props.error} onCancel={props.onCancel}/></Modal>}
  {browserConsent && <Modal title={copyDictionary.cde6b999c63a6a53c} onClose={() => setBrowserConsent(null)}><p>{copyDictionary.c2c2926222df5de30}</p><PrimaryButton onClick={() => { const next = browserConsent; setBrowserConsent(null); void props.onAnalyze(next, 'browser'); }}>{copyDictionary.c449db88acda06851}</PrimaryButton><PrimaryButton variant="ghost" onClick={() => setBrowserConsent(null)}>{copyDictionary.c468d466c2911ebff}</PrimaryButton></Modal>}
 </section>;
}
