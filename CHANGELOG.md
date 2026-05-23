# Changelog

Todos los cambios notables de este proyecto se documentarán aquí.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [Unreleased]

## [1.0.0] - 2026-05-22

### Añadido
- **Core**: Pipeline completo PS/PDF → separaciones CMYK+Spot → semitonos → PDF multipágina.
- **Ghostscript Integration**: Renderizado nativo via `tiffsep` device. Detección automática de Spot colors.
- **5 Presets**: Standard Plastisol, Fine Detail, White Underbase, Athletic Jersey, Vintage Print.
- **Hotfolder**: Watcher automático con `chokidar`. Procesamiento sin intervención.
- **Job Queue**: Cola con concurrencia limitada (2 jobs simultáneos). Estados: queued, processing, completed, error.
- **Logging estructurado**: JSON Lines por job. Rotación diaria. Visualización en tiempo real en UI.
- **UI**: Interfaz limpia con drag & drop, selector de presets, lista de jobs, visor de logs.
- **Asociación de archivos**: Doble-click en `.ps` y `.eps` abre la app (Windows).
- **Underbase**: Generación automática de base blanca con choke para prendas oscuras.
- **Semitonos**: Ordered dithering con matriz Bayer 8x8 rotada. Formas: round, ellipse, diamond, line, square.
- **PDF Output**: pdf-lib para ensamblar PDF multipágina con metadatos de RIP.

### Técnico
- Electron 30 + Vite + TypeScript.
- Arquitectura modular: main process / preload / renderer / engine.
- IPC tipado fuerte para evitar errores de comunicación.
- Manejo de memoria: procesamiento por bloques, limpieza de temp.

## [0.9.0] - 2026-05-15

### Añadido
- Scaffold inicial del proyecto Electron.
- Integración base de Ghostscript CLI.
- UI prototipo migrada desde el HTML monolítico anterior.

### Cambiado
- **BREAKING**: El proyecto ya NO es un HTML monolítico. Es una app Electron profesional.
- Parser PostScript propio eliminado. Ahora delegamos 100% a Ghostscript.

### Eliminado
- Parser PostScript embebido (~800 líneas). Reemplazado por Ghostscript nativo.
- Procesamiento Canvas del navegador. Reemplazado por sharp + Node.js.
