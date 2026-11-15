import { copyDictionary } from "./copyDictionary.ts";
import type { IconName } from '../components/Icons';
import { supportTools, type SupportToolId } from './supportCatalog.ts';
export type WorkbenchTarget = SupportToolId | 'fitting' | 'shop' | 'travel' | 'assistant' | 'profile' | 'devices' | 'choose-needs' | 'offline' | 'about';
export interface WorkbenchItem {
    id: WorkbenchTarget;
    target: WorkbenchTarget;
    label: string;
    description: string;
    icon: IconName;
}
export interface WorkbenchGroup {
    id: string;
    title: string;
    items: WorkbenchItem[];
}
function tool(id: SupportToolId): WorkbenchItem {
    const item = supportTools.find(entry => entry.id === id);
    if (!item)
        throw new Error(copyDictionary.c3f1e1b198c1e71c2 + id);
    return { id, target: id, label: item.title, description: item.detail, icon: item.icon };
}
function action(id: WorkbenchTarget, label: string, icon: IconName, description: string): WorkbenchItem {
    return { id, target: id, label, icon, description };
}
export const workbenchGroups: WorkbenchGroup[] = [
    {
        id: 'equipment-travel', title: copyDictionary.cbd9d87c32f1f239a, items: [
            action('fitting', copyDictionary.cbfc50e32f27a32dc, 'cube', copyDictionary.c699ba7b9e14e22a4),
            action('shop', copyDictionary.c4a98f083f7fe73b2, 'cart', copyDictionary.cd8715d4a85d9a1ab),
            action('travel', copyDictionary.c6e7604f9408c6b81, 'train', copyDictionary.c9318925fb874f0ca),
            tool('equipment-service'),
        ],
    },
    {
        id: 'reading-communication', title: copyDictionary.cf4b9d1a7735fee51, items: [
            tool('vision'), tool('magnifier'), tool('color'), tool('communication'), { ...tool('gestures'), label: copyDictionary.c09efa1fba179a2b2 },
            action('assistant', copyDictionary.c613f4eaa42519a01, 'message', copyDictionary.cd57c981a6337bcf9),
        ],
    },
    {
        id: 'daily-health', title: copyDictionary.c314c313d16f320a0, items: [
            { ...tool('life'), icon: 'home' }, tool('steps'), tool('reminders'),
            { ...tool('healthcare'), icon: 'hospital' }, { ...tool('home-connect'), icon: 'home-connect' },
        ],
    },
    {
        id: 'affairs-participation', title: copyDictionary.c102a9624a5979031, items: [
            { ...tool('benefits'), icon: 'documents' }, { ...tool('digital-help'), icon: 'digital-form' },
            { ...tool('participation'), icon: 'book-open' },
        ],
    },
    {
        id: 'map-help', title: copyDictionary.ca7c20c7d4efe828a, items: [
            { ...tool('places'), icon: 'map-pin' }, tool('help'), { ...tool('live-help'), icon: 'handshake' },
        ],
    },
    {
        id: 'personal-settings', title: copyDictionary.c32d35544298319e0, items: [
            action('profile', copyDictionary.cc3f46556ef6b7d3b, 'user', copyDictionary.c0bd98c40ce79ece3),
            action('devices', copyDictionary.c0542b7f63404edef, 'wheelchair', copyDictionary.c4eb1d3163bd9a058),
            action('choose-needs', copyDictionary.c10ca95dfcc79c12c, 'settings', copyDictionary.c26dab7343136e052),
            tool('needs'),
            action('offline', copyDictionary.c93f004ab9ea94276, 'cube', copyDictionary.c4babe7fa6f7d32f8),
        ],
    },
];
export const workbenchItems = workbenchGroups.flatMap(group => group.items);
