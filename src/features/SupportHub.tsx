import { copyDictionary } from "../app/copyDictionary.ts";
import { useState } from 'react';
import { Modal, PageHeader, PrimaryButton } from '../components/UI';
import { Icon } from '../components/Icons';
import { moduleMeta, moduleIds } from '../app/mock';
import { recommendedTools, supportTools, type SupportToolId, type SupportTool } from '../app/supportCatalog';
import type { ModuleId } from '../app/types';
export function NeedsPicker({ modules, onApply, onClose }: {
    modules: ModuleId[];
    onApply: (modules: ModuleId[]) => void;
    onClose: () => void;
}) {
    const [selected, setSelected] = useState(modules);
    return <Modal title={copyDictionary.c73abed149b82d8ef} onClose={onClose}><p>{copyDictionary.c4f43633c9f16bebe}</p><div className="support-need-grid">{moduleIds.map(id => <button key={id} aria-pressed={selected.includes(id)} onClick={() => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])}><Icon name={moduleMeta[id].icon}/><strong>{moduleMeta[id].label}</strong><span>{moduleMeta[id].detail}</span><small>{selected.includes(id) ? copyDictionary.cd2f5277505a4abae : copyDictionary.cc11330b85234f9c0}</small></button>)}</div><PrimaryButton onClick={() => { onApply(selected); onClose(); }}>{copyDictionary.c72a61142e1eda961}</PrimaryButton><button className="text-action" onClick={() => setSelected([])}>{copyDictionary.ce5ea732d4d0ecc50}</button></Modal>;
}
export function SupportRows({ tools, onTool }: {
    tools: SupportTool[];
    onTool: (id: SupportToolId) => void;
}) { return <div className="support-tool-list">{tools.map(tool => <button key={tool.id} onClick={() => onTool(tool.id)}><span className="support-tool-icon"><Icon name={tool.icon} size={27}/></span><span><strong>{tool.title}</strong><small>{tool.detail}</small></span><Icon name="chevron" size={19}/></button>)}</div>; }
export function SupportHub({ modules, onToggle, onChoose, onTool, onBack, saved }: {
    modules: ModuleId[];
    onToggle: (id: ModuleId) => void;
    onChoose: () => void;
    onTool: (id: SupportToolId) => void;
    onBack: () => void;
    saved: boolean;
}) {
    const [all, setAll] = useState(false);
    return <section className="screen support-hub"><PageHeader title={copyDictionary.c2513de5209c2a1a7} subtitle={copyDictionary.c6460fdf5e68b8557} onBack={onBack}/><button className="text-action" onClick={onChoose}>{copyDictionary.c069ac0e2b91bfeb3}</button><div className="support-tabs" role="group" aria-label={copyDictionary.ceed7e234873410a6}><button aria-pressed={!all} onClick={() => setAll(false)}>{copyDictionary.cdbf1c81979c6b41f}</button><button aria-pressed={all} onClick={() => setAll(true)}>{copyDictionary.c6c8f61c25046fd4e}</button></div><SupportRows tools={all ? supportTools : recommendedTools(modules)} onTool={onTool}/><p className="support-storage-note">{copyDictionary.c00342fabbec1b592}</p><button className="text-action" onClick={() => setAll(!all)}>{all ? copyDictionary.ca0f7520ae949f6c7 : copyDictionary.c90779d9a3f3e10d2}</button></section>;
}
