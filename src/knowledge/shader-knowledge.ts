import type { KnowledgeDocument } from './vector-db.js'

export const TECHNIQUE_SYNONYMS: Record<string, string[]> = {
  noise: ['perlin', 'simplex', 'value noise', 'fbm', 'fractal', 'organic', 'procedural'],
  voronoi: ['cellular', 'worley', 'cell noise', 'cells', 'diagram'],
  kaleidoscope: ['mirror', 'symmetry', 'radial', 'polar', 'reflection'],
  blur: ['gaussian', 'smooth', 'bokeh', 'defocus', 'bloom'],
  distortion: ['warp', 'twist', 'bend', 'deform', 'displace'],
  feedback: ['delay', 'echo', 'trail', 'persistence', 'accumulate'],
  particle: ['points', 'agent', 'emit', 'flow', 'swarm'],
  gradient: ['ramp', 'color ramp', 'palette', 'colormap', 'interpolation', 'blend', 'mix'],
  sdf: ['signed distance', 'distance field', 'raymarching', 'shapes'],
  glitch: ['digital', 'error', 'artifact', 'corruption', 'databend'],
  wave: ['sine', 'cosine', 'oscillation', 'ripple', 'interference'],
  pattern: ['tiling', 'grid', 'mosaic', 'tessellation', 'repeat'],
  color: ['hue', 'saturation', 'brightness', 'hsv', 'hsl', 'palette', 'rgb', 'mix', 'lerp'],
  '3d': ['tunnel', 'perspective', 'raymarching', 'volumetric'],
  edge: ['sobel', 'contour', 'outline', 'detection'],
  film: ['grain', 'halftone', 'dither', 'scanline', 'retro'],
  fbm: ['fractal brownian motion', 'octaves', 'layered noise', 'turbulence'],
  simplex: ['perlin', 'gradient noise', 'coherent noise'],
  polar: ['radial', 'angle', 'atan', 'circular', 'spiral'],
  geometric: ['shapes', 'sdf', 'distance field', 'circle', 'polygon', 'grid'],
  spiral: ['vortex', 'swirl', 'rotation', 'twist'],
  animation: ['time', 'motion', 'movement', 'animate', 'loop', 'sin', 'cos', 'TAU'],
  flow: ['curl', 'vector field', 'advection', 'fluid', 'stream'],
  warp: ['distort', 'displacement', 'domain warping', 'deform'],
  rainbow: ['spectrum', 'hsv rotation', 'hue cycle', 'chromatic'],
  filter: ['post-process', 'image effect', 'inputTex', 'texture'],
  synth: ['generator', 'procedural', 'synthesizer'],
}

export function expandQueryWithSynonyms(query: string): string {
  const lower = query.toLowerCase()
  const expanded = [query]
  for (const [key, synonyms] of Object.entries(TECHNIQUE_SYNONYMS)) {
    if (lower.includes(key)) {
      expanded.push(...synonyms)
    }
    for (const syn of synonyms) {
      if (lower.includes(syn)) {
        expanded.push(key)
        break
      }
    }
  }
  return expanded.join(' ')
}

export const CURATED_KNOWLEDGE: KnowledgeDocument[] = [
  {
    id: 'dsl-basics',
    title: 'DSL Basics',
    content: 'The shader DSL uses function chaining: search namespace, call effect function with args, write to output buffer (o0), render. Example: search synth\\nnoise(seed: 1).write(o0)\\nrender(o0)',
    category: 'dsl',
    tags: ['dsl', 'syntax', 'basics'],
  },
  {
    id: 'effect-definition-format',
    title: 'Effect Definition Format',
    content: 'Effects are defined as definition.json or definition.js files in namespace directories. They specify func (camelCase name), namespace, description, globals (uniforms with type/min/max/default), and passes (shader programs with inputs/outputs).',
    category: 'effect-definition',
    tags: ['definition', 'format', 'structure'],
  },
  {
    id: 'glsl-uniforms',
    title: 'GLSL Uniform Wiring',
    content: 'Uniforms in GLSL shaders must be declared with matching names from the globals section. Common system uniforms: resolution (vec2), time (float), aspect (float). Custom uniforms use the uniform field from globals.',
    category: 'glsl',
    tags: ['glsl', 'uniforms', 'wiring'],
  },
  {
    id: 'noise-techniques',
    title: 'Noise Generation Techniques',
    content: 'Common noise types: Perlin (smooth gradient noise), Simplex (improved Perlin), Voronoi/Worley (cellular patterns), Value noise (interpolated random), FBM (fractal Brownian motion, layered octaves). Use timeCircle pattern for seamless looping: vec2 tc = vec2(cos(time*TAU), sin(time*TAU)) * radius.',
    category: 'technique',
    tags: ['noise', 'perlin', 'simplex', 'voronoi', 'fbm'],
  },
  {
    id: 'sdf-techniques',
    title: 'Signed Distance Field Techniques',
    content: 'SDFs define shapes by distance to surface. Common operations: union (min), intersection (max), subtraction, smooth blend (smin). Raymarching steps along ray, checking SDF distance. Common shapes: sphere, box, torus, cylinder.',
    category: 'technique',
    tags: ['sdf', 'raymarching', 'distance field', 'shapes'],
  },
  {
    id: 'color-manipulation',
    title: 'Color Manipulation',
    content: 'HSV conversion: rgb2hsv/hsv2rgb. Color grading: lift/gamma/gain, temperature/tint. Palette generation: cosine gradient (a + b*cos(2*PI*(c*t+d))). Tone mapping: ACES, Reinhard. Blending modes: multiply, screen, overlay, soft light.',
    category: 'technique',
    tags: ['color', 'hsv', 'palette', 'grading', 'blend'],
  },
  {
    id: 'domain-warping',
    title: 'Domain Warping',
    content: 'Domain warping deforms UV coordinates before sampling: warpedUV = uv + noise(uv) * amount. Layered warping: apply noise multiple times. Feedback warping: use previous frame as warp source. Creates organic, fluid patterns.',
    category: 'technique',
    tags: ['warp', 'distortion', 'domain', 'organic'],
  },
  {
    id: 'filter-effects',
    title: 'Filter Effect Patterns',
    content: 'Filter effects process an input texture (inputTex). They receive the previous pass output and modify it. Common filters: blur (gaussian kernel), sharpen, edge detection (Sobel), color grading, distortion. Must declare inputTex in pass inputs.',
    category: 'effect-pattern',
    tags: ['filter', 'input', 'processing', 'post-processing'],
  },
  {
    id: 'compute-shaders',
    title: 'Compute Shader Patterns',
    content: 'Compute shaders run on GPU without rasterization. Used for GPGPU tasks: particle simulation, cellular automata, physics. Declare pass type as "compute" or "gpgpu". Access storage buffers and textures directly.',
    category: 'technique',
    tags: ['compute', 'gpgpu', 'simulation', 'particles'],
  },
  {
    id: 'animation-patterns',
    title: 'Seamless Animation Patterns',
    content: 'For seamless looping: use timeCircle (cos/sin of time*TAU*radius). Avoid raw time in noise - use periodic functions. The Bleuje pattern: t = fract(time), animate properties with sin/cos of t*TAU. Integer transitions with floor(t) for discrete changes.',
    category: 'technique',
    tags: ['animation', 'loop', 'seamless', 'time'],
  },
  {
    id: 'pipeline-architecture',
    title: 'Rendering Pipeline Architecture',
    content: 'The rendering pipeline processes passes sequentially. Each pass has inputs (textures from previous passes or external sources), outputs (render targets), and a shader program. The pipeline manages texture allocation, uniform propagation, and frame timing.',
    category: 'pipeline',
    tags: ['pipeline', 'architecture', 'rendering', 'passes'],
  },
  {
    id: 'common-errors',
    title: 'Common Shader Errors',
    content: 'Blank output: missing write to output color, wrong output variable name. Static animation: time not connected or not used. Monochrome: using single channel without color mapping. Compilation error: type mismatches, undeclared variables, missing precision qualifiers.',
    category: 'errors',
    tags: ['errors', 'debug', 'troubleshooting', 'fix'],
  },
]
