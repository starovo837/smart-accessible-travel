import { copyDictionary } from "../../app/copyDictionary.ts";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { aidOptions, candidateFromAnalysis, rankedCandidates, safeShoppingLink, type FitCandidate, type FittingDraft } from '../../app/fitting';
import { shoppingPlatforms, shoppingUrl } from '../../app/catalog';
import type { ProductAnalysis } from '../../app/types';
interface Props {
    draft: FittingDraft;
    setDraft: Dispatch<SetStateAction<FittingDraft>>;
    products: ProductAnalysis[];
    analysis?: ReactNode;
    onFitting: () => void;
    onAnalyze: () => void;
}
const emptyCandidate = (draft: FittingDraft): FitCandidate => ({ id: '', name: '', aid: draft.aids[0] ?? 'wheelchair', url: '', source: '', checkedAt: '', seatWidth: '', seatDepth: '', loadKg: '', outerWidth: '', weightKg: '', confirmed: false });
export function FitShopping({ draft, setDraft, products, analysis, onFitting, onAnalyze }: Props) {
    const [editing, setEditing] = useState<FitCandidate | null>(null), [notice, setNotice] = useState('');
    const primary = aidOptions.find(a => a.id === draft.aids[0]) ?? aidOptions[0], rows = rankedCandidates(draft);
    if (!draft.aids.length)
        return <section><h2>{copyDictionary.c63a45471f75f12fd}</h2><p>{copyDictionary.cf2b6130246e51957}</p><button onClick={onFitting}>{copyDictionary.ce675f5c67fbe5f19}</button></section>;
    const save = () => { if (!editing)
        return; const url = editing.url.trim() ? safeShoppingLink(editing.url) : ''; if (!editing.name.trim() || !editing.source.trim()) {
        setNotice(copyDictionary.c035755bf946dccae);
        return;
    } if (editing.url.trim() && !url) {
        setNotice(copyDictionary.c124b26528ba60578);
        return;
    } for (const key of ['seatWidth', 'seatDepth', 'loadKg', 'outerWidth', 'weightKg'] as const) {
        const raw = editing[key];
        if (raw.trim() && (!Number.isFinite(Number(raw)) || Number(raw) <= 0)) {
            setNotice(copyDictionary.c5701443d9b5ae270);
            return;
        }
    } const next = { ...editing, id: editing.id || 'candidate-' + Date.now(), name: editing.name.trim(), url, checkedAt: new Date().toISOString() }; setDraft(d => ({ ...d, candidates: [...d.candidates.filter(c => c.id !== next.id), next] })); setEditing(null); setNotice(copyDictionary.ce3495909eb2df7ef); };
    return <section className="fit-shopping" aria-label={copyDictionary.cf86c81db1a9a384b}><h2>{copyDictionary.c825f7d9f260c6924}</h2><p>{copyDictionary.c11cbed735c4fec8c}</p>
    <div className="fit-platforms">{shoppingPlatforms.map(platform => <a key={platform.id} href={shoppingUrl(platform, primary.query)} target="_blank" rel="noopener noreferrer"><strong>{platform.label}</strong><span>{copyDictionary.c6b5a8a514f479832}{primary.label} ↗</span></a>)}</div><p className="fit-subtle">{copyDictionary.c5ce3ed3dc5f6468a}{primary.query}{copyDictionary.c5b5256dffef56d31}</p>
    <div className="fit-inline-actions"><button onClick={() => { setEditing(emptyCandidate(draft)); setNotice(''); }}>{copyDictionary.c3cca6a623d5b06b5}</button><button onClick={() => { const imported = products.map(candidateFromAnalysis).filter((c): c is FitCandidate => Boolean(c)); setDraft(d => ({ ...d, candidates: [...d.candidates, ...imported.filter(c => !d.candidates.some(old => old.id === c.id))] })); setNotice(imported.length ? copyDictionary.cf337981e07a8461b : copyDictionary.c1554d6ea8e13f8b5); }}>{copyDictionary.cb6686f3465d36f01}</button></div>
    {editing && <form className="fit-candidate-form" onSubmit={e => { e.preventDefault(); save(); }}><h3>{editing.id ? copyDictionary.cba3b20bbee58fd28 : copyDictionary.c56bbeae2baec0d37}</h3><div className="fit-form-grid"><label>{copyDictionary.c1bb4e669b60ccf63}<input required maxLength={100} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value, confirmed: false })}/></label><label>{copyDictionary.cd72e6c3037c8aabb}<select value={editing.aid} onChange={e => setEditing({ ...editing, aid: e.target.value as FitCandidate['aid'], confirmed: false })}>{aidOptions.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label><label className="fit-span-two">{copyDictionary.c3bee280f60c7c7c8}<input type="url" value={editing.url} onChange={e => setEditing({ ...editing, url: e.target.value, confirmed: false })} placeholder="https://item.jd.com/…"/></label>{([['seatWidth', copyDictionary.c0c6db0cd77775ccf], ['seatDepth', copyDictionary.c4d21f03f361e3721], ['loadKg', copyDictionary.c81188c0602cdb694], ['outerWidth', copyDictionary.cfa2f72b33930cb22], ['weightKg', copyDictionary.cd0eedb5c3a8c60b7]] as const).map(([key, label]) => <label key={key}>{label}<input type="number" min="0.1" step="any" value={editing[key]} onChange={e => setEditing({ ...editing, [key]: e.target.value, confirmed: false })}/></label>)}</div><label>{copyDictionary.c45cec75300020848}<textarea required maxLength={500} value={editing.source} onChange={e => setEditing({ ...editing, source: e.target.value, confirmed: false })} placeholder={copyDictionary.c3dbc9e2b79f365ef}/></label><label className="switch-line"><input type="checkbox" checked={editing.confirmed} onChange={e => setEditing({ ...editing, confirmed: e.target.checked })}/>{copyDictionary.c4ea311eaf332a365}</label><div className="fit-inline-actions"><button type="submit">{copyDictionary.cc766b4d4f6292911}</button><button type="button" onClick={() => setEditing(null)}>{copyDictionary.c4b29ce8e40933160}</button></div></form>}
    <p role="status">{notice}</p>
    {!rows.length ? <div className="fit-empty"><h3>{copyDictionary.c33160e92b62dcf8a}</h3><p>{copyDictionary.ca6628dd24994de68}</p></div> : <div className="fit-candidate-list">{rows.map(({ candidate: c, checks, label, excluded }) => <article key={c.id} className={excluded ? 'fit-candidate excluded' : 'fit-candidate'}><div className="fit-candidate-title"><h3>{c.name}</h3><strong>{label}</strong></div><dl>{checks.map(check => <div key={check.label}><dt>{check.state === 'pass' ? '✓' : check.state === 'mismatch' ? '！' : '？'} {check.label}</dt><dd>{check.detail}</dd></div>)}</dl><p className="fit-subtle">{copyDictionary.c6181ed6f97342ce2}{c.source} · {c.checkedAt ? new Date(c.checkedAt).toLocaleDateString('zh-CN') : copyDictionary.c33df16b4afab2d5f}</p><div className="fit-inline-actions"><button onClick={() => { setDraft(d => ({ ...d, selectedCandidate: c.id })); onFitting(); }}>{copyDictionary.c7ee7f0bfcab17d3d}</button><button onClick={() => setEditing({ ...c })}>{copyDictionary.c5078505856cb904f}</button>{c.url && <a href={safeShoppingLink(c.url)} target="_blank" rel="noopener noreferrer">{copyDictionary.cf0a3b69ab23a9a94}</a>}<button onClick={() => setDraft(d => ({ ...d, candidates: d.candidates.filter(item => item.id !== c.id), selectedCandidate: d.selectedCandidate === c.id ? '' : d.selectedCandidate }))}>{copyDictionary.cb69df8a840d71c9e}</button></div></article>)}</div>}
    {analysis ? <details className="fit-analysis-section"><summary>{copyDictionary.c98ef3f1949e76ca7}</summary><div className="fit-embedded">{analysis}</div></details> : <button onClick={onAnalyze}>{copyDictionary.c95884e326478cac6}</button>}
  </section>;
}
