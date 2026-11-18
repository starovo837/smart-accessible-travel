import { copyDictionary } from "./copyDictionary.ts";
import { isSampleFact, conflictsOf, inSelectedModel, missingQuestions, productImpacts } from './product.ts';
import type { ProductAnalysis, TravelCheckResult } from './types.ts';
import { usabilityReview } from './usability.ts';
export interface AssistantEvidence {
    id: string;
    label: string;
    text: string;
    source: string;
    quote?: string;
    kind?: 'fact' | 'decision' | 'question';
    mandatory?: boolean;
}
export interface EvidencePack {
    items: AssistantEvidence[];
    total: number;
    omitted: string[];
    requiresNarrowing: boolean;
}
export function assistantEvidence(product?: ProductAnalysis, results: TravelCheckResult[] = []): AssistantEvidence[] {
    const insight = product?.insight;
    const items: AssistantEvidence[] = insight ? insight.facts.filter(fact => inSelectedModel(insight, fact)).map(fact => ({ id: fact.id, label: fact.label, text: (isSampleFact(insight,fact)?copyDictionary.travelSampleFact:'') + (fact.verification === 'unverified' ? copyDictionary.ce3b0c44298fc1c14 + fact.label + copyDictionary.c2e1f8d302086419e + (fact.validationNote ?? '') : copyDictionary.cff4e90e23476d047 + fact.label + copyDictionary.cf114611cd61000bf + fact.value + copyDictionary.c36a9e7f1c95b82ff + fact.unit + copyDictionary.ceb0d5884569b398e + (fact.verification === 'image' ? copyDictionary.c515c13d29c1326fd : copyDictionary.c08ae22ba2c4e71ce) + copyDictionary.ceb0d5884569b398e + (fact.confirmed && !isSampleFact(insight,fact) ? copyDictionary.c88f9e99179f87b72 : copyDictionary.c03556d6376b36b3c) + copyDictionary.ceb0d5884569b398e), quote: fact.quote, source: insight.sources.find(source => source.id === fact.sourceId)?.name ?? copyDictionary.c4e63cb7988f5bc30, kind: 'fact' })) : [];
    if (insight?.needs.oneHand)
        items.push({ id: 'need-onehand', label: copyDictionary.ca0a1f5ab062ff8fa, text: copyDictionary.c961990796b7c2a70, source: copyDictionary.ce601024261409d07 });
    if (insight?.needs.doorCm)
        items.push({ id: 'need-door', label: copyDictionary.c683bd1d8827791f7, text: copyDictionary.ce8da65e41f0e332f + insight.needs.doorCm + copyDictionary.cc1daf0cf567333a9, source: copyDictionary.ce601024261409d07 });
    if (product?.insight) {
        for (const [index, impact] of productImpacts(product).entries())
            items.push({ id: 'impact-' + index, label: impact.title, text: impact.detail, source: copyDictionary.ca45d27f8c6436809, kind: 'decision', mandatory: impact.tone === 'danger' });
        const conflicts = conflictsOf(product.insight).filter(item => !product.insight!.resolutions[item.field]);
        if (conflicts.length)
            items.push({ id: 'unresolved', label: copyDictionary.cdd57aabd33d19000, text: copyDictionary.ce3b0c44298fc1c14 + conflicts.map(item => item.label).join('、') + copyDictionary.c05317c00366d38b7, source: copyDictionary.cc847a1a77d278f2e, kind: 'decision', mandatory: true });
        for (const [index, question] of missingQuestions(product).entries())
            items.push({ id: 'question-' + index, label: question.label, text: question.question, source: copyDictionary.c1b0542a7d1619c51, kind: 'question' });
        for (const topic of usabilityReview(product).filter(item => product.insight?.needs.usabilityPriorities?.includes(item.id))) {
            items.push({ id: 'use-' + topic.id, label: copyDictionary.c37e30e4a21102d46 + topic.label, text: topic.quotes.length ? topic.quotes.map(quote => copyDictionary.ce3b0c44298fc1c14 + quote.source + copyDictionary.cf7287c1654e70850 + quote.text).join('。') + copyDictionary.c8836516438e5bfbd : copyDictionary.cfc1a8ae2d54bff76, source: copyDictionary.c9bdf0d3c3dc4488b, kind: 'fact' });
            items.push({ id: 'use-question-' + topic.id, label: topic.label, text: topic.question, source: copyDictionary.c45ed8256589db24e, kind: 'question' });
        }
    }
    for (const [index, result] of results.entries()) {
        items.push({ id: 'travel-' + index, label: result.deviceName, text: copyDictionary.cebf339644430c342 + result.summary + copyDictionary.ceb0d5884569b398e + (result.missingInformation?.length ? copyDictionary.c463071aaadb97258 + result.missingInformation.join('、') + '。' : '') + copyDictionary.cf2c8bf14aff67004, source: result.source, kind: 'decision', mandatory: true });
        for (const [step, text] of (result.nextSteps ?? []).entries())
            items.push({ id: `travel-${index}-next-${step}`, label: result.deviceName + copyDictionary.c48352c4a67aba8f5, text, source: result.source, kind: 'fact' });
        if (result.missingInformation?.length)
            items.push({ id: `travel-${index}-question`, label: result.deviceName + copyDictionary.c28c2df1bf18dfba7, text: copyDictionary.cc48b741e737c106a + result.missingInformation[0] + '？', source: copyDictionary.cb7e8cac912199625, kind: 'question' });
    }
    return items;
}
export function packEvidence(items: AssistantEvidence[], limit = 6000): EvidencePack {
    let remaining = limit;
    const chosen: AssistantEvidence[] = [], omitted: string[] = [];
    let requiresNarrowing = false;
    const ordered = [...items.filter(item => item.mandatory), ...items.filter(item => !item.mandatory && item.kind === 'decision'), ...items.filter(item => item.kind === 'question' && !item.mandatory), ...items.filter(item => !item.mandatory && item.kind !== 'decision' && item.kind !== 'question')];
    for (const item of ordered) {
        if (chosen.length >= 30 || item.text.length > 1000 || item.text.length > remaining) {
            omitted.push(item.label);
            if (item.mandatory)
                requiresNarrowing = true;
            continue;
        }
        chosen.push(item);
        remaining -= item.text.length;
    }
    return { items: chosen, total: items.length, omitted, requiresNarrowing };
}
// The model chooses relevant, immutable statements; it never writes a new
// comparison, permission, negation or number into the authoritative answer.
export function renderAssistantSelection(raw: unknown, items: AssistantEvidence[]) {
    const value = raw as {
        statementIds?: unknown;
        questionId?: unknown;
        answer?: unknown;
        followUp?: unknown;
    };
    if (!value || value.answer !== undefined || value.followUp !== undefined || !Array.isArray(value.statementIds) || !value.statementIds.length || value.statementIds.length > 3)
        throw Error(copyDictionary.cb0131dfe676e9658);
    const ids = value.statementIds;
    if (ids.some(id => typeof id !== 'string' || !items.some(item => item.id === id && item.kind !== 'question')))
        throw Error(copyDictionary.c7d9ba0b64a9feddf);
    const mandatory = items.filter(item => item.mandatory && item.kind !== 'question');
    const selected = [...mandatory, ...ids.map(id => items.find(item => item.id === id)!)].filter((item, index, all) => all.findIndex(row => row.id === item.id) === index);
    let question: AssistantEvidence | undefined;
    if (value.questionId) {
        question = items.find(item => item.id === value.questionId && item.kind === 'question');
        if (!question)
            throw Error(copyDictionary.c531c93b58efe11bd);
    }
    return { answer: selected.map(item => `${item.label}：${item.text}`).join('\n\n'), factIds: selected.map(item => item.id), followUp: question?.text ?? '', statementIds: [...new Set(ids as string[])], questionId: question?.id ?? '', composition: 'verified-statements' as const };
}
export function validateAssistantAnswer(raw: unknown, items: AssistantEvidence[]) {
    const value = raw as {
        answer?: unknown;
        factIds?: unknown;
        followUp?: unknown;
    };
    if (!value || typeof value.answer !== 'string' || !value.answer.trim() || !Array.isArray(value.factIds))
        throw Error(copyDictionary.ccbaaf1d5fd6e1e8a);
    const ids = value.factIds.filter((id): id is string => typeof id === 'string');
    if (!ids.length || ids.some(id => !items.some(item => item.id === id)))
        throw Error(copyDictionary.c01e49045c3553881);
    const answer = value.answer.slice(0, 1500), followUp = typeof value.followUp === 'string' ? value.followUp.slice(0, 200) : '', allowed = items.filter(item => ids.includes(item.id)).map(item => item.text).join(' ');
    const numbers = (text: string) => [...text.matchAll(/\d+(?:\.\d+)?\s*(?:厘米|毫米|千克|公斤|瓦时|cm|mm|kg|Wh|米|克|m|g)(?![A-Za-z])/gi)].map(match => { const parsed = match[0].match(/([\d.]+)\s*(.+)/)!, unit = parsed[2].toLowerCase(), factor = ['mm', copyDictionary.c0d858112ea15fc24].includes(unit) ? .1 : ['m', copyDictionary.c1aac8b956f808df5].includes(unit) ? 100 : ['g', copyDictionary.c747bf31c6621e929].includes(unit) ? .001 : 1; return Number(parsed[1]) * factor + ':' + (/kg|千克|公斤|克|^g$/.test(unit) ? 'kg' : /wh|瓦时/.test(unit) ? 'wh' : 'cm'); });
    const permitted = numbers(allowed);
    for (const number of numbers(answer + ' ' + followUp))
        if (!permitted.includes(number))
            throw Error(copyDictionary.c7ee70c0fe3455dbf);
    if (/保证.*(?:可以|能)|一定能|已获(?:准|批准)|已经批准|绝对安全|保证安全/.test(answer))
        throw Error(copyDictionary.cd245fdcae44d5d76);
    if (/大于|小于|等于|超过|不超过|差距|相差|剩余|适配|通过|可以带|不能带|符合|不符合|单手|双手|可拆|不可拆|无需|必须|>|<|≤|≥/.test(answer + ' ' + followUp))
        throw Error(copyDictionary.ccdeab1bc77210671);
    return { answer, factIds: [...new Set(ids)], followUp };
}
export const assistantInstructions = copyDictionary.c63a26f37fb3d36f7;
