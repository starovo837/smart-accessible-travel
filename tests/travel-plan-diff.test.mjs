import test from 'node:test'
import assert from 'node:assert/strict'
import {diffTravelPlans} from '../src/app/travelPlanDiff.ts'

const action=(id,title)=>({id,title,detail:'核对本人行程',anchors:[],evidence:{level:'inference',status:'unverified',updatedAt:'2026-11-07'}})
const plan=actions=>({stages:[{id:'before',actions}],generalActions:[]})

test('trip change report distinguishes updated rules, added actions and removed titles',()=>{
 const previous=plan([action('same','原行动'),action('gone','已不适用的行动')])
 const next=plan([action('same','根据新行程调整'),action('new','新增行动')])
 assert.deepEqual(diffTravelPlans(previous,next),{added:['new'],removed:['已不适用的行动'],updated:['same']})
})
test('generation timestamps alone never announce an action change; general actions are included',()=>{
 const previous=plan([action('same','联系车站')]),next=structuredClone(previous)
 next.stages[0].actions[0].evidence.updatedAt='2026-11-08'
 assert.deepEqual(diffTravelPlans(previous,next),{added:[],removed:[],updated:[]})
 next.generalActions=[action('general','随身保存电话')]
 assert.deepEqual(diffTravelPlans(previous,next).added,['general'])
})
