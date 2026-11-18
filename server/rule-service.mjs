import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, rm, open } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { ruleCatalog, ruleDocumentsFromResponse, safeRuleUrl, hasRuleReview, RULE_REVIEW_DAYS } from '../src/app/ruleCatalog.ts'
import { copyDictionary as c } from '../src/app/copyDictionary.ts'

const directory=process.env.SAI_DATA_DIR||fileURLToPath(new URL('../.app-data/',import.meta.url))
export const defaultRuleFile=join(directory,'rules.json')
const invalid=message=>Object.assign(Error(message),{status:400})
const validReviewer=input=>typeof input?.reviewer==='string'&&!!input.reviewer.trim()&&input.reviewer.trim().length<=80&&typeof input?.note==='string'&&!!input.note.trim()&&input.note.trim().length<=2000
export const plainRuleText=html=>html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#(\d+);/g,(_,n)=>{const code=Number(n);return code<=0x10ffff?String.fromCodePoint(code):''}).replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,'').replace(/×/g,'*')

/** A machine check cannot grant a review or extend an existing review. */
export function inspectRule(rule,text,now=Date.now()) {
  const normalized=plainRuleText(text),hash=createHash('sha256').update(normalized).digest('hex')
  const anchors=rule.excerpts.length>0&&rule.excerpts.every(item=>normalized.toLowerCase().includes(plainRuleText(item.text).toLowerCase()))
  const same=rule.contentHash===hash
  const status=!anchors||rule.contentHash&&!same?'changed':rule.status==='verified'&&hasRuleReview(rule)&&same?'verified':rule.status==='changed'?'changed':'unverified'
  return {...rule,lastFetchedAt:new Date(now).toISOString(),status,pendingHash:hash,anchorsMatch:anchors}
}
export function approveRule(rule,{reviewer,note,hash}={},now=Date.now()) {
  if(!validReviewer({reviewer,note})||!rule.anchorsMatch||!/^[a-f0-9]{64}$/.test(hash??'')||rule.pendingHash!==hash)throw invalid(c.ruleReviewRequired)
  return {...rule,status:'verified',contentHash:hash,reviewer:reviewer.trim(),reviewNote:note.trim(),checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+RULE_REVIEW_DAYS*86400000).toISOString()}
}
export async function fetchRuleText(rule,{fetcher=fetch,timeoutMs=15000,maxBytes=2*1024*1024}={}) {
  if(!safeRuleUrl(rule.url)||!Number.isInteger(timeoutMs)||timeoutMs<=0||timeoutMs>15000||!Number.isInteger(maxBytes)||maxBytes<=0||maxBytes>2*1024*1024)throw invalid(c.ruleFetchFailed)
  const controller=new AbortController();let reader,timer
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(invalid(c.ruleFetchFailed))},timeoutMs)})
  const work=(async()=>{
    const response=await fetcher(rule.url,{signal:controller.signal,redirect:'error',headers:{'User-Agent':'SmartAccessibleTravel/1.0 source-verification'}})
    if(!response.ok||response.redirected||Number(response.headers.get('content-length'))>maxBytes)throw invalid(c.ruleFetchFailed)
    reader=response.body?.getReader();if(!reader)throw invalid(c.ruleFetchFailed)
    let bytes=0;const chunks=[]
    while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>maxBytes)throw invalid(c.ruleFetchFailed);chunks.push(chunk.value)}
    return Buffer.concat(chunks).toString('utf8')
  })()
  try{return await Promise.race([work,timeout])}finally{clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{})}
}
const sameSource=(seed,row)=>seed.url===row.url&&seed.version===row.version&&seed.operator===row.operator&&JSON.stringify(seed.modes)===JSON.stringify(row.modes)&&JSON.stringify(seed.excerpts)===JSON.stringify(row.excerpts)&&seed.city===row.city&&seed.line===row.line
/** Legacy auto-approved files without human metadata are downgraded on read. */
export function storedRuleDocuments(raw,{strict=false}={}) {
  if(!Array.isArray(raw))throw invalid(c.ruleFileInvalid)
  const prepared=raw.map(row=>{
    if(row?.status==='verified'&&!hasRuleReview(row)){
      if(strict)throw invalid(c.ruleImportRejected)
      return {...row,status:'unverified',checkedAt:null,expiresAt:null}
    }
    return row
  })
  const records=ruleDocumentsFromResponse({documents:prepared})
  if(records.some(row=>!ruleCatalog.some(seed=>seed.id===row.id)))throw invalid(c.ruleImportRejected)
  return ruleCatalog.map(seed=>{
    const row=records.find(item=>item.id===seed.id)
    if(!row)return structuredClone(seed)
    if(!sameSource(seed,row)){
      if(strict)throw invalid(c.ruleImportRejected)
      return {...structuredClone(seed),status:'changed'}
    }
    return {...row,title:seed.title}
  })
}
export async function readRuleRecords(file=defaultRuleFile,options) {
  try{
    const raw=await readFile(file,'utf8');if(Buffer.byteLength(raw)>2*1024*1024)throw invalid(c.ruleFileInvalid)
    return storedRuleDocuments(JSON.parse(raw),options)
  }catch(error){if(error.code==='ENOENT')return structuredClone(ruleCatalog);throw invalid(c.ruleFileInvalid)}
}
export async function writeRuleRecords(file,records) {
  const validated=storedRuleDocuments(records,{strict:true}),temporary=file+'.'+randomBytes(8).toString('hex')+'.tmp'
  await mkdir(dirname(file),{recursive:true});let created=false
  try{const handle=await open(temporary,'wx',0o600);created=true;try{await handle.writeFile(JSON.stringify(validated,null,2))}finally{await handle.close()}await rename(temporary,file)}finally{if(created)await rm(temporary,{force:true}).catch(()=>{})}
}
/** No bundled review means unverified seeds, including after a redeployment. */
export async function initializeRuleFile({bundledFile,dataDirectory,notify=console.warn}) {
  let records=structuredClone(ruleCatalog),rejected=false
  try{const raw=await readFile(bundledFile,'utf8');if(Buffer.byteLength(raw)>2*1024*1024)throw invalid(c.ruleImportRejected);records=storedRuleDocuments(JSON.parse(raw),{strict:true})}
  catch(error){if(error.code!=='ENOENT'){rejected=true;notify(c.ruleImportRejected)}}
  await writeRuleRecords(join(dataDirectory,'rules.json'),records)
  return {records,rejected}
}
export function createRuleService({fetcher=fetch,file=defaultRuleFile}={}) {
  let active
  const load=()=>readRuleRecords(file)
  return {
    get:load,
    async approve(id,input){
      if(active)throw invalid(c.ruleReviewBusy)
      if(!validReviewer(input)||!/^[a-f0-9]{64}$/.test(input?.hash??''))throw invalid(c.ruleReviewRequired)
      active=(async()=>{
        const records=await load(),rule=records.find(item=>item.id===id)
        if(!rule)throw invalid(c.ruleReviewRequired)
        let inspected
        try{inspected=inspectRule(rule,await fetchRuleText(rule,{fetcher}))}
        catch(error){await writeRuleRecords(file,records.map(item=>item.id===id?{...item,status:'fetch-failed',lastFetchedAt:new Date().toISOString()}:item));throw error}
        if(inspected.pendingHash!==input.hash||!inspected.anchorsMatch){
          await writeRuleRecords(file,records.map(item=>item.id===id?{...inspected,status:'changed'}:item))
          throw invalid(c.ruleSourceChanged)
        }
        const approved=approveRule(inspected,input)
        const next=records.map(item=>item.id===id?approved:item);await writeRuleRecords(file,next);return next
      })().finally(()=>{active=undefined})
      return active
    },
    async refresh(){
      if(active)return active
      active=(async()=>{
        const records=await load(),downloads=new Map(),next=[]
        for(const rule of records){try{if(!downloads.has(rule.url))downloads.set(rule.url,fetchRuleText(rule,{fetcher}));next.push(inspectRule(rule,await downloads.get(rule.url)))}catch{next.push({...rule,status:'fetch-failed',lastFetchedAt:new Date().toISOString()})}}
        await writeRuleRecords(file,next);return next
      })().finally(()=>{active=undefined})
      return active
    }
  }
}
export const ruleService=createRuleService()
