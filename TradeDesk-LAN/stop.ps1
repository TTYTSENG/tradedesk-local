$ErrorActionPreference = 'Stop'
$taskInfoPath = Join-Path $PSScriptRoot 'data\server-info.json'
if (Test-Path -LiteralPath $taskInfoPath) {
 $taskInfo = Get-Content -LiteralPath $taskInfoPath | ConvertFrom-Json
 Invoke-RestMethod -Uri "$($taskInfo.scheme)://127.0.0.1:$($taskInfo.port)/api/shutdown" -Method Post -Headers @{'X-Tradedesk-Token'=$taskInfo.token} -TimeoutSec 5 | Out-Null
 Write-Host 'TradeDesk-LAN stopped.'
}
