import { spawn } from 'node:child_process'
import { mkdir, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { LOCAL_MODEL } from '../../server/local-ai.mjs'
import { initializeRuleFile } from '../../server/rule-service.mjs'

// Model inference uses a loopback engine in this container. No paid model API.
process.env.SAI_DEPLOYMENT='studio'
process.env.PORT='7860'
process.env.SAI_DATA_DIR||='/mnt/workspace/smart-accessible/data'
process.env.OLLAMA_MODELS||='/opt/smart-models'
Object.assign(process.env,{OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_NO_CLOUD:'1',OLLAMA_NUM_PARALLEL:'1',OLLAMA_MAX_LOADED_MODELS:'1',OLLAMA_CONTEXT_LENGTH:'16384',OLLAMA_DEBUG:'0'})
await Promise.all([mkdir(process.env.SAI_DATA_DIR,{recursive:true}),mkdir(process.env.OLLAMA_MODELS,{recursive:true})])
// The uploader mirrors only the validated, optional review file into server/.
// That directory is already carried by the Docker allowlist. No wider COPY.
const directReviewFile=fileURLToPath(new URL('./rules.verified.json',import.meta.url))
let bundledFile=directReviewFile
try{await access(directReviewFile)}catch(error){if(error.code==='ENOENT')bundledFile=fileURLToPath(new URL('../../server/bundled-rules.verified.json',import.meta.url))}
await initializeRuleFile({bundledFile,dataDirectory:process.env.SAI_DATA_DIR})
const children=new Set()
let stopping=false
function stop(code=0){
  if(stopping)return
  stopping=true
  for(const child of children)child.kill('SIGTERM')
  const timer=setTimeout(()=>{for(const child of children)child.kill('SIGKILL');process.exit(code)},5000)
  timer.unref()
  if(!children.size)process.exit(code)
  process.exitCode=code
}
function launch(command,args,critical=true){
  const child=spawn(command,args,{stdio:'inherit',env:process.env})
  children.add(child)
  child.on('error',()=>{console.error('A required Studio service could not start.');if(critical)stop(1)})
  child.on('exit',code=>{children.delete(child);if(stopping){if(!children.size)process.exit(process.exitCode||0)}else if(critical)stop(code||1)})
  return child
}
process.on('SIGINT',()=>stop())
process.on('SIGTERM',()=>stop())
launch('ollama',['serve'])
// The build includes verified weights. Render basic flows while the engine starts.
launch(process.execPath,['desktop/server.mjs'])
async function prepareModel(){
  for(let attempt=0;attempt<30&&!stopping;attempt++){
    try{
      const response=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(1500)})
      if(response.ok){
        const data=await response.json()
        if(data.models?.some(model=>model.name===LOCAL_MODEL)){console.log('Studio model is installed.');return}
        console.error('The verified model is missing from the image. AI is disabled. Inspect the build; startup does not launch a background download.')
        return
      }
    }catch{/* Wait only for local engine readiness. Never retry user inference. */}
    await new Promise(resolve=>setTimeout(resolve,1000))
  }
  if(!stopping)console.error('Model engine is unavailable. AI is disabled; inspect Studio logs.')
}
void prepareModel()
