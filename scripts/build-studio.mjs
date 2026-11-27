import { build } from 'vite'
import { spawnSync } from 'node:child_process'
import { runTravelCopyGuard } from './assert-travel-copy.mjs'

process.env.VITE_DEPLOYMENT='studio'
process.env.SAI_BUILD_OUT_DIR='dist-studio'
await runTravelCopyGuard()
await build({build:{outDir:'dist-studio'}})
const offline=spawnSync(process.execPath,['scripts/build-offline.mjs'],{stdio:'inherit',env:process.env})
if(offline.status!==0)process.exit(offline.status||1)
