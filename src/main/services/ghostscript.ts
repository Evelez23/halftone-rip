import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { GhostscriptResult } from '@shared/types'
import { getJobTempDir, sanitizeFileName } from '@main/utils/paths'
import { logger } from './logger'

// Detectar Ghostscript en el sistema
function findGhostscript(): string {
  const platform = process.platform
  const candidates: string[] = []

  if (platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\gs\\gs10.03.0\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.02.1\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.02.0\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.01.2\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.01.1\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.00.0\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs9.56.1\\bin\\gswin64c.exe',
      'gswin64c.exe',
      'gswin32c.exe'
    )
  } else if (platform === 'darwin') {
    candidates.push(
      '/usr/local/bin/gs',
      '/opt/homebrew/bin/gs',
      '/usr/bin/gs'
    )
  } else {
    candidates.push('/usr/bin/gs', '/usr/local/bin/gs')
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  // Fallback: asumir que está en PATH
  return platform === 'win32' ? 'gswin64c.exe' : 'gs'
}

const GS_PATH = findGhostscript()

export function getGhostscriptPath(): string {
  return GS_PATH
}

export async function getGhostscriptVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(GS_PATH, ['--version'])
    let output = ''
    proc.stdout.on('data', (data) => { output += data.toString() })
    proc.on('close', (code) => {
      if (code === 0) resolve(output.trim())
      else reject(new Error('Ghostscript no disponible'))
    })
    proc.on('error', () => reject(new Error('Ghostscript no encontrado en el sistema')))
  })
}

export interface GSRenderOptions {
  inputPath: string
  jobId: string
  dpi: number
  page?: number  // undefined = todas
}

/**
 * Renderiza PS/PDF a TIFF separado por canales usando Ghostscript.
 * GS hace el trabajo pesado: parseo PostScript, rasterizado, separación CMYK+Spot.
 */
export async function renderWithGhostscript(options: GSRenderOptions): Promise<GhostscriptResult> {
  const { inputPath, jobId, dpi, page } = options
  const tempDir = getJobTempDir(jobId)

  logger.info(jobId, 'ghostscript', 'Iniciando renderizado GS', { 
    input: inputPath, 
    dpi, 
    page: page || 'all',
    gsPath: GS_PATH 
  })

  const baseName = sanitizeFileName(path.basename(inputPath, path.extname(inputPath)))
  const outputPattern = path.join(tempDir, `${baseName}_%04d.tif`)

  const args: string[] = [
    '-dNOPAUSE',
    '-dBATCH',
    '-dSAFER',
    `-r${dpi}`,
    '-sDEVICE=tiffsep',
    '-dCompressPages=true',
    '-sCompression=lzw',
    `-sOutputFile=${outputPattern}`,
    '-c',
    'save pop',
    '-f',
    inputPath
  ]

  if (page !== undefined) {
    args.unshift(`-dFirstPage=${page}`, `-dLastPage=${page}`)
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const proc = spawn(GS_PATH, args)

    let stderr = ''
    proc.stderr.on('data', (data) => { stderr += data.toString() })

    proc.on('close', (code) => {
      const duration = Date.now() - startTime

      if (code !== 0) {
        logger.error(jobId, 'ghostscript', 'Ghostscript falló', { 
          code, 
          stderr: stderr.slice(0, 500),
          durationMs: duration 
        })
        resolve({
          success: false,
          outputFiles: [],
          pageCount: 0,
          spotsDetected: [],
          error: `Ghostscript exit code ${code}: ${stderr.slice(0, 200)}`
        })
        return
      }

      // Ghostscript genera: base_0001.tif (compuesta), base_0001.Cyan.tif, etc.
      const files = fs.readdirSync(tempDir)
        .filter(f => f.startsWith(baseName))
        .sort()

      const compositeFiles = files.filter(f => /^.+_\d{4}\.tif$/.test(f))
      const spotFiles = files.filter(f => f.endsWith('.tif'))
      const spotsDetected = [...new Set(spotFiles.map(f => {
        // Soporta estilo de puntos: .SpotName.tif
        const matchDot = f.match(/\.([A-Za-z0-9_ -]+)\.tif$/)
        if (matchDot) return matchDot[1]

        // Soporta estilo de paréntesis: (SpotName).tif
        const matchParen = f.match(/\(([A-Za-z0-9_ -]+)\)\.tif$/)
        if (matchParen) return matchParen[1]

        return ''
      }).filter(Boolean))]

      logger.info(jobId, 'ghostscript', 'Renderizado completado', {
        durationMs: duration,
        pages: compositeFiles.length,
        spots: spotsDetected,
        totalFiles: files.length
      })

      resolve({
        success: true,
        outputFiles: files.map(f => path.join(tempDir, f)),
        pageCount: compositeFiles.length,
        spotsDetected
      })
    })

    proc.on('error', (err) => {
      logger.error(jobId, 'ghostscript', 'Error ejecutando Ghostscript', { error: err.message })
      resolve({
        success: false,
        outputFiles: [],
        pageCount: 0,
        spotsDetected: [],
        error: err.message
      })
    })
  })
}

/**
 * Genera PDF multipágina final desde los canales procesados.
 */
export async function generateFinalPdf(
  jobId: string,
  channelFiles: string[],
  outputPath: string,
  width: number,
  height: number,
  dpi: number
): Promise<void> {
  logger.info(jobId, 'ghostscript', 'Generando PDF final multipágina', {
    channels: channelFiles.length,
    output: outputPath
  })

  // Por ahora, usamos pdf-lib para ensamblar. Ghostscript también puede hacerlo
  // pero pdf-lib da más control sobre la estructura.
  // Implementación en pdf-assembler.ts
  logger.info(jobId, 'ghostscript', 'PDF final delegado a pdf-assembler')
}
