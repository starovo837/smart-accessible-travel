import { copyDictionary } from "./copyDictionary.ts";
import { removeLearning } from './learningPlan.ts';
import { initialJourney } from './journey.ts';
import { scopeSnapshot, type Snapshot } from './storage.ts';
import type { Device, JourneyData, LifeData } from './types';
export function exportableLife(life: LifeData): LifeData {
    const { helpSessions, ...safe } = removeLearning(life);
    return safe;
}
export function portableSnapshot(journey: JourneyData, devices: Device[], selection: {
    devices: boolean;
    life: boolean;
    trip: boolean;
}): Snapshot {
    const base = initialJourney(), privacy = { profile: false, devices: selection.devices || selection.trip, life: selection.life || selection.trip, retainDays: 0 as const };
    const snapshot = scopeSnapshot({ modules: [], devices: selection.devices ? devices : [], consent: 'granted', privacy, settings: { elderMode: false, stepMode: false, readAloud: false }, feedback: [], customModes: [], customDevices: [], journey: { ...base, cards: selection.devices ? journey.cards : [], life: selection.life ? exportableLife(journey.life) : base.life, living: selection.life ? journey.living : base.living, records: selection.trip ? journey.records : [], shares: [], packet: null } });
    snapshot.journey.packet = selection.trip && journey.packet ? { ...journey.packet, cards: selection.devices ? journey.packet.cards : [], life: undefined, communication: '', records: journey.records } : null;
    return snapshot;
}
export function embedPortable(template: string, snapshot: Snapshot) {
    const json = JSON.stringify(snapshot).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    const marker = '<script id="portable-data" type="application/json">', at = template.indexOf('<head>') + 6;
    if (at < 6)
        throw Error(copyDictionary.c0e1734cfe9f47a54);
    let clean = template;
    // Only remove an actual leading data element. A bundled JS string may contain
    // the same marker and must never be mistaken for an HTML element.
    if (clean.slice(at).startsWith(marker)) {
        const end = clean.indexOf('</script>', at + marker.length);
        if (end < 0)
            throw Error(copyDictionary.c9b434894e3974056);
        clean = clean.slice(0, at) + clean.slice(end + 9);
    }
    return clean.slice(0, at) + marker + json + '</script>' + clean.slice(at);
}
