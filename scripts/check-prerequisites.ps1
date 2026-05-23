#Requires -Version 5.1
<#
.SYNOPSIS
    Verifica que el sistema cumple los requisitos para Halftone RIP Pro
.DESCRIPTION
    Comprueba:
    - Version de Windows
    - Ghostscript instalado
    - Espacio en disco
    - RAM disponible
    - Permisos de escritura
.NOTES
    Version: 1.0.0
#>

$ErrorActionPreference = "Continue"

function Write-Check {
    param(
        [string]$Name,
        [bool]$Pass,
        [string]$Message,
        [string]$Fix = ""
    )
    $icon = if ($Pass) { "OK" } else { "XX" }
    $color = if ($Pass) { "Green" } else { "Red" }
    Write-Host "  [$icon] $Name" -ForegroundColor $color -NoNewline
    Write-Host ": $Message" -ForegroundColor $(if ($Pass) { "Gray" } else { "Yellow" })
    if (-not $Pass -and $Fix) {
        Write-Host "      -> $Fix" -ForegroundColor Cyan
    }
    return $Pass
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  Halftone RIP Pro - Verificacion de Prerrequisitos" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# 1. Sistema operativo
$osInfo = Get-CimInstance Win32_OperatingSystem
$isWin10OrLater = ($osInfo.Caption -match "Windows 10|Windows 11") -or ($osInfo.Version -ge "10.0")
$allPassed = (Write-Check "Sistema Operativo" $isWin10OrLater "$($osInfo.Caption) $($osInfo.Version)") -and $allPassed

# 2. Arquitectura
$is64Bit = [Environment]::Is64BitOperatingSystem
$allPassed = (Write-Check "Arquitectura" $is64Bit "64-bit requerido" "Instala Windows 64-bit") -and $allPassed

# 3. Ghostscript
$gsFound = $false
$gsVersion = $null
$gsPath = $null

$searchPaths = @(
    (Get-Command "gswin64c" -ErrorAction SilentlyContinue)?.Source,
    "$env:ProgramFiles\gs\gs10.03.0\bin\gswin64c.exe",
    "$env:ProgramFiles\gs\gs10.02.1\bin\gswin64c.exe",
    "$env:ProgramFiles\gs\gs10.02.0\bin\gswin64c.exe",
    "$env:ProgramFiles\gs\gs10.01.2\bin\gswin64c.exe",
    "$env:ProgramFiles\gs\gs10.01.1\bin\gswin64c.exe",
    "$env:ProgramFiles\gs\gs10.00.0\bin\gswin64c.exe",
    "$env:ProgramFiles\gs\gs9.56.1\bin\gswin64c.exe",
    "C:\Program Files (x86)\gs\gs10.03.0\bin\gswin64c.exe"
)

foreach ($path in $searchPaths) {
    if ($path -and (Test-Path $path)) {
        try {
            $ver = & $path --version 2>$null
            if ($ver) {
                $gsFound = $true
                $gsVersion = $ver
                $gsPath = $path
                break
            }
        } catch { }
    }
}

$fixMsg = if (-not $gsFound) { "Ejecuta: .\scripts\install-ghostscript.ps1" } else { "" }
$allPassed = (Write-Check "Ghostscript" $gsFound $(if ($gsFound) { "v$gsVersion en $gsPath" } else { "No encontrado" }) $fixMsg) -and $allPassed

# 4. Espacio en disco
$systemDrive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeSpaceGB = [math]::Round($systemDrive.FreeSpace / 1GB, 1)
$hasSpace = $freeSpaceGB -ge 2
$allPassed = (Write-Check "Espacio en disco" $hasSpace "$freeSpaceGB GB libres en C:" "Libera al menos 2 GB") -and $allPassed

# 5. RAM
$totalRAM = [math]::Round($osInfo.TotalVisibleMemorySize / 1MB, 0)
$hasRAM = $totalRAM -ge 4
$allPassed = (Write-Check "Memoria RAM" $hasRAM "$totalRAM GB detectados" "Minimo recomendado: 4 GB") -and $allPassed

# 6. Permisos de escritura
$testPath = "$env:LOCALAPPDATA\halftone-rip-test"
try {
    New-Item -ItemType Directory -Path $testPath -Force | Out-Null
    "test" | Out-File "$testPath\test.txt"
    Remove-Item $testPath -Recurse -Force
    $hasWrite = $true
} catch {
    $hasWrite = $false
}
$allPassed = (Write-Check "Permisos de escritura" $hasWrite "Escritura en %LOCALAPPDATA%" "Ejecuta como Administrador") -and $allPassed

# 7. Conectividad (opcional)
try {
    $hasInternet = Test-Connection -ComputerName "github.com" -Count 1 -Quiet
} catch {
    $hasInternet = $false
}
Write-Check "Internet" $hasInternet $(if ($hasInternet) { "Conectado" } else { "Sin conexion" }) "Opcional: solo para descargas" | Out-Null

# Resultado final
Write-Host ""
if ($allPassed) {
    Write-Host "===============================================================" -ForegroundColor Green
    Write-Host "  OK Todos los prerrequisitos cumplidos" -ForegroundColor Green
    Write-Host "  Puedes instalar Halftone RIP Pro" -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Green
    exit 0
} else {
    Write-Host "===============================================================" -ForegroundColor Red
    Write-Host "  XX Hay prerrequisitos pendientes" -ForegroundColor Red
    Write-Host "  Corrige los items marcados con XX antes de continuar" -ForegroundColor Red
    Write-Host "===============================================================" -ForegroundColor Red
    exit 1
}
