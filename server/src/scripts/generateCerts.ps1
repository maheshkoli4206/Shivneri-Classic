# Generate TLS Certificate for Shivneri Classic HTTPS Reverse Proxy
$certDir = Join-Path $PSScriptRoot "..\..\certs"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir -Force | Out-Null
}

$certPath = Join-Path $certDir "cert.pem"
$keyPath = Join-Path $certDir "key.pem"

# Create self-signed certificate in CurrentUser store (does not require Administrator)
$cert = New-SelfSignedCertificate `
    -Subject "CN=Shivneri Classic Apartment Local" `
    -DnsName "localhost", "127.0.0.1" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyExportPolicy Exportable `
    -KeySpec Signature `
    -KeyLength 2048 `
    -KeyAlgorithm RSA `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(2)

# Export public cert to PEM
$certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
$certBase64 = [System.Convert]::ToBase64String($certBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
$certPem = "-----BEGIN CERTIFICATE-----`r`n" + $certBase64 + "`r`n-----END CERTIFICATE-----"
[System.IO.File]::WriteAllText($certPath, $certPem)

# Export private key to PEM via PFX
$pwd = ConvertTo-SecureString -String "ShivneriTlsTempPass2026" -Force -AsPlainText
$pfxBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx, $pwd)

# Use .NET to extract RSA private key
$pfxCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
$pfxCert.Import($pfxBytes, "ShivneriTlsTempPass2026", [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable)

$rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($pfxCert)
$keyBytes = $rsa.ExportPkcs8PrivateKey()
$keyBase64 = [System.Convert]::ToBase64String($keyBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
$keyPem = "-----BEGIN PRIVATE KEY-----`r`n" + $keyBase64 + "`r`n-----END PRIVATE KEY-----"
[System.IO.File]::WriteAllText($keyPath, $keyPem)

Write-Output "TLS certificates successfully generated at: $certDir"
Write-Output "Cert: $certPath"
Write-Output "Key: $keyPath"

