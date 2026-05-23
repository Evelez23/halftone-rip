/**
 * Utilidades de color para el engine.
 * Conversión RGB↔CMYK y detección de colores dominantes.
 */

export interface CmykColor {
  c: number
  m: number
  y: number
  k: number
}

export function rgbToCmyk(r: number, g: number, b: number): CmykColor {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const k = 1 - Math.max(rNorm, gNorm, bNorm)
  const c = k === 1 ? 0 : (1 - rNorm - k) / (1 - k)
  const m = k === 1 ? 0 : (1 - gNorm - k) / (1 - k)
  const y = k === 1 ? 0 : (1 - bNorm - k) / (1 - k)

  return {
    c: Math.round(c * 255),
    m: Math.round(m * 255),
    y: Math.round(y * 255),
    k: Math.round(k * 255)
  }
}

export function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  const cNorm = c / 255
  const mNorm = m / 255
  const yNorm = y / 255
  const kNorm = k / 255

  return {
    r: Math.round((1 - cNorm) * (1 - kNorm) * 255),
    g: Math.round((1 - mNorm) * (1 - kNorm) * 255),
    b: Math.round((1 - yNorm) * (1 - kNorm) * 255)
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

export function detectDominantColors(
  pixels: Uint8ClampedArray,
  sampleSize: number = 50000
): Array<{ r: number; g: number; b: number; hex: string; count: number; percentage: number }> {
  const totalPixels = pixels.length / 4
  const step = Math.max(1, Math.floor(totalPixels / sampleSize))
  const colorMap = new Map<string, number>()

  for (let i = 0; i < totalPixels; i += step) {
    const idx = i * 4
    if (pixels[idx + 3] < 128) continue // transparente

    // Cuantizar a 16 niveles para agrupar colores similares
    const r = Math.round(pixels[idx] / 16) * 16
    const g = Math.round(pixels[idx + 1] / 16) * 16
    const b = Math.round(pixels[idx + 2] / 16) * 16
    const key = `${r},${g},${b}`

    colorMap.set(key, (colorMap.get(key) || 0) + 1)
  }

  const sorted = [...colorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  return sorted.map(([key, count]) => {
    const [r, g, b] = key.split(',').map(Number)
    return {
      r, g, b,
      hex: rgbToHex(r, g, b),
      count,
      percentage: (count * step / totalPixels) * 100
    }
  })
}

export function isGray(r: number, g: number, b: number, tolerance: number = 20): boolean {
  return Math.abs(r - g) < tolerance && Math.abs(g - b) < tolerance
}

export function isPrimaryColor(r: number, g: number, b: number): boolean {
  return (r > 200 && g < 50 && b < 50) ||   // Rojo puro
         (r < 50 && g > 200 && b < 50) ||   // Verde puro
         (r < 50 && g < 50 && b > 200) ||   // Azul puro
         (r < 30 && g < 30 && b < 30)        // Negro
}
