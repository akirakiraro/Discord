# Copia o instalador NSIS, o latest.yml e o blockmap para a pasta que o host serve em /updates.
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path (Split-Path $PSScriptRoot)
$packagePath = Join-Path $repoRoot 'apps\desktop\package.json'
$version = (Get-Content $packagePath -Raw | ConvertFrom-Json).version
$releaseDir = Join-Path $repoRoot 'apps\desktop\release'
$latestYml = Join-Path $releaseDir 'latest.yml'
$setup = Get-ChildItem $releaseDir -Filter '*Setup*.exe' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*$version*" } |
    Select-Object -First 1
$blockmap = Get-ChildItem $releaseDir -Filter '*.blockmap' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*$version*" } |
    Select-Object -First 1
if (-not (Test-Path $latestYml) -or -not $setup -or -not $blockmap) {
    throw "Pacote $version incompleto em $releaseDir. Esperado latest.yml, o instalador Setup e o .blockmap. Rode antes: npm run desktop:dist"
}

$updatesDir = Join-Path $PSScriptRoot 'updates'
New-Item -ItemType Directory -Force -Path $updatesDir | Out-Null
Get-ChildItem $updatesDir -File | Remove-Item -Force
Copy-Item -LiteralPath $latestYml -Destination (Join-Path $updatesDir 'latest.yml') -Force
Copy-Item -LiteralPath $setup.FullName -Destination (Join-Path $updatesDir $setup.Name) -Force
Copy-Item -LiteralPath $blockmap.FullName -Destination (Join-Path $updatesDir $blockmap.Name) -Force
Write-Host "SoundRoom $version publicado em $updatesDir. O electron-updater le /updates/latest.yml."
