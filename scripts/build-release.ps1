#Requires -Version 5.1
<#
.SYNOPSIS
    Build completo para release de Halftone RIP Pro
.DESCRIPTION
    - Limpia builds anteriores
    - Ejecuta tests (si existen)
    - Build de produccion
    - Genera instalador con electron-builder
.NOTES
    Version: 1.0.0
#>

param(
    [switch]$SkipTests,
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  Halftone RIP Pro - Build de Release" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar prerequisitos
Write-Host "[1/5] Verificando prerequisitos..." -ForegroundColor Cyan
& "$PSScriptRoot\check-prerequisites.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  XX Prerrequisitos no cumplidos. Abortando." -ForegroundColor Red
    exit 1
}

# 2. Actualizar version (opcional)
if ($Version) {
    Write-Host "[2/5] Actualizando version a $Version..." -ForegroundColor Cyan
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $packageJson.version = $Version
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
    Write-Host "  OK Version actualizada" -ForegroundColor Green
}

# 3. Tests
if (-not $SkipTests) {
    Write-Host "[3/5] Ejecutando tests..." -ForegroundColor Cyan
    & npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  XX Tests fallaron. Abortando." -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK Tests pasaron" -ForegroundColor Green
} else {
    Write-Host "[3/5] Tests omitidos (-SkipTests)" -ForegroundColor Yellow
}

# 4. Build
Write-Host "[4/5] Build de produccion..." -ForegroundColor Cyan
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  XX Build fallo" -ForegroundColor Red
    exit 1
}
Write-Host "  OK Build exitoso" -ForegroundColor Green

# 5. Generar instalador
Write-Host "[5/5] Generando instalador..." -ForegroundColor Cyan
& npm run dist:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "  XX Generacion de instalador fallo" -ForegroundColor Red
    exit 1
}

# Resultado
$releaseDir = "$projectRoot\release"
$artifacts = Get-ChildItem $releaseDir -Filter "*.exe" | Select-Object -ExpandProperty FullName

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "  OK Release generado correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "  Artifacts:" -ForegroundColor White
foreach ($artifact in $artifacts) {
    $size = [math]::Round((Get-Item $artifact).Length / 1MB, 1)
    Write-Host "    - $(Split-Path $artifact -Leaf) ($size MB)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "  Ubicacion: $releaseDir" -ForegroundColor Gray
Write-Host "===============================================================" -ForegroundColor Green
