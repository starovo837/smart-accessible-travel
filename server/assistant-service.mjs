import { LOCAL_MODEL, LOCAL_ORIGIN, localAIStatus } from './local-ai.mjs'
import { assistantInstructions, renderAssistantSelection } from '../src/app/assistantEvidence.ts'
export async function answerLocalQuestion(question,items,signal,fetcher=fetch) {
  if(typeof question!=='string'||!question.trim()||question.length>1000||!Array.isArray(items)||!items.length||items.length>30)throw Object.assign(Error('请提供问题与当前商品或出行依据。'),{status:400})
  const evidence=items.map(item=>({id:String(item.id).slice(0,80),label:String(item.label).slice(0,100),text:String(item.text).slice(0,1000),source:String(item.source).slice(0,160),kind:['decision','question'].includes(item.kind)?item.kind:'fact',mandatory:item.mandatory===true}))
  if(evidence.reduce((total,item)=>total+item.text.length,0)>6000)throw Object.assign(Error('依据过多，请只选择当前商品或当前出行结果。'),{status:400})
  if(!(await localAIStatus(fetcher)).configured)throw Object.assign(Error('本机AI未就绪。可以直接阅读当前依据，或在支持的设备上启用手机文字模型。'),{status:503})
  const response=await fetcher(LOCAL_ORIGIN+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({model:LOCAL_MODEL,stream:false,think:false,format:'json',keep_alive:'2m',messages:[{role:'system',content:assistantInstructions},{role:'user',content:JSON.stringify({question,evidence})}],options:{temperature:0,num_ctx:8192,num_predict:1800}})})
  if(!response.ok)throw Error('本机AI解释未完成。')
  const data=await response.json();if(!data.done||data.done_reason!=='stop')throw Error('解释被截断，本次不采用。')
  try{return {...renderAssistantSelection(JSON.parse(data.message.content),evidence),engine:'ollama',model:LOCAL_MODEL}}catch(error){throw Object.assign(Error(error.message),{status:422})}
}
