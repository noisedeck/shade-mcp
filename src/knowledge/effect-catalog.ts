export const EFFECT_CATALOG = `## Complete Effect Catalog (169 Effects)

### SYNTH (Generators) - Start chains, create images from nothing
| Function | Description | Key Parameters |
|----------|-------------|----------------|
| noise | Value noise with multiple interpolation types | xScale, yScale, noiseType, octaves, ridges, seed, colorMode |
| fractal | Multi-octave fractal noise | octaves, lacunarity, gain, noiseType, ridges |
| cell | Cellular/Voronoi noise | scale, jitter, mode, seed |
| perlin | Classic Perlin noise | scale, octaves, seed |
| curl | Curl noise patterns | scale, strength |
| polygon | Procedural polygon shapes | sides, rotation, fill |
| shape | SDF shape generator | shapeType, size, border |
| solid | Solid color generator | color |
| osc2d | 2D oscillator patterns | freq, phase, waveform |
| rd | Gray-Scott reaction-diffusion | feed, kill, rate1, rate2, speed, iterations |
| ca | Cellular automata | rule, seed |
| mnca | Multi-neighborhood CA | neighborhood, rule |
| testPattern | Calibration patterns | pattern |

### SYNTH3D (3D Volume Generators) - Use with render3d()
| Function | Description | Key Parameters |
|----------|-------------|----------------|
| noise3d | 3D simplex noise volume | volumeSize, scale, octaves, colorMode, ridges |
| fractal3d | 3D fractal noise | volumeSize, octaves, lacunarity |
| cell3d | 3D cellular noise | volumeSize, scale, jitter |
| shape3d | 3D SDF shapes | volumeSize, shapeType |
| rd3d | 3D reaction-diffusion | volumeSize, feed, kill |
| ca3d | 3D cellular automata | volumeSize, rule |

### FILTER (Processors) - Chain after generators, transform images
| Function | Description | Key Parameters |
|----------|-------------|----------------|
| blur | Gaussian blur | radiusX, radiusY, iterations |
| warp | Perlin noise distortion | strength, scale, seed, speed, wrap |
| bloom | Glow effect | threshold, intensity, radius |
| posterize | Reduce color levels | levels |
| edge | Edge detection | strength |
| emboss | Emboss effect | strength, angle |
| sharpen | Sharpen filter | amount |
| vignette | Vignette darkening | radius, softness, amount |
| sobel | Sobel edge detection | amount |
| pixels | Pixelation | size |
| rot | Rotation | angle, wrap |
| scale | Scale transform | scaleX, scaleY |
| translate | Translation | x, y, wrap |
| flipMirror | Flip/mirror operations | mode |
| bc | Brightness/contrast | brightness, contrast |
| hs | Hue/saturation | hue, saturation |
| inv | Invert colors | amount |
| tint | Color tinting | color, amount |
| thresh | Threshold | level |
| chroma | Chroma key | keyColor, tolerance |
| channel | Channel operations | mode |
| colorspace | Colorspace conversion | from, to |
| palette | Palette mapping | palette, dither |
| polar | Polar coordinate transform | mode |
| waves | Wave distortion | ampX, ampY, freqX, freqY |
| pinch | Pinch/bulge | amount, radius |
| bulge | Bulge distortion | amount, center |
| spiral | Spiral distortion | turns, radius |
| tunnel | Tunnel effect | speed, rotation |
| lens | Lens distortion | amount, type |
| feedback | Temporal feedback | decay, zoom, rotation |
| motionBlur | Motion blur | angle, amount |
| zoomBlur | Radial zoom blur | amount, center |
| chromaticAberration | RGB split | amount, angle |
| prismaticAberration | Prismatic split | amount, spread |
| grade | Color grading | lift, gamma, gain |
| step | Step function | steps |
| smoothstep | Smooth threshold | edge0, edge1 |
| deriv | Derivative/gradient | axis |
| outline | Edge outline | width, color |
| cf | Contour filter | levels |
| scroll | Animated scroll | speedX, speedY |

### POINTS (Particle Systems) - Use with pointsEmit() and pointsRender()
| Function | Description | Key Parameters |
|----------|-------------|----------------|
| flow | Flow field agents | behavior, stride, kink, inputWeight |
| physical | Physics simulation | gravity, friction, bounce |
| flock | Flocking behavior | separation, alignment, cohesion |
| attractor | Attractor physics | attractorType, strength, points |
| life | Life/death cycles | lifespan, fadeIn, fadeOut |
| hydraulic | Fluid erosion | erosion, deposition |
| dla | Diffusion-limited aggregation | stickiness |
| physarum | Slime mold simulation | sensorAngle, sensorDist, turnSpeed |

### RENDER (Pipeline Utilities)
| Function | Description | Key Parameters |
|----------|-------------|----------------|
| render3d | 3D volume raymarcher | threshold, filtering, orbitSpeed, bgColor |
| pointsEmit | Initialize particle state | stateSize, layout, seed, attrition |
| pointsRender | Draw particles to screen | blendMode, pointSize, shape |
| pointsBillboardRender | Billboard particle render | size, facing |
| loopBegin | Start render loop | count |
| loopEnd | End render loop | |

### MIXER (Two-input blending)
| Function | Description | Key Parameters |
|----------|-------------|----------------|
| blendMode | 16 blend modes | tex, mode, mixAmt |
| alphaMask | Alpha compositing | tex, mode |
| applyMode | Apply texture | tex, mode |
| centerMask | Center-based masking | tex, radius |
| displaceMixer | Displacement blend | tex, amount |

### CLASSIC EFFECTS (from classicNoisemaker/classicNoisedeck)
bloom, blur, crt, vhs, grain, kaleido, vortex, ripple, wormhole, aberration, wobble,
posterize, sobel, convolve, voronoi, clouds, nebula, fibers, glitch, scanlineError,
degauss, lightLeak, shadow, frame, simpleFrame, tint, rotate, palette, colorMap,
normalMap, densityMap, glyphMap, sketch, grime, scratches, snow, spatter, strayHair,
lensDistortion, lensWarp, refract, valueRefract, reindex, ridge, sine, pixelSort,
adjustHue, adjustSaturation, adjustBrightness, adjustContrast, normalize, fxaa,
reverb, vaseline, glowingEdges, derivative, jpegDecimate, spookyTicker, texture,
lowpoly, falseColor, onScreenDisplay
`
