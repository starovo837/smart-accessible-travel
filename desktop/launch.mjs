import { spawn } from 'node:child_process'
import { existsSync, appendFileSync, openSync, closeSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const workspace = path.dirname(directory)
const url = 'http://127.0.0.1:5173/'
const log = path.join(directory, 'desktop.log')
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function currentApp() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1800) })
    if (response.ok && (await response.text()).includes('<title>智能无碍行</title>')) return 'ready'
    return 'occupied'
  } catch { return 'missing' }
}
async function launch() {
  let status = await currentApp()
  if (status === 'occupied') throw new Error('5173 端口被其他程序使用，请关闭占用端口的程序后重新打开。')
  if (status !== 'ready') {
    if (!existsSync(path.join(workspace, 'dist', 'index.html'))) throw new Error('没有找到构建文件 dist/index.html，请先在项目目录运行 pnpm build。')
    const fd = openSync(log, 'a')
    const server = spawn(process.execPath, [path.join(directory, 'server.mjs')], { cwd: workspace, detached: true, windowsHide: true, stdio: ['ignore', fd, fd] })
    server.on('error', error => appendFileSync(log, error.message + '\n'))
    server.unref(); closeSync(fd)
    for (let i = 0; i < 30; i++) { await pause(250); if (await currentApp() === 'ready') { status = 'ready'; break } }
    if (status !== 'ready') throw new Error('本地服务启动失败，请查看 desktop/desktop.log。')
  }
  if (process.argv.includes('--no-browser')) { console.log('智能无碍行已就绪：' + url); return }
  const browsers = [
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ]
  const browser = browsers.find(existsSync)
  if (!browser) throw new Error('未找到 Edge 或 Chrome，请在浏览器输入 ' + url)
  const child = spawn(browser, ['--app=' + url], { detached: true, windowsHide: true, stdio: 'ignore' })
  await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject) })
  child.unref()
}
launch().catch(error => { appendFileSync(log, new Date().toISOString() + ' ' + error.message + '\n'); console.error(error.message); process.exitCode = 1 })
