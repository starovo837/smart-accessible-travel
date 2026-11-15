import { copyDictionary } from "./copyDictionary.ts";
import type { DailyStatus, ProductAnalysis, RoutePlan, TravelMode } from './types';
export function fitProduct(product: Pick<ProductAnalysis, 'width' | 'length'>, door: string, elevator: string): string {
    const widths = [Number(door), Number(elevator)];
    if (widths.some(width => !Number.isFinite(width) || width <= 0))
        return copyDictionary.c9b87f65c391dcfd6;
    const minimum = Math.min(...widths);
    if (product.width > minimum)
        return copyDictionary.cc759aab7a1182828 + product.width + copyDictionary.cca6809d1587e41b0 + minimum + copyDictionary.ccc7ab7a504d0777b;
    const margin = +(minimum - product.width).toFixed(1);
    return copyDictionary.cc759aab7a1182828 + product.width + copyDictionary.c377fd6d87877b58e + margin + copyDictionary.cf03ed331e6168fbe;
}
export function prepareRoute(from: string, to: string, mode: TravelMode, daily: DailyStatus, now: string): RoutePlan {
    const groundCar = ['taxi', 'ride-hailing', 'accessible-car', 'private-car'].includes(mode);
    const steps = [
        daily.companion ? copyDictionary.c39b0025d3eec97d7 : copyDictionary.c5cd4070825dabdac,
        groundCar ? copyDictionary.cc1c2dbda6e9897c6 : copyDictionary.c184c4d498cebb291,
        daily.energy !== 'good' || daily.pain !== 'none' ? copyDictionary.c495454b9b5a7e439 : copyDictionary.c087fa22f511e8827,
        copyDictionary.c539f566cb9b2ccec,
        copyDictionary.c1d6b34490e7b8348,
    ];
    return {
        id: `route-${Date.now()}`, from: from.trim(), to: to.trim(), mode, accessible: false, updatedAt: now, step: 0, paused: false, steps,
        alternatives: [copyDictionary.c3f21a75b4cc83e40, copyDictionary.c7e53737237e54c6f],
        restroom: copyDictionary.cb46c81fde68c132b, restStops: daily.energy === 'good' ? copyDictionary.cccec0b370cfc98a4 : copyDictionary.c05d5ee35903ee146,
        facilities: [
            { id: 'entrance', label: copyDictionary.c98b7dd324700ef00, status: 'unknown', note: '' },
            { id: 'lift', label: groundCar ? copyDictionary.c6bbea45160b532ed : copyDictionary.c22fda22e68d9f8d7, status: 'unknown', note: '' },
            { id: 'restroom', label: copyDictionary.cfa541444a159cb6a, status: 'unknown', note: '' },
            { id: 'help', label: copyDictionary.cda3113003b4612d3, status: 'unknown', note: '' },
        ],
    };
}
export interface AssistantSlots {
    intent?: 'travel' | 'product';
    product?: string;
    mode?: string;
    device?: string;
    city?: string;
}
const modes: [
    string,
    string
][] = [[copyDictionary.cc05f7cd6ed3587a2, 'plane'], [copyDictionary.c2db31e428de89535, 'rail'], [copyDictionary.cb8466cd555e68992, 'metro'], [copyDictionary.c0711877f34a0dae0, 'bus'], [copyDictionary.c228e2ed446e684a3, 'train'], [copyDictionary.ca009d2a251780ef1, 'taxi'], [copyDictionary.c4039dc8b6d42a85e, 'ride-hailing'], [copyDictionary.c7f48b4727067d712, 'ferry']];
const equipment = [copyDictionary.c4157eed714966bbc, copyDictionary.ccfc90ea657507b34, copyDictionary.c787be217eb406b96, copyDictionary.c27f1ebdaa0ae0601, copyDictionary.cbc4a33ffc596d34c, copyDictionary.cdc2ed4c62c4097ac, copyDictionary.c5aaf9eed70ae21eb, copyDictionary.caaede5bfae21dca3, copyDictionary.c53d3e902cac8f783, copyDictionary.c8893cae54a2d71e9, copyDictionary.c9195ed0c54ce5cac, copyDictionary.c895df78b5463c316];
export function assistantReply(input: string, previous: AssistantSlots): {
    slots: AssistantSlots;
    text: string;
    complete: boolean;
} {
    const slots = { ...previous };
    const normalized = input.trim();
    const foundMode = modes.find(([label]) => normalized.includes(label));
    if (foundMode)
        slots.mode = foundMode[1];
    const foundDevice = equipment.find(label => normalized.includes(label));
    if (/想买|购买|商品|买辅具|选购/.test(normalized))
        slots.intent = 'product';
    if (slots.intent === 'product') {
        if (foundDevice)
            slots.product = foundDevice;
        else if (previous.intent === 'product' && normalized)
            slots.product = normalized;
        if (!slots.product)
            return { slots, text: copyDictionary.c9112be655aa638f1, complete: false };
        return { slots, text: copyDictionary.c11f4f25de8fa999b + slots.product + copyDictionary.c2dfe91c5cebe26ce, complete: true };
    }
    slots.intent = 'travel';
    if (foundDevice)
        slots.device = foundDevice;
    if (!slots.mode && /步行|专车|其他方式/.test(normalized))
        slots.mode = normalized;
    if (previous.mode && !previous.device && !foundMode && !foundDevice && normalized)
        slots.device = normalized;
    if (previous.mode && previous.device && !previous.city && !foundMode && !foundDevice)
        slots.city = normalized;
    if (/没有设备|不带设备/.test(normalized))
        slots.device = copyDictionary.cf083f58809f4a30c;
    if (!slots.mode)
        return { slots, text: copyDictionary.c4fb4dbbc1dd1898d, complete: false };
    if (!slots.device)
        return { slots, text: copyDictionary.c8d001369b9a71056, complete: false };
    if (!slots.city)
        return { slots, text: copyDictionary.ce44903b71694857d, complete: false };
    return { slots, text: copyDictionary.c822e76db00fe53e5 + slots.city + copyDictionary.c605bc6091325403d + slots.device + copyDictionary.c2caf8bbca95ceb66, complete: true };
}
