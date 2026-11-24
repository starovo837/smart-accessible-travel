import { livingEntries, livingScenes, type SceneId, type ServiceToolId } from './livingCatalog.ts';
import { supportTools, type SupportToolId } from './supportCatalog.ts';
import type { Screen } from './types.ts';

const lifeTasks = ['menu', 'today', 'home', 'routes', 'care', 'family'] as const;
const dailyTools = ['menu', 'camera', 'talk', 'steps'] as const;
export type LifeTask = typeof lifeTasks[number];
export type DailyTool = typeof dailyTools[number];
export type TravelStep = 1 | 2 | 3;

const pagePaths = {
    home: '#home', welcome: '#welcome', select: '#select', consent: '#consent',
    devices: '#devices', 'device-cards': '#device-cards', profile: '#profile',
    'switch-modules': '#switch-modules', about: '#about', 'offline-pack': '#offline',
    'fitting-workspace': '#fitting', 'fit-shopping': '#compare',
    'product-input': '#shop', 'product-result': '#shop', 'travel-result': '#travel-plan',
    assistant: '#assistant', learning: '#learning', support: '#support', 'living-hub': '#services',
} as const satisfies Partial<Record<Screen, string>>;

export type PlainPage = keyof typeof pagePaths;
export type AppPage = { screen: PlainPage }
    | { screen: 'living-scene'; scene: SceneId }
    | { screen: 'living-service'; tool: ServiceToolId }
    | { screen: 'support-tool'; tool: SupportToolId }
    | { screen: 'travel-input'; step: TravelStep }
    | { screen: 'life-tools'; task: LifeTask; tool: DailyTool };

export const homePage: AppPage = { screen: 'home' };
export const lifeMenu = { screen: 'life-tools', task: 'menu', tool: 'menu' } as const satisfies AppPage;

export function pageHash(page: AppPage): string {
    switch (page.screen) {
        case 'living-scene': return '#scene-' + page.scene;
        case 'living-service':
        case 'support-tool': return '#aid-' + page.tool;
        case 'travel-input': return page.step === 1 ? '#travel' : '#travel/step-' + page.step;
        case 'life-tools': return page.task !== 'menu' ? '#daily/' + page.task : page.tool === 'menu' ? '#daily' : '#daily/tool-' + page.tool;
        default: return pagePaths[page.screen];
    }
}

export function pageFromHash(hash: string): AppPage | undefined {
    if (hash === '' || hash === '#') return homePage;
    if (hash === '#travel') return { screen: 'travel-input', step: 1 };
    if (hash === '#travel/step-2') return { screen: 'travel-input', step: 2 };
    if (hash === '#travel/step-3') return { screen: 'travel-input', step: 3 };
    if (hash === '#daily') return lifeMenu;
    const task = lifeTasks.find(value => value !== 'menu' && hash === '#daily/' + value);
    if (task) return { ...lifeMenu, task };
    const dailyTool = dailyTools.find(value => value !== 'menu' && hash === '#daily/tool-' + value);
    if (dailyTool) return { ...lifeMenu, tool: dailyTool };
    if (hash === '#aid-learning') return { screen: 'learning' };
    if (hash === '#aid-voice' || hash === '#aid-captions') return { screen: 'support' };
    const scene = livingScenes.find(item => hash === '#scene-' + item.id);
    if (scene) return { screen: 'living-scene', scene: scene.id };
    const service = livingEntries.find(item => hash === '#aid-' + item.id);
    if (service) return { screen: 'living-service', tool: service.id };
    const support = supportTools.find(item => !['help', 'needs', 'life'].includes(item.id) && hash === '#aid-' + item.id);
    if (support) return { screen: 'support-tool', tool: support.id };
    const page = (Object.keys(pagePaths) as PlainPage[]).find(name => name !== 'product-result' && pagePaths[name] === hash);
    return page ? { screen: page } : undefined;
}

// Links opened on their own still have a safe parent within the app.
export function defaultParent(page: AppPage): AppPage {
    switch (page.screen) {
        case 'living-scene':
        case 'living-service': return { screen: 'living-hub' };
        case 'support-tool': return { screen: 'support' };
        case 'device-cards':
        case 'switch-modules': return { screen: 'profile' };
        case 'product-result':
        case 'fit-shopping': return { screen: 'product-input' };
        case 'travel-result': return { screen: 'travel-input', step: 1 };
        case 'travel-input': return page.step === 3 ? { screen: 'travel-input', step: 2 } : page.step === 2 ? { screen: 'travel-input', step: 1 } : homePage;
        case 'life-tools': return page.task === 'menu' && page.tool === 'menu' ? homePage : lifeMenu;
        case 'select': return { screen: 'welcome' };
        case 'consent': return { screen: 'select' };
        default: return homePage;
    }
}

export function samePage(a: AppPage, b: AppPage) {
    return a.screen === b.screen && pageHash(a) === pageHash(b);
}
