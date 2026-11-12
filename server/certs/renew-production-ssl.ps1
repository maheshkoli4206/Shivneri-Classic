# Automated Certificate Renewal Script for Shivneri Classic Apartment
# Target: shivneri.duckdns.org (Let's Encrypt DNS-01)
$ErrorActionPreference = "Stop"

$appDir = "D:\Shivneri Classic App"
$certsDir = Join-Path $appDir "server\certs"
$logFile = Join-Path $certsDir "renewal.log"
$openssl = "C:\Program Files\Git\usr\bin\openssl.exe"
$bash = "C:\Program Files\Git\bin\bash.exe"

function Log-Message($msg) {
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$timestamp] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Force
}

Log-Message "Starting automated certificate renewal check for shivneri.duckdns.org..."

# 1. Run acme.sh renew via Git Bash
$renewOutput = & $bash -lc "~/.acme.sh/acme.sh --cron --home /c/Users/mahes/.acme.sh" 2>&1 | Out-String

Log-Message "acme.sh cron execution completed."

# Check if certificate was updated
$acmeCert = "C:\Users\mahes\.acme.sh\shivneri.duckdns.org_ecc\fullchain.cer"
$acmeKey = "C:\Users\mahes\.acme.sh\shivneri.duckdns.org_ecc\shivneri.duckdns.org.key"

if (-not (Test-Path $acmeCert) -or -not (Test-Path $acmeKey)) {
    Log-Message "[ERROR] ACME certificate or key files missing in user profile."
    exit 1
}

# Cryptographic pre-deployment check
$pubCert = (& $openssl x509 -in $acmeCert -noout -pubkey | Out-String).Trim()
$pubKey = (& $openssl pkey -in $acmeKey -pubout 2>$null | Out-String).Trim()

if ($pubCert -ne $pubKey -or $pubCert.Length -lt 20) {
    Log-Message "[ERROR] Cryptographic public key mismatch in renewed cert. Deployment aborted."
    exit 1
}

# Check if the staged cert differs from currently active production cert
$currentCert = Join-Path $certsDir "cert.pem"
$currentKey = Join-Path $certsDir "key.pem"

$acmeHash = (Get-FileHash $acmeCert).Hash
$currentHash = (Get-FileHash $currentCert).Hash

if ($acmeHash -ne $currentHash) {
    Log-Message "[INFO] New certificate detected! Deploying to production..."
    
    # Backup current before overwriting
    $backupDir = Join-Path $certsDir "backup_pre_lan"
    Copy-Item $currentCert (Join-Path $backupDir "cert.pem") -Force
    Copy-Item $currentKey (Join-Path $backupDir "key.pem") -Force
    
    # Deploy new cert and key atomically
    Copy-Item $acmeCert $currentCert -Force
    Copy-Item $acmeKey $currentKey -Force
    
    Log-Message "[SUCCESS] Production certificates updated. Reloading production server..."
    
    # Restart production server daemon if running
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "startProduction" } | Stop-Process -Force
    Start-Process -FilePath "node" -ArgumentList "startProduction.js" -WorkingDirectory (Join-Path $appDir "server") -WindowStyle Hidden
    
    Log-Message "[SUCCESS] Production stack reloaded with new certificate."
} else {
    Log-Message "[INFO] Certificate is still within validity window. No replacement required."
}

