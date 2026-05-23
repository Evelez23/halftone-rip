# Halftone RIP Pro

**Separador textil profesional PS/PDF → PDF multipágina con semitonos.**

> Convierte automáticamente archivos PostScript y PDF en separaciones textiles listas para impresión.

---

## 🎯 Filosofía del Producto

- **UNA cosa bien hecha**: Separaciones textiles con semitonos.
- **Cero configuración para el 90%**: Selecciona un preset y procesa.
- **Workflow invisible**: Hotfolder + doble-click = output listo.

---

## 📦 Requisitos

### Obligatorios
- **Node.js** 20+
- **Ghostscript** 10.x (instalado en el sistema)
  - Windows: [Descargar de Artifex](https://www.ghostscript.com/download/gsdnld.html)
  - macOS: `brew install ghostscript`
  - Linux: `sudo apt-get install ghostscript`

### Opcionales
- **Visual Studio Code** (recomendado)
- **Git**

---

## 🚀 Instalación

```bash
# 1. Clonar repo
git clone https://github.com/tuusuario/halftone-rip-pro.git
cd halftone-rip-pro

# 2. Instalar dependencias
npm install

# 3. Verificar Ghostscript
gs --version
# o en Windows: gswin64c --version

# 4. Iniciar en modo desarrollo
npm run dev

# 5. Construir para producción
npm run build
npm run dist
```

---

## 🖥️ Uso

### Método 1: Interfaz Gráfica
1. Arrastra un archivo `.ps`, `.eps` o `.pdf` al área de drop.
2. Selecciona un preset (Standard Plastisol, White Underbase, etc.).
3. Haz clic en **Procesar Separaciones**.
4. El PDF final aparece en `~/AppData/Roaming/Halftone RIP Pro/output/`.

### Método 2: Doble Click (Windows)
1. Instala la app con el instalador `.exe`.
2. Haz doble click en cualquier archivo `.ps` o `.eps`.
3. La app se abre, procesa automáticamente y cierra (opcional).

### Método 3: Hotfolder
1. Activa el hotfolder desde la UI (panel derecho).
2. Selecciona una carpeta de entrada.
3. Copia archivos a esa carpeta.
4. Se procesan automáticamente en la carpeta de salida.

---

## ⚙️ Presets Incluidos

| Preset | LPI | DPI | Uso |
|--------|-----|-----|-----|
| **Standard Plastisol** | 45 | 300 | Algodón estándar |
| **Fine Detail** | 65 | 400 | Microdetalles |
| **White Underbase** | 35 | 300 | Prendas oscuras |
| **Athletic Jersey** | 40 | 300 | Poliéster deportivo |
| **Vintage Print** | 35 | 200 | Efecto desgastado |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│  ELECTRON (UI + File System + Hotfolder)│
├─────────────────────────────────────────┤
│  NODE MAIN PROCESS                      │
│  ├── Job Queue (p-queue)                │
│  ├── Logging estructurado (JSONL)       │
│  ├── Preset Manager (JSON)              │
│  └── Ghostscript Spawner                │
├─────────────────────────────────────────┤
│  GHOSTSCRIPT (Motor de renderizado)     │
│  ├── PS/PDF → TIFF separado por canales │
│  ├── Detección de Spot colors           │
│  └── Rasterizado a alta resolución      │
├─────────────────────────────────────────┤
│  ENGINE (Tu propiedad intelectual)      │
│  ├── Semitonos ordenados (Bayer)        │
│  ├── Underbase generation               │
│  └── PDF multipágina final (pdf-lib)    │
└─────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
halftone-rip-pro/
├── src/
│   ├── main/              # Electron main process
│   │   ├── services/      # Logger, Presets, Job Queue, Watcher
│   │   ├── ipc-handlers/  # Comunicación main ↔ renderer
│   │   └── utils/         # Rutas, helpers
│   ├── preload/           # API segura expuesta al renderer
│   ├── renderer/          # UI (HTML + TypeScript vanilla)
│   │   └── components/    # DropZone, Presets, Jobs, Logs
│   ├── shared/            # Tipos y constantes
│   └── engine/            # Halftone, Underbase, PDF Assembler
├── resources/
│   ├── presets/           # JSON presets
│   └── icc/               # Perfiles de color
├── docs/                  # Documentación
├── logs/                  # Logs de ejecución (.jsonl)
├── temp/                  # Archivos temporales por job
└── output/                # PDFs finales
```

---

## 📝 Logging

Cada job genera un log estructurado en `logs/`:

```json
{"timestamp":"2026-05-22T13:30:00Z","jobId":"job_abc123","level":"info","stage":"ghostscript","message":"Renderizado completado","meta":{"pages":3,"spots":["Pantone 185"]}}
```

Para debug: abre la carpeta de logs desde el botón **📋 Logs** en la UI.

---

## 🔧 Desarrollo

### Comandos útiles

```bash
npm run dev          # Modo desarrollo con hot reload
npm run build        # Build de producción
npm run preview      # Preview del build
npm run dist         # Generar instalador
npm run dist:win     # Solo Windows
```

### Añadir un nuevo preset

1. Edita `src/main/services/preset-manager.ts`
2. Añade a `DEFAULT_PRESETS`:

```typescript
{
  id: 'mi-preset',
  name: 'Mi Preset',
  description: 'Descripción',
  category: 'standard',
  config: {
    lpi: 50, dpi: 300, angle: 22.5,
    dotShape: 'round', autoAngles: true,
    simulateSpot: true, presetName: 'mi-preset'
  }
}
```

---

## ⚠️ Limitaciones Conocidas

- **Ghostscript AGPL**: Usamos GS vía CLI (spawn), no link directo. Tu app es "mere aggregation".
- **Archivos PS complejos**: Fuentes Type3, shading patterns avanzados y imágenes incrustadas complejas pueden no renderizar perfectamente. Solución: convertir a PDF primero.
- **Memoria**: Archivos muy grandes (>100MB a 600DPI) pueden requerir más RAM. Usa 300DPI para pruebas.

---

## 📄 Licencia

MIT © 2026 Tu Nombre

Ghostscript es propiedad de Artifex Software, Inc. y se usa bajo sus términos de licencia.
