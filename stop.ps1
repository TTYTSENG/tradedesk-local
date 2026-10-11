$ErrorActionPreference = 'Stop'
$taskInfoPath = Join-Path $PSScriptRoot 'data\server-info.json'
if (Test-Path -LiteralPath $taskInfoPath) {
    $taskInfo = Get-Content -LiteralPath $taskInfoPath -Raw | ConvertFrom-Json
    try { Invoke-RestMethod -Uri "http://127.0.0.1:$($taskInfo.port)/api/shutdown" -Method Post -Headers @{ 'X-Tradedesk-Token' = $taskInfo.token } -TimeoutSec 3 | Out-Null } catch { Write-Host 'Service is already stopped or token is outdated.' }
}
