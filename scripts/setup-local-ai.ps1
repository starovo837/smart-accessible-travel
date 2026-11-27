$ErrorActionPreference = 'Stop'
$localWorkspace = Split-Path -Parent $PSScriptRoot
$localDirectory = Join-Path $localWorkspace '.local-ai'
$localExecutable = Join-Path $localDirectory 'ollama/ollama.exe'
$localArchive = Join-Path $localDirectory 'ollama-windows-amd64.zip'
New-Item -ItemType Directory -Path $localDirectory -Force | Out-Null

if (-not (Test-Path -LiteralPath $localExecutable)) {
  Write-Output 'Downloading the official Ollama portable runtime (about 1.5 GB)...'
  & curl.exe --ipv4 --location --fail --show-error --connect-timeout 20 --max-time 1800 --continue-at - --output $localArchive 'https://github.com/ollama/ollama/releases/download/v0.40.4/ollama-windows-amd64.zip'
  if ($LASTEXITCODE -ne 0) { throw 'Download did not complete. Run this script again to resume.' }
  $localHash = (Get-FileHash -LiteralPath $localArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($localHash -ne '7485a1172f8527db4342a63521b9342fc466185ff0855da378cc864ecf6354cf') { throw 'Official SHA256 mismatch. The runtime was not executed.' }
  Expand-Archive -LiteralPath $localArchive -DestinationPath (Join-Path $localDirectory 'ollama') -Force
}

$localNodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$localNodePath = if ($localNodeCommand) { $localNodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $localNodePath)) { throw 'Node.js 24 was not found. Start the app from its configured runtime.' }
& $localNodePath (Join-Path $PSScriptRoot 'start-local-ai.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Local AI engine did not start.' }

# This process uses loopback and the engine started with cloud features disabled.
$env:OLLAMA_HOST = '127.0.0.1:11434'
Write-Output 'Downloading Qwen3-VL 4B Instruct (about 3.3 GB). No account or API key is required...'
& (Join-Path $PSScriptRoot 'download-local-model.ps1')
Write-Output 'Local AI is ready. Open the app and choose local AI interpretation.'
