param([ValidateSet('check','publish','diagnose','configure')][string]$Action='check')
$ErrorActionPreference='Stop'
$projectDirectory=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Host.UI.RawUI.WindowTitle='ModelScope - '+$Action+' - Smart Accessible'
$nodeCommand=Get-Command node.exe -ErrorAction SilentlyContinue
$nodePath=if($nodeCommand){$nodeCommand.Source}else{Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'}
if(-not(Test-Path -LiteralPath $nodePath)){throw 'Node.js 24 was not found.'}
$gitCommand=Get-Command git.exe -ErrorAction SilentlyContinue
$gitPath=if($gitCommand){$gitCommand.Source}else{Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe'}
Write-Host 'ModelScope deployment credential is used only for platform upload, not AI inference.'
Write-Host 'Do not send the credential in chat. It will not be saved to a file.'
if($Action -eq 'check'){Write-Host 'READ ONLY: checks account and Docker hardware; does not create or start resources.'}
if($Action -eq 'diagnose'){Write-Host 'READ ONLY: downloads build/run logs for this app. Does not restart, publish or change hardware.'}
if($Action -eq 'configure'){Write-Host 'Configures this app HTTPS origin and restarts the same free Studio. No Git upload or hardware change.'}
if($Action -eq 'publish'){
  $deploymentPlan=Get-Content -LiteralPath (Join-Path $projectDirectory '.studio-deploy-plan.json') -Raw | ConvertFrom-Json
  Write-Host ('Target: '+$deploymentPlan.owner+'/'+$deploymentPlan.repo)
  Write-Host ('Hardware: '+$deploymentPlan.hardware+' (free hardware is verified again before publishing)')
  Write-Host 'The CPU-only build replaces this app deployment. The same open model is retained.'
  Write-Host 'Model weights are downloaded and verified during the build, then included in the app image.'
}
try{
  . (Join-Path $PSScriptRoot 'token-input.ps1')
  Write-Host 'Paste into the password dialog. Do not paste into this console or chat.'
  $enteredToken=Read-ModelScopeTokenDialog
  if([string]::IsNullOrEmpty($enteredToken)){Write-Host 'Cancelled. Nothing was sent.';return}
  $env:MS_DEPLOY_TOKEN=$enteredToken
  Remove-Variable enteredToken
  $env:MS_GIT_PATH=$gitPath
  Push-Location -LiteralPath $projectDirectory
  $scriptName=switch($Action){'check'{'check-studio.mjs'} 'diagnose'{'inspect-studio.mjs'} 'configure'{'configure-studio.mjs'} default{'publish-studio.mjs'}}
  try{
    do{
      & $nodePath (Join-Path $projectDirectory ('scripts/'+$scriptName))
      $retryPublish=$false
      if($LASTEXITCODE -ne 0){
        Write-Host 'Operation did not finish. No force push or paid hardware will be used.' -ForegroundColor Yellow
        if($Action -in @('publish','configure')){
          Write-Host 'After the assistant fixes the error, press R here to retry with the same in-memory credential.'
          Write-Host 'Press Q to finish. This prompt expires in 10 minutes; credentials are cleared on exit.'
          $retryUntil=[DateTime]::UtcNow.AddMinutes(10)
          while([DateTime]::UtcNow -lt $retryUntil){
            if($Host.UI.RawUI.KeyAvailable){
              $retryKey=$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
              if($retryKey.Character -in @('r','R')){$retryPublish=$true;break}
              if($retryKey.Character -in @('q','Q')){break}
            }
            Start-Sleep -Milliseconds 250
          }
        }
      }
    }while($retryPublish)
  }
  finally{Pop-Location}
}finally{
  Remove-Item Env:MS_DEPLOY_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:MS_GIT_PATH -ErrorAction SilentlyContinue
}
