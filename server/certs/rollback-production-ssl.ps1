# Automated Rollback Script for Shivneri Classic SSL/TLS Production Certificates
$ErrorActionPreference = "Stop"

$certsDir = "D:\Shivneri Classic App\server\certs"
$backupDir = Join-Path $certsDir "backup_pre_lan"
$certFile = Join-Path $certsDir "cert.pem"
$keyFile = Join-Path $certsDir "key.pem"

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "   Shivneri Classic - SSL Certificate Emergency Rollback   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

if (-not (Test-Path (Join-Path $backupDir "cert.pem")) -or -not (Test-Path (Join-Path $backupDir "key.pem"))) {
    Write-Host "[FATAL] Pre-LAN backup certificates not found in $backupDir!" -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Restoring original production certificates from backup..." -ForegroundColor Cyan
Copy-Item (Join-Path $backupDir "cert.pem") $certFile -Force
Copy-Item (Join-Path $backupDir "key.pem") $keyFile -Force

Write-Host "[2/3] Verifying restored file integrity..." -ForegroundColor Cyan
$restoredCertHash = (Get-FileHash $certFile).Hash
$restoredKeyHash = (Get-FileHash $keyFile).Hash
Write-Host "  Restored cert SHA256: $restoredCertHash" -ForegroundColor White
Write-Host "  Restored key  SHA256: $restoredKeyHash" -ForegroundColor White

Write-Host "[3/3] Validating restored certificate with OpenSSL..." -ForegroundColor Cyan
$openssl = "C:\Program Files\Git\usr\bin\openssl.exe"
$subject = & $openssl x509 -in $certFile -noout -subject
Write-Host "  Restored Subject: $subject" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  ROLLBACK COMPLETE - ORIGINAL CERTIFICATES RESTORED       " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

