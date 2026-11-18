import { copyDictionary } from "./copyDictionary.ts";
import type { Device, TravelCheckResult, TravelContext, TravelDeviceSpecs, TravelMode } from './types';
import { ruleCatalog, ruleCurrent, rulesFor, type RuleDocument } from './ruleCatalog.ts';
import {confirmedTravelSpecs} from './travelSpecEvidence.ts';
export const largeDeviceTypes = new Set(['wheelchair', 'manual-wheelchair', 'mobility-scooter', 'walker', 'rollator', 'transfer-board']);
const poweredTypes = new Set(['wheelchair', 'mobility-scooter', 'hearing-aid', 'oxygen', 'pump', 'electronic-cane', 'magnifier', 'braille-display', 'reading-device', 'cochlear-processor', 'hearing-transmitter', 'vibration-alert', 'aac-device', 'electrolarynx', 'reminder', 'cpap', 'nebulizer', 'glucose-monitor', 'suction-device']);
const medicalTypes = new Set(['oxygen', 'pump', 'cpap', 'nebulizer', 'suction-device']);
const knownTypes = new Set([...largeDeviceTypes, ...poweredTypes, 'cane', 'crutches', 'walking-stick', 'prosthesis', 'orthosis', 'pressure-cushion', 'communication-board', 'pill-organizer']);
const airlineUrl = 'https://m.airchina.com.cn/c/invoke/specialAssistance@pgzhcn?comeFrom=xlxx';
const airlineBatteryUrl = 'https://bj.airchina.com.cn/cn/ysztjzw/497660.shtml';
const caacUrl = 'https://www.caac.gov.cn/HDJL/GDYM/CJWTTY/';
const railUrl = 'https://kyfw.12306.cn/otn/gonggao/luggage.html';
export function buildTravelResults(mode: TravelMode, devices: Device[], specs: Record<string, TravelDeviceSpecs> = {}, context: TravelContext = { carrier: 'unspecified' }, documents: RuleDocument[] = ruleCatalog, now = Date.now()): TravelCheckResult[] {
    const applicable = rulesFor(mode, context, documents), current = applicable.filter(rule => ruleCurrent(rule, Math.max(now, Date.parse(context.journeyDate || '') || 0)));
    const active = (id: string) => current.some(rule => rule.id === id);
    return devices.map((device) => {
        const detail = confirmedTravelSpecs(specs[device.id],device);
        const large = largeDeviceTypes.has(device.type);
        const powered = poweredTypes.has(device.type) || (detail.batteryType && !['none', 'unknown'].includes(detail.batteryType));
        const electronic = powered || detail.batteryType === 'lithium';
        const medical = medicalTypes.has(device.type);
        const checks: string[] = [];
        const nextSteps: string[] = [];
        let eligibility: TravelCheckResult['eligibility'] = 'conditional';
        let summary = copyDictionary.c2e9dc3bf4a83d90c;
        let handling = copyDictionary.c5018bc0d632ba3b1;
        let source = copyDictionary.c92638da3b9fe8f68;
        let sourceLinks: {
            label: string;
            url: string;
        }[] = [];
        const conditional = (message: string) => { if (eligibility !== 'restricted' && eligibility !== 'unknown') {
            eligibility = 'conditional';
            summary = message;
        } };
        const restrict = (message: string) => { eligibility = 'restricted'; summary = message; };
        const dims = [detail.lengthCm, detail.widthCm, detail.heightCm];
        const hasDims = dims.every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0);
        checks.push(mode === 'bus' || ['taxi', 'ride-hailing', 'accessible-car', 'private-car'].includes(mode) ? copyDictionary.cf4cbc7dcb30fff6f : copyDictionary.cd9d0a2a29b2715e2);
        if (!knownTypes.has(device.type)) {
            eligibility = 'unknown';
            summary = copyDictionary.c2f420cd773a6e89c;
            nextSteps.push(copyDictionary.c10c283cfba12604e);
        }
        if (large) {
            checks.push(hasDims ? copyDictionary.cd8bff8eca96ed314 + dims.join(' × ') + copyDictionary.ca96b8174581891fd + (detail.weightKg ?? copyDictionary.c64747fab2c8f817d) + copyDictionary.c1349488e9a95c935 : copyDictionary.c7711e5c4f0770633);
            nextSteps.push(copyDictionary.cb2311615e5e20ac9);
            conditional(copyDictionary.c8ef300273ccfbd7b);
        }
        if (mode === 'plane') {
            source = context.carrier === 'airchina' ? copyDictionary.caaee5da592d557b6 : copyDictionary.cda0b960ccf023f43;
            sourceLinks = context.carrier === 'airchina' ? [{ label: copyDictionary.ce7f0736edf229693, url: airlineUrl }, { label: copyDictionary.c6a0874a559efd00e, url: airlineBatteryUrl }] : [{ label: copyDictionary.cdb80bfa3971dfd45, url: caacUrl }];
            if (['wheelchair', 'mobility-scooter'].includes(device.type)) {
                handling = copyDictionary.cad31ef3df0ece638;
                conditional(copyDictionary.c43524f4d909be95f);
                if (active('airchina-assistance'))
                    checks.push(copyDictionary.c99970b59003a84ad);
                checks.push(copyDictionary.c0375191604d594a2);
                nextSteps.push(copyDictionary.ce7a57a77019359a6);
                if (detail.batteryType === 'lithium' && detail.removable === 'yes' && detail.batteryWh !== undefined && detail.batteryCount !== undefined && context.carrier === 'airchina' && active('airchina-battery')) {
                    const limit = detail.batteryCount === 2 ? 160 : 300;
                    checks.push(copyDictionary.c133ea72731df4e2c + (detail.batteryCount === 2 ? copyDictionary.ca020c6d65506f9be : copyDictionary.c1f21190fc40b04e5) + copyDictionary.c27f9547cb82db7f7 + limit + copyDictionary.c5a6f1563adbd6658 + detail.batteryWh + copyDictionary.c97985eaa56b5d7f2);
                    if (detail.batteryWh > limit)
                        restrict(copyDictionary.ca0c85071b61c1b05 + detail.batteryWh + copyDictionary.caef6e506e7775ae6 + limit + copyDictionary.cf9ae0887db3a52f8);
                }
                else {
                    checks.push(copyDictionary.c35d7679a40a03176);
                }
            }
            else if (device.type === 'manual-wheelchair') {
                handling = copyDictionary.cf3c9f042db834e94;
                conditional(copyDictionary.ca84099a5f4091cbd);
                if (context.carrier === 'airchina' && active('airchina-assistance')) {
                    checks.push(copyDictionary.c26c72a73c5afa365);
                    if (hasDims) {
                        const sorted = (dims as number[]).slice().sort((a, b) => a - b);
                        const fits = sorted.every((value, index) => value <= [33, 91, 106][index]);
                        checks.push(detail.folded === 'yes' && fits ? copyDictionary.c99e47d2fd3f90385 : copyDictionary.cd5ed423e29091ea6);
                        if (!fits || detail.folded === 'no')
                            handling = copyDictionary.c4f5b719012aa63df;
                    }
                }
                else
                    checks.push(copyDictionary.c5efa5db93b53cc33);
            }
            else if (large) {
                handling = copyDictionary.c184becff140d2be6;
                conditional(copyDictionary.c285f50fd23cb20de);
            }
            if (electronic && !['wheelchair', 'mobility-scooter'].includes(device.type)) {
                checks.push(copyDictionary.cc69a4f1ef96f4cdf);
                if (device.type !== 'hearing-aid' && device.type !== 'cochlear-processor')
                    conditional(copyDictionary.c0b3c33807ac970a8);
            }
            if (medical) {
                conditional(copyDictionary.c5035936abcdf9f0c);
                nextSteps.push(copyDictionary.cc4b29d4fa0ec6b9e);
            }
        }
        else if (mode === 'rail' || mode === 'train') {
            source = copyDictionary.c33bbfe50b6a462d3;
            sourceLinks = [{ label: copyDictionary.cc5c4c6dc2db6b232, url: railUrl }];
            if (active('rail-domestic'))
                checks.push(copyDictionary.c9b34f323658f1df6 + (mode === 'rail' ? '130' : '160') + copyDictionary.c640c5a3da1313051);
            if (device.type === 'mobility-scooter') {
                conditional(copyDictionary.ccb516c4c136568df);
                checks.push(copyDictionary.cbd07c326040552e4);
            }
            if (large)
                nextSteps.push(copyDictionary.cf9c8e984559efd02);
            if (active('rail-domestic') && !['wheelchair', 'manual-wheelchair'].includes(device.type) && ((hasDims && (dims as number[]).reduce((a, b) => a + b, 0) > (mode === 'rail' ? 130 : 160)) || (detail.weightKg !== undefined && detail.weightKg > 20)))
                restrict(copyDictionary.cc00f4f1b2f2ab3c5);
        }
        else if (large || medical) {
            handling = large ? copyDictionary.c1398e80babb7d36e : copyDictionary.ce37da83f8713b1fe;
            conditional(copyDictionary.cc7c6bdd8149f5660);
            checks.push(copyDictionary.c1fcd0bad67032c69);
            nextSteps.push(copyDictionary.cfc87da720091f440);
        }
        if (large && hasDims) {
            const limits = [context.availableLengthCm, context.availableWidthCm, context.availableHeightCm];
            if (limits.some((value, i) => value !== undefined && (dims[i] as number) > value))
                restrict(copyDictionary.cad2de78674d678e7);
            if (context.doorWidthCm !== undefined && (detail.widthCm as number) > context.doorWidthCm)
                restrict(copyDictionary.cc39b3b7e28251d06);
            if (limits.some(value => value !== undefined) || context.doorWidthCm !== undefined)
                checks.push(copyDictionary.c16499ad87434594d);
        }
        if (large && context.availableWeightKg !== undefined) {
            checks.push(copyDictionary.ced139a5e242f8f68 + context.availableWeightKg + copyDictionary.cd5467702a32b2350);
            if (detail.weightKg === undefined)
                nextSteps.push(copyDictionary.ca2786acf6d3f0af3);
            else if (detail.weightKg > context.availableWeightKg)
                restrict(copyDictionary.cb55e3ce205ce86d2);
            nextSteps.push(copyDictionary.c85734e3763a77834);
        }
        if (!nextSteps.length)
            nextSteps.push(copyDictionary.cd401f4363251b6ad);
        if (large && (!hasDims || !detail.weightKg))
            nextSteps.unshift(copyDictionary.c79acb2cc7d069d0d);
        if (powered && detail.batteryType !== 'none' && (!detail.batteryType || detail.batteryType === 'unknown' || detail.batteryWh === undefined || detail.batteryCount === undefined))
            nextSteps.unshift(copyDictionary.c005e84969633c98a);
        if (!['plane', 'rail', 'train', 'bus', 'metro', 'taxi', 'ride-hailing', 'accessible-car', 'private-car', 'coach', 'ferry'].includes(mode)) {
            eligibility = 'unknown';
            summary = copyDictionary.cf86abc6545678ad8;
        }
        if (!current.length) {
            nextSteps.unshift(copyDictionary.c95831da9e011ba7b);
            checks.unshift(copyDictionary.c59e64df5a176c44f);
        }
        const missingInformation: string[] = [];
        if (!current.length)
            missingInformation.push(copyDictionary.c32f101fd0990ec25);
        if (!knownTypes.has(device.type))
            missingInformation.push(copyDictionary.c25d94f06864231ec);
        if ((large || mode === 'rail' || mode === 'train') && !hasDims)
            missingInformation.push(copyDictionary.cf3c40030ad48050d);
        if ((large || mode === 'rail' || mode === 'train') && !detail.weightKg)
            missingInformation.push(copyDictionary.ca84a142d40f0118b);
        if (!detail.batteryType || detail.batteryType === 'unknown')
            missingInformation.push(copyDictionary.c21a893ac9ccc17f7);
        if (electronic && detail.batteryType === 'lithium' && detail.batteryWh === undefined)
            missingInformation.push(copyDictionary.ce6d9534ba69b473b);
        if (mode === 'plane' && ['wheelchair', 'mobility-scooter'].includes(device.type) && detail.batteryType !== 'none') {
            if (detail.batteryCount === undefined)
                missingInformation.push(copyDictionary.cc0c73dc664361a97);
            if (!detail.removable || detail.removable === 'unknown')
                missingInformation.push(copyDictionary.c4be862ee5fc50de2);
            if (detail.batteryType !== 'lithium' || detail.removable !== 'yes' || !active('airchina-battery'))
                missingInformation.push(copyDictionary.c69c02d861a55ef77);
        }
        const blocked = (eligibility as TravelCheckResult['eligibility']) === 'restricted';
        let assessment: NonNullable<TravelCheckResult['assessment']> = blocked ? 'not-met' : missingInformation.length ? 'information-needed' : 'assistance-required';
        // Green means only these enumerated conditions match. It is never a
        // booking, dangerous-goods, security or boarding approval.
        const ordinaryRail = (mode === 'rail' || mode === 'train') && active('rail-domestic') && !large && !electronic && !medical && knownTypes.has(device.type);
        if (!blocked && ordinaryRail && !missingInformation.length) {
            assessment = 'conditions-met';
            eligibility = 'allowed';
            summary = copyDictionary.c5f76044f8602a377;
        }
        else if (!blocked && assessment === 'information-needed')
            eligibility = 'unknown';
        if (assessment === 'assistance-required')
            nextSteps.unshift(copyDictionary.c9c55063ca1e8d71d);
        const finalEligibility = eligibility as TravelCheckResult['eligibility'];
        const status: TravelCheckResult['status'] = finalEligibility === 'restricted' ? 'restricted' : !current.length || finalEligibility === 'unknown' ? 'no-rule-found' : assessment === 'conditions-met' ? 'official-allowed' : 'carrier-confirmation';
        const confidence = undefined;
        const ruleDate = current.length ? current.map(rule => rule.checkedAt).join('、') : copyDictionary.c2bba7935831f88bf;
        sourceLinks = applicable.map(rule => ({ label: rule.title, url: rule.url }));
        return { mode, deviceId: device.id, deviceName: device.name, eligibility, assessment, missingInformation, assessmentScope: assessment === 'conditions-met' ? copyDictionary.c86d104cf810be852 : copyDictionary.ced8a10fa99ce8e4e, summary, handling, checks, nextSteps, source: current.length ? current.map(rule => rule.title).join('、') : copyDictionary.c69fab1ecf7b76fa2 + source, updatedAt: ruleDate, ruleDate, status, confidence, applicableTo: `${getModeLabel(mode)} · ${context.city || copyDictionary.c10c15a5383a63834} · ${context.line || copyDictionary.c0e12cefdc203a03b}`, sourceLinks, ruleEvidence: applicable, evidence: copyDictionary.ce0093436a0206e93 + checks.join('\n') + copyDictionary.c4b3939c6603dac26 };
    });
}
function getModeLabel(mode: TravelMode) {
    const labels: Record<string, string> = { plane: copyDictionary.cc05f7cd6ed3587a2, rail: copyDictionary.c2db31e428de89535, train: copyDictionary.cb0e71283b715601f, bus: copyDictionary.c0711877f34a0dae0, metro: copyDictionary.cb8466cd555e68992, taxi: copyDictionary.ca009d2a251780ef1, 'ride-hailing': copyDictionary.c4039dc8b6d42a85e, 'accessible-car': copyDictionary.cf816877f0e3b4c6a, coach: copyDictionary.c126889b8d3296b28, ferry: copyDictionary.c59c8f9c7509b5762, 'private-car': copyDictionary.cccaed1ae5a74e03a };
    return labels[mode] ?? mode;
}
