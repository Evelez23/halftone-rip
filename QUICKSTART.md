# Halftone RIP Pro - Inicio Rápido

## Windows (Usuario Final)

### 1. Instalar Ghostscript (primera vez)
```powershell
# Abre PowerShell como Administrador y ejecuta:
powershell -ExecutionPolicy Bypass -File scripts/install-ghostscript.ps1
```

### 2. Instalar Halftone RIP Pro
- Descarga el `.exe` desde Releases
- Ejecuta el instalador
- La app se asocia automáticamente con `.ps` y `.eps`

### 3. Usar
- **Doble click** en cualquier `.ps` o `.eps`
- O arrastra a la ventana de la app
- Selecciona preset → Procesar → Listo

---

## Desarrollo

### Requisitos
- Windows 10/11 64-bit
- Node.js 20+
- Ghostscript 10+

### Setup
```powershell
# 1. Clonar
git clone https://github.com/tuusuario/halftone-rip-pro.git
cd halftone-rip-pro

# 2. Setup automático (instala todo)
npm run setup

# 3. O manualmente:
npm install
npm run check          # Verificar prerequisitos
npm run install:gs     # Instalar Ghostscript
npm run dev            # Modo desarrollo
```

### Build Release
```powershell
# Verificar todo
npm run check

# Generar instalador
npm run release:win

# O con versión específica
powershell -File scripts/build-release.ps1 -Version "1.1.0"
```

---

## Estructura del Output

```
OUTPUT/
  Diseño_FINAL.pdf          <- PDF multipágina con todos los canales

  Canales individuales (debug):
  temp/job_xxx/
    Diseño_0001.Cyan.tif
    Diseño_0001.Magenta.tif
    Diseño_0001.Yellow.tif
    Diseño_0001.Black.tif
    Diseño_0001.Spot_Pantone185.tif
    Diseño_0001.White_Underbase.tif  (si aplica)
```

---

## Troubleshooting

### "Ghostscript no detectado"
```powershell
npm run install:gs
# O manualmente:
# Descarga desde https://ghostscript.com/releases/gsdnld.html
```

### "Error al procesar archivo PS complejo"
- Convierte a PDF primero con Ghostscript: `gswin64c -sDEVICE=pdfwrite -o output.pdf input.ps`
- Usa el PDF resultante en la app

### "Out of memory"
- Reduce DPI a 300 para pruebas
- Procesa menos páginas simultáneas
- Cierra otras aplicaciones

---

## Soporte

- Logs: `%APPDATA%\Halftone RIP Pro\logs\`
- Issues: https://github.com/tuusuario/halftone-rip-pro/issues
