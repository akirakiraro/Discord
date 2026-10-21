# Copia o executavel portatil gerado para a pasta que o host serve em /updates.
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path (Split-Path $PSScriptRoot)
$packagePath = Join-Path $repoRoot 'apps\desktop\package.json'
$version = (Get-Content $packagePath -Raw | ConvertFrom-Json).version
$releaseDir = Join-Path $repoRoot 'apps\desktop\release'
$built = Get-ChildItem $releaseDir -Filter '*.exe' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*$version*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $built) {
    throw "Nenhum executavel $version em $releaseDir. Rode antes: npm run desktop:dist"
}

$updatesDir = Join-Path $PSScriptRoot 'updates'
New-Item -ItemType Directory -Force -Path $updatesDir | Out-Null
$target = Join-Path $updatesDir 'Radcord.exe'
Copy-Item -LiteralPath $built.FullName -Destination $target -Force
$hash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLower()
$size = (Get-Item -LiteralPath $target).Length
$manifest = @{ version = $version; sha256 = $hash; size = $size } | ConvertTo-Json -Compress
Set-Content -LiteralPath (Join-Path $updatesDir 'latest.json') -Value $manifest -Encoding ascii -NoNewline
Write-Host "Radcord $version publicado em $updatesDir ($size bytes). O host entrega em /updates/latest."
