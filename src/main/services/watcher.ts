import chokidar from 'chokidar'
import path from 'path'
import { WatcherConfig } from '@shared/types'
import { logger } from './logger'
import { jobQueue } from './job-queue'
import { getOutputDir } from '@main/utils/paths'

class WatcherService {
  private watcher: chokidar.FSWatcher | null = null
  private config: WatcherConfig = {
    enabled: false,
    inputPath: '',
    outputPath: '',
    preset: 'standard-plastisol',
    recursive: true
  }
  private listeners: Set<(event: { type: string; filePath: string }) => void> = new Set()

  getConfig(): WatcherConfig {
    return { ...this.config }
  }

  setConfig(config: Partial<WatcherConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('system', 'watcher', 'Configuración actualizada', { config: this.config })

    if (this.config.enabled && this.watcher) {
      this.stop()
      this.start()
    }
  }

  start(): boolean {
    if (!this.config.enabled || !this.config.inputPath) {
      logger.warn('system', 'watcher', 'No se puede iniciar: falta inputPath o está deshabilitado')
      return false
    }

    if (this.watcher) {
      logger.info('system', 'watcher', 'Watcher ya estaba activo, reiniciando')
      this.stop()
    }

    logger.info('system', 'watcher', 'Iniciando hotfolder', { 
      input: this.config.inputPath,
      preset: this.config.preset 
    })

    this.watcher = chokidar.watch(this.config.inputPath, {
      ignored: /(^|[\/\\])\../, // ignorar dotfiles
      persistent: true,
      ignoreInitial: true, // no procesar archivos existentes al iniciar
      depth: this.config.recursive ? undefined : 0,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 500
      }
    })

    this.watcher
      .on('add', (filePath) => this.handleFile(filePath))
      .on('error', (error) => {
        logger.error('system', 'watcher', 'Error del watcher', { error: error.message })
        this.notifyListeners({ type: 'error', filePath: error.message })
      })

    this.notifyListeners({ type: 'started', filePath: this.config.inputPath })
    return true
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
      logger.info('system', 'watcher', 'Watcher detenido')
      this.notifyListeners({ type: 'stopped', filePath: '' })
    }
  }

  toggle(): boolean {
    if (this.watcher) {
      this.stop()
      this.config.enabled = false
      return false
    } else {
      this.config.enabled = true
      return this.start()
    }
  }

  private async handleFile(filePath: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase()
    if (!['.ps', '.eps', '.pdf'].includes(ext)) {
      return // ignorar archivos no soportados
    }

    logger.info('system', 'watcher', `Archivo detectado: ${path.basename(filePath)}`, { filePath })
    this.notifyListeners({ type: 'file-detected', filePath })

    try {
      const job = await jobQueue.add(filePath, this.config.preset)
      this.notifyListeners({ type: 'job-created', filePath: job.id })
    } catch (error) {
      logger.error('system', 'watcher', 'Error encolando archivo', { 
        filePath, 
        error: (error as Error).message 
      })
      this.notifyListeners({ type: 'error', filePath: (error as Error).message })
    }
  }

  onEvent(callback: (event: { type: string; filePath: string }) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(event: { type: string; filePath: string }): void {
    this.listeners.forEach(cb => {
      try { cb(event) } catch (e) { /* ignore */ }
    })
  }
}

export const watcherService = new WatcherService()
