export const EFFECT_CATALOG = `## Effect Catalog

**IMPORTANT: Do NOT guess parameter names.** Copy parameter names exactly from the example programs below or from the exemplar programs. If you don't see an example of an effect being used with parameters, use it with NO parameters and let the defaults work.

### SYNTH (Generators) - Start chains, create images from nothing
noise, fractal, cell, perlin, curl, polygon, shape, solid, osc2d, rd, ca, mnca, testPattern

### SYNTH3D (3D Volume Generators) - Use with render3d()
noise3d, fractal3d, cell3d, shape3d, rd3d, ca3d

### FILTER (Processors) - Chain after generators
blur, warp, bloom, posterize, edge, emboss, sharpen, vignette, sobel, pixels,
rot, scale, translate, flipMirror, bc, hs, inv, tint, thresh, chroma, channel,
colorspace, palette, polar, waves, pinch, bulge, spiral, tunnel, lens, feedback,
motionBlur, zoomBlur, chromaticAberration, prismaticAberration, grade, step,
smoothstep, deriv, outline, cf, scroll

### POINTS (Particle Systems) - Use with pointsEmit()/pointsRender()
flow, physical, flock, attractor, life, hydraulic, dla, physarum, lenia

### RENDER (Pipeline Utilities)
render3d, pointsEmit, pointsRender, pointsBillboardRender, loopBegin, loopEnd

### MIXER (Two-input blending) - Require tex: read(oN) parameter
blendMode, alphaMask, applyMode, centerMask, displaceMixer, coalesce

### CLASSIC EFFECTS (classicNoisedeck namespace)
background, bitEffects, cellNoise, fractal, noise, noise3d, pattern, shapes,
bloom, blur, crt, vhs, grain, kaleido, vortex, ripple, wormhole, aberration, wobble,
posterize, sobel, convolve, voronoi, clouds, nebula, fibers, glitch, scanlineError,
degauss, lightLeak, shadow, frame, simpleFrame, tint, rotate, palette, colorMap,
normalMap, densityMap, glyphMap, sketch, grime, scratches, snow, spatter, strayHair,
lensDistortion, lensWarp, refract, valueRefract, reindex, ridge, sine, pixelSort,
adjustHue, adjustSaturation, adjustBrightness, adjustContrast, normalize, fxaa,
reverb, vaseline, glowingEdges, derivative, jpegDecimate, spookyTicker, texture,
lowpoly, falseColor, onScreenDisplay, colorLab, effects, text

### Parameter Examples (REAL, VERIFIED from working programs)
\`\`\`
noise(noiseType: 10, octaves: 2, xScale: 75, yScale: 75, ridges: true, colorMode: 6, hueRotation: 45, hueRange: 25, kaleido: 1, palette: afterimage)
shapes(loopAAmp: 50, loopAOffset: 60, loopAScale: 21, loopBAmp: 42, loopBOffset: 120, loopBScale: 54, palette: netOfGems, wrap: true)
cellNoise(scale: 75, cellScale: 87, cellSmooth: 11, cellVariation: 50, colorMode: 0, palette: royal)
fractal(fractalType: 0, zoomAmt: 0, rotation: 0, speed: 30, offsetX: 70, offsetY: 50, iterations: 50, colorMode: 4, palette: dealerHat)
pattern(patternType: 1, scale: 80, rotation: 0, lineWidth: 100, animation: 0, speed: 1, color1: #ffea31, color2: #000000)
solid(color: #000)
polygon(radius: 0.7, fgAlpha: 0.1, bgAlpha: 0)
text(text: "hello", font: "Audiowide", size: 0.09, posX: 0.375, color: #ffffff)
pointsEmit(stateSize: x64, attrition: 2.63)
physical(gravity: 0, energy: 0.98, drag: 0.125)
pointsRender(density: 100, inputIntensity: 20)
pointsBillboardRender(tex: read(o0), pointSize: 40, sizeVariation: 50, rotationVariation: 50)
loopBegin(alpha: 95, intensity: 95)
warp()
bloom(taps: 15)
blur(radiusX: 5)
vignette()
lens(displacement: -0.5)
chromaticAberration(aberrationAmt: 25)
coalesce(tex: read(o0), blendMode: 8, mixAmt: -51, refractAAmt: 0, refractBAmt: 71)
blendMode(tex: read(o0), mode: multiply)
lensDistortion(aberrationAmt: 100, distortion: -48, opacity: 12, shape: 0, tint: #b42f2d, vignetteAmt: -46)
colorLab(colorMode: 2, dither: 0, hueRange: 100, hueRotation: 0, levels: 2, palette: seventiesShirt)
effects(effect: 4, effectAmt: 2, flip: 0, offsetX: 0, offsetY: 0, rotation: 0, scaleAmt: 100)
posterize(levels: 6)
outline()
colorspace()
hs(rotation: 120, hueRange: 40)
bc()
\`\`\`
`
