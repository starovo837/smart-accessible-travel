import { mkdir,readFile,writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { accountName,platformClient,redactPlatformOutput } from '../deployment/modelscope/platform.mjs'
const root=fileURLToPath(new URL('../',import.meta.url)),token=process.env.MS_DEPLOY_TOKEN
const clean=value=>redactPlatformOutput(value,[token])
try{
 const plan=JSON.parse(await readFile(path.join(root,'.studio-deploy-plan.json'),'utf8'))
 if(plan.owner!=='starovo'||plan.repo!=='smart-accessible-travel')throw Error('诊断目标不匹配，已停止。')
 const api=platformClient(token),repo=plan.owner+'/'+plan.repo
 if(accountName(await api('/users/me'))!==plan.owner)throw Error('令牌账号与诊断目标不匹配。')
 const info=await api('/studios/'+repo)
 await mkdir(path.join(root,'.studio-logs'),{recursive:true})
 for(const kind of ['build','run']){
   const result=await api('/studios/'+repo+'/logs/'+kind+'?page_size=200')
   const logs=(result.logs??[]).filter(line=>typeof line==='string').slice(-200).map(clean)
   await writeFile(path.join(root,'.studio-logs',kind+'.json'),JSON.stringify({logs},null,2))
   console.log(kind+' logs saved ('+logs.length+' lines).')
 }
 await writeFile(path.join(root,'.studio-diagnosis.json'),JSON.stringify({state:info.status,checkedAt:new Date().toISOString(),result:'logs_saved'},null,2))
 console.log('Diagnostics saved. No deployment or hardware changes were made.')
}catch(error){
 const message=clean(error?.message??error)
 await writeFile(path.join(root,'.studio-diagnosis.json'),JSON.stringify({result:'error',message,checkedAt:new Date().toISOString()},null,2))
 console.error(message);process.exitCode=1
}
