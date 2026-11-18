import { copyDictionary } from "./copyDictionary.ts";
import { chosenFact, conflictsOf, missingQuestions, productImpacts, type FactField } from './product.ts';
import type { Device, ProductAnalysis, TravelCheckResult, TravelDeviceSpecs } from './types.ts';
import { largeDeviceTypes } from './travelRules.ts';
import {confirmedTravelSpecs,sampleDeviceField} from './travelSpecEvidence.ts';
export function productFocus(product: ProductAnalysis) {
    const insight = product.insight;
    if (!insight)
        return { risks: [], otherRisks: [], extra: 0, field: undefined, action: copyDictionary.ca91097bcbdacb912, section: 'next' as const };
    const conflicts = conflictsOf(insight).filter(row => !insight.resolutions[row.field]), impacts = productImpacts(product);
    const risks = [...impacts.filter(row => row.tone === 'danger'), ...conflicts.map(row => ({ title: row.label + copyDictionary.cdb0d050aba6f4ecd, detail: copyDictionary.cca3666ff1eb6e631, tone: 'warn' as const })), ...impacts.filter(row => row.tone !== 'danger')];
    const questions = missingQuestions(product);
    const fields: FactField[] = ['widthCm', 'weightKg', 'weightIncludesBattery', 'foldHands', 'batteryWh', 'operation', 'compatibility', 'batteryType', 'lengthCm', 'heightCm', 'removable', 'batteryCount'];
    const pending = fields.map(field => chosenFact(insight, field)).find(fact => fact && !fact.confirmed);
    const field = conflicts[0]?.field ?? pending?.field;
    if (!risks.length)
        risks.push({ title: questions.length ? copyDictionary.c28c156d1461b6918 : copyDictionary.cd2c19e279972f0e5, detail: questions[0]?.question ?? copyDictionary.cc7159b79087964d6, tone: 'warn' });
    return { risks: risks.slice(0, 2), otherRisks: risks.slice(2), extra: Math.max(0, risks.length - 2), field, action: field ? copyDictionary.ca3da233094e17acc + (conflicts[0]?.label ?? pending!.label) : questions.length ? copyDictionary.ca14e58a27568e0d7 + questions[0].label : copyDictionary.c4caf77c37201fb0a, section: field ? 'evidence' as const : questions.length ? 'next' as const : 'next' as const };
}
export interface TravelQuestion {
    id: string;
    deviceId: string;
    name: string;
    field: keyof TravelDeviceSpecs;
    label: string;
    hint: string;
    choices?: [
        string,
        string
    ][];
}
export function travelQuestions(mode: string, devices: Device[], specs: Record<string, TravelDeviceSpecs>): TravelQuestion[] {
    return devices.flatMap(device => {
        if (device.type === 'guide-dog' || sampleDeviceField(device))
            return [];
        const values = confirmedTravelSpecs(specs[device.id],device), large = largeDeviceTypes.has(device.type), rows: TravelQuestion[] = [];
        const add = (field: keyof TravelDeviceSpecs, label: string, hint: string, choices?: [
            string,
            string
        ][]) => { const value = values[field]; if (value === undefined || value === 'unknown')
            rows.push({ id: device.id + ':' + field, deviceId: device.id, name: device.name, field, label, hint, choices }); };
        if (large || ['rail', 'train'].includes(mode)) {
            for (const [field, label] of [['lengthCm', copyDictionary.c3c31d4f79c7d71b8], ['widthCm', copyDictionary.c3943ee724184bd55], ['heightCm', copyDictionary.cd51b53cd2c858dda], ['weightKg', copyDictionary.c6f689d83a041e570]] as const)
                add(field, label, copyDictionary.ce2cf1b2019eceb2f);
        }
        add('batteryType', copyDictionary.c2e1fa9e01af0ffbd, copyDictionary.c5119f81f101695c2, [['none', copyDictionary.cd0b98b6b5127b3fd], ['lithium', copyDictionary.c0cad03728e492a1a], ['other', copyDictionary.c417bdbecdc24f0d5]]);
        if (values.batteryType === 'lithium')
            add('batteryWh', copyDictionary.c491ad24afc26c4d2, copyDictionary.ce492bdb7bee2ef69);
        if (mode === 'plane' && ['wheelchair', 'mobility-scooter'].includes(device.type) && values.batteryType && values.batteryType !== 'none' && values.batteryType !== 'unknown') {
            add('batteryCount', copyDictionary.c73943f4e5edd0f2b, copyDictionary.ca6be2372b24aa8b6, [['1', copyDictionary.c4856886447eba9fe], ['2', copyDictionary.ceb1bd21313647826]]);
            add('removable', copyDictionary.cc16a64123272287f, copyDictionary.cb4d7b50a9cd4a7eb, [['yes', copyDictionary.c653483205eea16ee], ['no', copyDictionary.cb98f332026c596bb]]);
        }
        if (mode === 'plane' && device.type === 'manual-wheelchair')
            add('folded', copyDictionary.cc842acd042b3c006, copyDictionary.c2f9673e34730e351, [['yes', copyDictionary.c8f70d047ab6f0630], ['no', copyDictionary.c5ba71da75a4f4539]]);
        return rows;
    });
}
export function travelNextAction(results: TravelCheckResult[]) {
    if (results.some(result => result.eligibility === 'restricted'))
        return { kind: 'script' as const, label: copyDictionary.c1cd2fd7160fc64d8, detail: copyDictionary.cc346730ddde7ced3 };
    const missing = results.flatMap(result => result.missingInformation ?? []), parameter = missing.find(item => !/(正式条款|承运方条件|设备用途)/.test(item));
    if (parameter)
        return { kind: 'supplement' as const, label: copyDictionary.c4f4f8f3eaa656ded, detail: parameter };
    if (missing.length)
        return { kind: 'script' as const, label: copyDictionary.c8b72a46537fa966b, detail: missing[0] };
    if (results.some(result => result.eligibility === 'conditional' || result.eligibility === 'unknown'))
        return { kind: 'script' as const, label: copyDictionary.c55337da9e3d5fd7f, detail: copyDictionary.c7f5f47ae48c3fe32 };
    return { kind: 'list' as const, label: copyDictionary.c0fdf843def525c8b, detail: copyDictionary.cd1a58bbd519f26ef };
}
