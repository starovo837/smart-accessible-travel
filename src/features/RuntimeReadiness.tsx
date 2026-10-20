import { useState } from 'react'
import { service } from '../app/service'
import { isStudio } from '../app/deployment'
import { downloadText } from '../app/accessibility'
interface Check {at:string;secure:boolean;file:boolean;gpu:string;server:string;localAI:string}
export function RuntimeReadiness(){
 const [check,setCheck]=useState<Check|null>(null),[busy,setBusy]=useState(false)
 const inspect=async()=>{setBusy(true);const result:Check={at:new Date().toISOString(),secure:window.isSecureContext,file:location.protocol==='file:',gpu:'未检测',server:'未连接',localAI:'尚未验证'}
  let timer:ReturnType<typeof setTimeout>|undefined;try{const gpu=(navigator as Navigator&{gpu?:{requestAdapter:()=>Promise<unknown>}}).gpu;result.gpu=!gpu?'不支持':await Promise.race([gpu.requestAdapter().then(adapter=>adapter?'检测到适配器':'无适配器'),new Promise<string>(resolve=>{timer=setTimeout(()=>resolve('检测超时，尚未确认'),5000)})])}catch{result.gpu='检测失败'}finally{clearTimeout(timer)}
  if(!result.file)try{const data=await service<{configured:boolean;authorized:boolean}>('status',undefined,undefined,AbortSignal.timeout(7000));result.server='当前服务可访问';result.localAI=data.configured?(data.authorized?'服务端模型已就绪':isStudio?'服务授权尚未就绪':'电脑模型已就绪，手机需配对'):'服务端模型尚未就绪'}catch{result.server='当前服务未连接'}
  setCheck(result);setBusy(false)
 }
 return <section className="task-panel"><h2>这台设备现在能做什么？</h2><p>检查不提交商品、病情或联系人，不下载模型。检测到显卡适配器不等于通过模型运行或无障碍验收。</p><button disabled={busy} onClick={()=>void inspect()}>{busy?'正在检查……':'检查这台设备的运行条件'}</button>{check&&<div role="status"><p>安全连接：{check.secure?'是':'否'} · 独立文件：{check.file?'是':'否'}</p><p>本设备AI：{check.gpu}；{check.file||!check.secure?'当前地址不启用本设备模型。':'仍需确认下载并实际运行验证。'}</p><p>{check.server}；{check.localAI}。</p><button onClick={()=>downloadText(JSON.stringify({kind:'technical-readiness',...check,humanAcceptance:'未完成，不能由技术检测推定'},null,2),'智能无碍行-运行条件检查.json','application/json')}>下载技术检查记录</button></div>}<p>{isStudio?'本页通过HTTPS使用创空间服务。':'局域网HTTP可使用电脑服务。'}手机独立文字AI需可信HTTPS、WebGPU和足够内存。完整离线应用可读设备卡和清单，实时协作仍需服务。没有连接时可保留草稿、导出资料。</p><p>手机AI兼容性、TalkBack、VoiceOver及残障用户独立操作需逐项实测，不因技术检查成功而标记通过。</p></section>
}
