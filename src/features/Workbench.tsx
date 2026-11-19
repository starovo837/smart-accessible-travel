import { copyDictionary } from "../app/copyDictionary.ts";
import { Fragment, useId, type ReactNode } from 'react';
import { Icon } from '../components/Icons';
import { AppMark } from '../components/UI';
import { CampusEmblem } from '../components/CampusEmblem';
import { HomeCover } from '../components/HomeCover';
import type { AppSettings, ModuleId } from '../app/types';
import { workbenchGroups, type WorkbenchItem, type WorkbenchTarget } from '../app/workbench';
import '../workbench.css';
interface WorkbenchProps {
    onAction: (target: WorkbenchTarget) => void;
    modules: ModuleId[];
    settings: AppSettings;
    playWater: boolean;
    encouragement?: ReactNode;
}
function WorkbenchIcon({ item }: {
    item: WorkbenchItem;
}) {
    return <span className="workbench-icon" aria-hidden="true"><Icon name={item.icon} size={30} strokeWidth={1.85} focusable="false"/><span className="workbench-icon-accent"/></span>;
}
export function Workbench({ onAction, modules, settings, playWater, encouragement }: WorkbenchProps) {
    const descriptionId = useId();
    return <section className="screen workbench-screen" aria-label={copyDictionary.cf9e02d3c13aaa72c} aria-describedby={descriptionId} data-large-text={Boolean(settings.largeText || settings.elderMode)}>
    <HomeCover playing={playWater}>
      <header className="workbench-heading"><div className="workbench-brand"><AppMark /><span>{copyDictionary.c4ec7c5b9618b5554}</span><CampusEmblem /></div><h1>{copyDictionary.cf9e02d3c13aaa72c}</h1><p>{copyDictionary.c8323ab3d6e326e53}</p></header>
    </HomeCover>
    <p id={descriptionId} className="sr-only">{copyDictionary.c3f4ebc4aad9793b6}{modules.length}{copyDictionary.c85fd5b143dc5c320}</p>
    <div className="workbench-groups">{workbenchGroups.map(group => <Fragment key={group.id}>
      <section className="workbench-group" aria-labelledby={'workbench-group-' + group.id}>
      <h2 id={'workbench-group-' + group.id}>{group.title}</h2>
      <ul className="workbench-grid">{group.items.map(item => <li key={item.id}>
        <button type="button" className="workbench-action" data-workbench-target={item.target} aria-label={item.label} aria-describedby={'workbench-description-' + item.id} onClick={() => onAction(item.target)}>
          <WorkbenchIcon item={item}/><span className="workbench-item-label">{item.label}</span>
          <span className="sr-only" id={'workbench-description-' + item.id}>{item.description}</span>
        </button>
      </li>)}</ul>
      </section>
      {group.id === 'equipment-travel' && encouragement && <div className="workbench-encouragement">{encouragement}</div>}
    </Fragment>)}</div>
    <button type="button" className="workbench-about-link" onClick={() => onAction('about')}><strong>{copyDictionary.c0ed77920b1cd8737}</strong><span>{copyDictionary.cee5eb5a598931a07}</span></button>
  </section>;
}
