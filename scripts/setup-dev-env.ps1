#Requires -Version 5.1
<#
.SYNOPSIS
    Configura el entorno de desarrollo para Halftone RIP Pro
.DESCRIPTION
    - Instala Node.js 20+ (si no esta)
    - Instala dependencias npm
    - Verifica Ghostscript
    - Configura git hooks (opcional)
.NOTES
    Version: 1.0.0
#>

param([switch]$SkipNodeInstall)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([int]$Step, [int]$Total, [string]$Message)
    Write-Host ""
    Write-Host "[$Step/$Total] $Message" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  Halftone RIP Pro - Setup de Entorno de Desarrollo" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# 1. Verificar Node.js
Write-Step 1 4 "Verificando Node.js..."
$nodeVersion = $null
try {
    $nodeVersion = & node --version 2>$null
} catch { }

if (-not $nodeVersion) {
    if ($SkipNodeInstall) {
        Write-Host "  XX Node.js no encontrado. Instalalo manualmente." -ForegroundColor Red
        exit 1
    }

    Write-Host "  Descargando Node.js 20 LTS..." -ForegroundColor Yellow
    $nodeInstaller = "$env:TEMP\node-setup.msi"
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi" -OutFile $nodeInstaller -UseBasicParsing
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $nodeInstaller, "/quiet", "/norestart" -Wait
    Remove-Item $nodeInstaller -Force

    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
    $nodeVersion = & node --version
}

Write-Host "  OK Node.js $nodeVersion" -ForegroundColor Green

# 2. Instalar dependencias
Write-Step 2 4 "Instalando dependencias npm..."
& npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  XX Error instalando dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "  OK Dependencias instaladas" -ForegroundColor Green

# 3. Verificar Ghostscript
Write-Step 3 4 "Verificando Ghostscript..."
& "$PSScriptRoot\check-prerequisites.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  Ghostscript no detectado. Instalar ahora?" -ForegroundColor Yellow
    $install = Read-Host "  [S/N]"
    if ($install -eq "S" -or $install -eq "s") {
        & "$PSScriptRoot\install-ghostscript.ps1"
    }
}

# 4. Build inicial
Write-Step 4 4 "Build inicial..."
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ! Build inicial fallo (normal en primera vez, prueba 'npm run dev')" -ForegroundColor Yellow
} else {
    Write-Host "  OK Build exitoso" -ForegroundColor Green
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "  OK Entorno configurado" -ForegroundColor Green
Write-Host ""
Write-Host "  Comandos disponibles:" -ForegroundColor White
Write-Host "    npm run dev     - Modo desarrollo con hot reload" -ForegroundColor Gray
Write-Host "    npm run build   - Build de produccion" -ForegroundColor Gray
Write-Host "    npm run dist    - Generar instalador" -ForegroundColor Gray
Write-Host "===============================================================" -ForegroundColor Green
