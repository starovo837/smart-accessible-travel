import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
const sharp=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')
const input=await fs.readFile('.asset-sources/person-source.glb')
const jsonLength=input.readUInt32LE(12),json=JSON.parse(input.subarray(20,20+jsonLength).toString())
const binary=input.subarray(28+jsonLength),chunks=[]
let offset=0
const images=new Map(json.images.map((image,index)=>[image.bufferView,index]))
for(let index=0;index<json.bufferViews.length;index++){
 const view=json.bufferViews[index]
 let data=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength)
 if(images.has(index)){
  data=await sharp(data).resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer()
  json.images[images.get(index)].mimeType='image/png'
 }
 view.byteOffset=offset;view.byteLength=data.length
 const padded=Buffer.alloc(Math.ceil(data.length/4)*4);data.copy(padded);chunks.push(padded);offset+=padded.length
}
json.buffers[0].byteLength=offset
json.asset.copyright='Innerscene / MakeHuman / MPFB CC0. See person-license.json.'
const encoded=Buffer.from(JSON.stringify(json)),encodedPadded=Buffer.alloc(Math.ceil(encoded.length/4)*4,32);encoded.copy(encodedPadded)
const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+encodedPadded.length+offset,8);header.writeUInt32LE(encodedPadded.length,12);header.write('JSON',16)
const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(offset);binHeader.write('BIN\0',4)
await fs.writeFile('public/models/person.glb',Buffer.concat([header,encodedPadded,binHeader,...chunks]))
await fs.mkdir('public/images',{recursive:true})
await sharp('C:/Users/Lenovo/.codex/generated_images/01a12697-31f6-7d81-afb7-bf2cab3beab5/exec-06784323-4e55-4ff5-93ea-de91f033349b.png').resize({width:1600,withoutEnlargement:true}).webp({quality:84}).toFile('public/images/quiet-lake.webp')
console.log('Prepared local model and landscape',offset)
