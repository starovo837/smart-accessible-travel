import test from 'node:test'
import assert from 'node:assert/strict'
import {ruleCatalog,ruleDocumentsFromResponse} from '../src/app/ruleCatalog.ts'
import {buildTravelTaskPlan} from '../src/app/travelPlan.ts'
test('invalid rule service responses preserve the offline sources and their action coverage',()=>{
 let current=ruleCatalog
 for(const payload of [{error:'HTML fallback'},null,'<!doctype html>',{documents:undefined},{documents:[{}]}]){
  assert.throws(()=>{current=ruleDocumentsFromResponse(payload)},/有效规则列表/)
  assert.equal(current,ruleCatalog)
 }
 const plan=buildTravelTaskPlan({mode:'rail',devices:[],specs:{},context:{carrier:'unspecified',from:'上海虹桥',to:'杭州东'},documents:current})
 assert.equal(plan.completion.generated,12);assert.equal(plan.completion.total,20)
})
test('valid service sources keep their original dates and metadata',()=>{
 assert.deepEqual(ruleDocumentsFromResponse({documents:ruleCatalog}),ruleCatalog)
 assert.deepEqual(ruleDocumentsFromResponse({documents:[]}),[])
})
