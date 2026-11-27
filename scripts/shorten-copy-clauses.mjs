import {readFile,writeFile} from 'node:fs/promises'
const file='src/app/copyDictionary.ts',source=await readFile(file,'utf8'),start=source.indexOf('{'),end=source.lastIndexOf('}'),dictionary=JSON.parse(source.slice(start,end+1))
// Split long authored clauses at existing punctuation. Leave quotations, prompts,
// patterns, addresses and indivisible names intact instead of cutting facts.
let changed=0
for(const [key,text] of Object.entries(dictionary)){
 if(/[<>\\]|JSON|https?:|摘录|产品资料|尺寸（|quote|sourceId|\d.*[×X]/.test(text))continue
 const result=text.split(/([。！？；\n])/).map(part=>{
  if(part.length<=30)return part
  return part.replace(/[，,]/g,'。').replace(/；/g,'。')
 }).join('')
 if(result!==text){dictionary[key]=result;changed++}
}
await writeFile(file,source.slice(0,start)+JSON.stringify(dictionary,null,2)+'\n')
console.log(JSON.stringify({changed}))
