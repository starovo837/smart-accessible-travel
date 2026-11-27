$ruleName = 'Smart Accessible Travel 5173 LAN'
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Any -RemoteAddress LocalSubnet | Out-Null
} else {
  Set-NetFirewallRule -DisplayName $ruleName -Enabled True -Action Allow | Out-Null
}
Write-Host 'LAN access for Smart Accessible Travel is enabled on port 5173.'
Read-Host 'Press Enter to close'
