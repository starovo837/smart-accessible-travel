import { copyDictionary } from "./copyDictionary.ts";
import type { ProductAnalysis } from './types.ts';
import { modelKey, modelKeys } from './evidence.ts';
export interface UsabilityTopic {
    id: string;
    label: string;
    question: string;
    pattern: RegExp;
}
const controls: UsabilityTopic = { id: 'controls', label: copyDictionary.c859687b0ede67d49, question: copyDictionary.c7a3354495c9b413d, pattern: /按钮|按键|开关|触摸|接口|握持|操作力度|单手|双手/ };
const alerts: UsabilityTopic = { id: 'alerts', label: copyDictionary.c7abff2a74fc02f6b, question: copyDictionary.c222b7ef04a56b81a, pattern: /震动|振动|灯光|指示灯|提示音|语音提示|文字提示|报警/ };
const compatibility: UsabilityTopic = { id: 'compatibility', label: copyDictionary.c8ba7a1f83e0103a9, question: copyDictionary.c150e53bad5b2b031, pattern: /兼容|适配系统|Android|安卓|iOS|蓝牙|外接开关|配对|手机系统/ };
const consumables: UsabilityTopic = { id: 'consumables', label: copyDictionary.c438783e5b70a7df9, question: copyDictionary.c12054bd3167efb7e, pattern: /耗材|更换|电池仓|工具|滤芯|杖头|耳塞|管路|轮胎/ };
const cleaning: UsabilityTopic = { id: 'cleaning', label: copyDictionary.cc778bc4a8db4220d, question: copyDictionary.c61abc275c0a2ef18, pattern: /清洁|清洗|消毒|维护|保养|防水/ };
const service: UsabilityTopic = { id: 'service', label: copyDictionary.c53ca82a6ee9ff5eb, question: copyDictionary.c993c35353db8d869, pattern: /保修|维修|寄修|售后|收费|费用|价格|服务网点|备用/ };
const offline: UsabilityTopic = { id: 'offline', label: copyDictionary.c93ecaf506efeb83c, question: copyDictionary.c49ea9a2c0b0668e2, pattern: /离线|断网|无网络|备用|沟通卡|手动|没电/ };
const mobility: UsabilityTopic = { id: 'mobility', label: copyDictionary.c7d2ebc624dd90ac4, question: copyDictionary.c156ad53d8a268c21, pattern: /刹车|制动|握把|扶手|转移|折叠|弯腰|单手|双手/ };
export function usabilityTopics(type: string): UsabilityTopic[] {
    if (['hearing-aid', 'cochlear-processor', 'hearing-transmitter', 'vibration-alert'].includes(type))
        return [controls, alerts, compatibility, consumables, cleaning, service];
    if (['cane', 'electronic-cane', 'magnifier', 'braille-display', 'reading-device'].includes(type))
        return [controls, alerts, compatibility, consumables, offline, service];
    if (['aac-device', 'communication-board', 'electrolarynx'].includes(type))
        return [controls, compatibility, offline, alerts, cleaning, service];
    if (['wheelchair', 'manual-wheelchair', 'mobility-scooter', 'walker', 'rollator', 'crutches', 'walking-stick', 'prosthesis', 'orthosis'].includes(type))
        return [mobility, controls, consumables, cleaning, service];
    if (['oxygen', 'pump', 'cpap', 'nebulizer', 'glucose-monitor', 'suction-device'].includes(type))
        return [alerts, controls, consumables, cleaning, offline, service];
    return [controls, alerts, compatibility, consumables, cleaning, service];
}
export function usabilityReview(product: ProductAnalysis) {
    const insight = product.insight;
    return usabilityTopics(product.deviceType ?? 'other').map(topic => {
        const quotes = insight?.sources.filter(source => source.kind !== 'review' && source.imageQuality !== 'unreadable').flatMap(source => {
            const matchingFacts = insight.facts.filter(fact => fact.sourceId === source.id && fact.verification !== 'unverified' && (insight.selectedModel === undefined || (fact.modelKey ?? '') === insight.selectedModel)).map(fact => fact.quote);
            const body = source.text || source.transcript || '', key = source.modelKey || modelKey(body), inScope = modelKeys(body).length <= 1 && (insight.selectedModel === undefined || key === insight.selectedModel);
            const raw = inScope ? body.split(/[。；;\n]+/).map(text => text.trim()).filter(Boolean) : [];
            return [...matchingFacts, ...raw].filter(text => text.length <= 400 && topic.pattern.test(text)).map(text => ({ sourceId: source.id, source: source.name, text, image: !!source.image || !!source.transcript, sample: !!source.sample }));
        }).filter((item, index, all) => all.findIndex(row => row.sourceId === item.sourceId && row.text === item.text) === index) ?? [];
        return { ...topic, quotes: quotes.slice(0, 3) };
    });
}
