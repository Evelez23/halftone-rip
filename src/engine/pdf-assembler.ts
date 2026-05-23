import { PDFDocument, PDFPage, PDFImage, PDFName, PDFDict, PDFArray, PDFNumber, PDFString } from 'pdf-lib'
import fs from 'fs'
import { ProcessedPage } from '@shared/types'
import { logger } from '@main/services/logger'

export interface PdfAssemblyOptions {
  pages: ProcessedPage[]
  outputPath: string
  jobId: string
  metadata: {
    source: string
    preset: string
    lpi: number
    dpi: number
  }
}

/**
 * Ensambla PDF multipágina donde cada página contiene los canales separados.
 * Estructura del PDF output:
 * - Página 1: Compuesta preview (opcional)
 * - Página 2: Canal Cyan
 * - Página 3: Canal Magenta
 * - Página 4: Canal Yellow
 * - Página 5: Canal Black
 * - Página N: Spots...
 * 
 * Cada canal es una imagen PNG en blanco y negro (1-bit efectivamente).
 */
export async function assembleMultiPagePdf(options: PdfAssemblyOptions): Promise<void> {
  const { pages, outputPath, jobId, metadata } = options

 logger.info(jobId, 'pdf-assembler', 'Iniciando ensamblaje PDF', {
    pages: pages.length,
    output: outputPath
  })

  const pdfDoc = await PDFDocument.create()

  // Metadatos del documento
  pdfDoc.setTitle(`${metadata.source} - Separaciones`)
  pdfDoc.setAuthor('Halftone RIP Pro')
  pdfDoc.setCreator(`Halftone RIP Pro v1.0.0 | Preset: ${metadata.preset} | ${metadata.dpi}DPI @ ${metadata.lpi}LPI`)
  pdfDoc.setCreationDate(new Date())
  pdfDoc.setModificationDate(new Date())

  // Añadir metadata custom para RIP posterior
  const ripMeta = PDFDict.withContext(pdfDoc.context)
  ripMeta.set(PDFName.of('SourceFile'), PDFString.of(metadata.source))
  ripMeta.set(PDFName.of('Preset'), PDFString.of(metadata.preset))
  ripMeta.set(PDFName.of('LPI'), PDFNumber.of(metadata.lpi))
  ripMeta.set(PDFName.of('DPI'), PDFNumber.of(metadata.dpi))

  // Para cada página del documento original
  for (const page of pages) {
    const { width, height, channels, pageNumber } = page
    const pageWidthPts = (width / metadata.dpi) * 72
    const pageHeightPts = (height / metadata.dpi) * 72

    // Crear una página por canal
    for (const channel of channels) {
      const pdfPage = pdfDoc.addPage([pageWidthPts, pageHeightPts])

      // Incrustar imagen PNG del canal
      const pngImage = await pdfDoc.embedPng(fs.readFileSync(channel.filePath))

      // Dibujar la imagen ocupando toda la página
      pdfPage.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pageWidthPts,
        height: pageHeightPts
      })

      // Añadir label del canal
      pdfPage.drawText(`${channel.name} | Pág ${pageNumber}`, {
        x: 10,
        y: pageHeightPts - 20,
        size: 8,
        color: { red: 0.5, green: 0.5, blue: 0.5 }
      })

      // Información técnica
      pdfPage.drawText(`${metadata.lpi} LPI @ ${channel.angle}° | ${metadata.dpi} DPI`, {
        x: 10,
        y: 10,
        size: 6,
        color: { red: 0.4, green: 0.4, blue: 0.4 }
      })
    }
  }

  // Guardar
  const pdfBytes = await pdfDoc.save()
  fs.writeFileSync(outputPath, pdfBytes)

  logger.info(jobId, 'pdf-assembler', 'PDF final guardado', {
    path: outputPath,
    size: pdfBytes.length,
    totalPages: pdfDoc.getPageCount()
  })
}
