import { copyDictionary } from "./copyDictionary.ts";
import type { Device, TravelContext, TravelDeviceSpecs } from './types';
import { normalizeDisabilityProfile, type DisabilityProfile } from './disabilityProfile.ts';
/** System placeholders are never allowed to become staff-facing copy. */
export function safeTripText(value: unknown, fallback = ''): string {
    if (typeof value !== 'string')
        return fallback;
    const clean = value.normalize('NFKC').replace(/\s+/gu, ' ').trim().slice(0, 200);
    return /（?(未选择|待填写|暂未)/u.test(clean) ? fallback : clean || fallback;
}
const positive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
export function normalizeTripSpecs(device: Device, supplied: TravelDeviceSpecs = {}): TravelDeviceSpecs {
    if (device.type === 'guide-dog')
        return { batteryType: 'none' };
    const result: TravelDeviceSpecs = {};
    for (const key of ['lengthCm', 'widthCm', 'heightCm', 'weightKg', 'batteryWh'] as const) {
        const value = positive(supplied[key]);
        if (value !== undefined)
            result[key] = value;
    }
    if (['yes', 'no', 'unknown'].includes(supplied.folded ?? ''))
        result.folded = supplied.folded;
    if (['none', 'lithium', 'other', 'unknown'].includes(supplied.batteryType ?? ''))
        result.batteryType = supplied.batteryType;
    if (['yes', 'no', 'unknown'].includes(supplied.removable ?? ''))
        result.removable = supplied.removable;
    if (supplied.batteryCount === 1 || supplied.batteryCount === 2)
        result.batteryCount = supplied.batteryCount;
    if (!result.batteryType && safeTripText(device.battery) === copyDictionary.c484d55613910eb8c)
        result.batteryType = 'none';
    return result;
}
export function normalizeTripContext(context: TravelContext): TravelContext & {
    from: string;
    to: string;
    city: string;
    line: string;
    journeyDate: string;
    companionCount: number;
} {
    return {
        carrier: context?.carrier ?? 'unspecified',
        from: safeTripText(context?.from), to: safeTripText(context?.to),
        city: safeTripText(context?.city), line: safeTripText(context?.line),
        journeyDate: safeTripText(context?.journeyDate),
        companionCount: Number.isInteger(context?.companionCount) && context.companionCount! >= 0 ? Math.min(context.companionCount!, 99) : 0,
        ...Object.fromEntries((['availableLengthCm', 'availableWidthCm', 'availableHeightCm', 'doorWidthCm', 'availableWeightKg'] as const).flatMap(key => positive(context?.[key]) ? [[key, context[key]]] : [])),
    };
}
/** Identity contains normalized facts, not database IDs, generation clocks or UI order. */
export function canonicalTripKey(input: {
    mode: string;
    devices: Device[];
    specs: Record<string, TravelDeviceSpecs>;
    context: TravelContext;
    disabilityProfile?: DisabilityProfile;
}): string {
    const devices = (input.devices ?? []).map(device => ({ name: safeTripText(device.name, copyDictionary.c0f0fca7f8a5cdd2d), type: safeTripText(device.type, 'other'), specs: normalizeTripSpecs(device, input.specs?.[device.id]) })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'zh-CN'));
    const profile = normalizeDisabilityProfile(input.disabilityProfile);
    return JSON.stringify({ mode: safeTripText(input.mode), context: normalizeTripContext(input.context), devices, ...(profile.selections.length ? { disabilityProfile: profile } : {}) });
}
