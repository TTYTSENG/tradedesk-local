$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskPort = 8767
$taskScheme = 'http'
$taskConfigPath = Join-Path $taskRoot 'config.local.json'
if (Test-Path -LiteralPath $taskConfigPath) { $taskConfig=Get-Content -LiteralPath $taskConfigPath | ConvertFrom-Json; if($taskConfig.port){$taskPort=$taskConfig.port}; if($taskConfig.tlsCert -and $taskConfig.tlsKey){$taskScheme='https'} }
$taskUrl = "$($taskScheme)://127.0.0.1:$taskPort"
$taskReady = $false
try { $taskHealth=Invoke-RestMethod -Uri "$taskUrl/api/health" -TimeoutSec 2; if($taskHealth.app -eq 'TradeDesk-LAN'){$taskReady=$true}else{throw 'Port used by another application'} } catch {}
if(-not $taskReady){
 $taskCandidates=@((Join-Path $taskRoot 'runtime\node.exe'),(Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'),'C:\Program Files\nodejs\node.exe')
 $taskNode=$taskCandidates | Where-Object {Test-Path -LiteralPath $_} | Select-Object -First 1
 if(-not $taskNode){$taskNode=(Get-Command node.exe -ErrorAction SilentlyContinue).Source}
 if(-not $taskNode){throw 'Install Node.js 24 LTS or place it in runtime\node.exe.'}
 $taskMajor=& $taskNode -p 'parseInt(process.versions.node)'
 if([int]$taskMajor -lt 24){throw 'Node.js 24 or newer is required.'}
 New-Item -ItemType Directory -Path (Join-Path $taskRoot 'data') -Force | Out-Null
 Start-Process -FilePath $taskNode -ArgumentList @('"'+(Join-Path $taskRoot 'server.js')+'"') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRoot 'data\server.log') -RedirectStandardError (Join-Path $taskRoot 'data\server-error.log')
 for($taskAttempt=0;$taskAttempt -lt 30;$taskAttempt++){Start-Sleep -Milliseconds 300;try{$taskHealth=Invoke-RestMethod -Uri "$taskUrl/api/health" -TimeoutSec 1;if($taskHealth.app -eq 'TradeDesk-LAN'){$taskReady=$true;break}}catch{}}
 if(-not $taskReady){throw 'Service failed. Check data\server-error.log and port 8767.'}
}
Write-Host "Host login: $taskUrl"
$taskInfo=Get-Content -LiteralPath (Join-Path $taskRoot 'data\server-info.json') | ConvertFrom-Json
foreach($taskOfficeUrl in $taskInfo.lanUrls){Write-Host "Office URL: $taskOfficeUrl"}
$taskChrome=@((Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),(Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),(Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')) | Where-Object {Test-Path -LiteralPath $_} | Select-Object -First 1
if($taskChrome){Start-Process -FilePath $taskChrome -ArgumentList $taskUrl}else{Start-Process $taskUrl}
