# Administrator script to configure Windows Firewall for Shivneri Classic LAN HTTPS Access
# Must be executed in an elevated (Administrator) PowerShell terminal

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Shivneri Classic - Windows Firewall LAN Configuration  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Set Wi-Fi connection profile to Private
Write-Host "[1/3] Setting Wi-Fi network category to Private..." -ForegroundColor Yellow
try {
    Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private
    Write-Host "  [PASS] Wi-Fi network category successfully set to Private." -ForegroundColor Green
} catch {
    Write-Host "  [WARNING] Could not set Wi-Fi network category: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2. Remove any existing rule with the same name to prevent duplicates
Write-Host "[2/3] Cleaning up any old firewall rules..." -ForegroundColor Yellow
Remove-NetFirewallRule -DisplayName "Shivneri Classic LAN HTTPS (Port 5443)" -ErrorAction SilentlyContinue

# 3. Create restricted Inbound Firewall Rule
Write-Host "[3/3] Creating restricted Inbound Firewall Rule..." -ForegroundColor Yellow
$rule = New-NetFirewallRule `
    -DisplayName "Shivneri Classic LAN HTTPS (Port 5443)" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 5443 `
    -LocalAddress 192.168.1.13 `
    -RemoteAddress 192.168.1.0/24 `
    -Profile Private `
    -Description "Restricted LAN HTTPS access to Shivneri Classic Apartment app on port 5443"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  FIREWALL RULE ACTIVATED SUCCESSFULLY                     " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Rule Name      : $($rule.DisplayName)" -ForegroundColor White
Write-Host "  Protocol / Port: TCP $($rule.LocalPort)" -ForegroundColor White
Write-Host "  Local Address  : $($rule.LocalAddress)" -ForegroundColor White
Write-Host "  Remote Subnet  : $($rule.RemoteAddress)" -ForegroundColor White
Write-Host "  Profile        : $($rule.Profile)" -ForegroundColor White
Write-Host "  Action         : $($rule.Action)" -ForegroundColor White

