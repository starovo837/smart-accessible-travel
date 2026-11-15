import { copyDictionary } from "./copyDictionary.ts";
import type { CardField, Device, DeviceCard, FieldEvidence, JourneyData, LivingProfile, LocalShare, OfflinePacket, ProductAnalysis, TravelDeviceSpecs } from './types';
export const fieldLabels: Record<CardField, string> = {
    lengthCm: copyDictionary.c3a592cee8d3f0c05, widthCm: copyDictionary.c2ebf6e1616732254, heightCm: copyDictionary.c2bec041336da3f26, weightKg: copyDictionary.c0939e081280f022c,
    foldLengthCm: copyDictionary.c49cdd2d88bdb85ea, foldWidthCm: copyDictionary.cea0bdf5ad3586095, foldHeightCm: copyDictionary.ce0b5f28c3b8f9a1e,
    batteryWh: copyDictionary.c9e42f5952acf95f5, batteryType: copyDictionary.ccc64d927855b9fde, removable: copyDictionary.c4be862ee5fc50de2, batteryCount: copyDictionary.cc0c73dc664361a97,
};
export const originLabels: Record<FieldEvidence['origin'], string> = { merchant: copyDictionary.cffb531b16fc798cf, plate: copyDictionary.c2bc413f7ee4ced05, measurement: copyDictionary.cab8f7e84918500c3, reply: copyDictionary.c5a7fbd07e26f0516 };
export function formatCardValue(field: CardField, value?: string) {
    if (!value)
        return copyDictionary.c64747fab2c8f817d;
    if (field === 'batteryType')
        return ({ none: copyDictionary.caf0bea91f489b74c, lithium: copyDictionary.c0cad03728e492a1a, other: copyDictionary.c417bdbecdc24f0d5, unknown: copyDictionary.ca8b0bd9c65f7fad5 } as Record<string, string>)[value] ?? value;
    if (field === 'removable')
        return ({ yes: copyDictionary.c18fbe3aef725614b, no: copyDictionary.cb98f332026c596bb, unknown: copyDictionary.ca8b0bd9c65f7fad5 } as Record<string, string>)[value] ?? value;
    return value;
}
export function initialJourney(): JourneyData { return { cards: [], living: { canFold: 'unknown', usualModes: ['rail'] }, comparisons: [], records: [], packet: null, shares: [], life: { home: { lighting: 'unknown', alarm: 'unknown' }, daily: { energy: 'good', pain: 'none', companion: false, note: '' }, routes: [], care: [], emergency: { helpText: copyDictionary.c93d418488d0d5ac4, caregiver: '', phone: '', showMedical: false, offlineReady: false }, caregiverHelp: false } }; }
export function productCard(product: ProductAnalysis): DeviceCard {
    const values = { lengthCm: String(product.length), widthCm: String(product.width), weightKg: String(product.weight) };
    return { id: 'card-' + product.id, type: 'wheelchair', name: product.title, battery: '', dimensions: `${product.length} × ${product.width} × ? cm`, weight: product.weight + ' kg', source: 'manual', prospective: true, productId: product.id, values, evidence: Object.fromEntries(Object.keys(values).map(field => [field, { origin: 'merchant', confirmed: false, note: copyDictionary.cf816f128f649152d }])) };
}
export function deviceCard(device: Device): DeviceCard {
    const values: DeviceCard['values'] = {};
    const dims = device.dimensions.match(/(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)/);
    if (dims) {
        values.lengthCm = dims[1];
        values.widthCm = dims[2];
        values.heightCm = dims[3];
    }
    const weight = device.weight.match(/(\d+(?:\.\d+)?)\s*kg/i);
    if (weight)
        values.weightKg = weight[1];
    if (device.battery === copyDictionary.c484d55613910eb8c)
        values.batteryType = 'none';
    return { ...device, prospective: false, values, evidence: Object.fromEntries(Object.keys(values).map(field => [field, { origin: device.source === 'plate' ? 'plate' : 'measurement', confirmed: device.source !== 'plate', note: device.source === 'plate' ? copyDictionary.c6dde0037aa5ea19c : copyDictionary.c050b1a3fd1a05565 }])) };
}
export function validCard(card: DeviceCard) {
    return Object.entries(card.values).every(([field, value]) => !value || (field === 'batteryCount' ? ['1', '2'].includes(value) : field === 'batteryType' ? ['none', 'lithium', 'other', 'unknown'].includes(value) : field === 'removable' ? ['yes', 'no', 'unknown'].includes(value) : Number.isFinite(Number(value)) && Number(value) > 0)) && Boolean(card.name.trim());
}
export function confirmedSpecs(card: DeviceCard): TravelDeviceSpecs {
    const get = (field: CardField) => card.evidence[field]?.confirmed ? card.values[field] : undefined;
    const num = (field: CardField) => get(field) && Number(get(field)) > 0 ? Number(get(field)) : undefined;
    const folded = card.transportState !== 'use' && ['foldLengthCm', 'foldWidthCm', 'foldHeightCm'].every(field => num(field as CardField) !== undefined);
    return { lengthCm: num(folded ? 'foldLengthCm' : 'lengthCm'), widthCm: num(folded ? 'foldWidthCm' : 'widthCm'), heightCm: num(folded ? 'foldHeightCm' : 'heightCm'), weightKg: num('weightKg'), folded: folded ? 'yes' : 'unknown', batteryWh: num('batteryWh'), batteryType: (get('batteryType') ?? 'unknown') as TravelDeviceSpecs['batteryType'], removable: (get('removable') ?? 'unknown') as TravelDeviceSpecs['removable'], batteryCount: num('batteryCount') as 1 | 2 | undefined };
}
export function rememberTravelSpecs(card: DeviceCard, specs: TravelDeviceSpecs): DeviceCard {
    const values = { ...card.values }, evidence = { ...card.evidence };
    for (const field of ['lengthCm', 'widthCm', 'heightCm', 'weightKg', 'batteryWh', 'batteryType', 'removable', 'batteryCount'] as const) {
        const key: CardField = specs.folded === 'yes' && ['lengthCm', 'widthCm', 'heightCm'].includes(field) ? ('fold' + field[0].toUpperCase() + field.slice(1)) as CardField : field;
        const value = specs[field];
        if (value === undefined || value === 'unknown') {
            delete values[key];
            delete evidence[key];
            continue;
        }
        values[key] = String(value);
        evidence[key] = { origin: 'measurement', confirmed: true, note: copyDictionary.cf6de573332ee95bd };
    }
    return { ...card, values, evidence, transportState: specs.folded === 'yes' ? 'folded' : 'use' };
}
export function missingCardFields(card: DeviceCard) { return (Object.keys(fieldLabels) as CardField[]).filter(field => !card.values[field] || !card.evidence[field]?.confirmed); }
export function merchantQuestion(card: DeviceCard) {
    const fields = missingCardFields(card).map(field => fieldLabels[field]).join('、');
    return copyDictionary.cb34ae1ca02df87f1 + card.name + copyDictionary.cf83d0cba94c67fbf + (fields || copyDictionary.c70d099e0a3b604be) + copyDictionary.c4d41b0edd6da1b5a;
}
export function extractReply(text: string): DeviceCard['values'] {
    const values: DeviceCard['values'] = {};
    for (const [prefix, fields] of [[copyDictionary.c84a07f292f1f78cc, ['foldLengthCm', 'foldWidthCm', 'foldHeightCm']], [copyDictionary.ccdfd0b34e4918648, ['lengthCm', 'widthCm', 'heightCm']]] as const) {
        const match = text.match(new RegExp(prefix + copyDictionary.c24fd8853dcccfc00, 'i'));
        if (match)
            fields.forEach((field, index) => { if (Number(match[index + 1]) > 0)
                values[field] = match[index + 1]; });
    }
    const weight = text.match(/(?:重量|重)\s*[：:]?\s*(\d+(?:\.\d+)?)\s*(?:kg|千克|公斤)/i);
    const wh = text.match(/(?:电池|容量|额定能量|每块电池)(?:容量)?\s*[：:]?\s*(\d+(?:\.\d+)?)\s*Wh/i);
    if (weight && Number(weight[1]) > 0)
        values.weightKg = weight[1];
    if (wh && Number(wh[1]) > 0)
        values.batteryWh = wh[1];
    if (/非锂电池/.test(text))
        values.batteryType = 'other';
    else if (/锂电池/.test(text))
        values.batteryType = 'lithium';
    if (/无电池|没有电池/.test(text))
        values.batteryType = 'none';
    if (/电池(?:不可拆卸|不可拆下|不能拆)/.test(text))
        values.removable = 'no';
    else if (/电池(?:可拆卸|可以拆下|可拆下)/.test(text))
        values.removable = 'yes';
    return values;
}
export function livingChecks(card: DeviceCard, home: LivingProfile): {
    label: string;
    detail: string;
    tone: 'good' | 'warn' | 'danger';
}[] {
    const result: ReturnType<typeof livingChecks> = [];
    const verified = (field: CardField) => card.evidence[field]?.confirmed && Number(card.values[field]) > 0 ? Number(card.values[field]) : undefined;
    const width = verified('widthCm'), length = verified('lengthCm'), weight = verified('weightKg');
    const checkWidth = (label: string, opening?: number) => {
        if (!opening || !width)
            result.push({ label, detail: copyDictionary.c846c79bcbe73e515, tone: 'warn' });
        else
            result.push({ label, detail: width > opening ? copyDictionary.c12ae1346ba64693e + width + copyDictionary.cfcb73eb7484ec238 + opening + copyDictionary.c27da6b5b4e254d9b : copyDictionary.c1f759ea9ae82e82e + +(opening - width).toFixed(2) + copyDictionary.c7ad9eee135cbc1e4, tone: width > opening ? 'danger' : 'good' });
    };
    checkWidth(copyDictionary.c2d88d6d8caa7db20, home.doorCm);
    checkWidth(copyDictionary.c95ddd9ef903d7487, home.elevatorDoorCm);
    if (!length || !width || !home.elevatorLengthCm || !home.elevatorWidthCm)
        result.push({ label: copyDictionary.c3d725e961b63cd4e, detail: copyDictionary.c26cf4462cac0d8c5, tone: 'warn' });
    else {
        const fits = length <= home.elevatorLengthCm && width <= home.elevatorWidthCm;
        result.push({ label: copyDictionary.c3d725e961b63cd4e, detail: fits ? copyDictionary.cfba1ba4d228ce2ce : copyDictionary.cb6f4d4f6a36cfccb, tone: fits ? 'good' : 'danger' });
    }
    result.push({ label: copyDictionary.c28e7ec2b3f6b3c27, detail: !weight || !home.liftKg ? copyDictionary.c2148d0b3237011f7 : weight > home.liftKg ? copyDictionary.caacf07d9e32a4888 + weight + copyDictionary.c6a1224679bc8dc42 + home.liftKg + copyDictionary.cbd9ddbfc040a45d3 : copyDictionary.ceccffb82506d6f3a, tone: weight && home.liftKg && weight > home.liftKg ? 'danger' : 'warn' });
    result.push({ label: copyDictionary.ca06d8f8a2fab57b2, detail: home.canFold === 'no' ? copyDictionary.c8a59dfb7f7966032 : copyDictionary.c15c3bc828fe7ccbc, tone: 'warn' });
    return result;
}
export function tripSignature(mode: string, carrier: string, devices: Device[], specs: Record<string, TravelDeviceSpecs>, context: object = {}) { return JSON.stringify({ mode, carrier, devices: devices.map(d => ({ id: d.id, type: d.type, name: d.name })), specs, context }); }
export function shareStatus(share: LocalShare, now = Date.now()) { return share.revoked ? copyDictionary.cfef96e34f77b742b : now >= share.expiresAt ? copyDictionary.cb9d8853e0ce7e6ea : copyDictionary.c11afd2a534395b18; }
export function sharePayload(packet: OfflinePacket, share: LocalShare, now = Date.now()) { if (shareStatus(share, now) !== copyDictionary.c11afd2a534395b18)
    return null; return { devices: share.scopes.includes('devices') ? packet.cards : undefined, records: share.scopes.includes('records') ? packet.records : undefined, checklist: share.scopes.includes('checklist') ? packet.checklist : undefined }; }
const esc = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export function packetHtml(packet: OfflinePacket) {
    const block = (title: string, body: string) => `<section><h2>${esc(title)}</h2><pre>${esc(body)}</pre></section>`;
    const cards = packet.cards.map(card => card.name + '\n' + Object.entries(card.values).map(([field, value]) => `${fieldLabels[field as CardField]}：${formatCardValue(field as CardField, value)}（${card.evidence[field as CardField]?.confirmed ? copyDictionary.ccaa1c5cf56ea027e : copyDictionary.ca8b0bd9c65f7fad5}）`).join('\n')).join('\n\n');
    const life = packet.life;
    const servicesText = life?.services ? [
        copyDictionary.c37bd12e8f048e1f1,
        ...life.services.facilities.map(row => copyDictionary.ce3b0c44298fc1c14 + row.name + copyDictionary.c005e1574a2b5c816 + row.address + copyDictionary.c8aa2fb4a12d06736 + (row.doorCm ?? copyDictionary.cccf9206892f889b7) + copyDictionary.c5c17dc2569a74b49 + (row.steps === 'none' ? copyDictionary.cd7eb4ee49f368301 : row.steps === 'present' ? copyDictionary.c7518f16ee5c5d85a : copyDictionary.cccf9206892f889b7) + copyDictionary.c284a7c7d71f0bddc + (row.elevator === 'working' ? copyDictionary.c5526f457bc9bcb25 : row.elevator === 'unavailable' ? copyDictionary.c5f131fd4873d0885 : copyDictionary.cccf9206892f889b7) + copyDictionary.c0c72aa33e7b3ca5e + (row.source || copyDictionary.c64747fab2c8f817d) + copyDictionary.cdce2a09a2618275a + (row.checkedAt || copyDictionary.c64747fab2c8f817d) + copyDictionary.c01ba4719c80b6fe9 + row.notes),
        copyDictionary.cdbfe29b1e7b47aa0,
        ...life.services.cases.map(row => copyDictionary.ce3b0c44298fc1c14 + row.title + copyDictionary.c005e1574a2b5c816 + row.region + copyDictionary.c005e1574a2b5c816 + row.date + copyDictionary.cf82117f2df290af2 + row.needs + copyDictionary.c01ba4719c80b6fe9 + row.materials.map(item => (item.checked ? '☑ ' : '☐ ') + item.label).join('\n') + copyDictionary.c6379beeedd33e64c + (row.confirmation ? row.confirmation.source + ' / ' + row.confirmation.reference : copyDictionary.c1e6cf9a3e424ee1f)),
        copyDictionary.c0fdcd090f954e23e,
        ...life.services.digitalTasks.map(row => copyDictionary.ce3b0c44298fc1c14 + row.title + copyDictionary.c33d1e0a8a8d67a21 + (row.deadline || copyDictionary.c64747fab2c8f817d) + copyDictionary.c01ba4719c80b6fe9 + row.steps.map(item => (item.checked ? '☑ ' : '☐ ') + item.label).join('\n')),
        copyDictionary.cc0b9876f18ff64ba,
        ...life.services.homeConnections.map(row => copyDictionary.ce3b0c44298fc1c14 + row.name + copyDictionary.c005e1574a2b5c816 + row.brandModel + copyDictionary.c005e1574a2b5c816 + row.event + copyDictionary.c170a3449a08337d2 + (row.compatibilitySource || copyDictionary.cccf9206892f889b7) + copyDictionary.c055816f746ba84c6)
    ].join('\n\n') : copyDictionary.c55035c51002efa40;
    const lifeText = life ? copyDictionary.c5ba380dfc194ca95 + { good: copyDictionary.c5f8bc9f56528d7c8, limited: copyDictionary.c8f9b35cd30ea65f1, rest: copyDictionary.c6f2210dc5e0274f0 }[life.daily.energy] + copyDictionary.cd6c082b43a9875c9 + { none: copyDictionary.c4d75ac7906d9e1ce, mild: copyDictionary.ca95189130f95c846, strong: copyDictionary.ca58caa3977fef1d6 }[life.daily.pain] + copyDictionary.cb0d3c9cfa0e1ef67 + (life.daily.companion ? copyDictionary.cd98a6d5c325bb371 : copyDictionary.cbfb4dca3166009fb) + copyDictionary.c96d0ded38b4311a8 + (life.home.doorCm ?? copyDictionary.c64747fab2c8f817d) + copyDictionary.c3a8314ef42e53eb7 + (life.home.elevatorDoorCm ?? copyDictionary.c64747fab2c8f817d) + copyDictionary.cdbbf59be54b0159b + (life.home.bathroomTurnCm ?? copyDictionary.c64747fab2c8f817d) + copyDictionary.cdd09853739cb1b16 + life.emergency.helpText + copyDictionary.cde7e92db66e75c84 + (life.emergency.caregiver || copyDictionary.c64747fab2c8f817d) + copyDictionary.c36a9e7f1c95b82ff + (life.emergency.phone || '') + copyDictionary.c9f31d3e3709a1b6a + (life.routes.map(route => `${route.from} → ${route.to}：${route.steps.join('；')}`).join('\n') || copyDictionary.ce952ad084e258b26) + copyDictionary.c59181f8e91eb7913 + (life.care.map(item => `${item.title}（${item.status === 'done' ? copyDictionary.cf28461bb49c85647 : copyDictionary.c999a459c3f3f2d16}）`).join('；') || copyDictionary.c0c3abdcfbfc476c4) : copyDictionary.ca27780b445dcd7a9;
    return copyDictionary.ca8a99a4da2efcf3a + esc(packet.savedAt) + copyDictionary.c1fdab5e9e5e2cbb2 + block(copyDictionary.cef10ade07eef44ca, cards) + block(copyDictionary.c7c5569c38a3c03db, packet.results.map(result => result.deviceName + '：' + result.summary + '\n' + (result.handling ?? '') + '\n' + result.evidence).join('\n\n')) + block(copyDictionary.c9d30495755811f16, packet.records.map(record => record.carrier + ' / ' + record.itinerary + ' / ' + record.date + '\n' + record.reply).join('\n\n') || copyDictionary.ccfed7ae469928353) + block(copyDictionary.c9c65ca209134a73e, packet.checklist.map(item => `${item.checked ? '☑' : '☐'} ${item.label}\n${item.detail}`).join('\n')) + block(copyDictionary.c6cae26ec66eeed88, packet.communication) + block(copyDictionary.c8124b5a7f6f471c5, lifeText) + (life ? block(copyDictionary.cb3052b0d64f275f7, servicesText) : '') + copyDictionary.cc3755af938c89071;
}
