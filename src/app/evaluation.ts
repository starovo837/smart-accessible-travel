import { copyDictionary } from "./copyDictionary.ts";
import { localAnalysis, type FactField, type ProductSource } from './product.ts';
import type { ProductAnalysis } from './types.ts';
export const evaluationVersion = '2026-10-18-v2';
export const realCase = {
    title: copyDictionary.c7e40d32ec57e2c5f,
    checkedAt: '2026-10-18',
    url: 'https://whill.cn/model-C2.html',
    source: { id: 'whill-cn-c2', name: copyDictionary.cc7256fc7d145993d, kind: 'merchant', modelKey: 'C2', text: copyDictionary.ca5d27df8f9f370e0 } as ProductSource,
    scenario: copyDictionary.ce74d322eeaf0d13f,
    steps: [
        { title: copyDictionary.cb943e7449e0a71a8, text: copyDictionary.cce93610c2e519dc5 },
        { title: copyDictionary.c2c079843f1f68220, text: copyDictionary.cc43e91a7ef858fbc },
        { title: copyDictionary.c8b48df64d31e0e71, text: copyDictionary.c0e63a65f61b5868b },
        { title: copyDictionary.cbf0b73cd2102998f, text: copyDictionary.c7ed254eb569d04c3 },
        { title: copyDictionary.cfcf8a01560397db2, text: copyDictionary.cbe2b97e1b1fb9dae },
    ],
};
export interface GoldFact {
    sourceId: string;
    field: FactField;
    value: string;
    critical?: boolean;
}
export interface BenchmarkCase {
    id: string;
    title: string;
    provenance: 'synthetic' | 'public-excerpt';
    sources: ProductSource[];
    scoredFields: FactField[];
    expected: GoldFact[];
    forbidden: FactField[];
    rationale: string;
}
const source = (id: string, text: string, kind: ProductSource['kind'] = 'manual'): ProductSource => ({ id, name: copyDictionary.c2b0b9bfee4b91094 + id, kind, text });
export const benchmarkCases: BenchmarkCase[] = [
    { id: 'unit', title: copyDictionary.c62efe6245b4dab70, provenance: 'synthetic', sources: [source('unit', copyDictionary.c2509add04e91af0c)], scoredFields: ['lengthCm', 'widthCm', 'heightCm', 'weightKg'], expected: [{ sourceId: 'unit', field: 'lengthCm', value: '80' }, { sourceId: 'unit', field: 'widthCm', value: '60', critical: true }, { sourceId: 'unit', field: 'heightCm', value: '90' }, { sourceId: 'unit', field: 'weightKg', value: '12' }], forbidden: [], rationale: copyDictionary.cacdf9212ae4a5ce8 },
    { id: 'state', title: copyDictionary.c881d9f6478b34036, provenance: 'synthetic', sources: [source('state', copyDictionary.cd32338e8a8a631b3)], scoredFields: ['lengthCm', 'widthCm', 'heightCm', 'foldLengthCm', 'foldWidthCm', 'foldHeightCm'], expected: [{ sourceId: 'state', field: 'lengthCm', value: '100' }, { sourceId: 'state', field: 'widthCm', value: '68', critical: true }, { sourceId: 'state', field: 'heightCm', value: '90' }, { sourceId: 'state', field: 'foldLengthCm', value: '80' }, { sourceId: 'state', field: 'foldWidthCm', value: '30', critical: true }, { sourceId: 'state', field: 'foldHeightCm', value: '70' }], forbidden: [], rationale: copyDictionary.c876e0078f40aa4ca },
    { id: 'battery', title: copyDictionary.c72536e97e458b92f, provenance: 'synthetic', sources: [source('battery', copyDictionary.cd3e86337b96a2802)], scoredFields: ['batteryType', 'batteryCount', 'removable', 'batteryWh'], expected: [{ sourceId: 'battery', field: 'batteryType', value: 'lithium' }, { sourceId: 'battery', field: 'batteryCount', value: '1' }, { sourceId: 'battery', field: 'removable', value: 'yes' }], forbidden: ['batteryWh'], rationale: copyDictionary.c8df64cd55a19d7ea },
    { id: 'conflict', title: copyDictionary.ce1ec0481167e8a80, provenance: 'synthetic', sources: [source('detail', copyDictionary.c342189dd7c046448, 'merchant'), source('manual', copyDictionary.c2d43b32d668a6043)], scoredFields: ['foldHands'], expected: [{ sourceId: 'detail', field: 'foldHands', value: copyDictionary.cf23e99bce57fa0ac, critical: true }, { sourceId: 'manual', field: 'foldHands', value: copyDictionary.ce54550a82a667a4a, critical: true }], forbidden: [], rationale: copyDictionary.cac5cc17c48c473c2 },
    { id: 'weight', title: copyDictionary.c4995272ec581807c, provenance: 'synthetic', sources: [source('weight', copyDictionary.c299398e3027597d4)], scoredFields: ['weightKg', 'batteryWeightKg', 'weightIncludesBattery'], expected: [{ sourceId: 'weight', field: 'weightKg', value: '32', critical: true }, { sourceId: 'weight', field: 'batteryWeightKg', value: '4' }, { sourceId: 'weight', field: 'weightIncludesBattery', value: 'no', critical: true }], forbidden: [], rationale: copyDictionary.ceefed868de792973 },
    { id: 'absence', title: copyDictionary.ca096550c7d35b997, provenance: 'synthetic', sources: [source('absence', copyDictionary.c71dc7d0203f2678f, 'merchant')], scoredFields: ['batteryWh', 'widthCm', 'weightKg'], expected: [], forbidden: ['batteryWh', 'widthCm', 'weightKg'], rationale: copyDictionary.ccf6bc2459b9e1185 },
    { id: 'cane', title: copyDictionary.c5b7755524a8ca58e, provenance: 'synthetic', sources: [source('cane', copyDictionary.c3364990094eaec8c)], scoredFields: ['lengthCm', 'foldLengthCm', 'weightKg', 'batteryType'], expected: [{ sourceId: 'cane', field: 'lengthCm', value: '120' }, { sourceId: 'cane', field: 'foldLengthCm', value: '30' }, { sourceId: 'cane', field: 'weightKg', value: '0.3' }, { sourceId: 'cane', field: 'batteryType', value: 'none' }], forbidden: [], rationale: copyDictionary.c7b857e1e836ee9ea },
    { id: 'public-c2', title: copyDictionary.cc6034e119979661b, provenance: 'public-excerpt', sources: [realCase.source], scoredFields: ['widthCm', 'lengthCm', 'batteryType', 'removable', 'batteryWh', 'heightCm'], expected: [{ sourceId: realCase.source.id, field: 'widthCm', value: '55.4', critical: true }, { sourceId: realCase.source.id, field: 'lengthCm', value: '98.5' }, { sourceId: realCase.source.id, field: 'batteryType', value: 'lithium' }, { sourceId: realCase.source.id, field: 'removable', value: 'yes' }], forbidden: ['batteryWh', 'heightCm'], rationale: copyDictionary.c70a5e13802006aa3 },
];
export interface BenchmarkScore {
    tp: number;
    fp: number;
    fn: number;
    precision: number | null;
    recall: number | null;
    criticalMisses: number;
    forbiddenAccepted: number;
    rejected: number;
    details: string[];
}
export interface BenchmarkRun {
    caseId: string;
    method: 'rule' | 'ai';
    at: string;
    elapsedMs: number;
    model: string;
    score: BenchmarkScore | null;
    analysis?: ProductAnalysis;
    error?: string;
}
export function scoreBenchmark(item: BenchmarkCase, analysis: ProductAnalysis): BenchmarkScore {
    const facts = (analysis.insight?.facts ?? []).filter(fact => item.scoredFields.includes(fact.field));
    const accepted = facts.filter(fact => fact.verification !== 'unverified');
    const key = (fact: {
        sourceId: string;
        field: string;
        value: string;
    }) => [fact.sourceId, fact.field, fact.value].join('|');
    const unique = [...new Map(accepted.map(fact => [key(fact), fact])).values()];
    const matches = (fact: GoldFact) => unique.some(row => key(row) === key(fact));
    const tp = item.expected.filter(matches).length, fp = unique.filter(fact => !item.expected.some(row => key(row) === key(fact))).length, fn = item.expected.length - tp;
    return { tp, fp, fn, precision: tp + fp ? tp / (tp + fp) : null, recall: item.expected.length ? tp / item.expected.length : null, criticalMisses: item.expected.filter(fact => fact.critical && !matches(fact)).length, forbiddenAccepted: unique.filter(fact => item.forbidden.includes(fact.field)).length, rejected: facts.length - accepted.length, details: [...item.expected.filter(fact => !matches(fact)).map(fact => copyDictionary.cbc339d8a697b4a36 + fact.sourceId + copyDictionary.c005e1574a2b5c816 + fact.field + copyDictionary.c7bacf9de79aa5b6a + fact.value), ...unique.filter(fact => !item.expected.some(row => key(row) === key(fact))).map(fact => copyDictionary.cfaa6949710365551 + fact.sourceId + copyDictionary.c005e1574a2b5c816 + fact.field + copyDictionary.c7bacf9de79aa5b6a + fact.value)] };
}
export function runRuleBenchmark(item: BenchmarkCase): BenchmarkRun {
    const start = performance.now(), analysis = localAnalysis(item.sources, 'local');
    return { caseId: item.id, method: 'rule', at: new Date().toISOString(), elapsedMs: Math.round(performance.now() - start), model: copyDictionary.c63acd3f6e2ec4438, score: scoreBenchmark(item, analysis), analysis };
}
export function summarizeRuns(runs: BenchmarkRun[]) {
    const scores = runs.flatMap(run => run.score ? [run.score] : []), sum = (field: 'tp' | 'fp' | 'fn' | 'criticalMisses' | 'forbiddenAccepted') => scores.reduce((n, s) => n + s[field], 0);
    const tp = sum('tp'), fp = sum('fp'), fn = sum('fn');
    return { completed: scores.length, failed: runs.length - scores.length, tp, fp, fn, precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null, criticalMisses: sum('criticalMisses'), forbiddenAccepted: sum('forbiddenAccepted') };
}
export const percent = (value: number | null) => value === null ? copyDictionary.caa01c0e0bad53682 : (value * 100).toFixed(1) + '%';
export const studyTasks = [
    { id: 'evidence', title: copyDictionary.c933cf62645290197, instruction: copyDictionary.c3f1ccc12336cba29, success: copyDictionary.cd07801cdbb113291 },
    { id: 'correction', title: copyDictionary.c08107bf263725b38, instruction: copyDictionary.cbba29226348e7eb3, success: copyDictionary.ca4c395a061413c1a },
    { id: 'travel', title: copyDictionary.cf32a89d7cc35c4e1, instruction: copyDictionary.c5b26aeb656977cc6, success: copyDictionary.c272087954fc6ef71 },
    { id: 'control', title: copyDictionary.c87d8ac8d4d1dfd4b, instruction: copyDictionary.c529bab9fa21fb0ce, success: copyDictionary.c55173903935f60d3 },
];
export const studyProtocol = copyDictionary.cf2697756ec4a2310 + evaluationVersion + copyDictionary.c7704742123528257 + studyTasks.map(t => copyDictionary.ce3b0c44298fc1c14 + t.id + copyDictionary.c36a9e7f1c95b82ff + t.title + copyDictionary.c01ba4719c80b6fe9 + t.instruction + copyDictionary.ce8c09bec7ed2c65d + t.success).join('\n') + copyDictionary.c744eb4b4593acb66;
