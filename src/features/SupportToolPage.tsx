import { copyDictionary } from "../app/copyDictionary.ts";
import { lazy, Suspense, type Dispatch, type SetStateAction } from 'react';
import { PageHeader } from '../components/UI';
import { supportTools, type SupportToolId } from '../app/supportCatalog';
import { DailyAssistance } from './DailyAssistance';
import { Magnifier } from './support/Magnifier';
import { VisionReader } from './support/VisionReader';
import { Reminders } from './support/Reminders';
import type { LifeData } from '../app/types';
const Gestures = lazy(() => import('./support/Gestures'));
export function SupportToolPage({ tool, life, setLife, saved, onBack, onPrivacy, onHelp }: {
    tool: SupportToolId;
    life: LifeData;
    setLife: Dispatch<SetStateAction<LifeData>>;
    saved: boolean;
    onBack: () => void;
    onPrivacy: () => void;
    onHelp: () => void;
}) {
    const item = supportTools.find(item => item.id === tool)!;
    return <section className="screen support-tool-page"><PageHeader title={item.title} subtitle={item.detail} onBack={onBack}/>{['color', 'communication', 'steps'].includes(tool) && <DailyAssistance key={tool} life={life} setLife={setLife} saved={saved} onPrivacy={onPrivacy} onHelp={onHelp} tool={tool === 'color' ? 'camera' : tool === 'steps' ? 'steps' : 'talk'} onExit={onBack}/>} {tool === 'vision' && <VisionReader />}{tool === 'magnifier' && <Magnifier />}{tool === 'reminders' && <Reminders life={life} setLife={setLife} saved={saved}/>} {tool === 'gestures' && <Suspense fallback={<p role="status">{copyDictionary.ce92efd6a36300ba8}</p>}><Gestures life={life} setLife={setLife}/></Suspense>}</section>;
}
