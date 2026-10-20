import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { build } from 'vite'
import path from 'node:path'
const outputDirectory=path.resolve(process.env.SAI_BUILD_OUT_DIR||'dist')
// A separate single-file bundle lets basic flows run without a PC or web server.
const portable=await build({configFile:false,base:'./',build:{write:false,cssCodeSplit:false,chunkSizeWarningLimit:20000,rolldownOptions:{output:{codeSplitting:false}}}})
const output=Array.isArray(portable)?portable[0].output:portable.output
const code=output.filter(item=>item.type==='chunk').map(item=>item.code).join('\n').replace(/<\/script/gi,'<\\/script')
const css=output.filter(item=>item.type==='asset'&&item.fileName.endsWith('.css')).map(item=>String(item.source)).join('\n').replace(/<\/style/gi,'<\\/style')
await writeFile(path.join(outputDirectory,'offline-app.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>智能无碍行 · 独立离线应用</title><style>'+css+'</style></head><body><div id="root"></div><script type="module">'+code+'</script></body></html>')
const assets = (await readdir(path.join(outputDirectory,'assets'))).map(name => '/assets/' + name)
const files = ['/', '/index.html', '/manifest.webmanifest', '/app-icon.svg', ...assets]
const content = await Promise.all(files.filter(name => name !== '/').map(name => readFile(path.join(outputDirectory,name))))
const version = createHash('sha256').update(Buffer.concat(content)).digest('hex').slice(0, 12)
const worker = `const CACHE='smart-accessible-shell-${version}'; const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('smart-accessible-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/index.html'))));return;}
if(FILES.includes(url.pathname))event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request).then(hit=>hit||fetch(event.request))));});`
await writeFile(path.join(outputDirectory,'sw.js'), worker)
console.log('Offline shell generated:', version, '(application code only; no personal data)')
