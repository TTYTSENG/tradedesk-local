$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskUrl = 'http://127.0.0.1:8765'
$taskReady = $false
try {
    $taskHealth = Invoke-RestMethod -Uri "$taskUrl/api/health" -TimeoutSec 2
    if ($taskHealth.app -eq 'TradeDesk') { $taskReady = $true }
} catch {}
if (-not $taskReady) {
    $taskNodeCandidates = @(
        (Join-Path $taskRoot 'runtime\node.exe'),
        (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'),
        'C:\Program Files\nodejs\node.exe'
    )
    $taskNode = $taskNodeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $taskNode) { $taskNode = (Get-Command node.exe -ErrorAction SilentlyContinue).Source }
    if (-not $taskNode) { throw 'Cannot find Node.js. Install Node.js LTS or place node.exe in runtime folder.' }
    New-Item -ItemType Directory -Force -Path (Join-Path $taskRoot 'data') | Out-Null
    Start-Process -FilePath $taskNode -ArgumentList @('"' + (Join-Path $taskRoot 'server.js') + '"') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRoot 'data\server.log') -RedirectStandardError (Join-Path $taskRoot 'data\server-error.log')
    for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
        Start-Sleep -Milliseconds 300
        try { $taskHealth = Invoke-RestMethod -Uri "$taskUrl/api/health" -TimeoutSec 1; if ($taskHealth.app -eq 'TradeDesk') { $taskReady = $true; break } } catch {}
    }
    if (-not $taskReady) { throw 'Local service did not start. Check data/server-error.log; port 8765 may be occupied.' }
}
$taskChromeCandidates = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
)
$taskChrome = $taskChromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($taskChrome) { Start-Process -FilePath $taskChrome -ArgumentList $taskUrl }
else { Start-Process $taskUrl }
