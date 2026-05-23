#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Instala Ghostscript automáticamente para Halftone RIP Pro
.DESCRIPTION
    Descarga e instala Ghostscript 10.x en Windows sin intervencion del usuario.
    Compatible con instalacion silenciosa y extraccion portatil.

    Ghostscript AGPL: NO se redistribuye. Se descarga del sitio oficial de Artifex.
.NOTES
    Version: 1.0.0
    Autor: Halftone RIP Pro
#>

param(
    [string]$InstallDir = "$env:ProgramFiles\gs",
    [switch]$Portable,
    [switch]$Force,
    [string]$Version = "10.03.0"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# --- CONFIGURACION ---
$GS_BASE_URL = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs$($Version.Replace('.',''))"
$GS_INSTALLER = "gs$($Version.Replace('.',''))w64.exe"
$GS_URL = "$GS_BASE_URL/$GS_INSTALLER"
$TEMP_DIR = "$env:TEMP\halftone-rip-gs-install"
$MIN_VERSION = [Version]"10.0.0"

# --- FUNCIONES AUXILIARES ---
function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $prefix = switch($Type) {
        "Success" { "[OK]" }
        "Error"   { "[ERR]" }
        "Warn"    { "[!]" }
        "Info"    { "[->]" }
        default   { "[->]" }
    }
    $color = switch($Type) {
        "Success" { "Green" }
        "Error"   { "Red" }
        "Warn"    { "Yellow" }
        "Info"    { "Cyan" }
        default   { "White" }
    }
    Write-Host "$prefix $Message" -ForegroundColor $color
}

function Test-GhostscriptInstalled {
    param([Version]$MinVersion = $MIN_VERSION)

    $gsInPath = Get-Command "gswin64c" -ErrorAction SilentlyContinue
    if ($gsInPath) {
        try {
            $verStr = & gswin64c --version 2>$null
            $ver = [Version]$verStr
            if ($ver -ge $MinVersion) {
                return @{ Found = $true; Path = $gsInPath.Source; Version = $verStr }
            }
        } catch { }
    }

    $standardPaths = @(
        "$env:ProgramFiles\gs\gs$Version\bin\gswin64c.exe",
        "$env:ProgramFiles\gs\gs10.02.1\bin\gswin64c.exe",
        "$env:ProgramFiles\gs\gs10.02.0\bin\gswin64c.exe",
        "$env:ProgramFiles\gs\gs10.01.2\bin\gswin64c.exe",
        "$env:ProgramFiles\gs\gs10.01.1\bin\gswin64c.exe",
        "$env:ProgramFiles\gs\gs10.00.0\bin\gswin64c.exe",
        "$env:ProgramFiles\gs\gs9.56.1\bin\gswin64c.exe",
        "C:\Program Files (x86)\gs\gs$Version\bin\gswin64c.exe",
        "C:\Program Files\gs\gs$Version\bin\gswin64c.exe"
    )

    foreach ($path in $standardPaths) {
        if (Test-Path $path) {
            try {
                $verStr = & $path --version 2>$null
                $ver = [Version]$verStr
                if ($ver -ge $MinVersion) {
                    return @{ Found = $true; Path = $path; Version = $verStr }
                }
            } catch { }
        }
    }

    return @{ Found = $false; Path = $null; Version = $null }
}

function Install-GhostscriptSilent {
    param([string]$InstallerPath, [string]$TargetDir)
    Write-Status "Ejecutando instalador silencioso..." "Info"
    $proc = Start-Process -FilePath $InstallerPath -ArgumentList "/S", "/D=$TargetDir" -Wait -PassThru
    if ($proc.ExitCode -ne 0) {
        throw "El instalador devolvio codigo de salida $($proc.ExitCode)"
    }
    Write-Status "Instalacion completada en $TargetDir" "Success"
}

function Add-ToPath {
    param([string]$GsBinPath)
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    if ($currentPath -notlike "*$GsBinPath*") {
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$GsBinPath", "Machine")
        Write-Status "Agregado $GsBinPath al PATH del sistema" "Success"
    } else {
        Write-Status "Ya esta en PATH" "Info"
    }
}

function Register-Ghostscript {
    param([string]$GsDir, [string]$Version)
    $binDir = Join-Path $GsDir "bin"
    $libDir = Join-Path $GsDir "lib"
    $fontsDir = Join-Path $GsDir "fonts"
    $resourceDir = Join-Path $GsDir "Resource"

    $regPath = "HKLM:\SOFTWARE\GPL Ghostscript\$Version"
    $regPathArtifex = "HKLM:\SOFTWARE\Artifex\GPL Ghostscript\$Version"

    try {
        New-Item -Path $regPath -Force | Out-Null
        New-ItemProperty -Path $regPath -Name "GS_DLL" -Value "$binDir\gsdll64.dll" -PropertyType String -Force | Out-Null
        New-ItemProperty -Path $regPath -Name "GS_LIB" -Value "$binDir;$libDir;$fontsDir;$resourceDir" -PropertyType String -Force | Out-Null
        New-Item -Path $regPathArtifex -Force | Out-Null
        New-ItemProperty -Path $regPathArtifex -Name "(Default)" -Value $GsDir -PropertyType String -Force | Out-Null
        Write-Status "Ghostscript registrado en el sistema" "Success"
    } catch {
        Write-Status "No se pudo registrar en registry: $_" "Warn"
    }
}

# --- MAIN ---
Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  Halftone RIP Pro - Instalador de Ghostscript" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar si ya esta instalado
Write-Status "Verificando instalacion existente..." "Info"
$existing = Test-GhostscriptInstalled

if ($existing.Found -and -not $Force) {
    Write-Status "Ghostscript $($existing.Version) ya esta instalado en:" "Success"
    Write-Status "  $($existing.Path)" "Info"
    Write-Status "No se requiere accion. Usa -Force para reinstalar." "Info"
    exit 0
}

if ($existing.Found -and $Force) {
    Write-Status "Reinstalando Ghostscript (Force activado)..." "Warn"
}

# 2. Preparar directorio temporal
if (Test-Path $TEMP_DIR) {
    Remove-Item $TEMP_DIR -Recurse -Force
}
New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null

# 3. Descargar installer
$installerPath = Join-Path $TEMP_DIR $GS_INSTALLER
Write-Status "Descargando Ghostscript $Version..." "Info"
Write-Status "  URL: $GS_URL" "Info"

try {
    Invoke-WebRequest -Uri $GS_URL -OutFile $installerPath -UseBasicParsing
    $sizeMB = [math]::Round((Get-Item $installerPath).Length / 1MB, 1)
    Write-Status "Descarga completada: $sizeMB MB" "Success"
} catch {
    Write-Status "Error descargando: $_" "Error"
    Write-Status "Intenta descargar manualmente desde: https://ghostscript.com/releases/gsdnld.html" "Warn"
    exit 1
}

# 4. Instalar
$targetDir = Join-Path $InstallDir "gs$Version"

try {
    Install-GhostscriptSilent -InstallerPath $installerPath -TargetDir $targetDir

    $binPath = Join-Path $targetDir "bin"
    if (-not $Portable) {
        Add-ToPath -GsBinPath $binPath
        Register-Ghostscript -GsDir $targetDir -Version $Version
    }

    $gsExe = Join-Path $binPath "gswin64c.exe"
    if (Test-Path $gsExe) {
        $ver = & $gsExe --version 2>$null
        Write-Status "Ghostscript $ver instalado y funcionando correctamente" "Success"
    } else {
        throw "No se encontro gswin64c.exe despues de la instalacion"
    }

    Remove-Item $TEMP_DIR -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Green
    Write-Host "  OK Ghostscript $Version instalado correctamente!" -ForegroundColor Green
    Write-Host "  Ubicacion: $targetDir" -ForegroundColor Green
    Write-Host "  Ejecutable: $gsExe" -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Green
    Write-Host ""

    if ($Portable) {
        Write-Status "Modo portatil: Agrega manualmente '$binPath' al PATH" "Warn"
    }

} catch {
    Write-Status "Error durante la instalacion: $_" "Error"
    Write-Status "Logs temporales en: $TEMP_DIR" "Warn"
    exit 1
}
