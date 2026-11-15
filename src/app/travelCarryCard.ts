import { copyDictionary } from "./copyDictionary.ts";
import { getTravelMeta } from './catalog.ts';
import type { TravelTaskPlan } from './travelTaskTypes';
import { allTravelActions } from './travelTaskTypes.ts';
import { requiresTravelDimensions, requiresTravelBattery } from './travelCompleteness.ts';
export interface TravelCarryDevice {
    name: string;
    dimensions: string;
    weight: string;
    battery: string;
}
export interface TravelCarryCardContent {
    completionStatement: string;
    title: string;
    itinerary: string;
    date: string;
    mode: string;
    generatedAt: string;
    summary: string;
    nextStep: string;
    devices: TravelCarryDevice[];
    contacts: {
        name: string;
        phone: string;
    }[];
    notice: string;
}
export interface TravelCarryImage {
    blob: Blob;
    width: number;
    height: number;
    page: number;
    pages: number;
}
const readable = (value: string | undefined, fallback: string) => value && !/（?(未选择|待填写|暂未)/u.test(value) ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim() || fallback : fallback;
const measurement = (value: number | undefined, unit: string) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? `${value} ${unit}` : copyDictionary.cd5c29499c6c824a3;
/** A local projection of the selected travel task only; no health profile or contact book is read. */
export function travelCarryCardContent(plan: TravelTaskPlan): TravelCarryCardContent {
    const date = plan.route.date && /^\d{4}-\d{2}-\d{2}$/.test(plan.route.date) ? plan.route.date : '';
    const generated = Date.parse(plan.generatedAt);
    const firstAction = allTravelActions(plan)[0];
    const from = readable(plan.route.from, ''), to = readable(plan.route.to, '');
    return {
        completionStatement: plan.completion?.statement ?? copyDictionary.c2d01d1551e745809,
        title: plan.readiness === 'preparation' ? copyDictionary.c5ae756ac7cd080b2 : copyDictionary.cfcdd2df42a7e0bba,
        itinerary: from && to ? `${from} → ${to}` : from || to || copyDictionary.cb8552f1fb6ca9553,
        date,
        mode: readable(getTravelMeta(plan.mode).label, copyDictionary.c927fd4fbfce64728),
        generatedAt: Number.isFinite(generated) ? new Date(generated).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : copyDictionary.cba9c4bee89d87437,
        summary: readable(plan.summary, copyDictionary.c945a168725a102a4),
        nextStep: firstAction ? `${firstAction.title}：${firstAction.detail}` : copyDictionary.c702c54126e5950b9,
        devices: plan.devices.map(device => {
            if (device.type === 'guide-dog')
                return { name: readable(device.name, copyDictionary.c0da044a91e7376dd), dimensions: copyDictionary.c82011c117b36c8de, weight: copyDictionary.c2746d995801b1cc8, battery: copyDictionary.c8c065d11a848dc94 };
            const specs = device.specs;
            const battery = ({ none: copyDictionary.c5f156bb8909c0967, lithium: copyDictionary.c0cad03728e492a1a, other: copyDictionary.c417bdbecdc24f0d5, unknown: copyDictionary.ce3c65efc09d600c1 } as const)[specs.batteryType ?? 'unknown'];
            const energy = typeof specs.batteryWh === 'number' && Number.isFinite(specs.batteryWh) && specs.batteryWh > 0 ? `；${specs.batteryWh} Wh` : '';
            const removable = specs.removable === 'yes' ? copyDictionary.c4b6c78374708fd86 : specs.removable === 'no' ? copyDictionary.cf5b9e226c0a18b2c : '';
            return {
                name: readable(device.name, copyDictionary.c9bc4cb429bcb1cf8),
                dimensions: !requiresTravelDimensions(device.type) && !specs.lengthCm && !specs.widthCm && !specs.heightCm ? copyDictionary.cff61cf4045a96e5f : copyDictionary.c6d4acbc0ee021816 + measurement(specs.lengthCm, 'cm') + copyDictionary.c864c32a877bd60ca + measurement(specs.widthCm, 'cm') + copyDictionary.cf3ad162479d3b55f + measurement(specs.heightCm, 'cm'),
                weight: measurement(specs.weightKg, 'kg'),
                battery: !requiresTravelBattery(device.type) && !specs.batteryType ? copyDictionary.c42db56fadda087d2 : battery + energy + removable,
            };
        }),
        contacts: plan.contacts.filter(contact => /^\+?[\d\s-]{3,24}$/.test(contact.phone.trim())).map(contact => ({ name: readable(contact.name, copyDictionary.c23d32ee58cad735b), phone: contact.phone.replace(/\s/g, '') })),
        notice: copyDictionary.c2ccabfddcfe0eb2a,
    };
}
/** Character wrapping supports Chinese text without depending on remote fonts. */
export function wrapCarryCardText(value: string, maxWidth: number, measure: (text: string) => number): string[] {
    if (!(maxWidth > 0))
        throw new Error(copyDictionary.c0d99218bf5056679);
    const result: string[] = [];
    for (const paragraph of value.split(/\r?\n/)) {
        let line = '';
        const tokens = paragraph.match(/\d+(?:\.\d+)?[ \u00a0]*(?:cm|kg|Wh)\b|[A-Za-z0-9]+(?:[-:./+][A-Za-z0-9]+)*|[\s\S]/gu) ?? [];
        for (const token of tokens) {
            // Keep dates and number/unit pairs together whenever they fit a whole row.
            for (const piece of measure(token) > maxWidth ? Array.from(token) : [token]) {
                if (line && measure(line + piece) > maxWidth) {
                    result.push(line);
                    line = piece;
                }
                else
                    line += piece;
            }
        }
        result.push(line);
    }
    return result;
}
export type TravelCarryCardRow = {
    text: string;
    kind: 'section' | 'body' | 'notice' | 'phone';
};
export function travelCarryCardRows(content: TravelCarryCardContent): TravelCarryCardRow[] {
    const rows: TravelCarryCardRow[] = [];
    const section = (title: string, values: string[]) => { rows.push({ text: title, kind: 'section' }, ...values.map(text => ({ text, kind: 'body' as const }))); };
    section(copyDictionary.cb2506d44d63b60a8, [content.completionStatement]);
    section(copyDictionary.cdb53413b7098773c, [content.itinerary, [content.date, content.mode].filter(Boolean).join(' · ')]);
    section(copyDictionary.c5505f0891e2c56b8, content.devices.length ? content.devices.flatMap((device, index) => [`${index + 1}. ${device.name}`, copyDictionary.c405ba2980ba14c3b + device.dimensions, copyDictionary.c162355cf007f0c6c + device.weight, copyDictionary.ca2938c7b9b27809d + device.battery]) : [copyDictionary.cfa1c89b74cd625a6]);
    section(copyDictionary.c8a83944de68e48e7, [content.summary, content.nextStep]);
    rows.push({ text: copyDictionary.cbab649031dae5f43, kind: 'section' });
    if (content.contacts.length)
        for (const contact of content.contacts)
            rows.push({ text: contact.name, kind: 'body' }, { text: contact.phone, kind: 'phone' });
    else
        rows.push({ text: copyDictionary.c82a78637052453f6, kind: 'body' });
    rows.push({ text: content.notice, kind: 'notice' }, { text: copyDictionary.cd5a4499896c6a27d + content.generatedAt, kind: 'notice' });
    return rows;
}
/** Generates PNG pages locally. Long multi-device plans are paged instead of clipping details. */
export async function createTravelCarryCard(plan: TravelTaskPlan): Promise<TravelCarryImage[]> {
    if (typeof document === 'undefined')
        throw new Error(copyDictionary.c75588504eb36c864);
    const content = travelCarryCardContent(plan);
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    if (!context)
        throw new Error(copyDictionary.c7246138da809af89);
    const width = 1080, padding = 64, textWidth = width - padding * 2;
    const family = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';
    context.font = `400 42px ${family}`;
    const coverageLines = wrapCarryCardText(content.completionStatement, textWidth, text => context.measureText(text).width);
    const coverageHeight = coverageLines.length * 70 + 24;
    const lines = travelCarryCardRows(content).slice(2).flatMap(row => {
        const fontSize = row.kind === 'phone' ? 56 : row.kind === 'section' ? 48 : row.kind === 'notice' ? 40 : 46;
        context.font = `${row.kind === 'section' ? '700' : '400'} ${fontSize}px ${family}`;
        // Phone numbers occupy their own row and never pass through character wrapping.
        const wrapped = row.kind === 'phone' ? [row.text] : wrapCarryCardText(row.text, textWidth, text => context.measureText(text).width);
        return wrapped.map((text, index) => ({ text, fontSize, kind: row.kind, gap: index === 0 ? row.kind === 'section' ? 38 : 8 : 0, lineHeight: Math.ceil(fontSize * 1.65) }));
    });
    const pages: typeof lines[] = [], headerHeight = 230 + coverageHeight, footerHeight = 80, maxHeight = 12000;
    let current: typeof lines = [], height = headerHeight + footerHeight;
    for (const line of lines) {
        const nextHeight = line.gap + line.lineHeight;
        if (current.length && height + nextHeight > maxHeight) {
            pages.push(current);
            current = [];
            height = headerHeight + footerHeight;
        }
        current.push(line);
        height += nextHeight;
    }
    if (current.length)
        pages.push(current);
    const images: TravelCarryImage[] = [];
    for (const [index, page] of pages.entries()) {
        canvas.width = width;
        canvas.height = Math.ceil(headerHeight + footerHeight + page.reduce((sum, line) => sum + line.gap + line.lineHeight, 0));
        context.fillStyle = '#fffef8';
        context.fillRect(0, 0, width, canvas.height);
        context.fillStyle = '#214d38';
        context.fillRect(0, 0, width, 14);
        context.textBaseline = 'top';
        context.fillStyle = '#214d38';
        context.font = `700 38px ${family}`;
        context.fillText(copyDictionary.c4ec7c5b9618b5554, padding, 48);
        context.font = `700 64px ${family}`;
        context.fillText(content.title, padding, 108);
        context.font = `400 30px ${family}`;
        context.textAlign = 'right';
        context.fillText(`${index + 1} / ${pages.length}`, width - padding, 58);
        context.textAlign = 'left';
        context.fillStyle = plan.completion?.locked ? '#f8efcf' : '#edf4e8';
        context.fillRect(padding - 16, 200, textWidth + 32, coverageHeight);
        context.fillStyle = '#193c2c';
        context.font = `400 42px ${family}`;
        coverageLines.forEach((text, line) => context.fillText(text, padding, 214 + line * 70));
        let y = headerHeight;
        for (const line of page) {
            y += line.gap;
            context.font = `${line.kind === 'section' ? '700' : '400'} ${line.fontSize}px ${family}`;
            context.fillStyle = line.kind === 'notice' ? '#46594d' : line.kind === 'section' ? '#214d38' : '#193c2c';
            context.fillText(line.text, padding, y);
            y += line.lineHeight;
        }
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error(copyDictionary.c0fda43dcb8d085e9)), 'image/png'));
        images.push({ blob, width, height: canvas.height, page: index + 1, pages: pages.length });
    }
    return images;
}
export function carryCardFileName(plan: TravelTaskPlan, page = 1, pages = 1): string {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(plan.route.date) ? plan.route.date : copyDictionary.cdb53413b7098773c;
    return copyDictionary.c5c9433296f7e3a59 + date + (pages > 1 ? copyDictionary.c3973e022e93220f9 + page + copyDictionary.c76e547a8fa546381 + pages + copyDictionary.cf56a049fcc23f1eb : '') + copyDictionary.cb98b801d8acac8de;
}
