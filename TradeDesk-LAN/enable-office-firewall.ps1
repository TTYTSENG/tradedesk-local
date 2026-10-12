# Run explicitly as administrator on the designated host. No Internet-wide rule.
$ErrorActionPreference='Stop'
$taskPort=8767
if(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'config.local.json')){$taskConfig=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'config.local.json') | ConvertFrom-Json;if($taskConfig.port){$taskPort=$taskConfig.port}}
$taskRule='TradeDesk-LAN-Office-'+$taskPort
$taskExisting=Get-NetFirewallRule -Name $taskRule -ErrorAction SilentlyContinue
if(-not $taskExisting){New-NetFirewallRule -Name $taskRule -DisplayName "TradeDesk LAN Office $taskPort" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $taskPort -Profile Private -RemoteAddress LocalSubnet -ErrorAction Stop | Out-Null}
$taskVerified=Get-NetFirewallRule -Name $taskRule -ErrorAction Stop
$taskPorts=$taskVerified | Get-NetFirewallPortFilter -ErrorAction Stop
$taskAddresses=$taskVerified | Get-NetFirewallAddressFilter -ErrorAction Stop
if($taskVerified.Enabled -ne 'True' -or $taskVerified.Direction -ne 'Inbound' -or $taskVerified.Action -ne 'Allow' -or $taskVerified.Profile -ne 'Private' -or $taskPorts.LocalPort -ne $taskPort -or $taskPorts.Protocol -notin @('TCP','6') -or $taskAddresses.RemoteAddress -ne 'LocalSubnet'){throw 'The existing firewall rule does not match the requested office scope.'}
$taskVerified | Select-Object Name,Enabled,Direction,Action,Profile | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'data\firewall-status.json') -Encoding UTF8
Write-Host 'Office rule enabled for Private profile / LocalSubnet only.'
