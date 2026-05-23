# Arquitectura Técnica

## Flujo de Datos

```
Archivo PS/PDF
    ↓
[Electron Main] ──spawn──→ [Ghostscript]
    │                        ↓
    │                    TIFF separado por canales
    │                        ↓
    │                    (Cyan.tif, Magenta.tif, Spot_Pantone185.tif...)
    │                        ↓
    ←────────────────────── [Node.js]
                              ↓
                    [Engine: Halftone]
                              ↓
                    PNG con semitono por canal
                              ↓
                    [Engine: Underbase] (opcional)
                              ↓
                    [Engine: PDF Assembler]
                              ↓
                    PDF multipágina final
                              ↓
                    ~/output/Diseño_FINAL.pdf
```

## Por qué Ghostscript

| Aspecto | Ghostscript | Parser Propio |
|---------|-------------|---------------|
| PS Level 3 | ✅ Nativo | ❌ Imposible |
| Fuentes Type1/Type3 | ✅ | ❌ Parcial |
| Shading patterns | ✅ | ❌ No |
| Imágenes incrustadas | ✅ | ❌ No |
| Spot colors (Separation) | ✅ Nativo | ❌ Manual |
| Mantenimiento | ✅ Artifex | ❌ Tú solo |

**Decisión**: Delegar lo que GS hace mejor. Tu valor está en el post-procesamiento textil.

## Seguridad de Memoria

- Ghostscript genera TIFFs en disco, no en RAM.
- El engine procesa con `sharp` que usa libvips (C nativo, eficiente).
- Temp se limpia automáticamente después de cada job.
- Límite de 2 jobs concurrentes para no saturar.

## Licencia Ghostscript

Ghostscript es AGPL. **NO** linkamos directamente. Lo invocamos via `child_process.spawn()`.

Según la FSF, esto califica como "mere aggregation" - tu app y GS son programas independientes que se comunican por pipes.

Si necesitas distribuir comercialmente sin preocupaciones, considera:
- Artifex Commercial License
- O indicar claramente que GS es requisito del usuario
