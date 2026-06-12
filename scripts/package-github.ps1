$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $projectRoot 'release'
$stageRoot = Join-Path $releaseRoot 'nexora-pos'
$zipPath = Join-Path $releaseRoot 'nexora-pos-github.zip'

if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

$excludedDirectories = @(
    '.git',
    '.npm-cache',
    '.vite',
    'data',
    'dist',
    'gym-pos',
    'hotel-pos',
    'ladybug-jewelry-pos',
    'node_modules',
    'release'
)

Get-ChildItem -LiteralPath $projectRoot -Force | Where-Object {
    $_.Name -notin $excludedDirectories -and
    $_.Name -ne '.env' -and
    $_.Extension -ne '.log'
} | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $stageRoot -Recurse -Force
}

Compress-Archive -Path (Join-Path $stageRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -LiteralPath $stageRoot -Recurse -Force

$sizeMb = [Math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 2)
Write-Host "Created $zipPath ($sizeMb MB)"
