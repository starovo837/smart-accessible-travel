import ts from '../tmp/copy-tools/node_modules/typescript/lib/typescript.js'
import {readFile,writeFile,readdir,mkdir,access} from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'

// One-time mechanical migration. Run from the project root; no network access.
const dictionaryOnly=process.argv.includes('--dictionary-only')
const root=path.resolve(dictionaryOnly?'tmp/copy-migration-before':'src'),dictionaryPath=path.resolve('src/app/copyDictionary.ts')
if(!dictionaryOnly){let exists=false;try{await access(dictionaryPath);exists=true}catch{}if(exists)throw new Error('One-time migration already completed; edit the existing dictionary instead.')}
const dictionary={},chinese=/[\u3400-\u9fff]/u
const replacements=[
 ['按你填写的行程和资料整理','随这次行程准备'],['本段本次无适用行动','这一步这次用不到'],
 ['首次生成尚无比较基线。',''],['依据等级','这条的出处'],['模型推断','这条是我们按常见情况估的，不一定准'],
 ['官方页面摘录','官网上写的'],['满配','资料齐全时'],['基线','上次清单'],['待补条件','还需填写的资料'],
 ['可执行行动','要做的事'],['编排建议','出行提醒'],['缺口卡','补充资料入口'],['专属行动','行程提醒'],
 ['生成时间','整理日期'],['当前显示','这里是'],['参数','资料'],['按需要','需要时'],
 ['视障模式','视力残疾'],['轮椅模式','肢体残疾'],['视障','视力残疾'],['听障','听力残疾'],
]
function rewrite(text){
 for(const [from,to] of replacements)text=text.split(from).join(to)
 text=text.replace(/先([^。！？；\n]{1,30}?)[，,]?再/g,'$1。')
 return text
}
function entry(text){
 const rewritten=rewrite(text),key='c'+createHash('sha256').update(text).digest('hex').slice(0,16)
 if(dictionary[key]!==undefined&&dictionary[key]!==rewritten)throw new Error('Copy dictionary collision')
 dictionary[key]=rewritten
 return ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('copyDictionary'),key)
}
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});const result=[];for(const item of entries){const file=path.join(dir,item.name);if(item.isDirectory())result.push(...await files(file));else if(/\.tsx?$/.test(item.name)&&!item.name.endsWith('.d.ts'))result.push(file)}return result}
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed})
await mkdir('tmp/copy-migration-before',{recursive:true})
let changed=0
for(const file of await files(root)){
 if(file===dictionaryPath)continue
 const source=await readFile(file,'utf8'),sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 let used=false
 const transform=context=>{
  const visit=node=>{
   if(ts.isTypeNode(node))return node
   if(ts.isJsxAttribute(node)&&node.initializer&&ts.isStringLiteral(node.initializer)&&chinese.test(node.initializer.text)){
    used=true;return ts.factory.updateJsxAttribute(node,node.name,ts.factory.createJsxExpression(undefined,entry(node.initializer.text)))
   }
   if(ts.isJsxText(node)&&chinese.test(node.text)){
    const lines=node.text.replace(/\r/g,'').split('\n'),text=lines.map((line,index)=>index===0?line.trimEnd():line.trim()).filter(Boolean).join(' ')
    used=true;return ts.factory.createJsxExpression(undefined,entry(text))
   }
   if((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))&&chinese.test(node.text)){
    const parent=node.parent
    if(parent&&(ts.isPropertyAssignment(parent)&&parent.name===node||ts.isPropertySignature(parent)&&parent.name===node||ts.isImportDeclaration(parent)||ts.isExportDeclaration(parent)))return node
    used=true;return entry(node.text)
   }
   if(ts.isTemplateExpression(node)&&[node.head.text,...node.templateSpans.map(span=>span.literal.text)].some(text=>chinese.test(text))){
    used=true;let expression=entry(node.head.text)
    for(const span of node.templateSpans){expression=ts.factory.createBinaryExpression(expression,ts.SyntaxKind.PlusToken,ts.visitNode(span.expression,visit));if(span.literal.text)expression=ts.factory.createBinaryExpression(expression,ts.SyntaxKind.PlusToken,entry(span.literal.text))}
    return expression
   }
   return ts.visitEachChild(node,visit,context)
  }
  return node=>ts.visitNode(node,visit)
 }
 const result=ts.transform(sf,[transform]),transformed=result.transformed[0]
 if(used&&!dictionaryOnly){
  const relative=path.relative(path.dirname(file),dictionaryPath).replace(/\\/g,'/'),specifier=relative.startsWith('.')?relative:'./'+relative
  const importNode=ts.factory.createImportDeclaration(undefined,ts.factory.createImportClause(false,undefined,ts.factory.createNamedImports([ts.factory.createImportSpecifier(false,undefined,ts.factory.createIdentifier('copyDictionary'))])),ts.factory.createStringLiteral(specifier))
  const output=printer.printFile(ts.factory.updateSourceFile(transformed,[importNode,...transformed.statements]))
  const backup=path.join('tmp/copy-migration-before',path.relative(root,file));await mkdir(path.dirname(backup),{recursive:true});await writeFile(backup,source)
  await writeFile(file,output);changed++
 }
 result.dispose()
}
await writeFile(dictionaryPath,'/** All authored interface text. Keep numbers, dates and official links unchanged. */\nexport const copyDictionary = '+JSON.stringify(dictionary,null,2)+'\n')
console.log(JSON.stringify({changedFiles:changed,entries:Object.keys(dictionary).length}))
