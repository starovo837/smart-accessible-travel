import { useId, type ReactNode } from 'react'
import { Icon } from '../components/Icons'
import { AppMark } from '../components/UI'
import { CampusEmblem } from '../components/CampusEmblem'
import type { AppSettings, ModuleId } from '../app/types'
import { workbenchGroups, type WorkbenchItem, type WorkbenchTarget } from '../app/workbench'
import '../workbench.css'

interface WorkbenchProps {
  onAction: (target: WorkbenchTarget) => void
  modules: ModuleId[]
  settings: AppSettings
  encouragement?: ReactNode
}

function WorkbenchIcon({ item }: { item: WorkbenchItem }) {
  return <span className="workbench-icon" aria-hidden="true"><Icon name={item.icon} size={30} strokeWidth={1.85} focusable="false" /><span className="workbench-icon-accent" /></span>
}

export function Workbench({ onAction, modules, settings, encouragement }: WorkbenchProps) {
  const descriptionId = useId()
  return <section className="screen workbench-screen" aria-label="工作台" aria-describedby={descriptionId} data-large-text={Boolean(settings.largeText || settings.elderMode)}>
    <header className="workbench-heading"><div className="workbench-brand"><AppMark/><span>智能无碍行</span><CampusEmblem/></div><h1>工作台</h1><p>按分类，找到现在需要的帮助。</p></header>
    <p id={descriptionId} className="sr-only">已选择{modules.length}类辅助需要。所有分类和功能均可自由使用。</p>
    {encouragement && <div className="workbench-encouragement">{encouragement}</div>}
    <div className="workbench-groups">{workbenchGroups.map(group => <section className="workbench-group" key={group.id} aria-labelledby={'workbench-group-' + group.id}>
      <h2 id={'workbench-group-' + group.id}>{group.title}</h2>
      <ul className="workbench-grid">{group.items.map(item => <li key={item.id}>
        <button type="button" className="workbench-action" data-workbench-target={item.target} aria-label={item.label} aria-describedby={'workbench-description-' + item.id} onClick={() => onAction(item.target)}>
          <WorkbenchIcon item={item} /><span className="workbench-item-label">{item.label}</span>
          <span className="sr-only" id={'workbench-description-' + item.id}>{item.description}</span>
        </button>
      </li>)}</ul>
    </section>)}</div>
  </section>
}
