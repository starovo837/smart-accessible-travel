import { cp,mkdtemp,readFile,writeFile } from 'node:fs/promises'
import { appendFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { format } from 'node:util'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { platformClient,hardwareOptions,requireFreeHardware,accountName,gitCredential,redactPlatformOutput,updateStudioSettingsIfChanged,ensureStudioOrigin } from '../deployment/modelscope/platform.mjs'
import { prepareStudio } from '../deployment/modelscope/package.mjs'
import { monitorStudio } from '../deployment/modelscope/monitor.mjs'

const root=fileURLToPath(new URL('../',import.meta.url))
if(process.env.MS_PUBLISH_LOG){
  const log=process.env.MS_PUBLISH_LOG
  const write=(...values)=>appendFileSync(log,format(...values)+'\n','utf8')
  console.log=write
  console.error=write
}
let gitSecret='',stage='configuration'
process.on('uncaughtException',async error=>{
  const message=redactPlatformOutput(error?.message??error,[process.env.MS_DEPLOY_TOKEN,gitSecret])
  try{await writeFile(path.join(root,'.studio-publish-error.json'),JSON.stringify({stage,message,at:new Date().toISOString()},null,2))}catch{}
  console.error('发布未完成（'+stage+'）：'+message)
  process.exit(1)
})
const plan=JSON.parse(await readFile(path.join(root,'.studio-deploy-plan.json'),'utf8'))
if(plan.owner!=='starovo'||!/^[a-z0-9][a-z0-9-]{2,63}$/.test(plan.repo)||!['public','private'].includes(plan.visibility)||plan.action!=='publish')throw Error('缺少已核对的部署配置，已停止。')
const api=platformClient(process.env.MS_DEPLOY_TOKEN)
stage='verify-account-and-free-hardware'
if(accountName(await api('/users/me'))!==plan.owner)throw Error('令牌账号与部署目标不一致。')
const repo=plan.owner+'/'+plan.repo,apiPath='/studios/'+repo
let existing
try{existing=await api(apiPath)}catch(error){if(error.status!==404)throw error}
requireFreeHardware(hardwareOptions(await api('/studios/hardware?sdk_type=docker'+(existing?'&studio='+encodeURIComponent(repo):''))),plan.hardware)
if(existing&&existing.sdk_type!=='docker')throw Error('同名创空间不是 Docker 类型，请使用新的名称，避免修改其他作品。')
console.log('已核对目标账号和免费硬件。')
// Stage and scan before any external write. Never copy the working repository's history.
const temp=await mkdtemp(path.join(os.tmpdir(),'smart-accessible-publish-'))
const source=path.join(temp,'source')
stage='prepare-and-scan-source'
await prepareStudio(root,source)
await writeFile(path.join(source,'.smart-accessible-studio.json'),JSON.stringify({app:'smart-accessible-travel',version:1}))
console.log('白名单源码已准备，正在验证仓库上传权限。')
const credential=await gitCredential(process.env.MS_DEPLOY_TOKEN,plan.owner)
gitSecret=credential
let previous
try{previous=JSON.parse(await readFile(path.join(root,'.studio-publish-result.json'),'utf8'))}catch{}
let previousPublishError
try{previousPublishError=JSON.parse(await readFile(path.join(root,'.studio-publish-error.json'),'utf8'))}catch{}
let createdId=existing?.id
if(!existing){
  stage='create-free-studio'
  const created=await api('/studios',{method:'POST',body:{owner:plan.owner,repo_name:plan.repo,sdk_type:'docker',visibility:plan.visibility,hardware:plan.hardware,display_name:'智能无碍行',description:'面向视障、残障群体的辅具商品AI信息解读与出行合规查询助手'}})
  createdId=created?.id
  await writeFile(path.join(root,'.studio-publish-result.json'),JSON.stringify({app:'smart-accessible-travel',repo,createdId,status:'created',at:new Date().toISOString()},null,2))
  console.log('已创建创空间，正在上传白名单代码。')
}
const git=process.env.MS_GIT_PATH||'git'
const askpass=path.join(temp,process.platform==='win32'?'askpass.cmd':'askpass.sh')
const helper=path.join(root,'deployment/modelscope/git-askpass.mjs')
await writeFile(askpass,process.platform==='win32'?'@echo off\r\n"%MS_ASKPASS_NODE%" "%MS_ASKPASS_HELPER%" %*\r\n':'#!/bin/sh\nexec "$MS_ASKPASS_NODE" "$MS_ASKPASS_HELPER" "$@"\n',{mode:0o700})
const {MS_DEPLOY_TOKEN:omitted,...gitBaseEnv}=process.env
const gitEnv={...gitBaseEnv,GIT_ASKPASS:askpass,GIT_TERMINAL_PROMPT:'0',MS_ASKPASS_NODE:process.execPath,MS_ASKPASS_HELPER:helper,MS_GIT_CREDENTIAL:credential}
function run(args,cwd){const result=spawnSync(git,['-c','credential.helper=','-c','core.autocrlf=false',...args],{cwd,env:gitEnv,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:16*1024*1024});if(result.error||result.status!==0)throw Error('Git '+args[0]+' 未完成；不会强制推送。'+(result.error?' '+result.error.code:'')+'\n'+redactPlatformOutput(result.stderr,[credential,process.env.MS_DEPLOY_TOKEN]));return result.stdout}
const checkout=path.join(temp,'checkout')
stage='clone-owned-repository'
console.log('正在拉取现有创空间仓库。')
run(['clone','https://modelscope.cn/studios/'+repo+'.git',checkout],temp)
if(existing){let marker;try{marker=JSON.parse(await readFile(path.join(checkout,'.smart-accessible-studio.json'),'utf8'))}catch{}const resumable=existing.id&&previous?.createdId===existing.id&&previous?.repo===repo&&previous?.app==='smart-accessible-travel';if(marker?.app!=='smart-accessible-travel'&&!resumable)throw Error('同名仓库未标记为本作品，已停止覆盖。请使用新的创空间名称。')}
stage='configure-application-origin'
console.log('仓库已拉取，正在核对应用域名配置。')
await ensureStudioOrigin(api,apiPath,'https://starovo-smart-accessible-travel.ms.show')
const refs=run(['for-each-ref','--format=%(refname)','refs/remotes/origin'],checkout).split(/\r?\n/)
if(refs.includes('refs/remotes/origin/master'))run(['checkout','master'],checkout)
else if(refs.some(ref=>ref&&ref!=='refs/remotes/origin/HEAD'))throw Error('仓库已有其他分支，请先核对，不会覆盖或重命名。')
else run(['symbolic-ref','HEAD','refs/heads/master'],checkout)
await cp(source,checkout,{recursive:true})
stage='upload-source'
console.log('正在提交并推送新版源码。')
run(['add','--all'],checkout)
if(run(['diff','--cached','--name-only'],checkout).trim()){
  run(['-c','user.name=starovo','-c','user.email=starovo@users.noreply.modelscope.cn','commit','-m','Deploy smart accessible travel'],checkout)
  run(['push','origin','master'],checkout)
}
console.log('远端仓库已包含新版源码。')
if(existing){
  stage='replace-previous-build'
  const retryStalledStop=/^stopping$/i.test(existing.status??'')&&previousPublishError?.stage==='replace-previous-build'
  if(retryStalledStop)console.log('上一轮已等待停止超时；向同一个创空间提交一次部署请求，由平台决定是否接受。')
  if(/building|running|starting|stopping/i.test(existing.status??'')&&!retryStalledStop){
    if(!/stopping/i.test(existing.status??''))await api(apiPath+'/stop',{method:'POST'})
    console.log('已请求停止本作品的上一版构建或实例，准备更新同一个免费创空间。')
    let stopped=false
    let lastStopState=''
    for(let attempt=0;attempt<120;attempt++){
      const current=await api(apiPath)
      await writeFile(path.join(root,'.studio-status.json'),JSON.stringify({repo,state:current.status,checkedAt:new Date().toISOString(),aiVerified:false},null,2))
      if(current.status!==lastStopState){console.log('等待旧实例停止：'+current.status);lastStopState=current.status}
      if(!/building|running|starting|stopping/i.test(current.status??'')){stopped=true;break}
      await new Promise(resolve=>setTimeout(resolve,5000))
    }
    if(!stopped)throw Error('上一版仍在停止中。代码已上传，请等待平台停止后再部署；未重复提交部署。')
  }
  stage='update-changed-settings'
  if(!await updateStudioSettingsIfChanged(api,apiPath,existing,plan))console.log('免费硬件和公开范围已符合配置，跳过设置更新。')
}
stage='request-deployment'
await api(apiPath+'/deploy',{method:'POST'})
const result={app:'smart-accessible-travel',repo,createdId,url:'https://modelscope.cn/studios/'+repo,status:'deployment_requested',at:new Date().toISOString()}
await writeFile(path.join(root,'.studio-publish-result.json'),JSON.stringify(result,null,2))
await writeFile(path.join(root,'.studio-publish-error.json'),JSON.stringify({stage:'none',message:'',at:new Date().toISOString()},null,2))
console.log('已请求构建：'+result.url)
console.log('这还不代表运行成功。请检查构建和运行日志，并实际验证在线图文解读。')
stage='monitor-deployment'
const outcome=await monitorStudio(api,repo,root,{secrets:[process.env.MS_DEPLOY_TOKEN,credential],checkReadiness:async()=>{
  const response=await fetch('https://starovo-smart-accessible-travel.ms.show/api/status',{signal:AbortSignal.timeout(15000)})
  return response.ok&&(await response.json()).configured===true
}})
if(/error|failed/i.test(outcome.state))throw Error('云端构建或运行失败，具体日志已保存到 .studio-logs。')
