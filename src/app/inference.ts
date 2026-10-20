import { apiFetch } from './transport'

type Job<T> = { taskId?:string;state?:'running'|'completed'|'failed'|'cancelled';result?:T;error?:string;progress?:string;elapsedSeconds?:number }
const pause = (signal:AbortSignal) => new Promise<void>((resolve,reject)=>{
  signal.throwIfAborted()
  const cancel=()=>{clearTimeout(timer);reject(signal.reason)},timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve()},3000)
  signal.addEventListener('abort',cancel,{once:true})
})

// Short requests avoid the hosting proxy's synchronous inference timeout.
export async function runInference<T>(path:string,input:unknown,signal:AbortSignal,onProgress:(message:string)=>void=()=>{}):Promise<T>{
  let taskId:string|undefined
  try{
    const response=await apiFetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Prefer:'respond-async'},signal,body:JSON.stringify(input)})
    const payload=await response.json().catch(()=>({error:'模型服务未正确响应，资料仍保留在本页。'}))
    if(!response.ok)throw Error(payload.error??'本次解读未完成，没有生成AI结论。')
    if(response.status!==202)return payload as T
    taskId=payload.taskId
    if(!taskId||!/^([a-f0-9]{48})$/.test(taskId))throw Error('模型任务未能建立，资料仍保留在本页。')
    onProgress('已提交，正在准备模型。免费CPU处理可能需要数分钟，可随时取消。')
    for(;;){
      await pause(signal)
      const poll=await apiFetch('/api/inference-jobs/'+taskId,{signal,cache:'no-store'})
      const job:Job<T>=await poll.json().catch(()=>({error:'读取进度失败，资料仍保留在本页。'}))
      if(!poll.ok)throw Error(job.error??'暂时无法读取模型进度。')
      if(job.state==='completed'&&job.result)return job.result
      if(job.state!=='running')throw Error(job.error??'本次解读已停止，没有生成新结论。')
      const elapsed=job.elapsedSeconds??0
      onProgress((job.progress??'正在解读')+' · 已等待'+(elapsed<60?elapsed+'秒':Math.floor(elapsed/60)+'分'+elapsed%60+'秒')+'。可取消，资料会保留。')
    }
  }finally{
    if(taskId){void apiFetch('/api/inference-jobs/'+taskId,{method:'DELETE',keepalive:true}).catch(()=>{})}
  }
}
