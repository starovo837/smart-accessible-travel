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
    reviewer?: string;
    lastFetchedAt?: string;
}
const ruleHosts = ['12306.cn', 'airchina.com', 'airchina.com.cn', 'gov.cn'];
export function safeRuleUrl(raw: unknown): string {
    if (typeof raw !== 'string' || raw.length > 2048) return '';
    try {
        const url = new URL(raw), host = url.hostname.toLowerCase();
        return url.protocol === 'https:' && !url.username && !url.password && !url.port && ruleHosts.some(root => host === root || host.endsWith('.' + root)) ? url.toString() : '';
    } catch { return ''; }
}
export const RULE_REVIEW_DAYS = 7;
/** This proves a review record exists, not that the reviewer or the policy is infallible. */
export function hasRuleReview(rule: RuleDocument): boolean {
    const checked = Date.parse(rule.checkedAt ?? ''), expires = Date.parse(rule.expiresAt ?? '');
    return Boolean(typeof rule.reviewer === 'string' && rule.reviewer.trim() && typeof rule.reviewNote === 'string' && rule.reviewNote.trim() && typeof rule.checkedAt === 'string' && typeof rule.expiresAt === 'string' && /^[a-f0-9]{64}$/.test(rule.contentHash ?? '') && rule.anchorsMatch === true && rule.pendingHash === rule.contentHash && Number.isFinite(checked) && Number.isFinite(expires) && expires > checked && expires - checked <= RULE_REVIEW_DAYS * 86400000);
}
/** Reject malformed or untrusted links before replacing offline sources. */
export function ruleDocumentsFromResponse(value: unknown): RuleDocument[] {
    const documents = value && typeof value === 'object' && 'documents' in value ? value.documents : undefined;
    const invalid = () => { throw new Error(copyDictionary.cfa45e6ba0825bb14); };
    if (!Array.isArray(documents) || documents.length > 30) return invalid();
    const bounded = (v: unknown, max: number) => typeof v === 'string' && v.length <= max && !!v.trim();
    const date = (v: unknown) => v === null || typeof v === 'string' && v.length <= 40 && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v) && Number.isFinite(Date.parse(v));
    const ids = new Set<string>();
    let total = 0;
    return documents.map((row: RuleDocument) => {
        if (!row || typeof row !== 'object' || Array.isArray(row) || !['id','title','operator','version'].every(key => bounded(row[key as keyof RuleDocument], key === 'title' ? 240 : 120)) || ids.has(row.id) || !safeRuleUrl(row.url) || !['verified','unverified','changed','fetch-failed'].includes(row.status) || !Array.isArray(row.modes) || !row.modes.length || row.modes.length > 12 || !row.modes.every(mode => bounded(mode, 60)) || !Array.isArray(row.excerpts) || !row.excerpts.length || row.excerpts.length > 20 || !row.excerpts.every(item => item && bounded(item.label, 200) && bounded(item.text, 6000)) || !['publishedAt','effectiveAt','checkedAt','expiresAt'].every(key => date(row[key as keyof RuleDocument]))) return invalid();
        if (row.city !== undefined && !bounded(row.city, 100) || row.line !== undefined && !bounded(row.line, 100)) return invalid();
        if (row.reviewer !== undefined && !bounded(row.reviewer, 80) || row.reviewNote !== undefined && !bounded(row.reviewNote, 2000)) return invalid();
        if (row.contentHash !== undefined && !/^[a-f0-9]{64}$/.test(row.contentHash) || row.pendingHash !== undefined && !/^[a-f0-9]{64}$/.test(row.pendingHash) || row.anchorsMatch !== undefined && typeof row.anchorsMatch !== 'boolean' || row.lastFetchedAt !== undefined && !date(row.lastFetchedAt)) return invalid();
        if (row.status === 'verified' && !hasRuleReview(row)) return invalid();
        total += row.excerpts.reduce((n, item) => n + item.text.length, 0);
        if (total > 300000) return invalid();
        ids.add(row.id);
        return { id: row.id, title: row.title, operator: row.operator, modes: [...row.modes], url: safeRuleUrl(row.url), version: row.version, publishedAt: row.publishedAt, effectiveAt: row.effectiveAt, checkedAt: row.checkedAt, expiresAt: row.expiresAt, status: row.status, excerpts: row.excerpts.map(item => ({label:item.label,text:item.text})), ...(row.city ? {city:row.city} : {}), ...(row.line ? {line:row.line} : {}), ...Object.fromEntries(['reviewer','reviewNote','contentHash','pendingHash','anchorsMatch','lastFetchedAt'].filter(key => row[key as keyof RuleDocument] !== undefined).map(key => [key,row[key as keyof RuleDocument]])) } as RuleDocument;
    });
}
// Source entry points are not automatically approved policy. The source service
// checks anchors and records versions; changed or expired text cannot supply limits.
export const ruleCatalog: RuleDocument[] = [
    { id: 'rail-domestic', title: copyDictionary.c78e4f01b2677f803, operator: copyDictionary.c7431ef1a6273f7ef, modes: ['rail', 'train'], url: 'https://kyfw.12306.cn/otn/gonggao/saleTicketMeans.html?linktypeid=means5', version: '2026-06-01-domestic', publishedAt: null, effectiveAt: '2026-06-01', checkedAt: null, expiresAt: null, status: 'unverified', excerpts: [{ label: copyDictionary.c936ce920a3c3a0e9, text: copyDictionary.c2fa5bb1d7d7f98cd }, { label: copyDictionary.cd9725b17e2cf47fe, text: copyDictionary.cea7e7db8ba689a5f }, { label: copyDictionary.c5081ead9bbce7393, text: copyDictionary.c7516d86c26e7b6a2 }, { label: copyDictionary.c48b42fa4c1d896f7, text: copyDictionary.c8c7bb9163d0575bc }] },
    { id: 'airchina-assistance', title: copyDictionary.c4fd392baa008998f, operator: 'airchina', modes: ['plane'], url: 'https://m.airchina.com/ac/c/invoke/specialAssistance@pgzhcn?comeFrom=xlxx', version: '2026-10-18-import-1', publishedAt: null, effectiveAt: null, checkedAt: null, expiresAt: null, status: 'unverified', excerpts: [{ label: copyDictionary.c08c0c34d4f06136e, text: copyDictionary.c125f3516aafe386b }, { label: copyDictionary.c079be09079debc0a, text: '33*91*106CM' }] },
    { id: 'airchina-battery', title: copyDictionary.c97c82e1dc18af78d, operator: 'airchina', modes: ['plane'], url: 'https://m.airchina.com/ac/c/invoke/specialAssistance@pgzhcn?comeFrom=xlxx', version: '2026-10-18-import-1', publishedAt: null, effectiveAt: null, checkedAt: null, expiresAt: null, status: 'unverified', excerpts: [{ label: copyDictionary.cd10e51ada9015eba, text: copyDictionary.c2abc704ae3a099e5 }, { label: copyDictionary.c9f6a7b16a7c7ff5e, text: copyDictionary.c84b59a0eb0e8e30a }] },
];
export const ruleCurrent = (rule: RuleDocument, now = Date.now()) => rule.status === 'verified' && hasRuleReview(rule) && (!rule.effectiveAt || Date.parse(rule.effectiveAt) <= now) && Date.parse(rule.checkedAt!) <= now && Date.parse(rule.expiresAt!) > now;
export function rulesFor(mode: TravelMode, context: TravelContext, catalog = ruleCatalog) {
    return catalog.filter(rule => rule.modes.includes(mode) && (!['airchina', 'ceair', 'csair'].includes(rule.operator) || context.carrier === rule.operator) && (!rule.city || rule.city === context.city) && (!rule.line || rule.line === context.line));
}
export const ruleStatusLabel = (rule: RuleDocument, now = Date.now()) => rule.status === 'changed' ? copyDictionary.cf23dd042911da2bd : rule.status === 'fetch-failed' ? copyDictionary.c9a2af0b89f2b1c67 : ruleCurrent(rule, now) ? copyDictionary.c7c1b33fad7213e89 : rule.status === 'verified' ? copyDictionary.cc01629edcfcd0f84 : copyDictionary.cdbb8e8f92eb5beae;
