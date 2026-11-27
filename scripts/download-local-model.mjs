import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, stat, rename, unlink, rm } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCAL_MODEL } from '../server/local-ai.mjs'

const run = promisify(execFile), root = fileURLToPath(new URL('../.local-ai/', import.meta.url))
const blobs = path.join(root, 'models', 'blobs'), manifestPath = path.join(root, 'manifest.json')
const registry = 'https://registry.ollama.ai/v2/library/qwen3-vl'
const fileSize = async filename => { try { return (await stat(filename)).size } catch { return 0 } }
async function hash(filename) { const value = createHash('sha256'); for await (const chunk of createReadStream(filename)) value.update(chunk); return value.digest('hex') }
async function curl(url, filename, range) {
  await run('curl.exe', ['--ipv4', '--http1.1', '--location', '--fail', '--silent', '--show-error', '--connect-timeout', '15', '--max-time', '120', ...(process.argv.includes('--direct') ? ['--noproxy', '*'] : []), ...(range ? ['--range', range] : []), '--output', filename, url], { windowsHide: true, maxBuffer: 65536 })
}
async function main() {
  await mkdir(blobs, { recursive: true })
  await curl(registry + '/manifests/' + LOCAL_MODEL.split(':')[1], manifestPath)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.layers.find(layer => layer.mediaType === 'application/vnd.ollama.image.model')?.digest !== 'sha256:16b83be682148a4d8201dbf720ea7eace5de98b69f63f05e0c908b4d7977ecb5') throw Error('The pinned official Instruct model has changed. Review the model before installing.')
  const layers = [...new Map([manifest.config, ...manifest.layers].map(layer => [layer.digest, layer])).values()]
  for (const layer of layers) {
    if (!/^sha256:[0-9a-f]{64}$/.test(layer.digest) || !Number.isSafeInteger(layer.size) || layer.size < 1 || layer.size > 8 * 1024 ** 3) throw Error('Invalid official manifest.')
    const target = path.join(blobs, layer.digest.replace(':', '-')), expected = layer.digest.slice(7)
    if (await fileSize(target) === layer.size && await hash(target) === expected) continue
    const parts = path.join(root, 'model-parts-8m', expected), chunkSize = 8 * 1024 ** 2, count = Math.ceil(layer.size / chunkSize)
    await mkdir(parts, { recursive: true })
    let next = 0, completed = 0
    const worker = async () => {
      while (next < count) {
        const index = next++, start = index * chunkSize, end = Math.min(layer.size, start + chunkSize) - 1, filename = path.join(parts, index + '.part'), size = end - start + 1
        if (await fileSize(filename) !== size) {
          let failure
          for (let attempt = 0; attempt < 5; attempt++) {
            try { await curl(registry + '/blobs/' + layer.digest, filename, `${start}-${end}`); if (await fileSize(filename) !== size) throw Error('Unexpected model range length.'); failure = null; break } catch (error) { if (await fileSize(filename) === size) { failure = null; break } failure = error }
          }
          if (failure) throw failure
        }
        completed += size
        console.log(`Verified range length: ${Math.round(completed / 1024 ** 2)} / ${Math.round(layer.size / 1024 ** 2)} MB`)
      }
    }
    await Promise.all(Array.from({ length: Math.min(24, count) }, worker))
    const temporary = target + '.download'
    // Only task-created files under .local-ai are overwritten or removed.
    await rm(temporary, { force: true })
    for (let index = 0; index < count; index++) await pipeline(createReadStream(path.join(parts, index + '.part')), createWriteStream(temporary, { flags: 'a' }))
    if (await fileSize(temporary) !== layer.size || await hash(temporary) !== expected) throw Error('SHA256 verification failed. No model was installed.')
    await rename(temporary, target)
    for (let index = 0; index < count; index++) await unlink(path.join(parts, index + '.part'))
    console.log('Official model component SHA256 verified.')
  }
  await run(path.join(root, 'ollama', 'ollama.exe'), ['pull', LOCAL_MODEL], { windowsHide: true, timeout: 180000, maxBuffer: 1024 * 1024, env: { ...process.env, OLLAMA_HOST: '127.0.0.1:11434' } })
  console.log('Verified local vision-language model is ready.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
