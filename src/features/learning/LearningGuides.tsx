import { useState } from 'react'
import { copyDictionary as c } from '../../app/copyDictionary'
import { accommodationTemplates, accommodationExport, learningTutorials } from '../../app/learningGuides'
import { copyText, downloadText, readText } from '../../app/accessibility'
import type { SupportToolId } from '../../app/supportCatalog'
import { OfficialLearningLink } from './LearningCenter'
export function LearningGuides({mode,onTool,onResources,notify}:{mode:'accommodations'|'tutorials';onTool:(id:SupportToolId)=>void;onResources:()=>void;notify:(text:string)=>void}) {
  const [selected,setSelected]=useState<string[]>([])
  return mode==='accommodations'?<><h2>{c.learningAccommodations}</h2><p>{c.learningTemplateBoundary}</p><p>{c.learningChooseTemplates}</p><button disabled={!selected.length} onClick={()=>downloadText(accommodationExport(selected),c.learningTemplateFile,'text/plain;charset=utf-8')}>{c.learningTemplateExport}（{selected.length}）</button>
    {accommodationTemplates.map(row=><article className="learning-card" key={row.id}><h3>{row.title}</h3><p>{row.scene}</p><dl><dt>{c.learningRecipient}</dt><dd>{row.recipient}</dd><dt>{c.learningLeadTime}</dt><dd>{row.leadTime}</dd><dt>{c.learningMaterials}</dt><dd>{row.materials}</dd></dl><p>{row.script}</p><p>{c.learningCheckedAt} {row.verifiedAt}</p><div className="learning-actions"><OfficialLearningLink url={row.sourceUrl}>{c.learningSource}</OfficialLearningLink><button onClick={async()=>notify(await copyText(row.script)?c.learningCopied:c.learningCopyFailed)}>{c.learningCopy}</button></div><label className="learning-check"><input type="checkbox" checked={selected.includes(row.id)} onChange={e=>setSelected(e.target.checked?[...selected,row.id]:selected.filter(id=>id!==row.id))}/>{c.learningTemplateSelect}</label></article>)}</>:
    <><h2>{c.learningTutorials}</h2><p>{c.learningTutorialBoundary}</p>{learningTutorials.map(row=><article className="learning-card" key={row.id}><h3>{row.title}</h3><ol>{row.steps.map(step=><li key={step}>{step}</li>)}</ol><div className="learning-actions"><button onClick={()=>row.tool==='screen-reader-resources'?onResources():onTool(row.tool)}>{row.tool==='screen-reader-resources'?c.learningScreenTools:c.learningTutorialOpen}</button><button onClick={()=>void readText([row.title,...row.steps].join('。'))}>{c.learningRead}</button></div></article>)}</>
}
