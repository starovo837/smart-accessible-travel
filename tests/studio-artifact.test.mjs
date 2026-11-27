import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp,readFile,readdir } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { MODEL_ARTIFACT,downloadBlob,downloadModel } from '../deployment/modelscope/download-model.mjs'
import { LOCAL_MODEL } from '../server/local-ai.mjs'

const content=Buffer.from('synthetic public model artifact'),digest='sha256:'+createHash('sha256').update(content).digest('hex')
const descriptor={digest,size:content.length}
test('verified model artifact is streamed to its content-addressed file',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'studio-artifact-'))
 const file=await downloadBlob(descriptor,directory,{notify:()=>{},fetcher:async(url)=>{
   assert.equal(url,'https://registry.ollama.ai/v2/library/qwen3-vl/blobs/'+digest)
   return new Response(content)
 }})
 assert.deepEqual(await readFile(file),content)
 assert.equal(MODEL_ARTIFACT.name,LOCAL_MODEL)
})
test('corrupt or truncated downloads never become installed model blobs',async()=>{
 for(const bad of [Buffer.from('corrupt'),Buffer.alloc(content.length,1),Buffer.alloc(content.length+1,1)]){
   const directory=await mkdtemp(path.join(os.tmpdir(),'studio-artifact-corrupt-'))
   await assert.rejects(()=>downloadBlob(descriptor,directory,{notify:()=>{},fetcher:async()=>new Response(bad)}),/size|integrity/)
   assert.deepEqual(await readdir(path.join(directory,'blobs')),[])
 }
})
test('changed manifest and invalid blob paths are rejected before installing anything',async()=>{
 let requests=0
 const directory=await mkdtemp(path.join(os.tmpdir(),'studio-artifact-manifest-'))
 await assert.rejects(()=>downloadModel(directory,{notify:()=>{},fetcher:async()=>{requests++;return new Response('{}')}}),/manifest has changed/)
 assert.equal(requests,1);assert.deepEqual(await readdir(directory),[])
 await assert.rejects(()=>downloadBlob({digest:'../../outside',size:1},directory,{fetcher:async()=>{throw Error('must not fetch')}}),/descriptor/)
})
