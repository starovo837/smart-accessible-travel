import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleProductApi } from '../server/product-api.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const port=Number(process.env.PORT||5173)
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT必须为有效端口。')
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json' }
await stat(path.join(root, 'index.html'))
const server = http.createServer(async (req, res) => {
  if (await handleProductApi(req, res)) return
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1:5173').pathname)
    if (pathname === '/__smart_accessible_health') {
      res.writeHead(200, { 'Content-Type': mime['.json'] }); res.end(JSON.stringify({ app: 'smart-accessible-travel', mode:process.env.SAI_DEPLOYMENT==='studio'?'studio':'desktop' })); return
    }
    const target = path.resolve(root, '.' + pathname)
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return }
    let filename = target
    try { if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html') }
    catch { if (path.extname(pathname)) { res.writeHead(404); res.end(); return }; filename = path.join(root, 'index.html') }
    const data = await readFile(filename)
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' })
    res.end(req.method === 'HEAD' ? undefined : data)
  } catch { res.writeHead(400); res.end() }
})
server.on('error', error => { console.error(error.message); process.exitCode = 1 })
server.listen(port, '0.0.0.0', () => console.log('Smart Accessible Travel server started on port '+port))
