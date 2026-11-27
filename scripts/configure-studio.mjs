import { readFile,writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { platformClient,accountName,hardwareOptions,requireFreeHardware,ensureStudioOrigin,redactPlatformOutput } from '../deployment/modelscope/platform.mjs'
import { monitorStudio } from '../deployment/modelscope/monitor.mjs'
const root=fileURLToPath(new URL('../',import.meta.url)),origin='https://starovo-smart-accessible-travel.ms.show'
let stage='verify-target'
try{
 const plan=JSON.parse(await readFile(path.join(root,'.studio-deploy-plan.json'),'utf8'))
 if(plan.owner!=='starovo'||plan.repo!=='smart-accessible-travel')throw Error('配置目标不匹配。')
 const api=platformClient(process.env.MS_DEPLOY_TOKEN),repo=plan.owner+'/'+plan.repo,apiPath='/studios/'+repo
 if(accountName(await api('/users/me'))!==plan.owner)throw Error('令牌账号与作品不匹配。')
 const info=await api(apiPath)
 if(info.hardware!==plan.hardware||info.sdk_type!=='docker')throw Error('当前作品硬件或类型与核对配置不一致。')
 requireFreeHardware(hardwareOptions(await api('/studios/hardware?sdk_type=docker&studio='+encodeURIComponent(repo))),plan.hardware)
 stage='configure-application-origin'
 const changed=await ensureStudioOrigin(api,apiPath,origin)
 let needsRestart=changed
 if(!changed&&info.status==='Running'){
   const probe=await fetch(origin+'/api/status',{headers:{Origin:origin,'Sec-Fetch-Site':'same-origin'},signal:AbortSignal.timeout(15000)})
   needsRestart=probe.status===403
 }
 if(needsRestart){
   console.log('Application origin configured. Restarting the same free Studio to apply it; no Git upload.')
   stage='apply-configuration'
   await api(apiPath+'/deploy',{method:'POST'})
 }
 stage='verify-application-origin'
 const outcome=await monitorStudio(api,repo,root,{secrets:[process.env.MS_DEPLOY_TOKEN],checkReadiness:async()=>{
   const response=await fetch(origin+'/api/status',{headers:{Origin:origin,'Sec-Fetch-Site':'same-origin'},signal:AbortSignal.timeout(15000)})
   return response.ok&&(await response.json()).configured===true
 }})
 if(!outcome.modelReady)throw Error('应用域名或模型尚未就绪，详见运行日志。')
 await writeFile(path.join(root,'.studio-config-result.json'),JSON.stringify({repo,origin,status:'origin_verified',modelReady:true,aiVerified:false,at:new Date().toISOString()},null,2))
 console.log('Application origin and model readiness verified. Actual AI acceptance is still required.')
}catch(error){
 const message=redactPlatformOutput(error?.message??error,[process.env.MS_DEPLOY_TOKEN])
 await writeFile(path.join(root,'.studio-config-result.json'),JSON.stringify({stage,message,status:'error',at:new Date().toISOString()},null,2))
 console.error(message);process.exitCode=1
}
