import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { storedRuleDocuments } from '../../server/rule-service.mjs'
import { copyDictionary as c } from '../../src/app/copyDictionary.ts'

const rootFiles=['Dockerfile','.dockerignore','package.json','pnpm-lock.yaml','tsconfig.json','tsconfig.app.json','tsconfig.node.json','vite.config.ts','index.html']
const gestureRuntime=['gesture_recognizer.task','vision_wasm_internal.js','vision_wasm_internal.wasm','vision_wasm_module_internal.js','vision_wasm_module_internal.wasm','vision_wasm_nosimd_internal.js','vision_wasm_nosimd_internal.wasm'].map(name=>'public/mediapipe/'+name)
const fixedFiles=[...gestureRuntime,'public/images/seu-sipailou-fountain.jpg','public/images/seu-sipailou-fountain.LICENSE.txt','public/images/seu-emblem.SOURCE.txt','docs/工作台与校园主题.md','docs/出行任务编排-实现与验收.md','public/mediapipe/LICENSE.txt','docs/分类辅助平台-实现与验收.md','docs/生活服务-实现与验收.md','docs/真实服务渠道核验.md','desktop/server.mjs','scripts/build-offline.mjs','scripts/assert-travel-copy.mjs','deployment/modelscope/start.mjs','deployment/modelscope/download-model.mjs','docs/三维量身选辅具-实现提示语.md','docs/third-party/hello-ai-LICENSE.txt']
fixedFiles.push('docs/学习支持中心-实现与验收.md','docs/学习资源核验台账.md','docs/学习资源候选池.md')
fixedFiles.push('scripts/review-rules.mjs','docs/规则核验链路-A批实现与验收.md')
fixedFiles.push('docs/设备证据-B批实现与验收.md')
fixedFiles.push('docs/档案授权-C批实现与验收.md')
fixedFiles.push('docs/会话与限流-D批实现与验收.md')
fixedFiles.push('docs/日常交互与隐私-E批实现与验收.md')
fixedFiles.push('scripts/assert-plain-copy.mjs')
const extensions=new Set(['.ts','.tsx','.mjs','.mts','.css','.svg','.png','.webmanifest','.json','.webp'])
const reviewedFile='deployment/modelscope/rules.verified.json'
const reviewedMirror='server/bundled-rules.verified.json'
export async function bundledRuleBytes(root){
  let bytes
  try{bytes=await readFile(path.join(root,reviewedFile))}catch(error){if(error.code==='ENOENT')return null;throw error}
  if(bytes.length>2*1024*1024)throw Error(c.ruleBundleTooLarge)
  if(secretPattern.test(bytes.toString('utf8')))throw Error(c.ruleBundleSecret)
  const records=storedRuleDocuments(JSON.parse(bytes.toString('utf8')),{strict:true})
  return Buffer.from(JSON.stringify(records,null,2))
}
const secretPattern=/(?:\bms-[a-zA-Z0-9_-]{16,}|sk-(?:proj-)?[a-zA-Z0-9_-]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:MODELSCOPE_API_KEY|MS_DEPLOY_TOKEN|OPENAI_API_KEY)\s*[:=]\s*["'][^"'\s]{16,}["'])/

// This repository intentionally uses an explicit Docker allowlist. Check the
// contract between its COPY inputs, upload inventory and the allowlist before
// making any platform writes; an uploaded file may still be hidden from Docker.
export async function validateStudioContext(root,files){
  const dockerfile=await readFile(path.join(root,'Dockerfile'),'utf8')
  const rules=(await readFile(path.join(root,'.dockerignore'),'utf8')).split(/\r?\n/).map(line=>line.trim())
  for(const line of dockerfile.split(/\r?\n/)){
    if(!/^COPY\s/i.test(line)||/^COPY\s+--from=/i.test(line))continue
    const sources=line.trim().split(/\s+/).slice(1,-1)
    for(const source of sources){
      const folder=files.some(file=>file.startsWith(source+'/'))
      const matches=files.filter(file=>file===source||path.matchesGlob(file,source)||folder&&file.startsWith(source+'/'))
      if(!matches.length)throw Error('Docker 构建所需文件未在上传清单中：'+source)
      if(folder){if(!rules.includes('!'+source+'/')||!rules.includes('!'+source+'/**'))throw Error('Docker 构建目录未在白名单中开放：'+source)}
      else{
        if(!rules.includes('!'+source))throw Error('Docker 构建文件被白名单排除：'+source)
        const parents=source.split('/').slice(0,-1)
        for(let index=1;index<=parents.length;index++)if(!rules.includes('!'+parents.slice(0,index).join('/')+'/'))throw Error('Docker 构建父目录未在白名单中开放：'+source)
      }
    }
  }
}

export async function studioFiles(root){
  const files=[...rootFiles,...fixedFiles,'public/models/person.glb','docs/法定分类与复合出行-实施记录.md']
  async function walk(relative){
    for(const entry of await readdir(path.join(root,relative),{withFileTypes:true})){
      if(entry.isSymbolicLink())throw Error('上传源目录不能包含符号链接：'+relative+'/'+entry.name)
      const next=relative+'/'+entry.name
      if(next===reviewedMirror)throw Error(c.ruleBundleReserved)
      if(entry.isDirectory())await walk(next)
      else if(!entry.name.startsWith('.')&&extensions.has(path.extname(entry.name)))files.push(next)
    }
  }
  for(const folder of ['src','server','public'])await walk(folder)
  return files.sort()
}
export async function prepareStudio(root,destination){
  const files=await studioFiles(root)
  const ruleBytes=await bundledRuleBytes(root)
  await validateStudioContext(root,files)
  try{await stat(destination);throw Error('上传目录已存在，请使用新的目录；不会覆盖先前文件。')}catch(error){if(error.code!=='ENOENT')throw error}
  // Validate all files before creating the clean upload directory. Never print matched values.
  for(const file of [...files,'deployment/modelscope/README.md']){const data=await readFile(path.join(root,file));if(data.length>20*1024*1024)throw Error('上传文件过大：'+file);if(secretPattern.test(data.toString('utf8')))throw Error('检测到疑似凭证，已停止整理。请检查文件：'+file)}
  await mkdir(destination,{recursive:true})
  for(const file of files){await mkdir(path.dirname(path.join(destination,file)),{recursive:true});await cp(path.join(root,file),path.join(destination,file))}
  if(ruleBytes)await writeFile(path.join(destination,reviewedMirror),ruleBytes)
  await cp(path.join(root,'deployment/modelscope/README.md'),path.join(destination,'README.md'))
  await writeFile(path.join(destination,'.gitignore'),'node_modules/\ndist/\n.env*\n.app-data/\n.local-ai/\n')
  return {directory:destination,files:files.length+2+(ruleBytes?1:0)}
}
