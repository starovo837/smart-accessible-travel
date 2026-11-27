// One explicitly invoked synthetic test. An optional argument is the generated test PNG.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { chosenFact, conflictsOf } from '../src/app/product.ts'
const base='http://127.0.0.1:5173'
const status=await fetch(base+'/api/status'),cookie=status.headers.get('set-cookie')?.split(';')[0],config=await status.json()
if(!config.configured||!cookie||config.localOnly!==true)throw Error('The local-only AI engine is not ready.')
const imagePath=process.argv[2]
const sources=imagePath?[{id:'synthetic-image',name:'合成测试参数图',kind:'merchant',text:'',image:'data:image/png;base64,'+(await readFile(imagePath)).toString('base64')}]:[{id:'synthetic-detail',name:'合成测试商品详情',kind:'merchant',text:'测试X1电动轮椅。使用尺寸（长×宽×高）105×68×98 cm，整车32 kg不含电池。宣传单手折叠。'},{id:'synthetic-manual',name:'合成测试说明书',kind:'manual',text:'测试X1的折叠操作需要双手。电池可拆卸，驱动电池1块，锂电池。没有提供标称Wh。'}]
const response=await fetch(base+'/api/product/analyze',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({sources,consent:true}),signal:AbortSignal.timeout(190000)}),data=await response.json()
if(!response.ok){console.log(JSON.stringify({ok:false,status:response.status,code:data.code,message:data.error}));process.exitCode=1}
else {
  const insight=data.analysis?.insight
  assert.equal(insight?.engine,'ollama');assert.equal(insight?.mode,'ai')
  if(imagePath){assert.equal(data.analysis.deviceType,'manual-wheelchair');assert.equal(Number(chosenFact(insight,'widthCm')?.value),61);assert.equal(Number(chosenFact(insight,'weightKg')?.value),14.5);assert.equal(chosenFact(insight,'batteryType')?.value,'none')}
  else {assert.equal(data.analysis.deviceType,'wheelchair');assert.equal(Number(chosenFact(insight,'widthCm')?.value),68);assert.equal(Number(chosenFact(insight,'weightKg')?.value),32);assert.equal(chosenFact(insight,'batteryWh'),undefined);assert.ok(conflictsOf(insight).some(conflict=>conflict.field==='foldHands'))}
  console.log(JSON.stringify({ok:true,input:imagePath?'synthetic-image':'synthetic-text',model:insight.model,title:data.analysis.title,category:data.analysis.deviceType,facts:insight.facts.length,fields:insight.facts.map(fact=>({field:fact.field,value:fact.value,verification:fact.verification}))}))
}
