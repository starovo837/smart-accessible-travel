import { copyDictionary } from "./copyDictionary.ts";
import { normalizeTripSpecs, safeTripText } from './travelTripIdentity.ts';
import type { TravelCompleteness, TravelCompletionGap, TravelPlanInput, TravelTaskPlan, TravelTaskDevice, TravelStageId } from './travelTaskTypes';
type RawPlan = Omit<TravelTaskPlan, 'completion'>;
const dimensionTypes = new Set(['wheelchair', 'manual-wheelchair', 'mobility-scooter', 'walker', 'rollator', 'transfer-board', 'oxygen', 'cpap', 'nebulizer', 'suction-device']);
const nonBatteryTypes = new Set(['cane', 'manual-wheelchair', 'walker', 'rollator', 'crutches', 'walking-stick', 'prosthesis', 'orthosis', 'transfer-board', 'pressure-cushion', 'communication-board', 'guide-dog']);
export const requiresTravelDimensions = (type: string) => dimensionTypes.has(type) || type.startsWith('custom:') || type === 'other';
export const requiresTravelBattery = (type: string) => !nonBatteryTypes.has(type);
export function travelEquipmentGaps(devices: TravelTaskDevice[]): TravelCompletionGap[] {
    if (!devices.length)
        return [{ id: 'devices', label: copyDictionary.c64d9ad1a731d635d, unlocks: 0 }, { id: 'dimensions', label: copyDictionary.c246df7d8db841735, unlocks: 0 }, { id: 'batteryType', label: copyDictionary.ccc64d927855b9fde, unlocks: 0 }];
    const missingType = devices.filter(device => !device.type || ['other', 'unknown'].includes(device.type));
    const dimensions = devices.filter(device => requiresTravelDimensions(device.type) && !(['lengthCm', 'widthCm', 'heightCm'] as const).every(field => typeof device.specs[field] === 'number' && Number.isFinite(device.specs[field]) && device.specs[field]! > 0));
    const battery = devices.filter(device => requiresTravelBattery(device.type) && !['none', 'lithium', 'other'].includes(device.specs.batteryType ?? ''));
    return [...(missingType.length ? [{ id: 'devices' as const, label: copyDictionary.c64d9ad1a731d635d, unlocks: 0, deviceIds: missingType.map(device => device.id) }] : []), ...(dimensions.length ? [{ id: 'dimensions' as const, label: copyDictionary.c246df7d8db841735, unlocks: 0, deviceIds: dimensions.map(device => device.id) }] : []), ...(battery.length ? [{ id: 'batteryType' as const, label: copyDictionary.ccc64d927855b9fde, unlocks: 0, deviceIds: battery.map(device => device.id) }] : [])];
}
/** A capacity probe only. Its invented values must never be used as actual equipment or action copy. */
export function travelCapacityInput(input: TravelPlanInput): TravelPlanInput {
    const devices = input.devices.length ? input.devices.map(device => ({ ...device, type: !safeTripText(device.type) || ['other', 'unknown'].includes(device.type) ? 'wheelchair' : device.type })) : [{ id: 'capacity-only', name: copyDictionary.c01980d7dd3be97b9, type: 'wheelchair', battery: '', dimensions: '', weight: '', source: 'manual' as const }];
    return { ...input, mode: safeTripText(input.mode, 'rail'), devices, context: { ...input.context, from: safeTripText(input.context.from, copyDictionary.cd82a07365225b51e), to: safeTripText(input.context.to, copyDictionary.cdfddc47f6caa7728) }, specs: Object.fromEntries(devices.map(device => {
            const actual = normalizeTripSpecs(device, input.specs[device.id]);
            return [device.id, { ...actual, ...(requiresTravelDimensions(device.type) ? { lengthCm: actual.lengthCm ?? 120, widthCm: actual.widthCm ?? 68, heightCm: actual.heightCm ?? 95 } : {}), batteryType: requiresTravelBattery(device.type) ? (['none', 'lithium', 'other'].includes(actual.batteryType ?? '') ? actual.batteryType : 'lithium') : 'none' }];
        })) };
}
export function travelCompleteness(plan: RawPlan, capacity: RawPlan): TravelCompleteness {
    const equipment = travelEquipmentGaps(plan.devices);
    const gaps: TravelCompletionGap[] = [...(!plan.mode ? [{ id: 'mode' as const, label: copyDictionary.ce9b0e57eec5b8a99, unlocks: 0 }] : []), ...(!plan.route.from ? [{ id: 'from' as const, label: copyDictionary.cfffd5618127396d4, unlocks: 0 }] : []), ...(!plan.route.to ? [{ id: 'to' as const, label: copyDictionary.c624228ce6473e904, unlocks: 0 }] : []), ...equipment];
    const equipmentLabels = equipment.map(gap => gap.label);
    const stages = Object.fromEntries(plan.stages.map(stage => {
        let total = Math.max(stage.actions.length, capacity.stages.find(row => row.id === stage.id)?.actions.length ?? 0);
        const missing = stage.id === 'fallback' ? [] : stage.id === 'station' ? gaps.filter(gap => ['from', 'to'].includes(gap.id)).map(gap => gap.label) : stage.id === 'arrival' ? gaps.filter(gap => gap.id === 'to').map(gap => gap.label) : gaps.map(gap => gap.label);
        if (stage.id === 'station' && stage.actions.length < total)
            missing.push(...equipmentLabels);
        if (stage.id === 'fallback' && plan.readiness === 'preparation')
            total = stage.actions.length;
        if (stage.id === 'arrival' && plan.route.to && !plan.route.from)
            total = stage.actions.length;
        const generated = stage.actions.length;
        return [stage.id, { generated, total, status: stage.id === 'fallback' ? 'ready' : generated === total && !missing.length ? 'ready' : generated ? 'partial' : 'blocked', missing: [...new Set(missing)] }];
    })) as TravelCompleteness['stages'];
    const generated = plan.stages.reduce((sum, stage) => sum + stage.actions.length, plan.generalActions.length);
    const total = Object.values(stages).reduce((sum, stage) => sum + stage.total, plan.generalActions.length), locked = Math.max(0, total - generated);
    const equipmentRules = new Set(['device-record', 'carry', 'pack', 'documents', 'screening', 'position', 'battery', 'nonpowered', 'dog', 'assistance']);
    const equipmentLocked = Math.min(locked, capacity.stages.flatMap(stage => stage.actions).filter(action => equipmentRules.has(action.id.slice(capacity.mode.length + 1))).length);
    for (const gap of gaps) {
        gap.unlocks = ['devices', 'dimensions', 'batteryType'].includes(gap.id) ? equipmentLocked : locked;
        gap.requires = gaps.filter(other => other.id !== gap.id).map(other => other.id);
    }
    const labels = gaps.map(gap => gap.label);
    const omitted = equipment.length ? copyDictionary.c9cd168b122fd9081 : gaps.length ? copyDictionary.cebf0a4a2164e9220 : copyDictionary.c5f877ee6fac69439;
    return { version: 1, generated, total, locked, gaps, stages, statement: copyDictionary.c87dc5418bcbd6102 + generated + copyDictionary.c8a5edab282632443 + total + copyDictionary.cf9d529eacdf392b4 + (labels.length ? copyDictionary.ce600b37f57da393d + labels.join('、') : copyDictionary.c4c1108ae464bf167) + copyDictionary.ceb0d5884569b398e + omitted, estimatedAdditional: locked };
}
