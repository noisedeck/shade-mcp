export interface ImageMetrics {
  mean_rgb: [number, number, number]
  mean_alpha: number
  std_rgb: [number, number, number]
  luma_variance: number
  unique_sampled_colors: number
  is_all_zero: boolean
  is_all_transparent: boolean
  is_essentially_blank: boolean
  is_monochrome: boolean
}

/**
 * Compute statistical metrics from RGBA pixel data.
 * Handles both Uint8Array (0-255) and Float32Array (0-1) input.
 * Samples ~1000 pixels via strided iteration for performance.
 */
export function computeImageMetrics(data: Uint8Array | Float32Array, width: number, height: number): ImageMetrics {
  const pixelCount = width * height
  const isFloat = data instanceof Float32Array
  const scale = isFloat ? 1.0 : 1.0 / 255.0

  // Sample stride: aim for ~1000 pixel samples
  const sampleStride = Math.max(1, Math.floor(pixelCount / 1000))
  let sampleCount = 0

  let sumR = 0, sumG = 0, sumB = 0, sumA = 0
  let sumR2 = 0, sumG2 = 0, sumB2 = 0
  let sumLuma = 0, sumLuma2 = 0
  let allZero = true
  let allTransparent = true

  // Track unique colors (quantize to 6 bits per channel)
  const colorSet = new Set<number>()

  for (let p = 0; p < pixelCount; p += sampleStride) {
    const i = p * 4
    const r = data[i] * scale
    const g = data[i + 1] * scale
    const b = data[i + 2] * scale
    const a = data[i + 3] * scale

    sumR += r; sumG += g; sumB += b; sumA += a
    sumR2 += r * r; sumG2 += g * g; sumB2 += b * b

    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    sumLuma += luma
    sumLuma2 += luma * luma

    if (r > 0.001 || g > 0.001 || b > 0.001) allZero = false
    if (a > 0.001) allTransparent = false

    // Quantize to 6-bit per channel for uniqueness
    const qr = Math.floor(r * 63)
    const qg = Math.floor(g * 63)
    const qb = Math.floor(b * 63)
    colorSet.add((qr << 12) | (qg << 6) | qb)

    sampleCount++
  }

  const n = sampleCount || 1
  const meanR = sumR / n
  const meanG = sumG / n
  const meanB = sumB / n
  const meanA = sumA / n
  const meanLuma = sumLuma / n

  const stdR = Math.sqrt(Math.max(0, sumR2 / n - meanR * meanR))
  const stdG = Math.sqrt(Math.max(0, sumG2 / n - meanG * meanG))
  const stdB = Math.sqrt(Math.max(0, sumB2 / n - meanB * meanB))
  const lumaVariance = Math.max(0, sumLuma2 / n - meanLuma * meanLuma)

  const uniqueColors = colorSet.size
  const isBlank = meanR < 0.01 && meanG < 0.01 && meanB < 0.01 && uniqueColors <= 10

  return {
    mean_rgb: [meanR, meanG, meanB],
    mean_alpha: meanA,
    std_rgb: [stdR, stdG, stdB],
    luma_variance: lumaVariance,
    unique_sampled_colors: uniqueColors,
    is_all_zero: allZero,
    is_all_transparent: allTransparent,
    is_essentially_blank: isBlank,
    is_monochrome: uniqueColors <= 1,
  }
}
