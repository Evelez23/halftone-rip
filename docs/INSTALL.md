# Guía de Instalación

## Windows

### 1. Instalar Ghostscript
1. Descarga Ghostscript 10.x desde [ghostscript.com](https://www.ghostscript.com/download/gsdnld.html)
2. Ejecuta el instalador `.exe`
3. Asegúrate de que `gswin64c.exe` esté en el PATH o en `C:\Program Files\gs\`

### 2. Instalar Halftone RIP Pro
1. Descarga el instalador `.exe` desde [Releases](https://github.com/tuusuario/halftone-rip-pro/releases)
2. Ejecuta el instalador
3. La app se asocia automáticamente con `.ps` y `.eps`

### 3. Verificar
1. Abre Halftone RIP Pro
2. En la barra superior debe decir "✓ GS 10.x.x"
3. Si dice "✗ GS no detectado", revisa la instalación de Ghostscript

## macOS

```bash
# Instalar Ghostscript
brew install ghostscript

# Descargar y ejecutar la app
# (Descarga el .dmg desde Releases)
```

## Linux (Ubuntu/Debian)

```bash
# Instalar Ghostscript
sudo apt-get update
sudo apt-get install ghostscript

# Descargar AppImage o .deb desde Releases
# Ejecutar:
./halftone-rip-pro-*.AppImage
```
