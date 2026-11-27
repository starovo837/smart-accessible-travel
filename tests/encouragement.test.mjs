import test from 'node:test'
import assert from 'node:assert/strict'
import {createEncouragementCycle, encouragementMessages, selectEncouragement} from '../src/app/encouragement.ts'
const contexts=Object.keys(encouragementMessages)
test('encouragement is available in every supported context on every valid day',()=>{
 assert.ok(contexts.length>=11)
 for(let day=1;day<=35;day++){
  const morning=new Date(2026,9,day,8),evening=new Date(2026,9,day,22)
  const messages=contexts.map(context=>selectEncouragement(context,morning))
  assert.equal(messages.filter(Boolean).length,contexts.length)
  for(const context of contexts)assert.equal(selectEncouragement(context,morning),selectEncouragement(context,evening))
 }
})
test('page visits and manual changes rotate through the full collection before repeating',()=>{
 const next=createEncouragementCycle(),date=new Date(2026,9,27)
 for(const context of contexts){
  const count=encouragementMessages[context].length
  assert.ok(count>=8)
  const firstCycle=Array.from({length:count},()=>next(context,date))
  assert.equal(new Set(firstCycle).size,count)
  assert.equal(next(context,date),firstCycle[0])
 }
})
test('switching contexts preserves each independent rotation',()=>{
 const next=createEncouragementCycle(),date=new Date(2026,9,27)
 const first=next('home',date)
 next('hospital',date)
 assert.notEqual(next('home',date),first)
 assert.equal(next('home',new Date('invalid')),null)
})
test('copy is diverse, brief and avoids pity, comparison, or health promises',()=>{
 const messages=Object.values(encouragementMessages).flat()
 assert.ok(messages.length>=88)
 assert.equal(new Set(messages).size,messages.length)
 for(const text of messages){assert.ok(text.length<55);assert.ok(!/正常人|可怜|治愈|康复保证|一定能好|克服残疾|身残志坚/.test(text))}
 assert.equal(selectEncouragement('home',new Date('invalid')),null)
 assert.equal(selectEncouragement('home',new Date(),Infinity),null)
})
