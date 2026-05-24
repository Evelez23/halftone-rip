import fs from 'fs'
import path from 'path'
import { Preset, JobConfig } from '@shared/types'
import { getPresetsDir } from '@main/utils/paths'
import { logger } from './logger'

const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'standard-plastisol',
    name: 'Standard Plastisol',
    description: 'Configuración equilibrada para algodón estándar con tinta plastisol',
    category: 'standard',
    config: {
      lpi: 45,
      dpi: 300,
      angle: 22.5,
      dotShape: 'round',
      autoAngles: true,
      simulateSpot: true,
      presetName: 'standard-plastisol'
    }
  },
  {
    id: 'fine-detail',
    name: 'Fine Detail',
    description: 'Alta lineatura para microdetalles y trabajos finos',
    category: 'standard',
    config: {
      lpi: 65,
      dpi: 1200,
      angle: 22.5,
      dotShape: 'ellipse',
      autoAngles: true,
      simulateSpot: true,
      presetName: 'fine-detail'
    }
  },
  {
    id: 'white-underbase',
    name: 'White Underbase',
    description: 'Base blanca optimizada con choke para prendas oscuras',
    category: 'underbase',
    config: {
      lpi: 35,
      dpi: 300,
      angle: 15,
      dotShape: 'round',
      autoAngles: false,
      simulateSpot: true,
      presetName: 'white-underbase'
    }
  },
  {
    id: 'athletic-jersey',
    name: 'Athletic Jersey',
    description: 'Optimizado para poliéster y malla deportiva',
    category: 'specialty',
    config: {
      lpi: 40,
      dpi: 300,
      angle: 22.5,
      dotShape: 'round',
      autoAngles: true,
      simulateSpot: true,
      presetName: 'athletic-jersey'
    }
  },
  {
    id: 'vintage-print',
    name: 'Vintage Print',
    description: 'Efecto desgastado con baja lineatura',
    category: 'specialty',
    config: {
      lpi: 35,
      dpi: 200,
      angle: 22.5,
      dotShape: 'round',
      autoAngles: true,
      simulateSpot: true,
      presetName: 'vintage-print'
    }
  }
]

const PRESETS_FILE = 'user-presets.json'

class PresetManager {
  private presets: Map<string, Preset> = new Map()
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return

    // Cargar defaults
    DEFAULT_PRESETS.forEach(p => this.presets.set(p.id, p))

    // Cargar user presets
    const userFile = path.join(getPresetsDir(), PRESETS_FILE)
    if (fs.existsSync(userFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(userFile, 'utf-8')) as Preset[]
        data.forEach(p => this.presets.set(p.id, p))
        logger.info('system', 'preset-manager', `Cargados ${data.length} presets de usuario`)
      } catch (e) {
        logger.error('system', 'preset-manager', 'Error cargando user presets', { error: (e as Error).message })
      }
    }

    this.initialized = true
  }

  getAll(): Preset[] {
    return Array.from(this.presets.values())
  }

  get(id: string): Preset | undefined {
    return this.presets.get(id)
  }

  save(preset: Preset): void {
    this.presets.set(preset.id, preset)
    this.persist()
    logger.info('system', 'preset-manager', `Preset guardado: ${preset.name}`)
  }

  delete(id: string): boolean {
    // No borrar defaults
    if (DEFAULT_PRESETS.find(p => p.id === id)) {
      return false
    }
    const deleted = this.presets.delete(id)
    if (deleted) this.persist()
    return deleted
  }

  getConfig(presetId: string): JobConfig {
    const preset = this.get(presetId)
    if (!preset) {
      throw new Error(`Preset no encontrado: ${presetId}`)
    }
    return { ...preset.config }
  }

  private persist(): void {
    const userPresets = Array.from(this.presets.values())
      .filter(p => !DEFAULT_PRESETS.find(d => d.id === p.id))
    const userFile = path.join(getPresetsDir(), PRESETS_FILE)
    fs.writeFileSync(userFile, JSON.stringify(userPresets, null, 2))
  }
}

export const presetManager = new PresetManager()
