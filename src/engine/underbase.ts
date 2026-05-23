import sharp from 'sharp'
import path from 'path'
import { HalftoneChannel, JobConfig } from '@shared/types'
import { getJobTempDir } from '@main/utils/paths'
import { logger } from '@main/services/logger'

export interface UnderbaseOptions {
  channels: HalftoneChannel[]
  jobId: string
  config: JobConfig
}

/**
 * Genera canal de base blanca (underbase) a partir de los canales CMYK.
 * Lógica: donde hay tinta, necesitamos base blanca.
 * Con choke para evitar halo blanco.
 */
export async function generateUnderbase(options: UnderbaseOptions): Promise<HalftoneChannel> {
  const { channels, jobId, config } = options

  logger.info(jobId, 'underbase', 'Generando base blanca', {
    sourceChannels: channels.map(c => c.name)
  })

  // Encontrar dimensiones
  const refChannel = channels[0]
  const { width, height } = refChannel

  // Combinar todos los canales para saber dónde hay tinta
  const coverage = new Uint8Array(width * height)

  for (const channel of channels) {
    if (channel.name === 'White Underbase') continue

    // Asumimos que channel.data es Buffer de sharp raw
    const data = new Uint8Array(channel.data)
    for (let i = 0; i < width * height; i++) {
      // Invertir: en semitono, 0 = tinta (negro), 255 = papel (blanco)
      // Queremos saber dónde hay tinta
      if (data[i] < 128) {
        coverage[i] = Math.min(255, coverage[i] + (255 - data[i]))
      }
    }
  }

  // Aplicar choke (reducir ligeramente para evitar halo)
  // Simple: erosión de 1-2 píxeles
  const choke = 2
  const choked = new Uint8Array(width * height)

  for (let y = choke; y < height - choke; y++) {
    for (let x = choke; x < width - choke; x++) {
      const idx = y * width + x
      let minVal = 255

      for (let dy = -choke; dy <= choke; dy++) {
        for (let dx = -choke; dx <= choke; dx++) {
          const nIdx = (y + dy) * width + (x + dx)
          minVal = Math.min(minVal, coverage[nIdx])
        }
      }

      choked[idx] = minVal
    }
  }

  // Invertir para semitono: áreas con tinta → base blanca (negro en semitono)
  // Pero en el PDF final, el underbase se imprime primero
  const out = new Uint8ClampedArray(width * height)
  for (let i = 0; i < width * height; i++) {
    // Más cobertura de tinta = más base blanca necesaria
    out[i] = 255 - choked[i]
  }

  const tempDir = getJobTempDir(jobId)
  const outputPath = path.join(tempDir, 'White_Underbase_halftone.png')

  await sharp(Buffer.from(out), {
    raw: { width, height, channels: 1 }
  })
    .png()
    .toFile(outputPath)

  logger.info(jobId, 'underbase', 'Base blanca generada', {
    output: outputPath,
    choke
  })

  return {
    name: 'White Underbase',
    isSpot: true,
    angle: config.angle,
    lpi: config.lpi,
    data: Buffer.from(out),
    width,
    height,
    filePath: outputPath
  }
}
