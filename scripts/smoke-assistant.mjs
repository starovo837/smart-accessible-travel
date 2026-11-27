// Explicit local-only smoke test using synthetic widths, never user records.
import assert from 'node:assert/strict'
import {assistantEvidence,packEvidence} from '../src/app/assistantEvidence.ts'
import {normalizeAnalysis} from '../src/app/product.ts'
const base='http://127.0.0.1:5173'
let cookie,ready=false
for(let attempt=0;attempt<14;attempt++){
 const response=await fetch(base+'/api/status'),state=await response.json()
 cookie=response.headers.get('set-cookie')?.split(';')[0]??cookie
 if(state.configured&&state.localOnly===true){ready=true;break}
 await new Promise(resolve=>setTimeout(resolve,3000))
}
assert.ok(ready,'The local-only model is not ready.')
const product=normalizeAnalysis({category:'manual-wheelchair',facts:[{sourceId:'m',field:'widthCm',value:'68',unit:'cm',quote:'设备宽度68cm'}]},[{id:'m',name:'合成验收说明书',kind:'manual',text:'设备宽度68cm'}],'ai',{doorCm:65,oneHand:false,canFold:'unknown'})
const response=await fetch(base+'/api/assistant/answer',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({consent:true,question:'这台设备能直线通过我家门吗？不要把68说成小于65。',evidence:packEvidence(assistantEvidence(product)).items}),signal:AbortSignal.timeout(90000)})
const data=await response.json()
assert.equal(response.status,200,data.error)
assert.equal(data.composition,'verified-statements')
assert.match(data.answer,/不能直线通过/)
assert.ok(!data.answer.includes('小于65'))
console.log(JSON.stringify({ok:true,engine:data.engine,model:data.model,composition:data.composition,statementIds:data.statementIds,answer:data.answer}))
