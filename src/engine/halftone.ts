import sharp from 'sharp'
import path from 'path'
import { JobConfig, HalftoneChannel } from '@shared/types'
import { getJobTempDir } from '@main/utils/paths'
import { logger } from '@main/services/logger'

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

export async function applyHalftoneToChannel(options: HalftoneOptions): Promise<HalftoneChannel> {
  const { inputPath, jobId, channelName, config, isSpot = false } = options

  logger.info(jobId, 'halftone', `Procesando canal ${channelName}`, {
    input: inputPath,
    lpi: config.lpi,
    dpi: config.dpi,
    shape: config.dotShape
  })

  const meta = await sharp(inputPath, { limitInputPixels: false }).metadata()
  const width = meta.width || 0
  const height = meta.height || 0
  if (!width || !height) throw new Error(`No se pudieron leer dimensiones del canal: ${inputPath}`)

  let angle = config.angle
  if (config.autoAngles && !isSpot) {
    const angles: Record<string, number> = { Cyan: 15, Magenta: 75, Yellow: 0, Black: 45 }
    angle = angles[channelName] || config.angle
  } else if (isSpot) {
    angle = config.angle + 30
  }

  const pxPerCell = config.dpi / config.lpi
  if (pxPerCell < 12) {
    logger.warn(jobId, 'halftone', 'Relación DPI/LPI baja: el punto puede verse cuadriculado', {
      dpi: config.dpi,
      lpi: config.lpi,
      pxPerCell: Number(pxPerCell.toFixed(2)),
      recommendedMinDpi: Math.ceil(config.lpi * 12)
    })
  }

  const cellSize = Math.max(2, Math.round(pxPerCell))
  const threshold = getRotatedMatrix(angle)
  const tSize = 8
  const out = new Uint8ClampedArray(width * height)
  const tileSize = 1024

  for (let y0 = 0; y0 < height; y0 += tileSize) {
    const tileH = Math.min(tileSize, height - y0)
    for (let x0 = 0; x0 < width; x0 += tileSize) {
      const tileW = Math.min(tileSize, width - x0)
      const tile = await sharp(inputPath, { limitInputPixels: false })
        .extract({ left: x0, top: y0, width: tileW, height: tileH })
        .greyscale()
        .raw()
        .toBuffer()

      for (let ty = 0; ty < tileH; ty++) {
        const y = y0 + ty
        for (let tx = 0; tx < tileW; tx++) {
          const x = x0 + tx
          const intensity = tile[ty * tileW + tx]

          if (intensity >= 250) {
            out[y * width + x] = 255
            continue
          }

          const thresholdVal = threshold[(y % tSize) * tSize + (x % tSize)] / 64
          const cx = (x % cellSize) / cellSize * 2 - 1
          const cy = (y % cellSize) / cellSize * 2 - 1
          const spot = getSpotFunction(config.dotShape, cx, cy)
          const adjustedThreshold = Math.max(0, Math.min(1, thresholdVal + spot * 0.15))
          const normalizedIntensity = intensity / 255

          out[y * width + x] = normalizedIntensity > adjustedThreshold ? 255 : 0
        }
      }
    }
  }

  const outputBuffer = Buffer.from(out)
  const tempDir = getJobTempDir(jobId)
  const outputPath = path.join(tempDir, `${path.basename(inputPath, path.extname(inputPath))}_${channelName}_halftone.png`)

  await sharp(outputBuffer, { raw: { width, height, channels: 1 } }).png().toFile(outputPath)

  logger.info(jobId, 'halftone', `Canal ${channelName} completado`, {
    output: outputPath,
    dimensions: `${width}x${height}`
  })

  return { name: channelName, isSpot, angle, lpi: config.lpi, data: outputBuffer, width, height, filePath: outputPath }
}
