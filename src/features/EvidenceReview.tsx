import { copyDictionary } from "../app/copyDictionary.ts";
import { useState, type Dispatch, type SetStateAction } from 'react';
import { readText, stopReading } from '../app/accessibility';
import { checkEnumClaim, checkNumericClaim } from '../app/evidence';
import { isSampleFact, inSelectedModel, type ProductFact } from '../app/product';
import type { ProductAnalysis } from '../app/types';
export function EvidenceReview({ product, setProduct }: {
    product: ProductAnalysis;
    setProduct: Dispatch<SetStateAction<ProductAnalysis>>;
}) {
    const insight = product.insight!, [factId, setFactId] = useState(''), [method, setMethod] = useState(copyDictionary.c5a08fe1ddb71411b), [basis, setBasis] = useState(''), [notice, setNotice] = useState('');
    const groups = [...new Set(insight.facts.map(fact => fact.modelKey || ''))];
    const images = insight.sources.filter(source => source.image || source.transcript);
    const candidates = insight.facts.filter(fact => inSelectedModel(insight, fact) && !isSampleFact(insight,fact) && fact.verification === 'image');
    const fact = candidates.find(item => item.id === factId);
    const confirm = () => {
        if (!fact || isSampleFact(insight,fact) || !basis.trim())
            return;
        const numeric = /Cm$|Kg$|Wh$/.test(fact.field) || fact.field === 'batteryCount';
        const matches = numeric ? checkNumericClaim(fact.field, fact.value, fact.unit, basis).ok : checkEnumClaim(fact.field, fact.value, basis);
        if (!matches) {
            setNotice(copyDictionary.cc7ed7e9cd4961dfe);
            return;
        }
        setProduct(current => ({ ...current, insight: current.insight ? { ...current.insight, facts: current.insight.facts.map(item => item.id === fact.id ? { ...item, confirmed: true, reviewMethod: method, independentQuote: basis.trim().slice(0, 800) } : item) } : undefined }));
        setNotice(copyDictionary.c1968c1758b36c360);
        setBasis('');
    };
    return <section className="intake-panel" aria-label={copyDictionary.c58cfea1b9b2be5fa}>
    <h2>{copyDictionary.cdfe455cac81c6ac1}</h2>
    <label>{copyDictionary.c8be1060afe1d457a}<select value={insight.selectedModel ?? groups[0] ?? ''} onChange={event => setProduct(current => ({ ...current, insight: current.insight ? { ...current.insight, selectedModel: event.target.value, resolutions: {} } : undefined }))}>{groups.map(key => <option key={key} value={key}>{key || copyDictionary.cf2fc8dc6164c87e4}</option>)}</select></label>
    {groups.length > 1 && <p role="status">{copyDictionary.ce8dfc54357870050}</p>}
    {insight.facts.filter(item => item.verification === 'unverified').length > 0 && <details><summary>{copyDictionary.c70539d1b9e5ce3ec}</summary>{insight.facts.filter(item => item.verification === 'unverified').map(item => <p key={item.id}><strong>{item.label}：{item.value} {item.unit}</strong>。{item.validationNote || copyDictionary.cbe2ccce544e22191}{copyDictionary.c154aeb8815c3d811}</p>)}</details>}
    {images.map(source => <details key={source.id}><summary>{copyDictionary.c86de9125caea9d44}{source.name}</summary><p>{copyDictionary.c734c0bfdeff928c0}{source.imageQuality === 'clear' ? copyDictionary.c014a9431ffb0ac45 : source.imageQuality === 'unreadable' ? copyDictionary.c0319813e32f69be5 : copyDictionary.c88734b990b4afd52}。</p>{source.transcript ? <><button onClick={() => readText(source.transcript!)}>{copyDictionary.cf673b63c4f988b89}</button><button onClick={stopReading}>{copyDictionary.c6113d2b22a57df3a}</button><ol>{source.transcript.split(/\n+/).filter(Boolean).map((line, index) => <li key={index}>{line}<button aria-label={copyDictionary.c79bd1727bdbfc0d3 + (index + 1) + copyDictionary.c4cc7b00050cb1c21} onClick={() => readText(line)}>{copyDictionary.c99e560b65b974a86}</button></li>)}</ol></> : <p>{copyDictionary.c646c19af2b57d073}</p>}<p>{copyDictionary.cb04e43915f8a70d1}</p></details>)}
    {candidates.length > 0 && <details><summary>{copyDictionary.c5acd0e6fff5685e5}</summary><p>{copyDictionary.cbcdc015377a89a5f}</p><label>{copyDictionary.c6831a3ed8a067875}<select value={factId} onChange={event => setFactId(event.target.value)}><option value="">{copyDictionary.cda590a8fe3ce4de0}</option>{candidates.map(item => <option key={item.id} value={item.id}>{item.label}：{item.value} {item.unit}{item.confirmed ? copyDictionary.cb219ac192fd5c5fd : ''}</option>)}</select></label><label>{copyDictionary.cfd8828cd9fbadbd9}<select value={method} onChange={event => setMethod(event.target.value)}>{[copyDictionary.c5a08fe1ddb71411b, copyDictionary.c77d9f2302f95a41c, copyDictionary.cbfc4651d724d71d7].map(item => <option key={item}>{item}</option>)}</select></label><label>{copyDictionary.c087d612110794a3d}<textarea value={basis} maxLength={800} onChange={event => setBasis(event.target.value)} placeholder={copyDictionary.c1b76f57eb1d407df}/></label><button disabled={!fact || !basis.trim()} onClick={confirm}>{copyDictionary.c243e5451668b01e7}</button></details>}
    <p role="status">{notice}</p>
  </section>;
}
