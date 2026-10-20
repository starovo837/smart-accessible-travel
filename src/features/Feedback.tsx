import { useState } from 'react'
import { Modal, PrimaryButton } from '../components/UI'
import { localTime } from '../app/accessibility'
import type { Feedback } from '../app/types'
import { prepareService, service } from '../app/service'
export function FeedbackDialog({ subject, onSave, onClose }: { subject: string; onSave: (item: Feedback) => void; onClose: () => void }) {
  const [text, setText] = useState(''), [saved, setSaved] = useState(false)
  const [submit,setSubmit]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
  return <Modal title="报告问题" onClose={onClose}>{saved ? <><p role="status">{notice}</p><PrimaryButton onClick={onClose}>知道了</PrimaryButton></> : <form onSubmit={async event => { event.preventDefault(); if (!text.trim()||busy) return;setBusy(true);try{let remote:Partial<Feedback>={};if(submit){await prepareService();const record=await service<{id:string;accessToken:string}>('cases',{subject,text:text.trim(),consent:true});remote={serverId:record.id,accessToken:record.accessToken,status:'submitted'}}onSave({ id: 'feedback-' + Date.now(), subject, text: text.trim(), createdAt: localTime(), status:'local-pending',...remote });setNotice(submit?'已提交到当前服务，可在“我的 → 纠错记录”查看实际处理进度。浏览器只在允许保存生活资料时保留追踪凭据，请在该页导出凭据备份。':'已保存本机待处理记录，尚未发送。');setSaved(true)}catch(error){setNotice((error as Error).message)}finally{setBusy(false)} }}><p>{subject}</p><label>哪一项有误？你希望如何更正？<textarea required maxLength={2000} value={text} onChange={event => setText(event.target.value)} /></label><label className="switch-line"><input type="checkbox" checked={submit} onChange={e=>setSubmit(e.target.checked)}/>同意将这段问题和对应标题提交到当前服务，供处理人核查</label><p>服务端纠错最长保留30天，也可由本人提前删除。不附带完整档案、原图或联系人。请确保服务可访问；不要填写身份证等不必要信息。</p><p role="status">{notice}</p><PrimaryButton type="submit" disabled={!text.trim()||busy}>{busy?'正在保存……':submit?'提交纠错并追踪进度':'仅保存本机待处理记录'}</PrimaryButton></form>}</Modal>
}
