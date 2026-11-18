import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { ruleCatalog } from '../src/app/ruleCatalog.ts'
import { copyDictionary as c } from '../src/app/copyDictionary.ts'
import { inspectRule,approveRule,fetchRuleText,readRuleRecords,writeRuleRecords,defaultRuleFile } from '../server/rule-service.mjs'

/** Reviewer and note are explicit human inputs. checkOnly never writes. */
export async function reviewRules({reviewer,note,checkOnly=false,file=defaultRuleFile,fetcher=fetch,now=Date.now()}={}) {
  if(!checkOnly&&(typeof reviewer!=='string'||!reviewer.trim()||reviewer.trim().length>80||typeof note!=='string'||!note.trim()||note.trim().length>2000))throw Error(c.ruleReviewRequired)
  const records=await readRuleRecords(file),next=[],downloads=new Map()
  for(const seed of ruleCatalog){
    const rule=records.find(item=>item.id===seed.id)??seed
    try{
      if(!downloads.has(rule.url))downloads.set(rule.url,fetchRuleText(rule,{fetcher}))
      const inspected=inspectRule(rule,await downloads.get(rule.url),now)
      next.push(!checkOnly&&inspected.anchorsMatch?approveRule(inspected,{reviewer,note,hash:inspected.pendingHash},now):inspected)
    }catch{next.push({...rule,status:'fetch-failed',lastFetchedAt:new Date(now).toISOString()})}
  }
  if(!checkOnly)await writeRuleRecords(file,next)
  return {records:next,written:!checkOnly,ok:next.every(rule=>rule.anchorsMatch&&rule.status!=='fetch-failed')}
}
async function main(args){
  const flags={};for(let i=0;i<args.length;i++){
    const key=args[i]
    if(key==='--check'&&!flags.checkOnly){flags.checkOnly=true;continue}
    if(['--reviewer','--note'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--')&&flags[key.slice(2)]===undefined){flags[key.slice(2)]=args[++i];continue}
    throw Error(c.ruleReviewUsage)
  }
  if(flags.checkOnly&&(flags.reviewer||flags.note))throw Error(c.ruleReviewUsage)
  const result=await reviewRules(flags)
  console.log(result.written?c.ruleReviewWritten:c.ruleReviewCheckOnly)
  for(const row of result.records)console.log(JSON.stringify({id:row.id,status:row.status,anchorsMatch:row.anchorsMatch===true,checkedAt:row.checkedAt,expiresAt:row.expiresAt}))
  if(!result.ok)process.exitCode=1
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1})
