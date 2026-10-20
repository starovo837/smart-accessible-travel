import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir,rename,rm,writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable,Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'

export const MODEL_ARTIFACT={name:'qwen3-vl:4b-instruct',repository:'library/qwen3-vl',tag:'4b-instruct',manifestHash:'84f7ed8042fa7cdbd902f7dcb7d0370e032095047cc3244179f263b77b5bc318'}
const registry='https://registry.ollama.ai/v2/'

export async function downloadBlob(descriptor,directory,{fetcher=fetch,notify=console.log}={}){
 if(!/^sha256:[a-f0-9]{64}$/.test(descriptor?.digest)||!Number.isSafeInteger(descriptor.size)||descriptor.size<1||descriptor.size>4_000_000_000)throw Error('Invalid model artifact descriptor.')
 await mkdir(path.join(directory,'blobs'),{recursive:true})
 const target=path.join(directory,'blobs',descriptor.digest.replace(':','-')),temporary=target+'.part'
 const hash=createHash('sha256');let size=0,nextReport=256*1024*1024
 try{
   const response=await fetcher(registry+MODEL_ARTIFACT.repository+'/blobs/'+descriptor.digest,{signal:AbortSignal.timeout(20*60*1000)})
   if(!response.ok||!response.body)throw Error('Model artifact download failed (HTTP '+response.status+').')
   await pipeline(Readable.fromWeb(response.body),new Transform({transform(chunk,_encoding,callback){
     size+=chunk.length
     if(size>descriptor.size){callback(Error('Model artifact exceeded its expected size.'));return}
     hash.update(chunk)
     if(size>=nextReport){notify('Model artifact '+descriptor.digest.slice(7,19)+': '+Math.round(size/1024/1024)+' MiB');nextReport+=256*1024*1024}
     callback(null,chunk)
   }}),createWriteStream(temporary,{flags:'wx'}))
   if(size!==descriptor.size||hash.digest('hex')!==descriptor.digest.slice(7))throw Error('Model artifact integrity check failed.')
   await rename(temporary,target)
   notify('Verified model artifact '+descriptor.digest.slice(7,19)+' ('+size+' bytes).')
   return target
 }catch(error){await rm(temporary,{force:true});throw error}
}

export async function downloadModel(directory,{fetcher=fetch,notify=console.log}={}){
 const response=await fetcher(registry+MODEL_ARTIFACT.repository+'/manifests/'+MODEL_ARTIFACT.tag,{signal:AbortSignal.timeout(30000)})
 if(!response.ok)throw Error('Model manifest download failed (HTTP '+response.status+').')
 const bytes=Buffer.from(await response.arrayBuffer())
 if(createHash('sha256').update(bytes).digest('hex')!==MODEL_ARTIFACT.manifestHash)throw Error('Model manifest has changed. Review the new artifact before publishing.')
 const manifest=JSON.parse(bytes.toString('utf8'))
 for(const descriptor of [manifest.config,...manifest.layers])await downloadBlob(descriptor,directory,{fetcher,notify})
 const manifests=path.join(directory,'manifests','registry.ollama.ai',MODEL_ARTIFACT.repository)
 await mkdir(manifests,{recursive:true})
 await writeFile(path.join(manifests,MODEL_ARTIFACT.tag),bytes)
 notify('Pinned text and vision model downloaded and verified. No user data or model API key was used.')
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await downloadModel(process.argv[2]??'/models')
