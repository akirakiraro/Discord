# Sobe o LiveKit (em outra janela) e a API do Radcord usando o IP do Radmin desta maquina.
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path (Split-Path $PSScriptRoot)
$livekitExe = Join-Path $PSScriptRoot 'bin\livekit-server.exe'
$generatedDir = Join-Path $PSScriptRoot 'generated'
$secretPath = Join-Path $generatedDir 'livekit-secret.txt'
$configPath = Join-Path $generatedDir 'livekit.yaml'
$apiKey = 'radcord'

function Get-RadminIp {
    $address = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.InterfaceAlias -like 'Radmin*' -or $_.IPAddress -like '26.*' } |
        Select-Object -First 1
    if (-not $address) { throw 'Nenhum IP 26.x.x.x encontrado. O Radmin VPN esta aberto e conectado a rede?' }
    return $address.IPAddress
}

function Get-LiveKitSecret {
    if (Test-Path $secretPath) { return (Get-Content $secretPath -Raw).Trim() }
    $bytes = New-Object byte[] 36
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes) -replace '[+/=]', ''
    Set-Content -Path $secretPath -Value $secret -NoNewline
    return $secret
}

function Write-LiveKitConfig($radminIp, $secret) {
    # use_external_ip=false + node_ip: o LiveKit anuncia so o IP do Radmin, nunca o IP publico.
    $yaml = @"
port: 7880
bind_addresses:
  - "$radminIp"
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50100
  use_external_ip: false
  node_ip: "$radminIp"
  ips:
    includes:
      - 26.0.0.0/8
keys:
  ${apiKey}: "$secret"
logging:
  level: info
"@
    Set-Content -Path $configPath -Value $yaml -Encoding ASCII
}

if (-not (Test-Path $livekitExe)) { throw "LiveKit nao instalado em $livekitExe. Rode antes: npm run host:install" }
New-Item -ItemType Directory -Force -Path $generatedDir | Out-Null

$radminIp = Get-RadminIp
$secret = Get-LiveKitSecret
Write-LiveKitConfig $radminIp $secret
Start-Process -FilePath $livekitExe -ArgumentList @('--config', "`"$configPath`"") -WorkingDirectory $generatedDir

$env:BIND_HOST = $radminIp
$env:DATABASE_PATH = Join-Path $PSScriptRoot 'data\radcord.db'
$env:LIVEKIT_API_KEY = $apiKey
$env:LIVEKIT_API_SECRET = $secret
$env:LIVEKIT_PUBLIC_URL = "ws://${radminIp}:7880"

Write-Host ''
Write-Host "Host do Radcord no ar. Seus amigos devem digitar: $radminIp" -ForegroundColor Green
Write-Host 'Feche esta janela e a do LiveKit para desligar.'
Write-Host ''
Set-Location $repoRoot
npm run server
