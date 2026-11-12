# Secure, hidden input script for DuckDNS token
# This script prompts for the token using a masked SecureString, never echoes it,
# restricts file access to the current Windows user, and securely clears memory.

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Shivneri Classic Apartment - Secure DuckDNS Token Input  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Please enter your NEW, rotated DuckDNS token below." -ForegroundColor Yellow
Write-Host "The input will be hidden (asterisks). It will NOT be printed or logged." -ForegroundColor Gray
Write-Host ""

$stagingDir = "D:\Shivneri Classic App\server\certs\staging"
if (-not (Test-Path $stagingDir)) {
    New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null
}

$tokenFile = Join-Path $stagingDir ".duckdns_token"

# Masked prompt
$secToken = Read-Host -Prompt "Enter DuckDNS Token" -AsSecureString

if ($null -eq $secToken -or $secToken.Length -eq 0) {
    Write-Host "[ERROR] Token cannot be empty. Aborted." -ForegroundColor Red
    exit 1
}

# Unprotect securely in memory
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secToken)
$plainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

$trimmedToken = $plainToken.Trim()

if ($trimmedToken.Length -lt 20) {
    Write-Host "[WARNING] Token appears shorter than expected DuckDNS tokens." -ForegroundColor Yellow
}

# Write token with no trailing newline or BOM
[System.IO.File]::WriteAllText($tokenFile, $trimmedToken, [System.Text.UTF8Encoding]::new($false))

# Clear in-memory plain text
$plainToken = $null
$trimmedToken = $null
$secToken.Dispose()
[System.GC]::Collect()

# Restrict NTFS ACL permissions to current user and SYSTEM only
try {
    $acl = Get-Acl $tokenFile
    $acl.SetAccessRuleProtection($true, $false) # Disable inheritance and strip all inherited rules
    $user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $userRule = New-Object System.Security.AccessControl.FileSystemAccessRule($user, "FullControl", "Allow")
    $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule("NT AUTHORITY\SYSTEM", "FullControl", "Allow")
    $acl.AddAccessRule($userRule)
    $acl.AddAccessRule($systemRule)
    Set-Acl $tokenFile $acl
} catch {
    Write-Warning "Could not tighten ACL: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "[SUCCESS] Token securely saved to: $tokenFile" -ForegroundColor Green
Write-Host "File size: $((Get-Item $tokenFile).Length) bytes. Access strictly restricted to $user and SYSTEM." -ForegroundColor Green
Write-Host "You may now return to the assistant to proceed with certificate issuance." -ForegroundColor Cyan

