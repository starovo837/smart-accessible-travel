import {reviewedSpecs} from './helpers/confirmed-specs.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {productFocus,travelQuestions,travelNextAction} from '../src/app/dailyFlow.ts'
import {localAnalysis,sampleBundles} from '../src/app/product.ts'
const cane={id:'cane',type:'cane',name:'盲杖',battery:'',dimensions:'',weight:'',source:'manual'}
test('product prioritizes a failed fit and a conflict without confirming or discarding the other findings',()=>{
 const product=localAnalysis(sampleBundles[0].sources,'sample',{doorCm:65,liftKg:20,oneHand:true,canFold:'no'}),before=JSON.stringify(product),focus=productFocus(product)
 assert.equal(focus.risks.length,2);assert.equal(focus.risks[0].tone,'danger');assert.ok([...focus.risks,...focus.otherRisks].some(row=>row.detail.includes('不能直线通过')));assert.ok(focus.otherRisks.length>0);assert.equal(focus.field,'foldHands');assert.equal(JSON.stringify(product),before)
})
test('travel prompts reuse actual values, branch only for the selected mode and never assume battery absence',()=>{
 const plane=travelQuestions('plane',[cane],{});assert.deepEqual(plane.map(row=>row.field),['batteryType'])
 const rail=travelQuestions('rail',[cane],{cane:reviewedSpecs({lengthCm:120,widthCm:2,heightCm:2,weightKg:.3})});assert.deepEqual(rail.map(row=>row.field),['batteryType'])
 assert.equal(travelQuestions('rail',[cane],{cane:reviewedSpecs({lengthCm:120,widthCm:2,heightCm:2,weightKg:.3,batteryType:'none'})}).length,0)
 const wheel={...cane,id:'wheel',type:'wheelchair'},values={wheel:reviewedSpecs({lengthCm:90,widthCm:65,heightCm:80,weightKg:32,batteryType:'lithium',batteryWh:200})}
 assert.deepEqual(travelQuestions('plane',[wheel],values).map(row=>row.field),['batteryCount','removable']);assert.equal(travelQuestions('rail',[wheel],values).length,0)
})
test('all devices retain a distinct question identity and one device cannot satisfy another',()=>{
 const result=travelQuestions('plane',[cane,{...cane,id:'second',name:'备用盲杖'}],{cane:reviewedSpecs({batteryType:'none'})});assert.equal(result.length,1);assert.equal(result[0].deviceId,'second');assert.equal(result[0].field,'batteryType')
})
test('travel action respects restrictions before missing data, and separates unavailable rules from editable parameters',()=>{
 assert.equal(travelNextAction([{eligibility:'restricted',missingInformation:['设备总重量']}]).kind,'script')
 assert.equal(travelNextAction([{eligibility:'unknown',missingInformation:['适用且在复核期限内的正式条款']}]).kind,'script')
 assert.equal(travelNextAction([{eligibility:'unknown',missingInformation:['适用且在复核期限内的正式条款','设备实际运输状态的长、宽、高']}]).kind,'supplement')
 assert.equal(travelNextAction([{eligibility:'conditional',missingInformation:[]}]).kind,'script');assert.equal(travelNextAction([{eligibility:'allowed',missingInformation:[]}]).kind,'list')
})
