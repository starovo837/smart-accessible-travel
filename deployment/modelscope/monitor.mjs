import { mkdir,writeFile } from 'node:fs/promises'
import path from 'node:path'
import { redactPlatformOutput } from './platform.mjs'

export function studioState(info){
  const value=info?.status??info?.runtime?.status??info?.stage
  return typeof value==='string'?value:typeof value?.name==='string'?value.name:'unknown'
}
export async function monitorStudio(api,repo,root,{secrets=[],attempts=90,interval=20000,notify=console.log,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),checkReadiness}={}){
  await mkdir(path.join(root,'.studio-logs'),{recursive:true})
  let last=''
  for(let attempt=0;attempt<attempts;attempt++){
    let state='unknown'
    try{
      const info=await api('/studios/'+repo)
      state=studioState(info)
      // Store an explicit small allowlist, not the full platform response.
      await writeFile(path.join(root,'.studio-status.json'),JSON.stringify({repo,state,checkedAt:new Date().toISOString(),runtimeUrl:info?.host??info?.app_url??info?.runtime?.url??null,aiVerified:false},null,2))
      if(state!==last){notify('创空间状态：'+state);last=state}
      for(const type of ['build','run']){
        try{const logs=await api('/studios/'+repo+'/logs/'+type+'?page_size=100');const lines=Array.isArray(logs.logs)?logs.logs.slice(-100).map(line=>redactPlatformOutput(typeof line==='string'?line:JSON.stringify(line),secrets)):[];await writeFile(path.join(root,'.studio-logs',type+'.json'),JSON.stringify({logs:lines},null,2))}catch{/* Some stages do not expose both logs yet. */}
      }
      if(/^running$/i.test(state)){
        const modelReady=checkReadiness?await checkReadiness(info).catch(()=>false):undefined
        if(checkReadiness)await writeFile(path.join(root,'.studio-status.json'),JSON.stringify({repo,state,checkedAt:new Date().toISOString(),runtimeUrl:info?.host??info?.app_url??info?.runtime?.url??null,modelReady,aiVerified:false},null,2))
        if(!checkReadiness||modelReady){notify('容器已运行。实际图文解读仍需检查，尚未标记验收完成。');return {state,modelReady,aiVerified:false}}
        if(attempt===0||last!=='Running')notify('容器已运行，模型未就绪，将继续收集运行日志。')
      }
      if(/error|failed/i.test(state)){notify('构建或运行失败，已保存可用日志，请交给助手修复。');return {state,aiVerified:false}}
    }catch{if(attempt===0)notify('暂时未读到部署状态，将继续检查；不会重复提交部署。')}
    if(attempt+1<attempts)await pause(interval)
  }
  notify('已完成本轮状态检查，部署可能仍在进行。请查看创空间页面或将状态文件交给助手。')
  return {state:last||'unknown',aiVerified:false}
}
