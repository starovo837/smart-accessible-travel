import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {copyDictionary} from '../src/app/copyDictionary.ts'
const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8')
const css=await readFile(new URL('../src/travel-task.css',import.meta.url),'utf8')
test('default expanded presentation remains available and every dictionary entry avoids banned copy',()=>{
 assert.match(app,/travelSingleStep:\s*false/)
 const banned=/满配|基线|参数|依据等级|生成时间|待补条件|可执行行动|本段本次无适用行动|当前显示|编排建议|按你填写的行程和资料整理|缺口卡|专属行动|模型推断/
 for(const [key,text] of Object.entries(copyDictionary))assert.ok(!banned.test(text),key)
 assert.ok(Object.values(copyDictionary).includes('去填写'))
 assert.ok(Object.values(copyDictionary).includes('导出本次清单'))
 assert.match(css,/\.screen\.travel-task-result \{[^}]*overflow:visible/)
})
