import PQueue from 'p-queue'
import path from 'path'
import { Job, JobConfig, ProcessedPage } from '@shared/types'
import { LIMITS } from '@shared/constants'
import { getOutputDir, getJobTempDir, cleanJobTemp, sanitizeFileName } from '@main/utils/paths'
import { logger } from './logger'
import { renderWithGhostscript } from './ghostscript'
import { applyHalftoneToChannel } from '@engine/halftone'
import { generateUnderbase } from '@engine/underbase'
import { assembleMultiPagePdf } from '@engine/pdf-assembler'
import { presetManager } from './preset-manager'

class JobQueue {
  private queue: PQueue
  private jobs: Map<string, Job> = new Map()
  private listeners: Set<(job: Job) => void> = new Set()

  constructor() {
    this.queue = new PQueue({ concurrency: LIMITS.CONCURRENT_JOBS })
  }

  async add(filePath: string, presetId: string, configOverride?: Partial<JobConfig>): Promise<Job> {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const fileName = path.basename(filePath)
    const ext = path.extname(filePath).toLowerCase().slice(1)

    const baseConfig = presetManager.getConfig(presetId)
    const config: JobConfig = { ...baseConfig, ...configOverride, presetName: presetId }

    const job: Job = {
      id,
      filePath,
      fileName,
      fileType: ext as 'pdf' | 'ps' | 'eps',
      status: 'queued',
      preset: presetId,
      config,
      createdAt: new Date().toISOString()
    }

    this.jobs.set(id, job)
    this.notifyListeners(job)

    logger.info(id, 'job-queue', 'Job encolado', { 
      file: fileName, 
      preset: presetId,
      config 
    })

    this.queue.add(() => this.process(job))

    return job
  }

  private async process(job: Job): Promise<void> {
    const startTime = Date.now()
    job.status = 'processing'
    this.notifyListeners(job)

    logger.info(job.id, 'processor', 'Iniciando procesamiento', {
      file: job.fileName,
      preset: job.preset
    })

    try {
      // 1. Renderizado con Ghostscript
      const gsResult = await renderWithGhostscript({
        inputPath: job.filePath,
        jobId: job.id,
        dpi: job.config.dpi
      })

      if (!gsResult.success) {
        throw new Error(gsResult.error || 'Ghostscript falló sin mensaje de error')
      }

      // 2. Procesar cada página
      const processedPages: ProcessedPage[] = []

      for (let pageNum = 1; pageNum <= gsResult.pageCount; pageNum++) {
        logger.info(job.id, 'processor', `Procesando página ${pageNum}/${gsResult.pageCount}`)

        // Ghostscript genera archivos: base_0001.tif, base_0001.Cyan.tif, etc.
        const tempDir = getJobTempDir(job.id)
        const baseName = sanitizeFileName(path.basename(job.filePath, path.extname(job.filePath)))
        const pageSuffix = String(pageNum).padStart(4, '0')

        // Detectar archivos de canal para esta página
        const pageFiles = gsResult.outputFiles.filter(f => 
          f.includes(`${baseName}_${pageSuffix}`) && f.includes('.')
        )

        // Canales estándar
        const standardChannels = ['Cyan', 'Magenta', 'Yellow', 'Black']
        const channels = []

        for (const chName of standardChannels) {
          const chFile = pageFiles.find(f => f.includes(`.${chName}.tif`) || f.includes(`(${chName}).tif`))
          if (chFile) {
            logger.info(job.id, 'halftone', `Aplicando semitono a ${chName}`)
            const processed = await applyHalftoneToChannel({
              inputPath: chFile,
              jobId: job.id,
              channelName: chName,
              config: job.config
            })
            channels.push(processed)
          }
        }

        // Canales Spot detectados por GS
        for (const spotName of gsResult.spotsDetected) {
          if (standardChannels.includes(spotName)) continue
          const spotFile = pageFiles.find(f => f.includes(`.${spotName}.tif`) || f.includes(`(${spotName}).tif`))
          if (spotFile) {
            logger.info(job.id, 'halftone', `Aplicando semitono a Spot: ${spotName}`)
            const processed = await applyHalftoneToChannel({
              inputPath: spotFile,
              jobId: job.id,
              channelName: spotName,
              config: job.config,
              isSpot: true
            })
            channels.push(processed)
          }
        }

        // Underbase (si el preset lo requiere)
        if (job.preset === 'white-underbase' || job.config.presetName === 'white-underbase') {
          logger.info(job.id, 'underbase', 'Generando base blanca')
          const underbase = await generateUnderbase({
            channels,
            jobId: job.id,
            config: job.config
          })
          channels.unshift(underbase)
        }

        processedPages.push({
          pageNumber: pageNum,
          channels,
          width: channels[0]?.width || 0,
          height: channels[0]?.height || 0
        })
      }

      // 3. Ensamblar PDF final
      const outputFileName = `${sanitizeFileName(path.basename(job.filePath, path.extname(job.filePath)))}_FINAL.pdf`
      const outputPath = path.join(getOutputDir(), outputFileName)

      await assembleMultiPagePdf({
        pages: processedPages,
        outputPath,
        jobId: job.id,
        metadata: {
          source: job.fileName,
          preset: job.preset,
          lpi: job.config.lpi,
          dpi: job.config.dpi
        }
      })

      // 4. Finalizar
      job.status = 'completed'
      job.completedAt = new Date().toISOString()
      job.outputPath = outputPath
      job.channels = processedPages.flatMap(p => p.channels.map(c => c.name))
      job.durationMs = Date.now() - startTime

      logger.info(job.id, 'processor', 'Job completado', {
        durationMs: job.durationMs,
        output: outputPath,
        pages: processedPages.length,
        channels: job.channels
      })

      // Limpieza opcional (conservar temp para debug en desarrollo)
      if (process.env.NODE_ENV !== 'development') {
        cleanJobTemp(job.id)
      }

    } catch (error) {
      job.status = 'error'
      job.error = (error as Error).message
      job.durationMs = Date.now() - startTime

      logger.error(job.id, 'processor', 'Job falló', {
        error: job.error,
        durationMs: job.durationMs
      })
    }

    this.notifyListeners(job)
  }

  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'queued') return false

    // p-queue no soporta cancelación individual fácilmente
    // Marcamos como cancelado y ignoramos en siguiente iteración
    job.status = 'error'
    job.error = 'Cancelado por usuario'
    this.notifyListeners(job)
    logger.info(jobId, 'job-queue', 'Job cancelado por usuario')
    return true
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id)
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  onUpdate(callback: (job: Job) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(job: Job): void {
    this.listeners.forEach(cb => {
      try { cb(job) } catch (e) { /* ignore */ }
    })
  }
}

export const jobQueue = new JobQueue()
