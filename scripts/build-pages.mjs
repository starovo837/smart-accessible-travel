import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { build } from 'vite'
import { runTravelCopyGuard } from './assert-travel-copy.mjs'

const base = process.argv[2] ?? '/smart-accessible-travel-web/'
if (!/^\/(?:[a-z0-9][a-z0-9-]*\/)*$/i.test(base)) throw Error('Expected an absolute GitHub Pages site path.')
process.env.VITE_DEPLOYMENT = 'pages'
process.env.SAI_ASSET_BASE = base
process.env.SAI_BUILD_OUT_DIR = 'dist-pages'

function runNode(file, ...args) {
  const result = spawnSync(process.execPath, [file, ...args], { stdio: 'inherit', env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}

runNode('scripts/assert-plain-copy.mjs')
await runTravelCopyGuard()
await build({ base, build: { outDir: process.env.SAI_BUILD_OUT_DIR } })
runNode('scripts/build-offline.mjs')
await writeFile(path.join(process.env.SAI_BUILD_OUT_DIR, '.nojekyll'), '')
