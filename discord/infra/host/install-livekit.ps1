# Baixa o binario do LiveKit Server para Windows (release mais recente do GitHub).
$ErrorActionPreference = 'Stop'

$binDir = Join-Path $PSScriptRoot 'bin'
$exePath = Join-Path $binDir 'livekit-server.exe'

function Get-LatestWindowsAsset {
    $release = Invoke-RestMethod 'https://api.github.com/repos/livekit/livekit/releases/latest'
    $asset = $release.assets | Where-Object { $_.name -like '*windows_amd64.zip' } | Select-Object -First 1
    if (-not $asset) {
        throw "Release $($release.tag_name) sem binario windows_amd64.zip. Assets encontrados: $($release.assets.name -join ', ')"
    }
    Write-Host "Baixando LiveKit $($release.tag_name)..."
    return $asset
}

function Install-LiveKitBinary($asset) {
    $zipPath = Join-Path $env:TEMP $asset.name
    $extractDir = Join-Path $env:TEMP 'radcord-livekit'
    Invoke-WebRequest $asset.browser_download_url -OutFile $zipPath
    Expand-Archive $zipPath -DestinationPath $extractDir -Force
    $found = Get-ChildItem $extractDir -Recurse -Filter 'livekit-server.exe' | Select-Object -First 1
    if (-not $found) { throw "livekit-server.exe nao encontrado dentro de $($asset.name)" }
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
    Copy-Item $found.FullName $exePath -Force
    Remove-Item $zipPath, $extractDir -Recurse -Force
}

if (Test-Path $exePath) {
    Write-Host "LiveKit ja instalado em $exePath (apague o arquivo para baixar de novo)."
    exit 0
}

Install-LiveKitBinary (Get-LatestWindowsAsset)
Write-Host "LiveKit instalado em $exePath" -ForegroundColor Green
