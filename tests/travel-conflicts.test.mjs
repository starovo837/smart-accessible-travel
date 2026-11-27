import test from 'node:test'
import assert from 'node:assert/strict'
import {detectTravelConflict,resolveTravelConflicts} from '../src/app/travelConflicts.ts'
const action=(id,constraints)=>({id,title:id,detail:id,constraints,anchors:[],evidence:{level:'inference',officialUrl:'https://www.12306.cn'},verification:{phone:'12306'}})
const replace=({kind,actions})=>({...actions[0],id:'replacement',constraints:undefined,combined:{conflict:kind,reason:'人工核对',replacedTitles:actions.map(item=>item.title)}})
test('channel, process and directive constraints detect conflicts only in the same task',()=>{
 const visual=action('visual',{task:'notice',onlyChannel:'visual'}),audio=action('audio',{task:'notice',onlyChannel:'auditory'})
 assert.equal(detectTravelConflict(visual,audio,new Set(['visual','auditory'])),'channel')
 assert.equal(detectTravelConflict(visual,audio,new Set(['visual'])),undefined)
 assert.equal(detectTravelConflict(action('early',{task:'service',minimumLeadMinutes:60}),action('quiet',{task:'service',minimizeWaiting:true}),new Set()),'process')
 assert.equal(detectTravelConflict(action('go',{task:'boarding',directive:{key:'move',value:'yes'}}),action('stop',{task:'boarding',directive:{key:'move',value:'no'}}),new Set()),'instruction')
 assert.equal(detectTravelConflict({...visual,constraints:{...visual.constraints,task:'elsewhere'}},audio,new Set(['visual','auditory'])),undefined)
})
test('overlapping conflicts are replaced once and originals never survive',()=>{
 const rows=[action('a',{task:'boarding',directive:{key:'move',value:'yes'}}),action('b',{task:'boarding',directive:{key:'move',value:'no'}}),action('c',{task:'boarding',directive:{key:'move',value:'yes'}}),action('unrelated',{task:'other'})]
 const resolved=resolveTravelConflicts(rows,new Set(),replace)
 assert.deepEqual(resolved.map(row=>row.id),['replacement','unrelated'])
 assert.deepEqual(resolved[0].combined.replacedTitles,['a','b','c'])
 assert.deepEqual(resolved,resolveTravelConflicts(rows,new Set(),replace))
 assert.throws(()=>resolveTravelConflicts(rows,new Set(),()=>rows[0]))
})
