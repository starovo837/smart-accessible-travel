import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Modal, PageHeader, PrimaryButton, ResultDisclaimer } from '../components/UI'
import { Icon } from '../components/Icons'
import { assistantReply, type AssistantSlots } from '../app/logic'
import { readText, stopReading } from '../app/accessibility'
import { isStudio, processingLocation } from '../app/deployment'
import { service } from '../app/service'
import { runInference } from '../app/inference'
import { answerInBrowser, browserAIAvailable, browserAIReady } from '../app/browserAI'
import { renderAssistantSelection, type AssistantEvidence } from '../app/assistantEvidence'
import type { AssistantTurn } from '../app/types'

export function AssistantPage({ readAloud, evidence, preferBrowser, contextKey, contextLabel, contextControls, omitted, evidenceTotal, requiresNarrowing, onBack, onTravel, onProduct }: { readAloud: boolean; evidence:AssistantEvidence[]; preferBrowser:boolean; contextKey:string;contextLabel:string;contextControls:ReactNode;omitted:string[];evidenceTotal:number;requiresNarrowing:boolean; onBack: () => void; onTravel: (slots: AssistantSlots) => void; onProduct: (query: string) => void }) {
  const [turns, setTurns] = useState<AssistantTurn[]>([{ speaker: 'assistant', text: '你好。可以输入问题。流程引导一次只问一项；有当前资料时可切换到带依据的真实AI解释。' }])
  const [grounded,setGrounded]=useState(evidence.length>0),[agreed,setAgreed]=useState(false),[busy,setBusy]=useState(false),[engineChoice,setEngineChoice]=useState<'auto'|'computer'|'device'>('auto'),[pendingBrowser,setPendingBrowser]=useState<string|null>(null)
  const request=useRef<AbortController|null>(null),epoch=useRef(0)
  const [draft, setDraft] = useState('')
  const [slots, setSlots] = useState<AssistantSlots>({})
  const [complete, setComplete] = useState(false)
  const [slow, setSlow] = useState(false)
  const [status, setStatus] = useState('')
  const latest = turns.filter(turn => turn.speaker === 'assistant').at(-1)?.text ?? ''
  useEffect(() => () => { epoch.current++;request.current?.abort(); stopReading() }, [])

  useEffect(()=>{epoch.current++;request.current?.abort();setBusy(false);setGrounded(evidence.length>0);setAgreed(false);setPendingBrowser(null);setDraft('');setTurns([{speaker:'assistant',text:evidence.length?'当前资料：'+contextLabel+'。可以直接问这份资料的风险、缺项或下一步。':'当前没有选用商品或出行资料，可以先用流程引导。'}]);setStatus('')},[contextKey])

  const submit = async (text = draft, forceDevice=false) => {
    if(busy){setStatus('模型正在回答，可以先点停止／打断。');return}
    if (!text.trim()) { setStatus('请先输入问题或选择一个常用问题。'); return }
    stopReading()
    if(grounded){
      if(requiresNarrowing){setStatus('关键依据超出本次容量，请先选择单台设备或更小的资料范围。');return}
      if(!agreed){setStatus('请先勾选本次问题和所选资料的AI处理授权。');return}
      if(!evidence.length){setStatus('还没有当前资料，请先完成商品解读或出行检查。');return}
      request.current?.abort();let controller=new AbortController();request.current=controller;const version=++epoch.current
      setBusy(true);setStatus(isStudio?'正在检查创空间AI……':'正在选择可用的本地AI……')
      try{
        let useDevice=forceDevice||engineChoice==='device'||engineChoice==='auto'&&preferBrowser&&browserAIReady()
        if(!useDevice){
          let ready:{configured?:boolean;authorized?:boolean}|null=null
          const timeout=setTimeout(()=>controller.abort(),8000)
          try{ready=await service('status',undefined,undefined,controller.signal)}catch{if(version!==epoch.current)return}finally{clearTimeout(timeout)}
          if(version!==epoch.current)return
          if(!ready?.configured||!ready?.authorized){
            if(engineChoice==='auto'&&browserAIReady())useDevice=true
            else if(engineChoice==='auto'&&browserAIAvailable()){setPendingBrowser(text);setStatus('服务端AI暂不可用。可选择在这台设备运行，或保留问题稍后再试。');return}
            else throw Error(ready?.configured?(isStudio?'创空间授权未就绪，请刷新页面后重试；问题已保留。':'当前设备尚未连接电脑AI，请到商品资料页完成手机授权；问题已保留。'):'服务端AI暂不可用，问题已保留。请等待服务恢复后重试，也可以在回答设置中选择流程引导。')
          }
        }
        if(useDevice&&!browserAIReady()&&!forceDevice){if(!browserAIAvailable())throw Error('这台设备暂不支持独立AI。问题已保留，可等待服务端AI就绪后重试。');setPendingBrowser(text);setStatus('首次使用需要确认模型下载，尚未发送本次问题。');return}
        if(controller.signal.aborted){controller=new AbortController();request.current=controller}
        setDraft('');setStatus(useDevice?'正在这台设备上回答……':'正在通过'+processingLocation+'回答……');setTurns(current=>[...current,{speaker:'user',text:text.trim()}])
        const progress=(message:string)=>{if(version===epoch.current)setStatus(message)}
        const selected=useDevice?await answerInBrowser(text,evidence,progress,controller.signal):await runInference<ReturnType<typeof renderAssistantSelection>>('assistant/answer',{question:text,evidence,consent:true},controller.signal,progress)
        if(version!==epoch.current)return
        const output=renderAssistantSelection({statementIds:selected.statementIds,questionId:selected.questionId},evidence)
        const answer=output.answer+(output.followUp?'\n下一项需要确认：'+output.followUp:'');setTurns(current=>[...current,{speaker:'assistant',text:answer,citations:evidence.filter(item=>output.factIds.includes(item.id))}]);setStatus('回答完成，可展开回答下方的依据核对。');if(readAloud)readText(answer,slow?.75:1)
      }catch(error){if(version===epoch.current&&(error as Error).name!=='AbortError'){setDraft(text);setStatus((error as Error).message)}}finally{if(version===epoch.current)setBusy(false)}
      return
    }
    const result = assistantReply(text, slots)
    setTurns(current => [...current, { speaker: 'user', text: text.trim() }, { speaker: 'assistant', text: result.text }])
    setSlots(result.slots); setComplete(result.complete); setDraft(''); setStatus('')
    if (readAloud && !readText(result.text, slow ? 0.75 : 1)) setStatus('此浏览器不支持朗读，请查看文字回复。')
  }
  const repeat = (rate: number) => { if (!readText(latest, rate)) setStatus('此浏览器不支持朗读，最新回复仍在上方。') }
  const interrupt = () => { epoch.current++;request.current?.abort();setBusy(false);stopReading(); setStatus('已停止回答和朗读。你可以输入新的内容。') }
  return <section className="screen assistant-screen corrected-assistant">
    <PageHeader title="文字助手" subtitle="输入问题或选择常用问题，一次只问一项" onBack={onBack} />
    <p className="assistant-context">{evidence.length?'正在围绕“'+contextLabel+'”帮你解答。':'还没有商品或出行资料，我可以先帮你一步步填写出行需要。'}</p>
    <div className="chat-thread" role="log" aria-live="polite" aria-label="对话记录">{turns.map((turn, index) => <div className={`chat-bubble ${turn.speaker}`} key={index}><strong className="sr-only">{turn.speaker === 'user' ? '你：' : '助手：'}</strong><span>{turn.text}</span>{turn.citations?.map(item=><details key={item.id}><summary>回答依据：{item.label} · {item.source}</summary><p>{item.text}</p>{item.quote&&<blockquote>{item.quote}</blockquote>}</details>)}</div>)}</div>
    <div className="assistant-presets" aria-busy={busy}>{(grounded?contextKey.startsWith('product:')?['这件商品最需要注意什么？','我还要核对哪项信息？']:['这次出行还缺什么？','现在最先需要做什么？']:['我想带电动轮椅坐高铁','我想带助听器坐飞机','我想带盲杖坐地铁']).map(question=><button disabled={busy} key={question} onClick={()=>void submit(question)}>{question}</button>)}</div>
    {grounded&&<label className="switch-line"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} disabled={busy}/>{isStudio?'允许本次问题和所选资料交给创空间服务端模型处理，不上传诊断或联系人':'允许本次问题和所选资料由可用的本地AI处理，不发送到云端'}</label>}
    <form className="assistant-input" onSubmit={event => { event.preventDefault(); submit() }}><label htmlFor="assistant-text">输入你的问题<input id="assistant-text" value={draft} onChange={event => setDraft(event.target.value)} placeholder="例如：我想带助行器坐公交" /></label><PrimaryButton type="submit" disabled={!draft.trim()||busy||(grounded&&requiresNarrowing)} icon="send">发送文字</PrimaryButton></form>
    <div className="assistant-shortcuts"><button onClick={() => repeat(slow ? 0.75 : 1)}><Icon name="volume" size={18} />重复最新回复</button><button aria-pressed={slow} onClick={() => { setSlow(current => !current); repeat(slow ? 1 : 0.75) }}>{slow ? '恢复正常语速' : '慢一点朗读'}</button><button onClick={interrupt}>停止 / 打断</button></div>
    <p role="status" className="operation-status">{status}</p>
    {complete && <PrimaryButton onClick={() => slots.intent === 'product' ? onProduct(slots.product ?? '辅具') : onTravel(slots)}>{slots.intent === 'product' ? '进入买辅具' : '用这些信息进入出行查询'}</PrimaryButton>}
    <button className="text-action" onClick={() => { interrupt(); setSlots({}); setComplete(false); setStatus('已开始新问题。'); setTurns([{ speaker: 'assistant', text: '你这次准备怎么出行？' }]) }}>开始新问题</button>
    <details className="assistant-settings"><summary>资料范围与回答设置</summary>{contextControls}<p>已纳入 {evidence.length} / {evidenceTotal} 条依据。</p>{omitted.length>0&&<details><summary>查看未纳入的 {omitted.length} 条依据</summary><p>未纳入不代表没有风险，可选择单台设备再问。</p><ul>{[...new Set(omitted)].map(label=><li key={label}>{label}</li>)}</ul></details>}
      <label className="switch-line"><input type="checkbox" checked={grounded} disabled={busy} onChange={e=>{interrupt();setGrounded(e.target.checked)}}/>围绕当前资料由AI回答</label>{!grounded&&<p>当前使用固定流程引导，不调用AI，不解释商品参数。</p>}
      <label htmlFor="assistant-engine">回答方式</label><select id="assistant-engine" disabled={busy} value={engineChoice} onChange={e=>setEngineChoice(e.target.value as typeof engineChoice)}><option value="auto">{isStudio?'自动选择可用AI（推荐）':'自动选择可用的本地AI（推荐）'}</option><option value="computer">{isStudio?'使用创空间服务端':'使用当前电脑'}</option><option value="device">使用这台设备</option></select>
      <details><summary>查看本次处理的资料</summary>{evidence.map(item=><article key={item.id}><h3>{item.label} · {item.source}</h3><p>{item.text}</p></article>)}<p>没有发送诊断、联系人或整份个人档案。关键结论由程序保留，AI不能改写运输许可或数值比较。</p></details>
    </details>
    {requiresNarrowing&&grounded&&<p role="alert">本次关键资料较多，请在“资料范围与回答设置”中选择单台设备后再提问。</p>}
    {pendingBrowser!==null&&<Modal title="改用这台设备回答？" onClose={()=>setPendingBrowser(null)}><p>服务端AI目前不可用，或你选择了这台设备。首次需要下载数百MB文字模型，可能耗时并占用存储，需要兼容的安全连接和WebGPU。资料在本设备处理，不用密钥，不调用云端。</p><PrimaryButton onClick={()=>{const text=pendingBrowser;setPendingBrowser(null);void submit(text,true)}}>下载／加载模型并继续回答</PrimaryButton><PrimaryButton variant="ghost" onClick={()=>{setDraft(pendingBrowser);setPendingBrowser(null);setStatus('已保留问题，尚未下载模型。')}}>暂不下载，保留问题</PrimaryButton></Modal>}
    <ResultDisclaimer/>
  </section>
}
