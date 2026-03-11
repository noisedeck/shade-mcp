/**
 * DSL Exemplar Programs and Patterns
 *
 * Canonical scaffolding patterns and curated example programs
 * for DSL jam mode. Programs sourced from Noisedeck basics and classic collections.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL DSL SCAFFOLDING PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

export const DSL_EXEMPLAR_PATTERNS = `
## Canonical DSL Scaffolding Patterns

These patterns are MANDATORY — always follow them for the given effect type.

### Points (particle systems)
\`\`\`
search points, synth, render
noise().pointsEmit().physical().pointsRender().write(o0)
render(o0)
\`\`\`

### Billboard Particles (textured particles)
\`\`\`
search points, synth, render
polygon(radius: 0.7, fgAlpha: 0.1, bgAlpha: 0).write(o0)
noise(ridges: true)
  .pointsEmit(stateSize: x64)
  .physical()
  .pointsBillboardRender(tex: read(o0), pointSize: 40, sizeVariation: 50, rotationVariation: 50)
  .write(o1)
render(o1)
\`\`\`

### Feedback Loop
\`\`\`
search synth, filter, render
noise(ridges: true)
  .loopBegin(alpha: 95, intensity: 95)
  .warp()
  .loopEnd()
  .write(o0)
render(o0)
\`\`\`

### 3D Volumetric
\`\`\`
search synth3d, filter3d, render
noise3d(volumeSize: x32).write3d(vol0, geo0)
read3d(vol0, geo0).render3d().write(o0)
render(o0)
\`\`\`

### Mixer (two-source blend)
\`\`\`
search synth, mixer
noise(seed: 1).write(o0)
gradient().blendMode(tex: read(o0), mode: multiply).write(o1)
render(o1)
\`\`\`

### Simple Starter
\`\`\`
search synth
noise(octaves: 4, ridges: true).write(o0)
render(o0)
\`\`\`

### Filter Chain
\`\`\`
search synth, filter
noise(ridges: true).blur(radiusX: 5).bloom(taps: 15).vignette().write(o0)
render(o0)
\`\`\`

### RULES
1. Points effects ALWAYS get pointsEmit()/pointsRender() wrapper
2. Billboard particles need a sprite on a SEPARATE surface
3. 3D effects ALWAYS end with render3d()
4. Filters ALWAYS chain from a generator (never standalone)
5. Mixers ALWAYS need tex: read(surface) param
6. Feedback loops use loopBegin()/loopEnd() with filter effects inside
7. Always use noise() as the default starter (with ridges: true for visual interest)
`

// ═══════════════════════════════════════════════════════════════════════════
// EXEMPLAR PROGRAM TYPE
// ═══════════════════════════════════════════════════════════════════════════

export interface ExemplarProgram {
  name: string
  dsl: string
  tags: string[]
  description: string
}

// ═══════════════════════════════════════════════════════════════════════════
// EXEMPLAR PROGRAMS
// ═══════════════════════════════════════════════════════════════════════════

export const DSL_EXEMPLAR_PROGRAMS: ExemplarProgram[] = [
  // ── Basics (all 8) ──────────────────────────────────────────────────────

  {
    name: 'background',
    dsl: 'search classicNoisedeck\n\nbackground(backgroundType: 10, rotation: 0, opacity: 100, color1: #000000, color2: #ffffff).write(o0)\nrender(o0)',
    tags: ['classic', 'basics', 'background', 'simple'],
    description: 'Simple background generator with two-color gradient',
  },
  {
    name: 'bit effects',
    dsl: 'search classicNoisedeck\n\nbitEffects(loopAmp: 50, formula: 0, n: 1, colorScheme: 20, interp: 0, scale: 75, rotation: 0, maskFormula: 10, tiles: 5, complexity: 57, maskColorScheme: 1, baseHueRange: 50, hueRotation: 180, hueRange: 25).write(o0)\nrender(o0)',
    tags: ['classic', 'basics', 'bitEffects', 'simple', 'math-art'],
    description: 'Bit manipulation math art with masked formula patterns and custom color scheme',
  },
  {
    name: 'cell noise',
    dsl: 'search classicNoisedeck\n\ncellNoise(scale: 75, cellScale: 87, cellSmooth: 11, cellVariation: 50, loopAmp: 1, colorMode: 0, palette: 0, cyclePalette: 1, rotatePalette: 0, repeatPalette: 1, paletteMode: 4).write(o0)\nrender(o0)',
    tags: ['classic', 'basics', 'cellNoise', 'simple', 'voronoi'],
    description: 'Voronoi cell noise with smoothed cell boundaries and cycling palette',
  },
  {
    name: 'fractal',
    dsl: 'search classicNoisedeck\n\nfractal(fractalType: 0, zoomAmt: 0, rotation: 0, speed: 30, offsetX: 70, offsetY: 50, centerX: 0, centerY: 0, iterations: 50, colorMode: 4, palette: dealerHat, cyclePalette: 0, rotatePalette: 0, hueRange: 100, levels: 0, backgroundColor: #000000, backgroundOpacity: 100, cutoff: 0).write(o0)\nrender(o0)',
    tags: ['classic', 'basics', 'fractal', 'simple', 'mandelbrot'],
    description: 'Mandelbrot fractal with dealerHat palette and animated zoom',
  },
  {
    name: 'noise',
    dsl: 'search classicNoisedeck\n\nnoise(noiseType: 10, octaves: 2, xScale: 75, yScale: 75, ridges: false, wrap: true, refractMode: 2, refractAmt: 0, loopOffset: 300, loopScale: 75, loopAmp: 25, kaleido: 1, metric: 0, colorMode: 6, hueRotation: 179, hueRange: 25, palette: afterimage, cyclePalette: 1, rotatePalette: 0, repeatPalette: 1, paletteMode: 3).write(o0)\nrender(o0)',
    tags: ['classic', 'basics', 'noise', 'simple'],
    description: 'Multi-octave noise with wrapping, afterimage palette, and HSV color rotation',
  },
  {
    name: 'noise 3d',
    dsl: 'search classicNoisedeck\n\nnoise3d(noiseType: 12, ridges: false, colorMode: 6).write(o0)\nrender(o0)',
    tags: ['classic', 'basics', 'noise3d', 'simple', '3d'],
    description: '3D noise generator with HSV color mode',
  },
  {
    name: 'pattern',
    dsl: 'search classicNoisedeck\n\npattern(patternType: 1, scale: 80, skewAmt: 0, rotation: 0, lineWidth: 100, animation: 0, speed: 1, sharpness: 100, color1: #ffea31, color2: #000000).write(o0)\nrender(o0)',
    tags: ['classic', 'basics', 'pattern', 'simple', 'geometric'],
    description: 'Dot pattern generator with yellow-black color scheme',
  },
  {
    name: 'shapes',
    dsl: 'search classicNoisedeck\n\nshapes(loopAOffset: 40, loopBOffset: 30, loopAScale: 1, loopBScale: 1, loopAAmp: 50, loopBAmp: 50, wrap: true, palette: sulphur, cyclePalette: 1, rotatePalette: 0, repeatPalette: 1).write(o0)\nrender(o0)',
    tags: ['classic', 'basics', 'shapes', 'simple', 'lissajous'],
    description: 'Lissajous shapes with dual loop oscillators and sulphur palette',
  },

  // ── Classic (curated ~35) ───────────────────────────────────────────────

  {
    name: '1980s shmoos',
    dsl: 'search classicNoisedeck\n\nshapes(loopAAmp: -32, loopAOffset: 200, loopAScale: 69, loopBAmp: -19, loopBOffset: 330, loopBScale: 47, palette: netOfGems, wrap: true, cyclePalette: 0, rotatePalette: 0).write(o0)\nshapes(loopAAmp: 32, loopAOffset: 200, loopAScale: 86, loopBAmp: -24, loopBOffset: 210, loopBScale: 18, palette: seventiesShirt, wrap: true, cyclePalette: 0, rotatePalette: 0).coalesce(tex: read(o0), blendMode: 6, mixAmt: 2, refractAAmt: 0, refractBAmt: 0).colorLab(colorMode: 2, dither: 0, hueRange: 100, hueRotation: 0, levels: 2, palette: seventiesShirt).palette(ampB: 43, ampG: 35, ampR: 91, freq: 4, offsetB: 17, offsetG: 66, offsetR: 90, phaseB: 100, phaseG: 33, phaseR: 58, paletteType: 0).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'shapes', 'coalesce', 'colorLab', 'palette'],
    description: 'Two shapes generators blended with coalesce, posterized with colorLab and custom palette remap',
  },
  {
    name: 'acid rinse',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 75, hueRotation: 59, loopAmp: 29, octaves: 6, refractAmt: 35, ridges: true, noiseType: 10, colorMode: 6, kaleido: 1, xScale: 81, yScale: 81).write(o0)\nnoise(hueRange: 12, hueRotation: 28, loopAmp: 85, refractAmt: 33, ridges: false, wrap: false, xScale: 89, yScale: 92, noiseType: 2, colorMode: 6, kaleido: 1, octaves: 1).coalesce(tex: read(o0), blendMode: 8, mixAmt: 100, refractAAmt: 0, refractBAmt: 42).effects(effect: 4, effectAmt: 2, flip: 0, offsetX: 0, offsetY: 0, rotation: 0, scaleAmt: 100).lensDistortion(aberrationAmt: 100, blendMode: 0, hueRange: 100, hueRotation: 0, blendMode: 1, modulate: true, passthru: 57, opacity: 0, loopAmp: 0, distortion: 0).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'coalesce', 'lens', 'chromatic-aberration', 'effects'],
    description: 'Two noise generators coalesced with mirror effects and full chromatic aberration',
  },
  {
    name: 'alien snowflake',
    dsl: 'search classicNoisedeck\n\nnoise(hueRotation: 45, kaleido: 7, metric: 0, palette: solaris, wrap: true, noiseType: 2, colorMode: 4, xScale: 89, yScale: 89, octaves: 1).write(o0)\nnoise(hueRotation: 45, kaleido: 7, metric: 0, palette: solaris, wrap: true, noiseType: 2, colorMode: 4, xScale: 51, yScale: 51, octaves: 1).coalesce(tex: read(o0), blendMode: 5, mixAmt: -27, refractAAmt: 0, refractBAmt: 0).lensDistortion(aberrationAmt: 48, blendMode: 0, hueRange: 0, hueRotation: 0, blendMode: 1, modulate: true, passthru: 71, opacity: 0, loopAmp: 0, distortion: 0).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'kaleido', 'lens', 'coalesce'],
    description: 'Two kaleido noise layers at different scales blended with lens distortion modulation',
  },
  {
    name: 'and it burns, burns, burns',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 35, hueRotation: 80, loopAmp: 33, octaves: 6, refractAmt: 63, ridges: true, noiseType: 10, colorMode: 6, kaleido: 1, xScale: 97, yScale: 97).write(o0)\ncellNoise(colorMode: 0, loopAmp: 5, palette: royal, scale: 21, cellScale: 75, cellSmooth: 0, cellVariation: 0, cyclePalette: 1, rotatePalette: 0).coalesce(tex: read(o0), blendMode: 7, mixAmt: -15, refractAAmt: 0, refractBAmt: 39).lensDistortion(aberrationAmt: 0, distortion: -48, loopAmp: 54, loopScale: 94, opacity: 12, shape: 0, tint: #b42f2d, vignetteAmt: -46).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'cellNoise', 'coalesce', 'lens', 'vignette'],
    description: 'Ridged noise blended with cell noise, barrel distortion and warm-tinted vignette',
  },
  {
    name: 'bitmaskception',
    dsl: 'search classicNoisedeck\n\nbitEffects(baseHueRange: 30, colorScheme: 2, complexity: 34, formula: 20, hueRange: 0, hueRotation: 82, loopAmp: 79, tiles: 4, maskFormula: 20, maskColorScheme: 2).write(o0)\nbitEffects(baseHueRange: 95, colorScheme: 2, complexity: 50, formula: 11, hueRange: 12, hueRotation: 92, loopAmp: 31, tiles: 30, maskFormula: 11, maskColorScheme: 2).coalesce(tex: read(o0), blendMode: 11, mixAmt: 19, refractAAmt: 7, refractBAmt: 0).effects(effect: 100, effectAmt: 9, flip: 0, offsetX: 0, offsetY: 0, rotation: 0, scaleAmt: 100).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'bitEffects', 'coalesce', 'effects', 'math-art'],
    description: 'Two bit manipulation formulas coalesced with pixelation effects',
  },
  {
    name: 'beautiful garbage',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 17, hueRotation: 52, loopAmp: 30, refractAmt: 43, ridges: false, wrap: true, xScale: 92, yScale: 90, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).write(o0)\nnoise(hueRange: 27, hueRotation: 55, loopAmp: 34, refractAmt: 36, ridges: false, wrap: false, xScale: 94, yScale: 88, noiseType: 10, colorMode: 6, kaleido: 1, octaves: 1).coalesce(tex: read(o0), blendMode: 15, mixAmt: -60, refractAAmt: 67, refractBAmt: 21).lensDistortion(aberrationAmt: 28, distortion: -45, loopAmp: -100, loopScale: 73, opacity: 33, shape: 2, tint: #b39c4d, vignetteAmt: -100).lensDistortion(aberrationAmt: 80, blendMode: 0, hueRange: 77, hueRotation: 36, blendMode: 1, modulate: true, passthru: 91, opacity: 0, loopAmp: 0, distortion: 0).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'coalesce', 'lens', 'refraction', 'vignette', 'dual-lens'],
    description: 'Two noise generators with heavy refraction, dual lens distortion with vignette and chromatic aberration',
  },
  {
    name: 'blue kaleido',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 6, hueRotation: 62, loopAmp: -60, loopOffset: 80, loopScale: 17, refractAmt: 23, wrap: true, noiseType: 10, colorMode: 6, kaleido: 1, xScale: 30, yScale: 30, octaves: 1).kaleido(direction: 2, effectWidth: 5, kaleido: 5, kernel: 0, loopAmp: 4, loopOffset: 30, loopScale: 11, metric: 0, wrap: true).write(o1)\nrender(o1)',
    tags: ['classic', 'noise', 'kaleido', 'filter'],
    description: 'Noise generator piped through kaleido filter for five-fold symmetry pattern',
  },
  {
    name: 'candy crystal cloud',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 98, hueRotation: 48, loopAmp: 9, loopOffset: 300, loopScale: 71, refractAmt: 37, wrap: true, noiseType: 3, colorMode: 6, kaleido: 1, xScale: 89, yScale: 89, octaves: 1).write(o0)\nnoise(hueRange: 49, hueRotation: 75, loopAmp: -2, loopOffset: 300, loopScale: 100, refractAmt: 71, wrap: true, noiseType: 0, colorMode: 6, kaleido: 1, xScale: 86, yScale: 86, octaves: 1).coalesce(tex: read(o0), blendMode: 12, mixAmt: 8, refractAAmt: 57, refractBAmt: 40).lensDistortion(aberrationAmt: 0, distortion: 0, loopAmp: 0, loopScale: 100, opacity: 30, shape: 0, tint: #c038ff, vignetteAmt: 0).refract().write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'coalesce', 'lens', 'refraction'],
    description: 'Two noise types coalesced with mutual refraction, purple tint overlay and refract filter',
  },
  {
    name: 'chromatic liquid',
    dsl: 'search classicNoisedeck\n\ncellNoise(colorMode: 1, loopAmp: 4, palette: justGreen, scale: 75, cellScale: 75, cellSmooth: 50, cellVariation: 0, cyclePalette: 1, rotatePalette: 0).write(o0)\nnoise(hueRange: 33, hueRotation: 82, loopAmp: 98, octaves: 1, refractAmt: 0, ridges: false, noiseType: 10, colorMode: 6, kaleido: 1, xScale: 74, yScale: 74).coalesce(tex: read(o0), blendMode: 15, mixAmt: 13, refractAAmt: 100, refractBAmt: 0).lensDistortion(aberrationAmt: 0, distortion: -35, loopAmp: 10, loopScale: 71, opacity: 34, shape: 0, tint: #ae5647, vignetteAmt: -60).lensDistortion(aberrationAmt: 69, blendMode: 0, hueRange: 100, hueRotation: 0, blendMode: 1, modulate: true, passthru: 52, opacity: 0, loopAmp: 0, distortion: 0).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'cellNoise', 'noise', 'coalesce', 'lens', 'dual-lens', 'chromatic-aberration'],
    description: 'Cell noise and smooth noise coalesced with full refraction, barrel distortion and chromatic aberration',
  },
  {
    name: 'circuits of time',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 23, hueRotation: 26, loopAmp: 19, refractAmt: 100, ridges: true, wrap: false, xScale: 95, yScale: 92, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).write(o0)\nnoise(hueRange: 46, hueRotation: 65, loopAmp: 21, refractAmt: 100, ridges: true, wrap: false, xScale: 99, yScale: 95, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).coalesce(tex: read(o0), blendMode: 11, mixAmt: 49, refractAAmt: 100, refractBAmt: 100).lensDistortion(aberrationAmt: 16, distortion: -20, loopAmp: 0, loopScale: 60, opacity: 17, shape: 0, tint: #4986bc, vignetteAmt: -100).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'coalesce', 'refraction', 'lens', 'vignette'],
    description: 'Two ridged noise generators with max refraction coalesced, blue-tinted vignette with barrel distortion',
  },
  {
    name: 'cool crystals',
    dsl: 'search classicNoisedeck\n\ncellNoise(colorMode: 1, loopAmp: 20, palette: santaCruz, scale: 90, cellScale: 75, cellSmooth: 0, cellVariation: 0, cyclePalette: 1, rotatePalette: 0).write(o0)\ncellNoise(colorMode: 2, loopAmp: 20, palette: tungsten, scale: 90, cellScale: 75, cellSmooth: 0, cellVariation: 0, cyclePalette: 1, rotatePalette: 0).coalesce(tex: read(o0), blendMode: 7, mixAmt: -61, refractAAmt: 46, refractBAmt: 25).lensDistortion(aberrationAmt: 30, distortion: -40, loopAmp: 10, loopScale: 71, opacity: 61, shape: 0, tint: #4052ba, vignetteAmt: -100).lensDistortion(aberrationAmt: 100, blendMode: 0, hueRange: 39, hueRotation: 16, blendMode: 1, modulate: true, passthru: 60, opacity: 0, loopAmp: 0, distortion: 0).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'cellNoise', 'coalesce', 'lens', 'dual-lens', 'vignette'],
    description: 'Two cell noise layers with different palettes coalesced with refraction, dual lens distortion and blue vignette',
  },
  {
    name: 'cutout hearts',
    dsl: 'search classicNoisedeck\n\npattern(color1: #000000, color2: #ff00f7, rotation: 25, scale: 97, skewAmt: 2, patternType: 3, speed: 1, animation: 0).write(o0)\nnoise(hueRange: 24, hueRotation: 60, loopAmp: 18, refractAmt: 77, ridges: false, wrap: true, xScale: 93, yScale: 67, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).composite(tex: read(o0), blendMode: 1, inputColor: #000000, mixAmt: 0, range: 80).palette(ampB: 47, ampG: 2, ampR: 79, freq: 2, offsetB: 89, offsetG: 44, offsetR: 72, phaseB: 43, phaseG: 59, phaseR: 29, paletteType: 0).lensDistortion(aberrationAmt: 73, blendMode: 0, hueRange: 0, hueRotation: 77, blendMode: 1, modulate: false, passthru: 50, opacity: 0, loopAmp: 0, distortion: 0).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'pattern', 'noise', 'composite', 'palette', 'lens'],
    description: 'Heart pattern composited with refracted noise, custom RGB palette remap and chromatic aberration',
  },
  {
    name: 'cyber soup',
    dsl: 'search classicNoisedeck\n\npattern(color1: #4a88fb, color2: #000000, rotation: 111, scale: 61, skewAmt: 0, patternType: 2, speed: 1, animation: 4).write(o0)\nnoise(hueRange: 20, hueRotation: 58, loopAmp: 78, loopOffset: 300, loopScale: 100, refractAmt: 68, wrap: true, noiseType: 3, colorMode: 6, kaleido: 1, xScale: 81, yScale: 81, octaves: 1).composite(tex: read(o0), blendMode: 2, inputColor: #000000, mixAmt: 4, range: 71).colorLab(colorMode: 2, dither: 0, hueRange: 154, hueRotation: 0, levels: 0, palette: eventHorizon).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'pattern', 'noise', 'composite', 'colorLab'],
    description: 'Grid pattern composited with refracted noise, remapped through eventHorizon palette',
  },
  {
    name: 'double chess',
    dsl: 'search classicNoisedeck\n\npattern(color1: #6272e7, color2: #f98a35, rotation: 45, scale: 96, skewAmt: 0, patternType: 0, speed: 1, animation: 2).write(o0)\npattern(color1: #da8b56, color2: #520e28, rotation: 180, scale: 86, skewAmt: 0, patternType: 0, speed: 1, animation: 2).coalesce(tex: read(o0), blendMode: 8, mixAmt: -52).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'pattern', 'coalesce', 'mixer'],
    description: 'Two animated checkerboard patterns at different rotations blended together',
  },
  {
    name: 'double mask',
    dsl: 'search classicNoisedeck\n\nbitEffects(baseHueRange: 76, colorScheme: 0, complexity: 100, formula: 10, hueRange: 55, hueRotation: 94, loopAmp: 45, tiles: 10, maskFormula: 10, maskColorScheme: 0).write(o0)\nbitEffects(baseHueRange: 99, colorScheme: 2, complexity: 1, formula: 10, hueRange: 100, hueRotation: 7, loopAmp: 100, tiles: 1, maskFormula: 10, maskColorScheme: 2).coalesce(tex: read(o0), blendMode: 11, mixAmt: 1, refractAAmt: 0, refractBAmt: 0).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'bitEffects', 'coalesce', 'math-art'],
    description: 'Two bit effect formulas with different tile scales blended for layered mathematical patterns',
  },
  {
    name: 'dramatic pattern',
    dsl: 'search classicNoisedeck\n\npattern(color1: #ffffff, color2: #000000, rotation: 142, scale: 98, skewAmt: 12, patternType: 8, speed: 1, animation: 0).write(o0)\ncellNoise(loopAmp: 7, palette: brushedMetal, scale: 79, cellScale: 75, cellSmooth: 50, cellVariation: 0, cyclePalette: 0, rotatePalette: 0).coalesce(tex: read(o0), blendMode: 13, mixAmt: 60, refractAAmt: 1, refractBAmt: 100).lensDistortion(aberrationAmt: 27, distortion: -31, loopAmp: -59, loopScale: 60, opacity: 34, shape: 0, tint: #5849bc, vignetteAmt: -37).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'pattern', 'cellNoise', 'coalesce', 'lens', 'refraction'],
    description: 'Skewed geometric pattern blended with cell noise using heavy refraction and purple vignette',
  },
  {
    name: 'entranced',
    dsl: 'search classicNoisedeck\n\nshapes(loopAAmp: -21, loopAOffset: 410, loopAScale: 21, loopBAmp: 38, loopBOffset: 80, loopBScale: 78, palette: solaris, wrap: true, cyclePalette: 0, rotatePalette: 0).write(o0)\nshapes(loopAAmp: -67, loopAOffset: 410, loopAScale: 57, loopBAmp: 92, loopBOffset: 80, loopBScale: 1, palette: solaris, wrap: true, cyclePalette: 0, rotatePalette: 0).composite(tex: read(o0), blendMode: 3).colorLab(colorMode: 2, dither: 0, hueRange: 90, hueRotation: 0, levels: 0, palette: sulphur).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'shapes', 'composite', 'colorLab'],
    description: 'Two shapes generators composited and remapped through sulphur palette for warm tones',
  },
  {
    name: 'flashy fractal',
    dsl: 'search classicNoisedeck\n\nfractal(centerX: 12, centerY: -57, fractalType: 0, offsetX: 35, offsetY: 59, palette: royal, rotation: 0, speed: 2, zoomAmt: 33, cyclePalette: 0, rotatePalette: 0).write(o0)\nfractal(centerX: 0, centerY: -4, fractalType: 1, offsetX: 31, offsetY: 0, palette: royal, rotation: 0, speed: 81, symmetry: 5, zoomAmt: 0, cyclePalette: 0, rotatePalette: 0).coalesce(tex: read(o0), blendMode: 13, mixAmt: 2, refractAAmt: 47, refractBAmt: 61).lensDistortion(aberrationAmt: 0, distortion: 6, loopAmp: -14, loopScale: 88, opacity: 81, shape: 0, tint: #487b9d, vignetteAmt: 72).effects(effect: 4, effectAmt: 0, flip: 15, offsetX: 0, offsetY: 0, rotation: 0, scaleAmt: 100).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'fractal', 'coalesce', 'lens', 'effects'],
    description: 'Two fractal types (Mandelbrot + symmetry) coalesced with refraction, tinted vignette and mirror',
  },
  {
    name: 'fractal wave wash',
    dsl: 'search classicNoisedeck\n\nfractal(centerX: 21, centerY: -37, fractalType: 0, offsetX: 73, offsetY: 52, palette: blueSkies, rotation: 127, speed: 75, zoomAmt: 91, cyclePalette: 0, rotatePalette: 0).write(o0)\nfractal(centerX: 21, centerY: 0, fractalType: 0, offsetX: 13, offsetY: 69, palette: blueSkies, rotation: 0, speed: 75, zoomAmt: 83, cyclePalette: 1, rotatePalette: 0).coalesce(tex: read(o0), blendMode: 100, mixAmt: -13, refractAAmt: 0, refractBAmt: 15).lensDistortion(aberrationAmt: 91, blendMode: 0, hueRange: 100, hueRotation: 0, blendMode: 1, modulate: true, passthru: 42, opacity: 0, loopAmp: 0, distortion: 0).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'fractal', 'coalesce', 'lens', 'chromatic-aberration'],
    description: 'Two deep-zoom Mandelbrot fractals blended with high chromatic aberration modulation',
  },
  {
    name: 'glitched grid',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 0, hueRotation: 45, loopAmp: 79, refractAmt: 100, ridges: false, wrap: true, xScale: 100, yScale: 99, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).write(o0)\npattern(color1: #8480ff, color2: #000000, rotation: 104, scale: 71, skewAmt: 1, patternType: 2, speed: 1, animation: 4).coalesce(tex: read(o0), blendMode: 17, mixAmt: 100, refractAAmt: 0, refractBAmt: 100).lensDistortion(aberrationAmt: 22, distortion: 56, loopAmp: -20, loopScale: 60, opacity: 4, shape: 6, tint: #494abc, vignetteAmt: -69).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'pattern', 'coalesce', 'lens', 'refraction'],
    description: 'Refracted noise blended with animated grid pattern, pincushion distortion and purple vignette',
  },
  {
    name: 'glitchy melted candy',
    dsl: 'search classicNoisedeck\n\nnoise(palette: cottonCandy, refractAmt: 34, ridges: false, noiseType: 10, colorMode: 4, kaleido: 1, xScale: 2, yScale: 2, octaves: 1).write(o0)\nnoise(palette: cottonCandy, refractAmt: 62, ridges: false, noiseType: 10, colorMode: 4, kaleido: 1, xScale: 3, yScale: 3, octaves: 1).composite(tex: read(o0), blendMode: 113).glitch(aberrationAmt: 32, distortion: 96, glitchiness: 6, scanlinesAmt: 69, vignetteAmt: 49, xChonk: 88, yChonk: 8).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'composite', 'glitch'],
    description: 'Two low-scale noise layers composited with heavy glitch effect including scanlines and distortion',
  },
  {
    name: 'golden rings',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 15, hueRotation: 47, loopAmp: 61, refractAmt: 8, ridges: true, wrap: true, xScale: 100, yScale: 89, noiseType: 0, colorMode: 6, kaleido: 1, octaves: 1).write(o0)\nshapes(loopAAmp: 100, loopAOffset: 10, loopAScale: 81, loopBAmp: -38, loopBOffset: 400, loopBScale: 75, palette: tungsten, wrap: true, cyclePalette: 0, rotatePalette: 0).coalesce(tex: read(o0), blendMode: 15, mixAmt: 19, refractAAmt: 45, refractBAmt: 0).lensDistortion(aberrationAmt: 60, distortion: -57, loopAmp: -8, loopScale: 55, opacity: 0, shape: 0, tint: #5ad2f2, vignetteAmt: 100).refract().write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'shapes', 'coalesce', 'lens', 'refraction'],
    description: 'Noise and shapes generators coalesced with refraction, barrel distortion and refract filter',
  },
  {
    name: 'hallucinogrid',
    dsl: 'search classicNoisedeck\n\npattern(color1: #00ffd5, color2: #000000, rotation: 130, scale: 75, skewAmt: 0, patternType: 2, speed: 1, animation: 4).write(o0)\nnoise(hueRange: 21, hueRotation: 43, loopAmp: 100, refractAmt: 100, ridges: true, wrap: true, xScale: 99, yScale: 97, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).coalesce(tex: read(o0), blendMode: 9, mixAmt: -56, refractAAmt: 27, refractBAmt: 29).lensDistortion(aberrationAmt: 100, distortion: -64, loopAmp: -10, loopScale: 62, opacity: 11, shape: 0, tint: #75c5c7, vignetteAmt: -100).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'pattern', 'noise', 'coalesce', 'lens', 'chromatic-aberration', 'vignette'],
    description: 'Cyan animated grid blended with ridged refracted noise, full chromatic aberration and barrel distortion',
  },
  {
    name: 'holo-transmission',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 9, hueRotation: 15, loopAmp: 73, loopOffset: 300, loopScale: 29, refractAmt: 71, wrap: true, noiseType: 3, colorMode: 6, kaleido: 1, xScale: 74, yScale: 74, octaves: 1).write(o0)\nbitEffects(colorScheme: 5, formula: 0, interp: 0, loopAmp: 34, n: 1, rotation: 0, scale: 88).glitch(aberrationAmt: 14).effects(effectAmt: 84, effect: 0).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'bitEffects', 'glitch', 'effects'],
    description: 'Noise and bit effects on separate chains with glitch filter and zoom effects',
  },
  {
    name: 'holographic noodles',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 9, hueRotation: 32, loopAmp: 17, refractAmt: 22, ridges: true, wrap: true, xScale: 90, yScale: 90, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).write(o0)\nnoise(hueRange: 9, hueRotation: 67, loopAmp: 25, refractAmt: 0, ridges: true, wrap: true, xScale: 60, yScale: 60, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).coalesce(tex: read(o0), blendMode: 9, mixAmt: 48, refractAAmt: 14, refractBAmt: 3).lensDistortion(aberrationAmt: 70, blendMode: 0, hueRange: 50, hueRotation: 34, blendMode: 1, modulate: false, passthru: 44, opacity: 0, loopAmp: 0, distortion: 0).refract().write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'coalesce', 'lens', 'refraction', 'chromatic-aberration'],
    description: 'Two ridged noise generators at different scales coalesced with chromatic aberration and refract filter',
  },
  {
    name: 'illuminatus',
    dsl: 'search classicNoisedeck\n\nshapes(loopAAmp: -22, loopAOffset: 410, loopAScale: 100, loopBAmp: 63, loopBOffset: 20, loopBScale: 61, palette: solaris, wrap: true, cyclePalette: 0, rotatePalette: 0).write(o0)\nshapes(loopAAmp: 50, loopAOffset: 410, loopAScale: 20, loopBAmp: 98, loopBOffset: 20, loopBScale: 1, palette: solaris, wrap: true, cyclePalette: 0, rotatePalette: 0).composite(tex: read(o0), blendMode: 3).colorLab(brightness: 4, colorMode: 2, dither: 0, hueRange: 200, hueRotation: 0, levels: 0, palette: sulphur, saturation: -6).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'shapes', 'composite', 'colorLab'],
    description: 'Two shapes oscillators composited with wide hue range colorLab remap and desaturation',
  },
  {
    name: 'kaleido-singularity',
    dsl: 'search classicNoisedeck\n\nnoise(hueRotation: 81, kaleido: 3, metric: 4, palette: eventHorizon, wrap: true, noiseType: 3, colorMode: 4, xScale: 81, yScale: 81, octaves: 1).coalesce(tex: read(o0), blendMode: 9, mixAmt: -100, refractAAmt: 100, refractBAmt: 0).glitch(aberrationAmt: 33, distortion: -62, glitchiness: 6, scanlinesAmt: 46, vignetteAmt: -57, xChonk: 100, yChonk: 75).write(o1)\nrender(o1)',
    tags: ['classic', 'noise', 'kaleido', 'coalesce', 'glitch'],
    description: 'Kaleido noise with self-refraction coalesce and heavy glitch scanline effects',
  },
  {
    name: 'kaleidopalooze',
    dsl: 'search classicNoisedeck\n\nnoise(hueRotation: 0, kaleido: 7, metric: 0, wrap: true, palette: royal, noiseType: 2, colorMode: 4, xScale: 52, yScale: 52, octaves: 1).write(o0)\nnoise(hueRange: 66, hueRotation: 36, loopAmp: 46, refractAmt: 68, ridges: true, wrap: false, xScale: 88, yScale: 94, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).coalesce(tex: read(o0), blendMode: 12, mixAmt: -19, refractAAmt: 0, refractBAmt: 40).kaleido(direction: 2, effectWidth: 3, kaleido: 7, kernel: 0, loopAmp: -10, loopOffset: 10, loopScale: 100, metric: 0, wrap: true).kaleido(direction: 2, effectWidth: 3, kaleido: 7, kernel: 0, loopAmp: 10, loopOffset: 10, loopScale: 86, metric: 0, wrap: true).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'coalesce', 'kaleido', 'dual-kaleido'],
    description: 'Two noise generators coalesced through dual kaleido filters for seven-fold nested symmetry',
  },
  {
    name: 'liquid flame',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 23, hueRotation: 76, loopAmp: 11, loopOffset: 210, loopScale: 50, refractAmt: 34, wrap: true, noiseType: 3, colorMode: 6, kaleido: 1, xScale: 92, yScale: 92, octaves: 1).write(o0)\nnoise(hueRange: 11, hueRotation: 76, loopAmp: 58, loopOffset: 210, loopScale: 100, refractAmt: 51, wrap: true, noiseType: 3, colorMode: 6, kaleido: 1, xScale: 78, yScale: 78, octaves: 1).coalesce(tex: read(o0), blendMode: 17, mixAmt: -4, refractAAmt: 57, refractBAmt: 40).lensDistortion(aberrationAmt: 0, distortion: 21, loopAmp: -3, loopScale: 99, opacity: 39, shape: 0, tint: #ca7907, vignetteAmt: -21).refract().write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'coalesce', 'lens', 'refraction'],
    description: 'Two warm-hued noise generators coalesced with mutual refraction, amber tint and refract filter',
  },
  {
    name: 'liquid ice',
    dsl: 'search classicNoisedeck\n\ncellNoise(colorMode: 1, loopAmp: 19, palette: jester, scale: 88, cellScale: 75, cellSmooth: 50, cellVariation: 0, cyclePalette: 1, rotatePalette: 0).write(o0)\ncellNoise(colorMode: 2, loopAmp: 8, palette: neptune, scale: 92, cellScale: 75, cellSmooth: 0, cellVariation: 0, cyclePalette: 1, rotatePalette: 0).coalesce(tex: read(o0), blendMode: 0, mixAmt: -50, refractAAmt: 61, refractBAmt: 34).lensDistortion(aberrationAmt: 30, distortion: -32, loopAmp: 15, loopScale: 73, opacity: 59, shape: 0, tint: #5e9e96, vignetteAmt: -100).refract().write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'cellNoise', 'coalesce', 'lens', 'refraction', 'vignette'],
    description: 'Two cell noise generators with jester and neptune palettes, refraction blend with teal vignette',
  },
  {
    name: 'liquid infinity',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 67, hueRotation: 9, loopAmp: 89, refractAmt: 100, ridges: true, wrap: true, xScale: 94, yScale: 97, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).write(o0)\nnoise(hueRange: 66, hueRotation: 20, loopAmp: 82, refractAmt: 100, ridges: true, wrap: true, xScale: 94, yScale: 97, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).coalesce(tex: read(o0), blendMode: 11, mixAmt: 55, refractAAmt: 100, refractBAmt: 100).lensDistortion(aberrationAmt: 20, distortion: -41, loopAmp: -10, loopScale: 60, opacity: 18, shape: 0, tint: #4950bc, vignetteAmt: -61).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'coalesce', 'refraction', 'lens', 'vignette'],
    description: 'Two max-refraction ridged noise generators coalesced with full mutual refraction and blue vignette',
  },
  {
    name: 'maelstrom',
    dsl: 'search classicNoisedeck\n\nfractal(centerX: 0, centerY: 0, fractalType: 0, offsetX: 40, offsetY: 58, palette: grayscale, rotation: 183, speed: 33, zoomAmt: 0, cyclePalette: 0, rotatePalette: 0).write(o0)\nnoise(hueRange: 26, hueRotation: 81, loopAmp: 100, refractAmt: 73, ridges: true, wrap: true, xScale: 95, yScale: 96, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).coalesce(tex: read(o0), blendMode: 10, mixAmt: 100, refractAAmt: 0, refractBAmt: 51).lensDistortion(aberrationAmt: 41, distortion: 23, loopAmp: 48, loopScale: 24, opacity: 14, shape: 0, tint: #935343, vignetteAmt: -47).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'fractal', 'noise', 'coalesce', 'lens'],
    description: 'Grayscale Mandelbrot fractal blended with ridged refracted noise, warm-tinted lens distortion',
  },
  {
    name: 'melt',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 17, hueRotation: 21, loopAmp: -27, loopOffset: 210, loopScale: 84, refractAmt: 88, wrap: true, noiseType: 3, colorMode: 6, kaleido: 1, xScale: 85, yScale: 85, octaves: 1).write(o0)\ncellNoise(colorMode: 1, loopAmp: 5, palette: blueSkies, scale: 69, cellScale: 75, cellSmooth: 0, cellVariation: 0, cyclePalette: 0, rotatePalette: 0).composite(tex: read(o0), blendMode: 1, inputColor: #000000, mixAmt: 46, range: 44).lensDistortion(aberrationAmt: 65, blendMode: 0, hueRange: 38, hueRotation: 0, blendMode: 0, modulate: false, passthru: 61, opacity: 0, loopAmp: 0, distortion: 0).refract().write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'cellNoise', 'composite', 'lens', 'refraction'],
    description: 'Refracted noise composited with blue cell noise, chromatic aberration and refract filter',
  },
  {
    name: 'oil cloud',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 100, hueRotation: 25, loopAmp: 100, octaves: 4, refractAmt: 5, ridges: true, noiseType: 10, colorMode: 6, kaleido: 1, xScale: 81, yScale: 81).write(o0)\nnoise(hueRange: 93, hueRotation: 25, loopAmp: 100, octaves: 1, refractAmt: 5, ridges: false, noiseType: 10, colorMode: 6, kaleido: 1, xScale: 81, yScale: 81).coalesce(tex: read(o0), blendMode: 5, mixAmt: 32, refractAAmt: 0, refractBAmt: 0).refract().refract().write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'coalesce', 'refraction', 'double-refract'],
    description: 'Two full-spectrum noise generators coalesced and double-refracted for iridescent oil effect',
  },
  {
    name: 'prismatic cloud',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 37, hueRotation: 0, loopAmp: 26, octaves: 5, refractAmt: 100, ridges: false, noiseType: 10, colorMode: 6, kaleido: 1, xScale: 98, yScale: 98).write(o0)\nnoise(hueRange: 100, hueRotation: 28, loopAmp: 98, refractAmt: 0, ridges: false, wrap: false, xScale: 98, yScale: 98, noiseType: 2, colorMode: 6, kaleido: 1, octaves: 1).coalesce(tex: read(o0), blendMode: 8, mixAmt: -72, refractAAmt: 0, refractBAmt: 100).lensDistortion(aberrationAmt: 0, distortion: -22, loopAmp: 10, loopScale: 71, opacity: 0, shape: 2, tint: #8a47ae, vignetteAmt: -73).lensDistortion(aberrationAmt: 100, blendMode: 0, hueRange: 12, hueRotation: 15, blendMode: 1, modulate: false, passthru: 76, opacity: 0, loopAmp: 0, distortion: 0).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'coalesce', 'lens', 'dual-lens', 'chromatic-aberration', 'vignette'],
    description: 'Multi-octave noise with full refraction coalesced, dual lens distortion with vignette and chromatic aberration',
  },
  {
    name: 'prismatic goop',
    dsl: 'search classicNoisedeck\n\npattern(color1: #ffffff, color2: #000000, rotation: 0, scale: 95, skewAmt: 8, patternType: 0, speed: 1, animation: 2).write(o0)\nnoise(hueRange: 25, hueRotation: 52, loopAmp: 53, refractAmt: 76, ridges: true, wrap: true, xScale: 95, yScale: 82, noiseType: 3, colorMode: 6, kaleido: 1, octaves: 1).coalesce(tex: read(o0), blendMode: 10, mixAmt: 43, refractAAmt: 10, refractBAmt: 0).lensDistortion(aberrationAmt: 100, blendMode: 0, hueRange: 71, hueRotation: 0, blendMode: 1, modulate: true, passthru: 47, opacity: 0, loopAmp: 0, distortion: 0).effects(effect: 4, effectAmt: 0, flip: 2, offsetX: 0, offsetY: 0, rotation: 59, scaleAmt: 146).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'pattern', 'noise', 'coalesce', 'lens', 'effects', 'chromatic-aberration'],
    description: 'Animated checkerboard coalesced with refracted noise, full chromatic aberration and rotated mirror',
  },
  {
    name: 'pure reflection',
    dsl: 'search classicNoisedeck\n\nshapes(loopAAmp: -28, loopAOffset: 30, loopAScale: 97, loopBAmp: 82, loopBOffset: 30, loopBScale: 7, wrap: true, palette: columbia, cyclePalette: 0, rotatePalette: 0).write(o0)\nshapes(loopAAmp: 43, loopAOffset: 210, loopAScale: 63, loopBAmp: -53, loopBOffset: 30, loopBScale: 71, wrap: true, palette: vibrant, cyclePalette: 0, rotatePalette: 0).composite(tex: read(o0), blendMode: 1, inputColor: #341cd4, mixAmt: 43, range: 30).refract().colorLab(colorMode: 2, dither: 0, hueRange: 200, hueRotation: 0, levels: 0, palette: sulphur).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'shapes', 'composite', 'refraction', 'colorLab'],
    description: 'Two shapes generators with different palettes composited with blue tint, refracted and color-remapped',
  },
  {
    name: 'satin touch',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 7, hueRotation: 73, loopAmp: 52, refractAmt: 80, ridges: false, wrap: true, xScale: 89, yScale: 93, noiseType: 10, colorMode: 6, kaleido: 1, octaves: 1).write(o0)\nnoise(hueRange: 38, hueRotation: 63, loopAmp: 46, octaves: 5, refractAmt: 83, ridges: true, noiseType: 10, colorMode: 6, kaleido: 1, xScale: 100, yScale: 100).coalesce(tex: read(o0), blendMode: 10, mixAmt: 100, refractAAmt: 24, refractBAmt: 10).colorLab(colorMode: 3, dither: 0, hueRange: 105, hueRotation: 55, levels: 0, palette: sulphur).colorLab(colorMode: 2, dither: 0, hueRange: 100, hueRotation: 88, levels: 0, palette: toxic).write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'coalesce', 'colorLab', 'dual-colorLab'],
    description: 'Two refracted noise generators coalesced with dual colorLab remapping through sulphur and toxic palettes',
  },
  {
    name: 'see you in prism',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 18, hueRotation: 20, loopAmp: -30, loopOffset: 20, loopScale: 81, refractAmt: 94, wrap: true, noiseType: 3, colorMode: 6, kaleido: 1, xScale: 100, yScale: 100, octaves: 1).write(o0)\ncellNoise(colorMode: 2, loopAmp: 0, palette: royal, scale: 84, cellScale: 75, cellSmooth: 0, cellVariation: 0, cyclePalette: 1, rotatePalette: 0).composite(tex: read(o0), blendMode: 1, inputColor: #8f8f8f, mixAmt: 0, range: 54).lensDistortion(aberrationAmt: 100, distortion: -67, loopAmp: 83, loopScale: 39, opacity: 33, shape: 6, tint: #412036, vignetteAmt: -46).refract().write(o1)\nrender(o1)',
    tags: ['classic', 'multi-chain', 'noise', 'cellNoise', 'composite', 'lens', 'refraction'],
    description: 'Refracted noise composited with royal cell noise, strong barrel distortion with diamond vignette and refract',
  },
  {
    name: 'digital camo',
    dsl: 'search classicNoisedeck\n\nnoise(hueRange: 3, hueRotation: 59, loopAmp: 22, loopOffset: 210, loopScale: 52, refractAmt: 35, wrap: true, noiseType: 0, colorMode: 6, kaleido: 1, xScale: 22, yScale: 22, octaves: 1).effects(effect: 100, effectAmt: 9, flip: 0, offsetX: 0, offsetY: 0, rotation: 0, scaleAmt: 100).write(o1)\nrender(o1)',
    tags: ['classic', 'noise', 'effects', 'pixelate', 'filter'],
    description: 'Low-scale noise with refraction pixelated into digital camouflage pattern',
  },
  {
    name: 'edgy fractal',
    dsl: 'search classicNoisedeck\n\nfractal(centerX: 0, centerY: 0, fractalType: 1, offsetX: 0, offsetY: 0, palette: vibrant, rotation: 0, speed: 51, symmetry: 4, zoomAmt: 0, cyclePalette: 0, rotatePalette: 0).write(o0)\nrender(o0)',
    tags: ['classic', 'fractal', 'simple', 'symmetry'],
    description: 'Symmetry fractal with four-fold rotation and vibrant palette',
  },
  {
    name: 'cyberfall',
    dsl: 'search classicNoisedeck\n\nbitEffects(colorScheme: 11, formula: 0, interp: 0, loopAmp: 100, n: 1, rotation: 45, scale: 84).write(o0)\nrender(o0)',
    tags: ['classic', 'bitEffects', 'simple', 'math-art'],
    description: 'Rotated bit manipulation formula with high animation speed',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Simple keyword search over exemplar programs.
 * Tokenizes query, matches against name/tags/description, returns top N.
 */
export function searchExemplars(query: string, maxResults: number = 5): ExemplarProgram[] {
  const tokens = query
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((t) => t.length > 1)

  if (tokens.length === 0) return DSL_EXEMPLAR_PROGRAMS.slice(0, maxResults)

  const scored = DSL_EXEMPLAR_PROGRAMS.map((program) => {
    const searchText = [
      program.name,
      ...program.tags,
      program.description,
    ]
      .join(' ')
      .toLowerCase()

    let score = 0
    for (const token of tokens) {
      // Exact tag match is strongest signal
      if (program.tags.some((tag) => tag === token)) {
        score += 3
      }
      // Name contains token
      if (program.name.toLowerCase().includes(token)) {
        score += 2
      }
      // Description/tags contain token
      if (searchText.includes(token)) {
        score += 1
      }
    }

    return { program, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.program)
}
