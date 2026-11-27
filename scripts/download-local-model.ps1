$ErrorActionPreference = 'Stop'
$localNodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$localNodePath = if ($localNodeCommand) { $localNodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $localNodePath)) { throw 'Node.js 24 was not found.' }
& $localNodePath (Join-Path $PSScriptRoot 'download-local-model.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Model download did not complete. Re-run this script to resume verified-size parts.' }
