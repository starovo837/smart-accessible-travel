import { copyDictionary } from "./copyDictionary.ts";
import type { ModuleId } from './types';
import type { IconName } from '../components/Icons';
export type SupportToolId = import('./livingCatalog').ServiceToolId | 'learning' | 'vision' | 'magnifier' | 'color' | 'communication' | 'gestures' | 'steps' | 'reminders' | 'help' | 'life' | 'needs';
export interface SupportTool {
    id: SupportToolId;
    title: string;
    detail: string;
    icon: IconName;
    modules: ModuleId[];
}
export const supportTools: SupportTool[] = [
    { id: 'learning', title: copyDictionary.learningTitle, detail: copyDictionary.learningPreview, icon: 'book-open', modules: ['vision', 'hearing', 'speech', 'mobility', 'cognitive', 'chronic'] },
    { id: 'vision', title: copyDictionary.c2f534997d0b0b0d8, detail: copyDictionary.c39932035fd35ea60, icon: 'camera', modules: ['vision', 'cognitive'] },
    { id: 'magnifier', title: copyDictionary.ca1f29d646a56b87b, detail: copyDictionary.c962446aa5270a702, icon: 'search', modules: ['vision'] },
    { id: 'color', title: copyDictionary.c1457cad0d6757fd5, detail: copyDictionary.c9bbcc0f36fbaedbc, icon: 'eye', modules: ['vision'] },
    { id: 'communication', title: copyDictionary.c6eed2d68c9586086, detail: copyDictionary.c9f66a08ccf10bc61, icon: 'message', modules: ['speech', 'hearing'] },
    { id: 'gestures', title: copyDictionary.ce45bece0df096500, detail: copyDictionary.c44a7e35dbd9d1133, icon: 'hand', modules: ['speech', 'hearing', 'mobility'] },
    { id: 'steps', title: copyDictionary.c30db6518cc83b35c, detail: copyDictionary.c79ddf5007cee8b28, icon: 'steps', modules: ['cognitive', 'chronic'] },
    { id: 'reminders', title: copyDictionary.c1e62871756675e44, detail: copyDictionary.c5acdf97f11ea320f, icon: 'clock', modules: ['chronic', 'cognitive'] },
    { id: 'help', title: copyDictionary.c4fc7ab4c3e81817c, detail: copyDictionary.cc6be511a66b12e7c, icon: 'heart', modules: ['speech', 'hearing', 'mobility', 'vision'] },
    { id: 'life', title: copyDictionary.c3e4e79cd3ac5e3ed, detail: copyDictionary.c4c70a723d8a76e10, icon: 'list', modules: ['mobility', 'chronic'] },
    { id: 'places', title: copyDictionary.c3d50b3ab7aacd41a, detail: copyDictionary.c8a9846a8e07cf9ad, icon: 'search', modules: ['mobility', 'vision'] },
    { id: 'healthcare', title: copyDictionary.ca8d199a7c34d4375, detail: copyDictionary.c142ba31193aaa3da, icon: 'heart', modules: ['chronic', 'mobility', 'hearing', 'speech'] },
    { id: 'live-help', title: copyDictionary.cc1ec5e0e6d50e455, detail: copyDictionary.c34b0982b3e76213a, icon: 'message', modules: ['vision', 'hearing', 'mobility', 'speech', 'cognitive', 'chronic'] },
    { id: 'benefits', title: copyDictionary.c9dd05cc784dff794, detail: copyDictionary.c7103864c5b9a134b, icon: 'list', modules: ['chronic', 'mobility'] },
    { id: 'equipment-service', title: copyDictionary.cb09d86198686f906, detail: copyDictionary.ce41c422e1e6547f5, icon: 'wheelchair', modules: ['vision', 'hearing', 'mobility'] },
    { id: 'digital-help', title: copyDictionary.caf3c7af0813d88f3, detail: copyDictionary.c59366077691d1182, icon: 'eye', modules: ['vision', 'cognitive'] },
    { id: 'home-connect', title: copyDictionary.ceac541e16c60e136, detail: copyDictionary.c336df8c0623e2594, icon: 'volume', modules: ['hearing', 'mobility'] },
    { id: 'participation', title: copyDictionary.c48f6e75b706dee26, detail: copyDictionary.cda0a2034997de798, icon: 'user', modules: ['hearing', 'speech', 'cognitive', 'mobility'] },
    { id: 'needs', title: copyDictionary.ce3cfc200b1a14615, detail: copyDictionary.cbe290b24aeea5b56, icon: 'settings', modules: ['vision', 'mobility', 'cognitive'] }
];
export function recommendedTools(modules: ModuleId[]) {
    const ids = [...new Set(modules)].filter(id => ['vision', 'hearing', 'mobility', 'speech', 'cognitive', 'chronic'].includes(id));
    if (!ids.length)
        return supportTools.filter(tool => ['communication', 'steps', 'help'].includes(tool.id));
    const primary: Record<ModuleId, SupportToolId> = { vision: 'vision', hearing: 'communication', mobility: 'equipment-service', speech: 'communication', cognitive: 'steps', chronic: 'reminders' };
    const first = [...new Set(ids.map(id => primary[id]))].map(id => supportTools.find(tool => tool.id === id)!), rest = supportTools.map((tool, order) => ({ tool, score: tool.modules.filter(id => ids.includes(id)).length, order })).filter(row => row.score > 0 && !first.some(tool => tool.id === row.tool.id)).sort((a, b) => b.score - a.score || a.order - b.order).map(row => row.tool);
    return [...first, ...rest];
}
export const gestureOptions = [
    { id: 'Open_Palm', name: copyDictionary.c91426114939a903f, hint: copyDictionary.c39e9044ce06717e9, phrase: copyDictionary.cf4b42725fbe9d98a },
    { id: 'Closed_Fist', name: copyDictionary.cdb510b94a0a1e5cc, hint: copyDictionary.cacd145f618273c79, phrase: copyDictionary.c1412b59b41db7bb1 },
    { id: 'Pointing_Up', name: copyDictionary.c6d07b5c5952e0793, hint: copyDictionary.c602ab272f9e59613, phrase: copyDictionary.c0ee61b222feabb34 },
    { id: 'Thumb_Up', name: copyDictionary.c0604bd1ceebae38e, hint: copyDictionary.c9851f44fb35d3bf1, phrase: copyDictionary.c2377dffeecfdc44b },
    { id: 'Thumb_Down', name: copyDictionary.c78c6f12fb08128ba, hint: copyDictionary.c8c7a6851305d8382, phrase: copyDictionary.c3381700002b9ccd2 },
    { id: 'Victory', name: copyDictionary.c63a074812afd472a, hint: copyDictionary.ca971accb27319778, phrase: copyDictionary.cf574afd3b3123a93 },
    { id: 'ILoveYou', name: copyDictionary.c411124cbe26b57c5, hint: copyDictionary.c5dfb23a026c7303a, phrase: copyDictionary.c1ef8a6395fa568f3 }
] as const;
export function confirmedGesture(category: string, score: number, consecutive: number) { return score >= .7 && consecutive >= 3 ? gestureOptions.find(option => option.id === category) : undefined; }
export interface DailyReminder {
    id: string;
    title: string;
    dueAt: string;
    done: boolean;
    note: string;
}
export function dueReminders(rows: DailyReminder[], now = Date.now()) { return rows.filter(row => !row.done && row.title.trim() && Number.isFinite(Date.parse(row.dueAt)) && Date.parse(row.dueAt) <= now); }
