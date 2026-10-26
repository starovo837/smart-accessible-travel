import { useState } from 'react'
import { Modal, PageHeader, PrimaryButton } from '../components/UI'
import { Icon } from '../components/Icons'
import { moduleMeta,moduleIds } from '../app/mock'
import { recommendedTools,supportTools,type SupportToolId,type SupportTool } from '../app/supportCatalog'
import type { ModuleId } from '../app/types'
export function NeedsPicker({modules,onApply,onClose}:{modules:ModuleId[];onApply:(modules:ModuleId[])=>void;onClose:()=>void}){
 const [selected,setSelected]=useState(modules)
 return <Modal title="选择我的辅助需要" onClose={onClose}><p>可以多选，也可以暂不选择。不需要提供诊断或证明，所有功能都能自由使用。</p><div className="support-need-grid">{moduleIds.map(id=><button key={id} aria-pressed={selected.includes(id)} onClick={()=>setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])}><Icon name={moduleMeta[id].icon}/><strong>{moduleMeta[id].label}</strong><span>{moduleMeta[id].detail}</span><small>{selected.includes(id)?'✓ 已选择':'选择'}</small></button>)}</div><PrimaryButton onClick={()=>{onApply(selected);onClose()}}>使用这组辅助需要</PrimaryButton><button className="text-action" onClick={()=>setSelected([])}>暂不选择类型</button></Modal>
}
export function SupportRows({tools,onTool}:{tools:SupportTool[];onTool:(id:SupportToolId)=>void}){return <div className="support-tool-list">{tools.map(tool=><button key={tool.id} onClick={()=>onTool(tool.id)}><span className="support-tool-icon"><Icon name={tool.icon} size={27}/></span><span><strong>{tool.title}</strong><small>{tool.detail}</small></span><Icon name="chevron" size={19}/></button>)}</div>}
export function SupportHub({modules,onToggle,onChoose,onTool,onBack,saved}:{modules:ModuleId[];onToggle:(id:ModuleId)=>void;onChoose:()=>void;onTool:(id:SupportToolId)=>void;onBack:()=>void;saved:boolean}){
 const [all,setAll]=useState(false)
 return <section className="screen support-hub"><PageHeader title="辅助中心" subtitle="按需要选择，也能自由组合" onBack={onBack}/><p>选择后优先推荐相关功能，所有工具仍能自由打开。</p><div className="support-module-chips" role="group" aria-label="我的辅助类型">{moduleIds.map(id=><button key={id} aria-pressed={modules.includes(id)} onClick={()=>onToggle(id)}>{modules.includes(id)&&<span aria-hidden="true">✓ </span>}{moduleMeta[id].label}</button>)}</div><button className="text-action" onClick={onChoose}>查看并调整我的辅助组合</button><div className="support-tabs" role="group" aria-label="功能范围"><button aria-pressed={!all} onClick={()=>setAll(false)}>为我推荐</button><button aria-pressed={all} onClick={()=>setAll(true)}>全部功能</button></div><SupportRows tools={all?supportTools:recommendedTools(modules)} onTool={onTool}/><p className="support-storage-note">{saved?'辅助类型按你的授权保存在本机。':'当前类型选择仅在本次使用中保留；可在“我的 → 隐私与数据”设置保存。'}</p><button className="text-action" onClick={()=>setAll(!all)}>{all?'回到为我推荐':'查看全部辅助功能'}</button></section>
}
