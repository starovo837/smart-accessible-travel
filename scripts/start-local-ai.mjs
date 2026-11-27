import { ensureLocalAI, localAIStatus } from '../server/local-ai.mjs'
await ensureLocalAI()
for (let index = 0; index < 20; index++) {
  const status = await localAIStatus()
  if (status.runtimeAvailable) { console.log(JSON.stringify(status)); process.exit(0) }
  await new Promise(resolve => setTimeout(resolve, 500))
}
console.error('本机AI引擎未启动，请先完成Ollama便携版安装。')
process.exitCode = 1
