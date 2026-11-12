# MongoDB 8.2 Authorization Configuration Script
param (
    [string]$ConfigPath = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"
)

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ELEVATION_REQUIRED: Please run this script in an elevated Administrator PowerShell prompt." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ConfigPath)) {
    Write-Host "ERROR: Configuration file not found at $ConfigPath" -ForegroundColor Red
    exit 1
}

$BackupPath = "$ConfigPath.bak"
Write-Host "Creating backup at $BackupPath..."
Copy-Item -Path $ConfigPath -Destination $BackupPath -Force
Write-Host "Backup created." -ForegroundColor Green

Write-Host "Updating configuration..."
$raw = Get-Content -Path $ConfigPath -Raw
if ($raw -match "authorization:\s*enabled") {
    Write-Host "authorization: enabled is already present." -ForegroundColor Yellow
} else {
    $updated = $raw -replace "#security:", "security:`r`n  authorization: enabled"
    Set-Content -Path $ConfigPath -Value $updated -Encoding UTF8
    Write-Host "Updated mongod.cfg with security.authorization: enabled." -ForegroundColor Green
}

Write-Host "Restarting MongoDB service..."
Restart-Service -Name "MongoDB" -Force
$service = Get-Service -Name "MongoDB"
if ($service.Status -eq "Running") {
    Write-Host "SUCCESS: MongoDB service is running with authorization enabled!" -ForegroundColor Green
} else {
    Write-Host "ERROR: MongoDB service status is $($service.Status)" -ForegroundColor Red
    exit 1
}
