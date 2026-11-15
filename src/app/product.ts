import { copyDictionary } from "./copyDictionary.ts";
import type { CardField, DeviceCard, ProductAnalysis } from './types.ts';
import { checkEnumClaim, checkNumericClaim, instructionClaim, modelKey, modelKeys } from './evidence.ts';
export type SourceKind = 'merchant' | 'manual' | 'reply' | 'review';
export interface ProductSource {
    id: string;
    name: string;
    kind: SourceKind;
    text: string;
    image?: string;
    sample?: boolean;
    modelKey?: string;
    transcript?: string;
    imageQuality?: string;
}
export type FactField = CardField | 'foldHands' | 'weightIncludesBattery' | 'batteryWeightKg' | 'foldable' | 'operation' | 'compatibility';
export interface ProductFact {
    id: string;
    field: FactField;
    label: string;
    value: string;
    unit: string;
    sourceId: string;
    quote: string;
    location: string;
    verification: 'quoted' | 'image' | 'unverified';
    confirmed: boolean;
    modelKey?: string;
    validationNote?: string;
    reviewMethod?: string;
    independentQuote?: string;
}
export interface ProductConflict {
    field: FactField;
    label: string;
    factIds: string[];
}
export interface ProductInsight {
    mode: 'ai' | 'sample' | 'local';
    engine?: 'ollama' | 'webllm';
    model?: string;
    selectedModel?: string;
    sources: ProductSource[];
    facts: ProductFact[];
    modelNote: string;
    resolutions: Partial<Record<FactField, string>>;
    needs: ProductNeeds;
}
export const inSelectedModel = (insight: ProductInsight, fact: ProductFact) => insight.selectedModel === undefined || (fact.modelKey || '') === insight.selectedModel;
export interface ProductNeeds {
    doorCm?: number;
    elevatorDoorCm?: number;
    liftKg?: number;
    oneHand: boolean;
    canFold: 'unknown' | 'yes' | 'no';
    usabilityPriorities?: string[];
}
export const initialNeeds = (): ProductNeeds => ({ oneHand: false, canFold: 'unknown' });
export const sourceNames: Record<SourceKind, string> = { merchant: copyDictionary.c8c091c69ffb991f0, manual: copyDictionary.c66a7d5999c16d155, reply: copyDictionary.ce16a7c13f2d95ef0, review: copyDictionary.c647fdd9ede1a876f };
export const factLabels: Record<FactField, string> = { lengthCm: copyDictionary.c218e03a4a652dfe8, widthCm: copyDictionary.c4708ed5e63ca5c84, heightCm: copyDictionary.c6cfe0ede7ddda492, weightKg: copyDictionary.c7e9a5a3a38e22286, foldLengthCm: copyDictionary.c0d22f90fbbb1f56c, foldWidthCm: copyDictionary.c87ab19387bfcf368, foldHeightCm: copyDictionary.cdc351fc1ec8f2ec5, batteryWh: copyDictionary.ca60db8fb09c3cea4, batteryType: copyDictionary.ccc64d927855b9fde, removable: copyDictionary.c1f9ff8e586f064f7, batteryCount: copyDictionary.cc0c73dc664361a97, foldHands: copyDictionary.c099130ab548fe1db, weightIncludesBattery: copyDictionary.cd237f2bff56baf2d, batteryWeightKg: copyDictionary.cd3292d94245bce7f, foldable: copyDictionary.c83d18a1c90dc0446, operation: copyDictionary.ce3a9570558b3a518, compatibility: copyDictionary.cc222c7e2d567b13d };
export const productCategories = ['wheelchair', 'manual-wheelchair', 'mobility-scooter', 'cane', 'electronic-cane', 'hearing-aid', 'oxygen', 'pump', 'walker', 'rollator', 'crutches', 'communication-board', 'aac-device', 'magnifier', 'braille-display', 'reading-device', 'cpap', 'other'] as const;
export function conflictsOf(insight: ProductInsight): ProductConflict[] {
    return (Object.keys(factLabels) as FactField[]).flatMap(field => {
        const facts = insight.facts.filter(fact => inSelectedModel(insight, fact) && fact.field === field && fact.verification !== 'unverified' && insight.sources.find(source => source.id === fact.sourceId)?.kind !== 'review');
        return new Set(facts.map(fact => fact.value.trim().toLowerCase())).size > 1 ? [{ field, label: factLabels[field], factIds: facts.map(fact => fact.id) }] : [];
    });
}
export function chosenFact(insight: ProductInsight, field: FactField): ProductFact | undefined {
    const conflict = conflictsOf(insight).find(item => item.field === field);
    const facts = insight.facts.filter(fact => inSelectedModel(insight, fact) && fact.field === field && fact.verification !== 'unverified' && insight.sources.find(source => source.id === fact.sourceId)?.kind !== 'review');
    return conflict ? facts.find(fact => fact.id === insight.resolutions[field]) : facts.find(fact => fact.confirmed) ?? facts[0];
}
export function reviewTopics(insight: ProductInsight) {
    const sources = insight.sources.filter(source => source.kind === 'review');
    const excerpts = sources.flatMap(source => {
        const quoted = insight.facts.filter(fact => fact.sourceId === source.id && fact.verification !== 'unverified').map(fact => ({ sourceId: source.id, quote: fact.quote, location: fact.location }));
        const text = source.text.split(/(?<=[。！？!?；;\n])/).map(quote => quote.trim()).filter(Boolean).map(quote => ({ sourceId: source.id, quote, location: source.name + copyDictionary.cd5e3132e91211efc }));
        const key = (quote: string) => compact(quote).replace(/[。！？!?；;]+$/g, '');
        return [...quoted, ...text].filter((entry, index, all) => all.findIndex(other => key(other.quote) === key(entry.quote)) === index);
    });
    return ([[copyDictionary.c004b05d72830c248, /折叠|收纳|展开/], [copyDictionary.c834fda2d5cdaf9f0, /搬运|抬|重量|过门|门槛|电梯/], [copyDictionary.c47dd9bb40d0c52a4, /操控|操作|按钮|握|语音|配对|听清|音量/], [copyDictionary.ce98dedb9f21e8c88, /维修|维护|售后|保修|更换|充电|清洁/]] as const).map(([title, pattern]) => ({ title, quotes: excerpts.filter(entry => pattern.test(entry.quote)) }));
}
export function missingQuestions(product: ProductAnalysis) {
    const insight = product.insight;
    if (!insight)
        return [];
    const large = ['wheelchair', 'manual-wheelchair', 'mobility-scooter', 'walker', 'rollator'].includes(product.deviceType ?? '');
    const powered = ['wheelchair', 'mobility-scooter', 'hearing-aid', 'oxygen', 'pump', 'aac-device', 'cpap', 'magnifier', 'reading-device'].includes(product.deviceType ?? '');
    const fields: FactField[] = large ? ['widthCm', 'lengthCm', 'heightCm', 'weightKg', 'weightIncludesBattery', 'foldHands'] : ['operation'];
    if (['cane', 'electronic-cane'].includes(product.deviceType ?? ''))
        fields.push('lengthCm', 'weightKg');
    if (['hearing-aid', 'aac-device', 'braille-display', 'reading-device'].includes(product.deviceType ?? ''))
        fields.push('compatibility');
    if (powered && chosenFact(insight, 'batteryType')?.value !== 'none') {
        fields.push('batteryType');
        if (chosenFact(insight, 'batteryType')?.value === 'lithium')
            fields.push('batteryWh');
        if (['wheelchair', 'mobility-scooter'].includes(product.deviceType ?? ''))
            fields.push('batteryWh', 'batteryCount', 'removable');
    }
    return Array.from(new Set(fields)).filter(field => !chosenFact(insight, field)).map(field => ({ field, label: factLabels[field], question: copyDictionary.c66f9b71db3db5420 + factLabels[field] + copyDictionary.c3535ad635d266ec2 }));
}
export function productImpacts(product: ProductAnalysis) {
    const insight = product.insight;
    if (!insight)
        return [];
    const rows: {
        title: string;
        detail: string;
        tone: 'warn' | 'danger' | 'good';
    }[] = [];
    const large = ['wheelchair', 'manual-wheelchair', 'mobility-scooter', 'walker', 'rollator'].includes(product.deviceType ?? '');
    const width = Number(chosenFact(insight, 'widthCm')?.value), weight = Number(chosenFact(insight, 'weightKg')?.value);
    const openings = [insight.needs.doorCm, insight.needs.elevatorDoorCm].filter((value): value is number => Number.isFinite(value) && !!value && value > 0);
    if (width > 0 && openings.length) {
        const opening = Math.min(...openings), gap = +(opening - width).toFixed(2);
        rows.push({ title: copyDictionary.c300872553ae8e991, detail: gap < 0 ? copyDictionary.ca7f851dc388c3804 + width + copyDictionary.c1fb60b7519f5ea69 + opening + copyDictionary.c3d6510732ee6ca5d + Math.abs(gap) + copyDictionary.cefdade2a7e10204b : copyDictionary.ca7f851dc388c3804 + width + copyDictionary.ce1efe871d344a913 + opening + copyDictionary.cb09f625999386280 + gap + copyDictionary.c54201f7bedb58017, tone: gap < 0 ? 'danger' : 'warn' });
    }
    else if (large)
        rows.push({ title: copyDictionary.c1b47f453a36cef57, detail: copyDictionary.ca9b2edd20713df1f, tone: 'warn' });
    const hands = chosenFact(insight, 'foldHands')?.value;
    if (insight.needs.oneHand)
        rows.push({ title: copyDictionary.c41eeb3e4a621c1a4, detail: !large && !hands ? copyDictionary.c689698249f4c0bfa : conflictsOf(insight).some(conflict => conflict.field === 'foldHands' && !insight.resolutions.foldHands) ? copyDictionary.cc6fa0536941b0004 : hands?.includes(copyDictionary.ce54550a82a667a4a) ? copyDictionary.cc9f6e84a2f36783f : hands ? copyDictionary.cdded19f4f92797c0 + hands + copyDictionary.cca7787c33218b213 : copyDictionary.c6c4fd10223345334, tone: 'warn' });
    if (weight > 0) {
        const excludesBattery = chosenFact(insight, 'weightIncludesBattery')?.value === 'no', lift = insight.needs.liftKg, hasLift = Number.isFinite(lift) && !!lift && lift > 0;
        rows.push({ title: copyDictionary.c8d0ea010157117c4, detail: copyDictionary.cfefe2328a74c0ecf + weight + copyDictionary.cec5b785e5a5f79c2 + (excludesBattery ? copyDictionary.c7c7aa8f293c2f334 : '') + copyDictionary.ceb0d5884569b398e + (hasLift ? weight > lift ? copyDictionary.c890014ca410f4642 + lift + copyDictionary.c1ef0a9183b54f319 : excludesBattery ? copyDictionary.c43470ef29a08e579 : copyDictionary.cf8632601edb97f76 : copyDictionary.c21d2dcfe0fb8fda0), tone: hasLift && weight > lift ? 'danger' : 'warn' });
    }
    if (insight.needs.canFold === 'no')
        rows.push({ title: copyDictionary.c861243a12dad5bdf, detail: copyDictionary.c8a9d869ca699cf81, tone: 'warn' });
    return rows;
}
const compact = (text: string) => text.replace(/\s+/g, '').toLowerCase();
export function quoteRange(text: string, quote: string) {
    const target = compact(quote);
    if (!target)
        return null;
    const positions: number[] = [], characters: string[] = [];
    for (let index = 0; index < text.length; index++)
        if (!/\s/.test(text[index])) {
            positions.push(index);
            characters.push(text[index].toLowerCase());
        }
    const start = characters.join('').indexOf(target);
    return start < 0 ? null : { start: positions[start], end: positions[start + target.length - 1] + 1 };
}
export function preserveConfirmations(previous: ProductAnalysis, next: ProductAnalysis): ProductAnalysis {
    if (!previous.insight || !next.insight)
        return next;
    const same = (a: ProductFact, b: ProductFact) => a.field === b.field && a.sourceId === b.sourceId && a.value === b.value && a.quote === b.quote && a.modelKey === b.modelKey;
    const facts = next.insight.facts.map(fact => ({ ...fact, confirmed: fact.verification !== 'unverified' && previous.insight!.facts.some(old => same(old, fact) && old.confirmed) }));
    const resolutions: ProductInsight['resolutions'] = {};
    for (const [field, id] of Object.entries(previous.insight.resolutions)) {
        const prior = previous.insight.facts.find(fact => fact.id === id), replacement = prior ? facts.find(fact => same(fact, prior)) : undefined;
        const oldSet = previous.insight.facts.filter(fact => fact.field === field).map(fact => fact.value).sort().join('|'), newSet = facts.filter(fact => fact.field === field).map(fact => fact.value).sort().join('|');
        if (replacement && oldSet === newSet)
            resolutions[field as FactField] = replacement.id;
    }
    return { ...next, insight: { ...next.insight, facts, resolutions } };
}
export function normalizeAnalysis(raw: unknown, sources: ProductSource[], mode: ProductInsight['mode'], needs = initialNeeds()): ProductAnalysis {
    const value = raw as {
        title?: unknown;
        category?: unknown;
        facts?: unknown;
        note?: unknown;
    };
    if (!value || !Array.isArray(value.facts))
        throw Error(copyDictionary.ce9e1fb9d18ca994d);
    const facts: ProductFact[] = [];
    for (const entry of value.facts.slice(0, 60)) {
        if (!entry || typeof entry !== 'object')
            continue;
        const fact = entry as Record<string, unknown>, source = sources.find(item => item.id === fact.sourceId);
        if (!source || !Object.hasOwn(factLabels, String(fact.field)) || typeof fact.value !== 'string' || !fact.value.trim() || typeof fact.quote !== 'string')
            continue;
        const quote = fact.quote.slice(0, 800), matched = quote.trim().length > 0 && compact(source.text).includes(compact(quote));
        const field = fact.field as FactField;
        const numeric = /Cm$|Kg$|Wh$/.test(field) || field === 'batteryCount';
        if (numeric && (!Number.isFinite(Number(fact.value)) || Number(fact.value) <= 0))
            continue;
        if (field === 'batteryCount' && !['1', '2'].includes(fact.value))
            continue;
        if (field === 'batteryType' && !['none', 'lithium', 'other', 'unknown'].includes(fact.value))
            continue;
        if (['removable', 'weightIncludesBattery', 'foldable'].includes(field) && !['yes', 'no', 'unknown'].includes(fact.value))
            continue;
        const numericCheck = numeric ? checkNumericClaim(field, fact.value, String(fact.unit ?? ''), quote, source.text) : null;
        const variants = modelKeys(source.text), quotedModel = modelKey(quote), ambiguous = variants.length > 1 && !quotedModel;
        const directed = instructionClaim(quote, source.text);
        const supported = (numericCheck?.ok ?? checkEnumClaim(field, fact.value, quote)) && source.imageQuality !== 'unreadable' && !ambiguous && !directed;
        const verification = supported && matched ? 'quoted' : supported && source.image && quote.trim() ? 'image' : 'unverified';
        const normalized: ProductFact = { id: 'fact-' + facts.length, field, label: factLabels[field], value: (numericCheck?.ok ? numericCheck.value : fact.value.trim()).slice(0, 160), unit: numeric ? numericCheck?.unit ?? '' : '', sourceId: source.id, quote, location: typeof fact.location === 'string' ? fact.location.slice(0, 150) : source.name, verification, confirmed: false, modelKey: source.modelKey?.trim().toUpperCase() || modelKey(source.text) || String(fact.modelKey ?? ''), validationNote: !supported ? numericCheck?.reason ?? copyDictionary.cf6ddf2978025fc51 : undefined };
        if (variants.length > 1) {
            normalized.modelKey = quotedModel;
            normalized.validationNote = ambiguous ? copyDictionary.c3495d8436244761f : normalized.validationNote;
        }
        if (directed)
            normalized.validationNote = copyDictionary.c39be633fb2885af0;
        if (!facts.some(item => item.field === field && item.value === normalized.value && item.sourceId === source.id && item.modelKey === normalized.modelKey))
            facts.push(normalized);
    }
    const insight: ProductInsight = { mode, sources, facts, selectedModel: facts.find(fact => fact.modelKey)?.modelKey, modelNote: typeof value.note === 'string' ? value.note.slice(0, 600) : '', resolutions: {}, needs };
    if (mode === 'ai')
        insight.modelNote = copyDictionary.cc95afb2587cf37f9 + facts.length + copyDictionary.cd0ad96f18ee80467 + facts.filter(fact => fact.verification === 'unverified').length + copyDictionary.cdfc8a31650f15504;
    const number = (field: FactField) => Number(chosenFact(insight, field)?.value) || 0;
    const deviceType = productCategories.includes(value.category as typeof productCategories[number]) ? String(value.category) : 'other';
    return { id: 'analysis-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), title: typeof value.title === 'string' ? value.title.slice(0, 160) : copyDictionary.c918e37a3998b5ac4, deviceType, sourceLabel: sources.map(source => source.name).join('、'), width: number('widthCm'), length: number('lengthCm'), weight: number('weightKg'), merchantClaims: facts.filter(fact => sources.find(source => source.id === fact.sourceId)?.kind !== 'review').map(fact => fact.quote), userFeedback: facts.filter(fact => sources.find(source => source.id === fact.sourceId)?.kind === 'review').map(fact => fact.quote), conclusion: copyDictionary.c8ad0ab0117b845ee, evidence: facts.map(fact => copyDictionary.ce3b0c44298fc1c14 + fact.label + copyDictionary.cf114611cd61000bf + fact.value + fact.unit + copyDictionary.cda047c04c9b5e27e + fact.location + copyDictionary.c744024cba4084c8b), nextSteps: [], insight };
}
export function insightCard(product: ProductAnalysis): DeviceCard {
    const insight = product.insight!, values: DeviceCard['values'] = {}, evidence: DeviceCard['evidence'] = {};
    for (const field of ['lengthCm', 'widthCm', 'heightCm', 'weightKg', 'foldLengthCm', 'foldWidthCm', 'foldHeightCm', 'batteryWh', 'batteryType', 'removable', 'batteryCount'] as CardField[]) {
        const fact = chosenFact(insight, field);
        if (!fact || fact.verification === 'unverified')
            continue;
        values[field] = fact.value;
        const source = insight.sources.find(item => item.id === fact.sourceId)!;
        const excludesBattery = field === 'weightKg' && chosenFact(insight, 'weightIncludesBattery')?.value === 'no';
        evidence[field] = { origin: source.kind === 'reply' ? 'reply' : 'merchant', confirmed: fact.confirmed && !excludesBattery, note: `${source.name} · ${fact.location}：${fact.quote}${source.sample ? copyDictionary.c16febcb7f2806ae6 : ''}${excludesBattery ? copyDictionary.ce92937463c741e7c : ''}` };
    }
    return { id: 'card-' + product.id, type: product.deviceType ?? 'other', name: product.title, battery: values.batteryType === 'none' ? copyDictionary.c484d55613910eb8c : values.batteryWh ? values.batteryWh + ' Wh' : '', dimensions: [values.lengthCm ?? '?', values.widthCm ?? '?', values.heightCm ?? '?'].join(' × ') + ' cm', weight: values.weightKg ? values.weightKg + ' kg' : '', source: 'manual', prospective: true, productId: product.id, values, evidence };
}
export const sampleBundles: {
    id: string;
    title: string;
    sources: ProductSource[];
}[] = [
    { id: 'chair', title: copyDictionary.cfede028335f30071, sources: [
            { id: 'sample-detail', name: copyDictionary.c1bd183cd5063528b, kind: 'merchant', sample: true, text: copyDictionary.c87ea3615ea888bd7 },
            { id: 'sample-manual', name: copyDictionary.c004fa78cba5854e2, kind: 'manual', sample: true, text: copyDictionary.cf6b94ef43792ed7c },
            { id: 'sample-reviews', name: copyDictionary.c980cd550ea39e68f, kind: 'review', sample: true, text: copyDictionary.c4b8c3d05ee39ef3d },
        ] },
    { id: 'cane', title: copyDictionary.c32dc36ebcc25d322, sources: [{ id: 'sample-cane', name: copyDictionary.ce6357e1d568471ef, kind: 'manual', sample: true, text: copyDictionary.c71665af55dffd2ff }] },
];
export function localAnalysis(sources: ProductSource[], mode: 'sample' | 'local', needs = initialNeeds()) {
    const facts: Record<string, string>[] = [];
    const add = (source: ProductSource, field: FactField, value: string, quote: string, unit = '') => facts.push({ field, value, quote, unit, sourceId: source.id, location: source.name + copyDictionary.cd5e3132e91211efc });
    for (const source of sources) {
        const text = source.text;
        for (const [prefix, fields] of [[copyDictionary.ccdfd0b34e4918648, ['lengthCm', 'widthCm', 'heightCm']], [copyDictionary.c84a07f292f1f78cc, ['foldLengthCm', 'foldWidthCm', 'foldHeightCm']]] as const) {
            const match = text.match(new RegExp(prefix + copyDictionary.c44eaec0e1cab92c8, 'i'));
            if (match)
                fields.forEach((field, index) => add(source, field, match[index + 1], match[0], 'cm'));
        }
        const weight = text.match(/(?<!电池)(?:整车重量|重量)[：:\s]*(\d+(?:\.\d+)?)\s*(kg|g)/i);
        if (weight)
            add(source, 'weightKg', String(Number(weight[1]) / (weight[2].toLowerCase() === 'g' ? 1000 : 1)), weight[0], 'kg');
        const batteryWeight = text.match(/电池重量[：:\s]*(\d+(?:\.\d+)?)\s*kg/i);
        if (batteryWeight)
            add(source, 'batteryWeightKg', batteryWeight[1], batteryWeight[0], 'kg');
        if (/不含电池/.test(text))
            add(source, 'weightIncludesBattery', 'no', copyDictionary.cf283c3cad36502b4);
        else if (/含电池重量|重量[^。；]*含电池/.test(text))
            add(source, 'weightIncludesBattery', 'yes', text.match(/含电池重量|重量[^。；]*含电池/)![0]);
        for (const [pattern, field] of [[/展开长度[：:\s]*(\d+(?:\.\d+)?)\s*cm/, 'lengthCm'], [/收纳长度[：:\s]*(\d+(?:\.\d+)?)\s*cm/, 'foldLengthCm'], [/(?:额定能量|标称能量|电池能量)[：:\s]*(\d+(?:\.\d+)?)\s*Wh/i, 'batteryWh']] as const) {
            const match = text.match(pattern);
            if (match)
                add(source, field, match[1], match[0], field === 'batteryWh' ? 'Wh' : 'cm');
        }
        if (/双手|两只手/.test(text))
            add(source, 'foldHands', copyDictionary.ce54550a82a667a4a, text.match(/[^。；]*?(?:双手|两只手)[^。；]*/)?.[0] ?? copyDictionary.ce54550a82a667a4a);
        if (/单手/.test(text))
            add(source, 'foldHands', copyDictionary.cf23e99bce57fa0ac, text.match(/[^。；]*?单手[^。；]*/)?.[0] ?? copyDictionary.cf23e99bce57fa0ac);
        if (/无电池/.test(text))
            add(source, 'batteryType', 'none', copyDictionary.caf0bea91f489b74c);
        else if (/锂电池/.test(text))
            add(source, 'batteryType', 'lithium', copyDictionary.c0cad03728e492a1a);
        if (/电池可拆卸/.test(text))
            add(source, 'removable', 'yes', copyDictionary.ca237c132cc1845a6);
        const count = text.match(/驱动电池\s*([12])\s*块/);
        if (count)
            add(source, 'batteryCount', count[1], count[0], copyDictionary.c36d89c8f512d8cce);
        if (/操作说明[：:]/.test(text))
            add(source, 'operation', text.split(/操作说明[：:]/)[1].slice(0, 120), text.split(/操作说明[：:]/)[1].slice(0, 120));
    }
    const all = sources.filter(source => source.kind !== 'review').map(source => source.text).join(' '), category = /电动轮椅/.test(all) ? 'wheelchair' : /手动轮椅/.test(all) ? 'manual-wheelchair' : /盲杖/.test(all) ? 'cane' : /助听器/.test(all) ? 'hearing-aid' : /制氧机/.test(all) ? 'oxygen' : /助行器/.test(all) ? 'walker' : 'other';
    const title = sources.find(source => source.kind !== 'review' && source.text.trim())?.text.trim().split(/[。\n；;]/)[0].slice(0, 60);
    return normalizeAnalysis({ title: title ? title + copyDictionary.c192b0880478f910c : copyDictionary.cc73e588ee319f105, category, facts, note: mode === 'sample' ? copyDictionary.cd91b17931d1a9926 : copyDictionary.cde350db4f9a85929 }, sources, mode, needs);
}
