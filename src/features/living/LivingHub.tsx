import { copyDictionary } from "../../app/copyDictionary.ts";
import { PageHeader } from '../../components/UI';
import { Icon, type IconName } from '../../components/Icons';
import { livingEntries, livingScenes, sceneSteps, type SceneId, type ServiceToolId, type SceneStep } from '../../app/livingCatalog';
import { learningResources } from '../../app/learningCatalog';
function LivingOptionIcon({ name }: {
    name: IconName;
}) {
    const warm = ['hospital', 'briefcase', 'documents', 'digital-form'].includes(name);
    return <span className="living-option-icon" data-tone={warm ? 'warm' : 'sage'} aria-hidden="true"><Icon name={name} size={28} strokeWidth={1.7} focusable="false"/></span>;
}
export function SceneChoices({ onScene }: {
    onScene: (id: SceneId) => void;
}) { return <div className="living-scene-grid">{livingScenes.map(scene => <button key={scene.id} onClick={() => onScene(scene.id)}><LivingOptionIcon name={scene.icon}/><span><strong>{scene.title}</strong><small>{scene.detail}</small></span><Icon name="chevron" size={17}/></button>)}</div>; }
export function LivingHub({ onBack, onScene, onTool }: {
    onBack: () => void;
    onScene: (id: SceneId) => void;
    onTool: (id: ServiceToolId) => void;
}) { return <section className="screen living-hub"><PageHeader title={copyDictionary.c00c3911aec003457} subtitle={copyDictionary.c82275e5b32ec0d7b} onBack={onBack}/><SceneChoices onScene={onScene}/><h2>{copyDictionary.cb083642d012e87d5}</h2><div className="living-entry-list">{livingEntries.map(item => <button key={item.id} onClick={() => onTool(item.id)}><LivingOptionIcon name={item.icon}/><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="chevron" size={17}/></button>)}</div><aside className="living-channel-note"><h2>{copyDictionary.cbabf1cf2f4e27492}</h2><p>{copyDictionary.c3471ad49740b8b9a}</p></aside></section>; }
export function ScenePage({ scene, checked, onChecked, onAction, onBack, saved }: {
    scene: SceneId;
    checked: string[];
    onChecked: (ids: string[]) => void;
    onAction: (action: SceneStep['action']) => void;
    onBack: () => void;
    saved: boolean;
}) {
    const meta = livingScenes.find(s => s.id === scene)!;
    return <section className="screen living-scene-page"><PageHeader title={meta.title} subtitle={copyDictionary.cf18f741a3b93f2a9} onBack={onBack}/>
      {scene==='work'&&<section className="living-intro"><h2>{copyDictionary.learningTitle}</h2><p>{copyDictionary.learningPreview}</p><ul>{learningResources.filter(r=>['cdlvi','smartedu','cdpee'].includes(r.id)).map(r=><li key={r.id}><button onClick={()=>onAction('learning')}>{r.name}</button><p>{r.scope}</p></li>)}</ul><button onClick={()=>onAction('learning')}>{copyDictionary.learningViewAll}</button></section>}
      <p>{copyDictionary.c0e0e8f0ec14471c6}</p>{sceneSteps[scene].map((step, i) => <article key={step.id} className="living-scene-step"><span className="living-step-number">{i + 1}</span><div><h2>{step.title}</h2><p>{step.detail}</p><button onClick={() => onAction(step.action)}>{step.button}</button><label className="switch-line"><input type="checkbox" checked={checked.includes(step.id)} onChange={e => onChecked(e.target.checked ? [...checked, step.id] : checked.filter(id => id !== step.id))}/>{copyDictionary.c205f07e7a6aa7f4f}</label></div></article>)}<p className="support-storage-note">{saved ? copyDictionary.cce48c7b201800260 : copyDictionary.c0e3dab45ce588140}</p><button onClick={() => onChecked([])}>{copyDictionary.c8be0b4a140d014c6}</button></section>;
}
