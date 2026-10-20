import { useState } from 'react'
import { service, prepareService } from '../app/service'
import { RuleSources } from './RuleSources'
import type { RuleDocument } from '../app/ruleCatalog'
export function RuleReview(){
 const [documents,setDocuments]=useState<RuleDocument[]>([]),[note,setNote]=useState(''),[checked,setChecked]=useState(false),[status,setStatus]=useState('')
 return <section className="task-panel"><h3>来源变化复核</h3><button onClick={async()=>{try{await prepareService();setDocuments((await service<{documents:RuleDocument[]}>('rules')).documents)}catch(error){setStatus((error as Error).message)}}}>读取当前来源版本</button><RuleSources documents={documents}/><label>复核记录（含完整条款、适用范围与例外核对）<textarea value={note} onChange={e=>setNote(e.target.value)}/></label><label className="switch-line"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>我已打开官方完整原文，核对相关条件及例外；此操作不是承运方许可</label>{documents.filter(rule=>rule.status==='changed').map(rule=><div className="record-row" key={rule.id}><p>{rule.title} · {rule.anchorsMatch?'原条款片段仍存在，需复核全文变化':'条款片段已不匹配，应先修正规则实现，不能在这里强行通过'}</p><button disabled={!checked||!note.trim()||!rule.anchorsMatch} onClick={async()=>{try{setDocuments((await service<{documents:RuleDocument[]}>('review/rules/'+rule.id,{hash:rule.pendingHash,note})).documents);setStatus('已记录此次人工复核与版本。请回到出行页面重新检查。');setChecked(false)}catch(error){setStatus((error as Error).message)}}}>确认此版本的全文复核</button></div>)}<p role="status">{status}</p></section>
}
