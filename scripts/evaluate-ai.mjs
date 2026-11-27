// Reproducible local-only benchmark. Sends only the versioned public/synthetic dataset.
import { writeFile } from 'node:fs/promises'
import { benchmarkCases, evaluationVersion, runRuleBenchmark, scoreBenchmark, summarizeRuns } from '../src/app/evaluation.ts'
const origin='http://127.0.0.1:5173'
const status=await fetch(origin+'/api/status')
const cookie=(status.headers.get('set-cookie')??'').split(';')[0]
let ready=await status.json()
for(let i=0;!ready.configured&&i<10;i++) { await new Promise(r=>setTimeout(r,2000));ready=await (await fetch(origin+'/api/status',{headers:{cookie}})).json() }
if(!ready.configured)throw Error('Local model is not ready. No benchmark result was fabricated.')
const runs=[]
for(const item of benchmarkCases){
  runs.push(runRuleBenchmark(item))
  const start=performance.now()
  try{
    const response=await fetch(origin+'/api/product/analyze',{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({sources:item.sources,consent:true}),signal:AbortSignal.timeout(185000)})
    const payload=await response.json()
    if(!response.ok||payload.analysis?.insight?.engine!=='ollama')throw Error(payload.error??'No local-model evidence')
    const analysis=payload.analysis
    runs.push({caseId:item.id,method:'ai',at:new Date().toISOString(),elapsedMs:Math.round(performance.now()-start),model:analysis.insight.model,score:scoreBenchmark(item,analysis),analysis})
    console.log(item.id,JSON.stringify(runs.at(-1).score))
  }catch(error){runs.push({caseId:item.id,method:'ai',at:new Date().toISOString(),elapsedMs:Math.round(performance.now()-start),model:ready.model??'local',score:null,error:error.message});console.log(item.id,'FAILED',error.message)}
  // Respect the existing service limit without automatically retrying failed calls.
  await new Promise(r=>setTimeout(r,13000))
}
await writeFile(new URL('../src/app/evaluation-run.json',import.meta.url),JSON.stringify({version:evaluationVersion,at:new Date().toISOString(),scope:'8-case development dataset; seven synthetic cases and one public excerpt; not an independent clinical or usability validation',runs},null,2)+'\n')
console.log('AI',JSON.stringify(summarizeRuns(runs.filter(run=>run.method==='ai'))))
console.log('RULE',JSON.stringify(summarizeRuns(runs.filter(run=>run.method==='rule'))))
