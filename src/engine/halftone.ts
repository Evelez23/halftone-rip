import sharp from 'sharp'
import path from 'path'
import { JobConfig, HalftoneChannel } from '@shared/types'
import { getJobTempDir } from '@main/utils/paths'
import { logger } from '@main/services/logger'

// Matriz Bayer 8x8 pre-calculada
const BAYER_8 = [
  [ 0, 48, 12, 60,  3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [ 8, 56,  4, 52, 11, 59,  7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [ 2, 50, 14, 62,  1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58,  6, 54,  9, 57,  5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21]
]

// Cache de matrices rotadas
const rotatedMatrices = new Map<number, Uint8Array>()

function getRotatedMatrix(angle: number): Uint8Array {
  const key = Math.round(angle * 2)
  if (rotatedMatrices.has(key)) return rotatedMatrices.get(key)!

  const rad = angle * Math.PI / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const n = 8
  const result = new Uint8Array(n * n)
  const cx = (n - 1) / 2, cy = (n - 1) / 2

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const sx = Math.round(cx + (x - cx) * cos - (y - cy) * sin)
      const sy = Math.round(cy + (x - cx) * sin + (y - cy) * cos)
      if (sx >= 0 && sx < n && sy >= 0 && sy < n) {
        result[y * n + x] = BAYER_8[sy][sx]
      }
    }
  }

  rotatedMatrices.set(key, result)
  return result
}

function getSpotFunction(shape: string, x: number, y: number): number {
  const absX = Math.abs(x), absY = Math.abs(y)
  switch (shape) {
    case 'round': return absX + absY - 1
    case 'ellipse': return absX / 2 + absY - 1
    case 'diamond': return (absX + absY) / 2 - 1
    case 'line': return Math.abs(y) - 1
    case 'square': return Math.max(absX, absY) - 1
    default: return absX + absY - 1
  }
}

export interface HalftoneOptions {
  inputPath: string
  jobId: string
  channelName: string
  config: JobConfig
  isSpot?: boolean
}

/**
 * Aplica semitono ordenado (Ordered Dithering) a un canal separado.
 * Ghostscript ya hizo la separación; nosotros aplicamos la trama.
 */
export async function applyHalftoneToChannel(options: HalftoneOptions): Promise<HalftoneChannel> {
  const { inputPath, jobId, channelName, config, isSpot = false } = options

  logger.info(jobId, 'halftone', `Procesando canal ${channelName}`, {
    input: inputPath,
    lpi: config.lpi,
    dpi: config.dpi,
    shape: config.dotShape
  })

  // Leer imagen con sharp
  const { data, info } = await sharp(inputPath)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const pixels = new Uint8Array(data)

  // Calcular ángulo para este canal
  let angle = config.angle
  if (config.autoAngles && !isSpot) {
    const angles: Record<string, number> = { Cyan: 15, Magenta: 75, Yellow: 0, Black: 45 }
    angle = angles[channelName] || config.angle
  } else if (isSpot) {
    angle = config.angle + 30 // spots a 30° del ángulo base
  }

  // Parámetros de semitono
  const scale = config.dpi / config.lpi
  const cellSize = Math.max(2, Math.round(scale))
  const threshold = getRotatedMatrix(angle)
  const tSize = 8

  // Procesar píxeles
  const out = new Uint8ClampedArray(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels
      // Tomar el primer canal (los TIFF de GS son grayscale en realidad)
      const intensity = pixels[idx]

      const tx = x % tSize
      const ty = y % tSize
      const thresholdVal = threshold[ty * tSize + tx] / 64

      const cx = (x % cellSize) / cellSize * 2 - 1
      const cy = (y % cellSize) / cellSize * 2 - 1
      const spot = getSpotFunction(config.dotShape, cx, cy)

      // Preserva blancos puros de separaciones vacías para evitar ruido de trama
      if (intensity >= 250) {
        out[y * width + x] = 255
        continue
      }

      const adjustedThreshold = Math.max(0, Math.min(1, thresholdVal + spot * 0.15))
      const normalizedIntensity = intensity / 255

      out[y * width + x] = normalizedIntensity > adjustedThreshold ? 255 : 0
    }
  }

  // Convertir de vuelta a imagen
  const outputBuffer = Buffer.from(out)
  const tempDir = getJobTempDir(jobId)
  const outputPath = path.join(tempDir, `${path.basename(inputPath, path.extname(inputPath))}_${channelName}_halftone.png`)

  await sharp(outputBuffer, {
    raw: { width, height, channels: 1 }
  })
    .png()
    .toFile(outputPath)

  logger.info(jobId, 'halftone', `Canal ${channelName} completado`, {
    output: outputPath,
    dimensions: `${width}x${height}`
  })

  return {
    name: channelName,
    isSpot,
    angle,
    lpi: config.lpi,
    data: outputBuffer,
    width,
    height,
    filePath: outputPath
  }
}
