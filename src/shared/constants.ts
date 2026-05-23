import path from 'path'
import { app } from 'electron'

// Rutas del sistema (se evalúan en runtime)
export const getPaths = () => {
  const userData = app.getPath('userData')
  return {
    LOGS_DIR: path.join(userData, 'logs'),
    TEMP_DIR: path.join(userData, 'temp'),
    OUTPUT_DIR: path.join(userData, 'output'),
    PRESETS_DIR: path.join(userData, 'presets'),
    ICC_DIR: path.join(userData, 'icc'),
    CONFIG_FILE: path.join(userData, 'config.json')
  }
}

// Defaults
export const DEFAULT_CONFIG: {
  outputDir: string
  defaultPreset: string
  watcher: {
    enabled: boolean
    inputPath: string
    outputPath: string
    preset: string
  }
} = {
  outputDir: '',
  defaultPreset: 'standard-plastisol',
  watcher: {
    enabled: false,
    inputPath: '',
    outputPath: '',
    preset: 'standard-plastisol'
  }
}

// Límites de seguridad
export const LIMITS = {
  MAX_FILE_SIZE_MB: 500,
  MAX_DPI: 1200,
  MIN_LPI: 10,
  MAX_LPI: 200,
  MAX_PAGES_BATCH: 50,
  CONCURRENT_JOBS: 2
}

// Ghostscript device options
export const GS_DEVICES = {
  TIFF_SEP: 'tiffsep',
  TIFF_SEP_1: 'tiffsep1',
  PNG_ALPHA: 'pngalpha',
  PDF_WRITE: 'pdfwrite'
}

// Colores de UI para canales
export const CHANNEL_COLORS: Record<string, string> = {
  Cyan: '#00b4d8',
  Magenta: '#e63a6e',
  Yellow: '#f5c800',
  Black: '#1a1a2e',
  'White Underbase': '#ffffff',
  'Orange Spot': '#ff6600',
  'Violet Spot': '#8b00ff',
  'Turquesa Spot': '#40e0d0'
}
