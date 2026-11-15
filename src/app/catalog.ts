import { copyDictionary } from "./copyDictionary.ts";
import type { IconName } from '../components/Icons';
import type { Device, DeviceType, TravelMode } from './types';
export const travelModes: {
    id: TravelMode;
    label: string;
    icon: IconName;
    contact: string;
}[] = [
    { id: 'rail', label: copyDictionary.c2db31e428de89535, icon: 'train', contact: copyDictionary.c9677f497a50990bb },
    { id: 'plane', label: copyDictionary.cc05f7cd6ed3587a2, icon: 'plane', contact: copyDictionary.cf597e45b87705950 },
    { id: 'bus', label: copyDictionary.c0711877f34a0dae0, icon: 'bus', contact: copyDictionary.ce24dcb9c5c1551ab },
    { id: 'metro', label: copyDictionary.cb8466cd555e68992, icon: 'train', contact: copyDictionary.c4fb7ab9b72410b78 },
    { id: 'train', label: copyDictionary.cb0e71283b715601f, icon: 'train', contact: copyDictionary.cc2ab5b000aa846de },
    { id: 'taxi', label: copyDictionary.ca009d2a251780ef1, icon: 'car', contact: copyDictionary.c49e4207a1a658372 },
    { id: 'ride-hailing', label: copyDictionary.c4039dc8b6d42a85e, icon: 'car', contact: copyDictionary.ca596f1a152a406b8 },
    { id: 'accessible-car', label: copyDictionary.cf816877f0e3b4c6a, icon: 'wheelchair', contact: copyDictionary.c400c3d7b7955ae80 },
    { id: 'coach', label: copyDictionary.c126889b8d3296b28, icon: 'bus', contact: copyDictionary.cbd431d12c9343806 },
    { id: 'ferry', label: copyDictionary.c59c8f9c7509b5762, icon: 'ship', contact: copyDictionary.cf3bef5faca375fed },
    { id: 'private-car', label: copyDictionary.cccaed1ae5a74e03a, icon: 'car', contact: copyDictionary.c6726a6df25b15766 },
];
export function getTravelMeta(id: TravelMode) {
    return travelModes.find((mode) => mode.id === id) ?? { id, label: id.startsWith('custom:') ? id.slice(7) : id, icon: 'arrow' as IconName, contact: copyDictionary.cf811646fa7313be8 };
}
export const extraEquipment: {
    id: DeviceType;
    label: string;
    icon: IconName;
    group: string;
}[] = [
    { id: 'manual-wheelchair', label: copyDictionary.ccfc90ea657507b34, icon: 'wheelchair', group: copyDictionary.c0b6a9276a29608b9 },
    { id: 'mobility-scooter', label: copyDictionary.c787be217eb406b96, icon: 'wheelchair', group: copyDictionary.c0b6a9276a29608b9 },
    { id: 'walker', label: copyDictionary.c53d3e902cac8f783, icon: 'cane', group: copyDictionary.c0b6a9276a29608b9 },
    { id: 'rollator', label: copyDictionary.cc8c799494185463e, icon: 'wheelchair', group: copyDictionary.c0b6a9276a29608b9 },
    { id: 'crutches', label: copyDictionary.cf64ab0574ebb0d96, icon: 'cane', group: copyDictionary.c0b6a9276a29608b9 },
    { id: 'walking-stick', label: copyDictionary.cb631fe6da844d328, icon: 'cane', group: copyDictionary.c0b6a9276a29608b9 },
    { id: 'prosthesis', label: copyDictionary.c33927804de61cbce, icon: 'user', group: copyDictionary.c0b6a9276a29608b9 },
    { id: 'orthosis', label: copyDictionary.cfd45203764b199ca, icon: 'user', group: copyDictionary.c0b6a9276a29608b9 },
    { id: 'transfer-board', label: copyDictionary.c5be2a331f284d59f, icon: 'steps', group: copyDictionary.c0b6a9276a29608b9 },
    { id: 'pressure-cushion', label: copyDictionary.cdb023aff72ad281b, icon: 'heart', group: copyDictionary.c0b6a9276a29608b9 },
    { id: 'electronic-cane', label: copyDictionary.cac6a02cebc18521a, icon: 'cane', group: copyDictionary.c5a3d443a19f57d05 },
    { id: 'guide-dog', label: copyDictionary.c0da044a91e7376dd, icon: 'eye', group: copyDictionary.c5a3d443a19f57d05 },
    { id: 'magnifier', label: copyDictionary.ca470971ed3af5eb5, icon: 'eye', group: copyDictionary.c5a3d443a19f57d05 },
    { id: 'braille-display', label: copyDictionary.c8a2a4220e854b461, icon: 'eye', group: copyDictionary.c5a3d443a19f57d05 },
    { id: 'reading-device', label: copyDictionary.c418d3facb63d362e, icon: 'volume', group: copyDictionary.c5a3d443a19f57d05 },
    { id: 'cochlear-processor', label: copyDictionary.c5c002e5c4f9117d1, icon: 'ear', group: copyDictionary.ce0288aa11ea1cdfb },
    { id: 'hearing-transmitter', label: copyDictionary.ccb67d86e2c852419, icon: 'ear', group: copyDictionary.ce0288aa11ea1cdfb },
    { id: 'vibration-alert', label: copyDictionary.ca01ba1ea574930fb, icon: 'ear', group: copyDictionary.ce0288aa11ea1cdfb },
    { id: 'aac-device', label: copyDictionary.c84fdebc9d180b0c4, icon: 'message', group: copyDictionary.c3219748c803f412c },
    { id: 'communication-board', label: copyDictionary.c9195ed0c54ce5cac, icon: 'message', group: copyDictionary.c3219748c803f412c },
    { id: 'electrolarynx', label: copyDictionary.cb811246d57b64ff2, icon: 'mic', group: copyDictionary.c3219748c803f412c },
    { id: 'reminder', label: copyDictionary.c6debb94066262408, icon: 'steps', group: copyDictionary.c3219748c803f412c },
    { id: 'pill-organizer', label: copyDictionary.c066d6be6d1423a67, icon: 'heart', group: copyDictionary.c3219748c803f412c },
    { id: 'cpap', label: copyDictionary.c1222615358fcc7ea, icon: 'oxygen', group: copyDictionary.ccae46091d8d30468 },
    { id: 'nebulizer', label: copyDictionary.cb239d3811f645625, icon: 'oxygen', group: copyDictionary.ccae46091d8d30468 },
    { id: 'glucose-monitor', label: copyDictionary.c1fc9ce8a4a497017, icon: 'heart', group: copyDictionary.ccae46091d8d30468 },
    { id: 'suction-device', label: copyDictionary.c8fcc1b79d5cf52eb, icon: 'oxygen', group: copyDictionary.ccae46091d8d30468 },
];
export function deviceGroup(type: DeviceType) {
    if (type.startsWith('custom:'))
        return copyDictionary.c4eafa9e925b30bcd;
    return extraEquipment.find((item) => item.id === type)?.group ?? ({ wheelchair: copyDictionary.c0b6a9276a29608b9, cane: copyDictionary.c5a3d443a19f57d05, 'hearing-aid': copyDictionary.ce0288aa11ea1cdfb, oxygen: copyDictionary.ccae46091d8d30468, pump: copyDictionary.ccae46091d8d30468 }[type] || copyDictionary.cd2909f1647e7c891);
}
export function normalizeLabel(text: string) { return text.trim().replace(/\s+/gu, ' '); }
export function makeCustomId(label: string) { return 'custom:' + normalizeLabel(label); }
export function catalogDevice(type: DeviceType, label: string): Device {
    return { id: 'catalog:' + type, type, name: label, battery: '', dimensions: '', weight: '', source: 'manual' };
}
export const shoppingPlatforms = [
    { id: 'jd', label: copyDictionary.c81baf57e05f11276, domain: 'search.jd.com', url: 'https://search.jd.com/Search', parameter: 'keyword' },
    { id: 'taobao', label: copyDictionary.cda14d8f7500f7e61, domain: 's.taobao.com', url: 'https://s.taobao.com/search', parameter: 'q' },
    { id: 'tmall', label: copyDictionary.c650d7bcacd9b4ddb, domain: 'list.tmall.com', url: 'https://list.tmall.com/search_product.htm', parameter: 'q' },
] as const;
export function shoppingUrl(platform: typeof shoppingPlatforms[number], query: string): string {
    const url = new URL(platform.url);
    url.searchParams.set(platform.parameter, query.trim());
    if (platform.id === 'jd')
        url.searchParams.set('enc', 'utf-8');
    return url.toString();
}
