import { copyDictionary } from "./copyDictionary.ts";
import { chosenFact } from './product.ts';
import type { DeviceCard, ProductAnalysis } from './types';
export const FITTING_KEY = 'smart-accessible-fitting-v1';
export const bodyFields = [
    { key: 'heightCm', label: copyDictionary.c2763b73dd129f286, unit: 'cm', min: 60, max: 240, example: 170, help: copyDictionary.c507e50531e477771 },
    { key: 'weightKg', label: copyDictionary.c38f7c7e22faf477b, unit: 'kg', min: 5, max: 350, example: 65, help: copyDictionary.c04076addcd5774ca },
    { key: 'hipWidthCm', label: copyDictionary.cc223a1c3c8d9173f, unit: 'cm', min: 15, max: 90, example: 38, help: copyDictionary.c25ff1c632cc031dd },
    { key: 'thighLengthCm', label: copyDictionary.ca456243080086956, unit: 'cm', min: 15, max: 80, example: 44, help: copyDictionary.c98666ac9ca3c409c },
    { key: 'lowerLegCm', label: copyDictionary.c481a76d67558f605, unit: 'cm', min: 10, max: 80, example: 43, help: copyDictionary.cafb8c43edf93b13f },
    { key: 'shoulderWidthCm', label: copyDictionary.c1cee23f073a9d264, unit: 'cm', min: 15, max: 80, example: 42, help: copyDictionary.c64f9e6bb35f6fbc4 },
    { key: 'forearmLengthCm', label: copyDictionary.c26d89dda5dcdd5d1, unit: 'cm', min: 10, max: 50, example: 26, help: copyDictionary.cfa35a0777fbd5f13 },
    { key: 'wristCircCm', label: copyDictionary.ccc8ca43cebdc2b34, unit: 'cm', min: 8, max: 40, example: 17, help: copyDictionary.cccdb98ea1952a45a },
    { key: 'ankleCircCm', label: copyDictionary.c8b1984c18104bc95, unit: 'cm', min: 10, max: 60, example: 23, help: copyDictionary.c5fc13b846b063a83 },
    { key: 'footLengthCm', label: copyDictionary.c4c07645459b44154, unit: 'cm', min: 8, max: 40, example: 25, help: copyDictionary.c3ec869b611698e23 },
] as const;
export type BodyKey = typeof bodyFields[number]['key'];
export type BodyDraft = Record<BodyKey, string>;
export const aidOptions = [
    { id: 'wheelchair', label: copyDictionary.ccfc90ea657507b34, query: copyDictionary.c9054f02e4b7b1b24, type: 'manual-wheelchair' },
    { id: 'walker', label: copyDictionary.c7f290bf710fb3e79, query: copyDictionary.c6358c8a44255e7f7, type: 'walker' },
    { id: 'crutch', label: copyDictionary.cd7762b62140d9f6b, query: copyDictionary.cf1537613c4b95525, type: 'crutches' },
    { id: 'cane', label: copyDictionary.cbc4a33ffc596d34c, query: copyDictionary.cf454568a95440414, type: 'cane' },
    { id: 'hearing', label: copyDictionary.ccf769172aafe5cac, query: copyDictionary.ccf769172aafe5cac, type: 'hearing-aid' },
    { id: 'wrist', label: copyDictionary.cf5609edbd587195e, query: copyDictionary.c5365c4c781ecfc41, type: 'other' },
    { id: 'ankle', label: copyDictionary.cdc78473a7e1b0a10, query: copyDictionary.ce6b12da5bdeaa9c9, type: 'other' },
] as const;
export type AidId = typeof aidOptions[number]['id'];
export interface DesignParameters {
    seatWidth: number;
    seatDepth: number;
    seatHeight: number;
    backHeight: number;
    handleHeight: number;
    supportLength: number;
}
export const designFields = [
    { key: 'seatWidth', label: copyDictionary.cbadfb1445f04c73a, min: 24, max: 70, step: 1 }, { key: 'seatDepth', label: copyDictionary.c644be19a701e6e91, min: 25, max: 60, step: 1 },
    { key: 'seatHeight', label: copyDictionary.cc395d0136600fbfb, min: 25, max: 65, step: 1 }, { key: 'backHeight', label: copyDictionary.c77ba20cc61068677, min: 20, max: 65, step: 1 },
    { key: 'handleHeight', label: copyDictionary.c43ef3602d1039255, min: 50, max: 125, step: 1 }, { key: 'supportLength', label: copyDictionary.c9e5ae7f276fed57c, min: 8, max: 30, step: 1 },
] as const;
export interface FitCandidate {
    id: string;
    name: string;
    aid: AidId;
    url: string;
    source: string;
    checkedAt: string;
    seatWidth: string;
    seatDepth: string;
    loadKg: string;
    outerWidth: string;
    weightKg: string;
    confirmed: boolean;
    sample?: boolean;
}
export interface FittingDraft {
    version: 1;
    allowSave: boolean;
    updatedAt: number;
    body: BodyDraft;
    measurementSource: 'self' | 'assisted' | 'professional' | 'unknown';
    aids: AidId[];
    pose: 'auto' | 'seated' | 'standing';
    side: 'left' | 'right' | 'both';
    parameters: DesignParameters;
    view: {
        azimuth: number;
        polar: number;
        distance: number;
    };
    showDimensions: boolean;
    tab: 'fit' | 'shop' | 'travel';
    candidates: FitCandidate[];
    selectedCandidate: string;
    notes: string;
    transport: {
        lengthCm: string;
        widthCm: string;
        heightCm: string;
        weightKg: string;
        batteryType: 'unknown' | 'none' | 'lithium' | 'other';
        batteryWh: string;
        source: string;
        confirmed: boolean;
    };
}
export function initialFitting(): FittingDraft { return { version: 1, allowSave: false, updatedAt: 0, body: Object.fromEntries(bodyFields.map(f => [f.key, ''])) as BodyDraft, measurementSource: 'unknown', aids: [], pose: 'standing', side: 'right', parameters: { seatWidth: 42, seatDepth: 40, seatHeight: 48, backHeight: 38, handleHeight: 92, supportLength: 17 }, view: { azimuth: .65, polar: 1.28, distance: 3.15 }, showDimensions: false, tab: 'fit', candidates: [], selectedCandidate: '', notes: '', transport: { lengthCm: '', widthCm: '', heightCm: '', weightKg: '', batteryType: 'unknown', batteryWh: '', source: '', confirmed: false } }; }
export function validBodyValue(body: BodyDraft, key: BodyKey): number | undefined { const field = bodyFields.find(f => f.key === key)!, raw = body[key]; if (!raw?.trim())
    return; const n = Number(raw); return Number.isFinite(n) && n >= field.min && n <= field.max ? n : undefined; }
export function bodyErrors(body: BodyDraft) { return bodyFields.filter(f => body[f.key]?.trim() && validBodyValue(body, f.key) === undefined).map(f => ({ key: f.key, message: copyDictionary.ce3b0c44298fc1c14 + f.label + copyDictionary.c60120ff05f5c62b9 + f.min + copyDictionary.c65edbf9f1c677e70 + f.max + f.unit + copyDictionary.cf9fefc1078a6d327 })); }
export function sceneBody(body: BodyDraft) { return Object.fromEntries(bodyFields.map(field => [field.key, validBodyValue(body, field.key) ?? field.example])) as Record<BodyKey, number>; }
export function bodyAppearance(body: BodyDraft) {
    const weight = validBodyValue(body, 'weightKg'), height = validBodyValue(body, 'heightCm') ?? 170;
    // A bounded illustration control, not a prediction of a person's body shape.
    const volume = weight === undefined ? 1 : 1 + .62 * Math.tanh((Math.sqrt(weight / (22.5 * (height / 100) ** 2)) - 1) / .65);
    return { volume, approximate: weight !== undefined, hipMeasured: validBodyValue(body, 'hipWidthCm') !== undefined, shoulderMeasured: validBodyValue(body, 'shoulderWidthCm') !== undefined, wristMeasured: validBodyValue(body, 'wristCircCm') !== undefined, ankleMeasured: validBodyValue(body, 'ankleCircCm') !== undefined };
}
export function filledMeasurements(body: BodyDraft) { return bodyFields.filter(f => validBodyValue(body, f.key) !== undefined).length; }
export function draftFromMeasurements(draft: FittingDraft) {
    const parameters = { ...draft.parameters }, used: string[] = [], notes: string[] = [];
    for (const [bodyKey, designKey] of [['hipWidthCm', 'seatWidth'], ['thighLengthCm', 'seatDepth'], ['lowerLegCm', 'seatHeight']] as const) {
        const n = validBodyValue(draft.body, bodyKey), field = designFields.find(f => f.key === designKey)!;
        if (n === undefined)
            continue;
        if (n < field.min || n > field.max) {
            notes.push(copyDictionary.ce3b0c44298fc1c14 + bodyFields.find(f => f.key === bodyKey)!.label + n + copyDictionary.c761f13af4cc3fa8f);
            continue;
        }
        parameters[designKey] = n;
        used.push(field.label);
    }
    return { parameters, used, notes: [...notes, copyDictionary.c9c54c8c76223d95f] };
}
export function safeShoppingLink(raw: string) { try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password && ['jd.com', 'taobao.com', 'tmall.com', '1688.com'].some(d => url.hostname === d || url.hostname.endsWith('.' + d)) ? url.toString() : '';
}
catch {
    return '';
} }
export function readFitting(raw: string | null): FittingDraft | null {
    try {
        if (!raw || raw.length > 80000)
            return null;
        const data = JSON.parse(raw), base = initialFitting();
        if (data?.version !== 1 || data.allowSave !== true)
            return null;
        const body = Object.fromEntries(bodyFields.map(field => [field.key, typeof data.body?.[field.key] === 'string' ? data.body[field.key].slice(0, 8) : ''])) as BodyDraft;
        const parameters = { ...base.parameters };
        for (const field of designFields) {
            const n = data.parameters?.[field.key];
            if (typeof n === 'number' && Number.isFinite(n))
                parameters[field.key] = Math.min(field.max, Math.max(field.min, n));
        }
        const text = (v: unknown, max = 100) => typeof v === 'string' ? v.slice(0, max) : '';
        const candidates: FitCandidate[] = Array.isArray(data.candidates) ? data.candidates.slice(0, 30).filter((c: FitCandidate) => c && aidOptions.some(a => a.id === c.aid)).map((c: FitCandidate) => ({ id: text(c.id), name: text(c.name), aid: c.aid, url: safeShoppingLink(text(c.url, 1500)), source: text(c.source, 500), checkedAt: text(c.checkedAt), seatWidth: text(c.seatWidth, 8), seatDepth: text(c.seatDepth, 8), loadKg: text(c.loadKg, 8), outerWidth: text(c.outerWidth, 8), weightKg: text(c.weightKg, 8), confirmed: c.confirmed === true, sample: c.sample === true })) : [];
        const view = { ...base.view };
        for (const key of ['azimuth', 'polar', 'distance'] as const) {
            const n = data.view?.[key];
            if (typeof n === 'number' && Number.isFinite(n))
                view[key] = key === 'polar' ? Math.min(2.8, Math.max(.1, n)) : key === 'distance' ? Math.min(7, Math.max(1.3, n)) : n % (Math.PI * 2);
        }
        return { ...base, allowSave: true, updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0, body, parameters, view, aids: Array.isArray(data.aids) ? [...new Set<AidId>(data.aids.filter((id: AidId) => aidOptions.some(a => a.id === id)))] : base.aids, measurementSource: ['self', 'assisted', 'professional'].includes(data.measurementSource) ? data.measurementSource : 'unknown', pose: ['seated', 'standing'].includes(data.pose) ? data.pose : 'auto', side: ['left', 'both'].includes(data.side) ? data.side : 'right', tab: ['shop', 'travel'].includes(data.tab) ? data.tab : 'fit', showDimensions: data.showDimensions === true, candidates, selectedCandidate: text(data.selectedCandidate), notes: text(data.notes, 1500), transport: { ...base.transport, ...Object.fromEntries(['lengthCm', 'widthCm', 'heightCm', 'weightKg', 'batteryWh'].map(key => [key, text(data.transport?.[key], 8)])), batteryType: ['none', 'lithium', 'other'].includes(data.transport?.batteryType) ? data.transport.batteryType : 'unknown', source: text(data.transport?.source, 500), confirmed: data.transport?.confirmed === true } };
    }
    catch {
        return null;
    }
}
export function serializedFitting(draft: FittingDraft, now = Date.now()) { return JSON.stringify({ ...draft, updatedAt: now }); }
export interface FitCheck {
    label: string;
    state: 'pass' | 'mismatch' | 'unknown';
    detail: string;
}
export function compareCandidate(draft: FittingDraft, candidate: FitCandidate) {
    const checks: FitCheck[] = [], number = (raw: string) => { const value = Number(raw); return raw.trim() && Number.isFinite(value) && value > 0 ? value : undefined; };
    const primary = draft.aids[0] ?? 'wheelchair';
    if (candidate.aid !== primary)
        checks.push({ label: copyDictionary.cd72e6c3037c8aabb, state: 'mismatch', detail: copyDictionary.c86811412519c7307 });
    const trusted = candidate.confirmed && !candidate.sample && Boolean(candidate.source.trim()) && Number.isFinite(Date.parse(candidate.checkedAt));
    if (primary === 'wheelchair')
        for (const [key, target, label] of [['seatWidth', draft.parameters.seatWidth, copyDictionary.ce1249c66d4ce28c8], ['seatDepth', draft.parameters.seatDepth, copyDictionary.c3c23af9fdf19f8aa]] as const) {
            const value = number(candidate[key]);
            checks.push(!trusted || value === undefined ? { label, state: 'unknown', detail: copyDictionary.c72ab14834f76efcf } : { label, state: value === target ? 'pass' : 'mismatch', detail: copyDictionary.ceac5649244ef2c3e + value + copyDictionary.c1c993ba25cf5dc98 + target + copyDictionary.cb5039c325d7107d6 + (value === target ? copyDictionary.c4ee61cef30f1a283 : copyDictionary.ccc8b0582da459295 + Math.abs(value - target) + copyDictionary.c61ec313ef24c106e) + copyDictionary.ceb0d5884569b398e });
        }
    const weight = validBodyValue(draft.body, 'weightKg'), load = number(candidate.loadKg);
    checks.push(!trusted || weight === undefined || load === undefined ? { label: copyDictionary.c1637e6db9b6004ec, state: 'unknown', detail: copyDictionary.c7560f627d6e8ac7f } : { label: copyDictionary.c1637e6db9b6004ec, state: load < weight ? 'mismatch' : 'pass', detail: copyDictionary.cbf54da3fb1be0478 + weight + copyDictionary.c52e7ba0a653a92f4 + load + copyDictionary.c131ed734290d30f3 + (load < weight ? copyDictionary.c56955f3d79bb4082 : copyDictionary.c7cf2b91eaf9d6a4a) + copyDictionary.ceb0d5884569b398e });
    const mismatch = checks.filter(c => c.state === 'mismatch').length, known = checks.filter(c => c.state !== 'unknown').length;
    const excluded = candidate.aid !== primary || Boolean(trusted && weight !== undefined && load !== undefined && load < weight);
    const distance = trusted && primary === 'wheelchair' ? (['seatWidth', 'seatDepth'] as const).reduce((sum, key) => { const value = number(candidate[key]); return sum + (value === undefined ? 0 : Math.abs(value - draft.parameters[key])); }, 0) : 0;
    return { candidate, checks, mismatch, known, excluded, distance, label: excluded ? copyDictionary.c76efbf6bb3f92b68 : !trusted ? copyDictionary.c4701325d17ee3eca : mismatch ? copyDictionary.c73c2c161c71408f7 : known < checks.length ? copyDictionary.ce6e45cba6a426e5b : copyDictionary.c8fc8f7161202cf40 };
}
export function rankedCandidates(draft: FittingDraft) { return draft.aids.length ? draft.candidates.map(c => compareCandidate(draft, c)).sort((a, b) => Number(a.excluded) - Number(b.excluded) || Number(b.known === b.checks.length) - Number(a.known === a.checks.length) || b.known - a.known || a.mismatch - b.mismatch || a.distance - b.distance) : []; }
export function candidateFromAnalysis(product: ProductAnalysis): FitCandidate | undefined {
    const aid = aidOptions.find(a => a.type === product.deviceType);
    if (!product.insight || product.insight.mode === 'sample' || !aid)
        return;
    const number = (field: 'widthCm' | 'weightKg') => { const fact = chosenFact(product.insight!, field); return fact?.confirmed ? fact.value : ''; };
    return { id: 'analysis-' + product.id, name: product.title, aid: aid.id, url: '', source: copyDictionary.cb0ac2809a288fb09, checkedAt: new Date().toISOString(), seatWidth: '', seatDepth: '', loadKg: '', outerWidth: number('widthCm'), weightKg: number('weightKg'), confirmed: false };
}
export function transportCard(draft: FittingDraft): DeviceCard | undefined {
    const t = draft.transport;
    if (!t.confirmed || !t.source.trim())
        return;
    if (t.batteryType === 'none' && t.batteryWh.trim())
        return;
    const values: DeviceCard['values'] = {}, evidence: DeviceCard['evidence'] = {};
    for (const key of ['lengthCm', 'widthCm', 'heightCm', 'weightKg', 'batteryWh'] as const) {
        const value = Number(t[key]);
        if (t[key].trim() && (!Number.isFinite(value) || value <= 0 || value > 100000))
            return;
        if (t[key].trim()) {
            values[key] = String(value);
            evidence[key] = { origin: 'measurement', confirmed: true, note: t.source.trim() };
        }
    }
    if (t.batteryType !== 'unknown') {
        values.batteryType = t.batteryType;
        evidence.batteryType = { origin: 'measurement', confirmed: true, note: t.source.trim() };
    }
    if (!Object.keys(values).length)
        return;
    const aid = aidOptions.find(a => a.id === draft.aids[0]) ?? aidOptions[0];
    return { id: 'fitting-actual-device', name: aid.label + copyDictionary.cec5a7717c77495f0, type: aid.type, source: 'manual', battery: '', dimensions: '', weight: '', values, evidence, prospective: true, transportState: 'use' };
}
