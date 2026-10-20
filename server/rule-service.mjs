import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { ruleCatalog } from '../src/app/ruleCatalog.ts'
const directory=process.env.SAI_DATA_DIR||fileURLToPath(new URL('../.app-data/',import.meta.url)), filename=directory.replace(/[\\/]?$/,'/')+'rules.json'
export const plainRuleText=html=>html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,'').replace(/×/g,'*')
export function inspectRule(rule,text,now=Date.now()) {
  const normalized=plainRuleText(text), hash=createHash('sha256').update(normalized).digest('hex'), anchors=rule.excerpts.every(item=>normalized.toLowerCase().includes(plainRuleText(item.text).toLowerCase()))
  const same=!rule.contentHash||rule.contentHash===hash
  return {...rule,lastFetchedAt:new Date(now).toISOString(),status:anchors&&same?'verified':'changed',...(anchors&&same?{checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+7*86400000).toISOString()}:{}),contentHash:rule.contentHash||hash,pendingHash:hash,anchorsMatch:anchors}
}
export function createRuleService({fetcher=fetch,file=filename}={}) {
  let cache,active
  const load=async()=>{if(cache)return cache;try{const records=JSON.parse(await readFile(file,'utf8'));cache=ruleCatalog.map(seed=>({...seed,...records.find(item=>item.id===seed.id),url:seed.url,excerpts:seed.excerpts}))}catch{cache=structuredClone(ruleCatalog)}return cache}
  const save=async()=>{await mkdir(dirname(file),{recursive:true});await writeFile(file+'.tmp',JSON.stringify(cache,null,2));await rename(file+'.tmp',file)}
  return {get:load,async approve(id,input){if(active)throw Error('请等待来源核验完成。');const records=await load(),rule=records.find(item=>item.id===id);if(!rule||!rule.anchorsMatch||rule.pendingHash!==input.hash||!String(input.note??'').trim())throw Error('必须核对当前版本的完整原文、全部条款和说明后才能复核。');rule.contentHash=rule.pendingHash;rule.status='verified';rule.checkedAt=new Date().toISOString();rule.expiresAt=new Date(Date.now()+7*86400000).toISOString();rule.version=new Date().toISOString();rule.reviewNote=String(input.note).slice(0,2000);await save();return cache},async refresh(){if(active)return active;active=(async()=>{const records=await load(),downloads=new Map();cache=await Promise.all(records.map(async rule=>{try{if(!downloads.has(rule.url))downloads.set(rule.url,(async()=>{const response=await fetcher(rule.url,{signal:AbortSignal.timeout(15000),redirect:'error',headers:{'User-Agent':'SmartAccessibleTravel/1.0 source-verification'}});if(!response.ok)throw Error('source unavailable');const reader=response.body?.getReader();let bytes=0,chunks=[];if(!reader)throw Error('empty');while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>2*1024*1024){await reader.cancel();throw Error('source too large')}chunks.push(chunk.value)}return Buffer.concat(chunks).toString('utf8')})());return inspectRule(rule,await downloads.get(rule.url))}catch{return {...rule,status:'fetch-failed',lastFetchedAt:new Date().toISOString()}}}));await save();return cache})().finally(()=>{active=undefined});return active}}
}
export const ruleService=createRuleService()
