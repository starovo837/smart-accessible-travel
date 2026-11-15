import { copyDictionary } from "./copyDictionary.ts";
import type { TravelContext, TravelMode } from './types.ts';
export interface RuleDocument {
    id: string;
    title: string;
    operator: string;
    modes: string[];
    city?: string;
    line?: string;
    url: string;
    version: string;
    publishedAt: string | null;
    effectiveAt: string | null;
    checkedAt: string | null;
    expiresAt: string | null;
    status: 'verified' | 'unverified' | 'changed' | 'fetch-failed';
    excerpts: {
        label: string;
        text: string;
    }[];
    contentHash?: string;
    pendingHash?: string;
    anchorsMatch?: boolean;
    reviewNote?: string;
    lastFetchedAt?: string;
}
/** Reject an HTML fallback or malformed service payload before replacing offline sources. */
export function ruleDocumentsFromResponse(value: unknown): RuleDocument[] {
    const documents = (value && typeof value === 'object' ? 'documents' in value ? value.documents : undefined : undefined);
    if (!Array.isArray(documents) || !documents.every(row => row && typeof row === 'object' && ['id', 'title', 'operator', 'url', 'version'].every(key => typeof row[key] === 'string') && Array.isArray(row.modes) && row.modes.every((mode: unknown) => typeof mode === 'string') && Array.isArray(row.excerpts) && row.excerpts.every((excerpt: unknown) => excerpt && typeof excerpt === 'object' && 'label' in excerpt && typeof excerpt.label === 'string' && 'text' in excerpt && typeof excerpt.text === 'string'))) {
        throw new Error(copyDictionary.cfa45e6ba0825bb14);
    }
    return documents as RuleDocument[];
}
// Source entry points are not automatically approved policy. The source service
// checks anchors and records versions; changed or expired text cannot supply limits.
export const ruleCatalog: RuleDocument[] = [
    { id: 'rail-domestic', title: copyDictionary.c78e4f01b2677f803, operator: copyDictionary.c7431ef1a6273f7ef, modes: ['rail', 'train'], url: 'https://kyfw.12306.cn/otn/gonggao/saleTicketMeans.html?linktypeid=means5', version: '2026-06-01-domestic', publishedAt: null, effectiveAt: '2026-06-01', checkedAt: null, expiresAt: null, status: 'unverified', excerpts: [{ label: copyDictionary.c936ce920a3c3a0e9, text: copyDictionary.c2fa5bb1d7d7f98cd }, { label: copyDictionary.cd9725b17e2cf47fe, text: copyDictionary.cea7e7db8ba689a5f }, { label: copyDictionary.c5081ead9bbce7393, text: copyDictionary.c7516d86c26e7b6a2 }, { label: copyDictionary.c48b42fa4c1d896f7, text: copyDictionary.c8c7bb9163d0575bc }] },
    { id: 'airchina-assistance', title: copyDictionary.c4fd392baa008998f, operator: 'airchina', modes: ['plane'], url: 'https://m.airchina.com/ac/c/invoke/specialAssistance@pgzhcn?comeFrom=xlxx', version: '2026-10-18-import-1', publishedAt: null, effectiveAt: null, checkedAt: null, expiresAt: null, status: 'unverified', excerpts: [{ label: copyDictionary.c08c0c34d4f06136e, text: copyDictionary.c125f3516aafe386b }, { label: copyDictionary.c079be09079debc0a, text: '33*91*106CM' }] },
    { id: 'airchina-battery', title: copyDictionary.c97c82e1dc18af78d, operator: 'airchina', modes: ['plane'], url: 'https://m.airchina.com/ac/c/invoke/specialAssistance@pgzhcn?comeFrom=xlxx', version: '2026-10-18-import-1', publishedAt: null, effectiveAt: null, checkedAt: null, expiresAt: null, status: 'unverified', excerpts: [{ label: copyDictionary.cd10e51ada9015eba, text: copyDictionary.c2abc704ae3a099e5 }, { label: copyDictionary.c9f6a7b16a7c7ff5e, text: copyDictionary.c84b59a0eb0e8e30a }] },
];
export const ruleCurrent = (rule: RuleDocument, now = Date.now()) => rule.status === 'verified' && !!rule.checkedAt && !!rule.expiresAt && (!rule.effectiveAt || Date.parse(rule.effectiveAt) <= now) && new Date(rule.checkedAt).getTime() <= now && new Date(rule.expiresAt).getTime() > now;
export function rulesFor(mode: TravelMode, context: TravelContext, catalog = ruleCatalog) {
    return catalog.filter(rule => rule.modes.includes(mode) && (!['airchina', 'ceair', 'csair'].includes(rule.operator) || context.carrier === rule.operator) && (!rule.city || rule.city === context.city) && (!rule.line || rule.line === context.line));
}
export const ruleStatusLabel = (rule: RuleDocument, now = Date.now()) => rule.status === 'changed' ? copyDictionary.cf23dd042911da2bd : rule.status === 'fetch-failed' ? copyDictionary.c9a2af0b89f2b1c67 : ruleCurrent(rule, now) ? copyDictionary.c7c1b33fad7213e89 : rule.status === 'verified' ? copyDictionary.cc01629edcfcd0f84 : copyDictionary.cdbb8e8f92eb5beae;
