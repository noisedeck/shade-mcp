/**
 * Loop-safe shader examples and retrieval functions.
 *
 * Extracted from shade's server/shader-knowledge/vector-db/index.js.
 * Curated, complete, working looping shader examples that demonstrate
 * correct animation techniques.
 */

import type { KnowledgeDocument } from './vector-db.js'

interface LoopingExample {
  name: string
  technique: string
  description: string
  code: string
}

const LOOPING_EXAMPLES: LoopingExample[] = [
  {
    name: 'Animated Pulse Ring',
    technique: 'basic',
    description: 'Expanding ring with sin(time*TAU) animation',
    code: `#version 300 es
precision highp float;
uniform float time;
uniform vec2 resolution;
out vec4 fragColor;

#define TAU 6.283185307179586

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 center = uv - 0.5;
    float dist = length(center);

    // Animation: sin(time * TAU) loops perfectly [0->1->0]
    float t = time * TAU;
    float pulse = 0.5 + 0.5 * sin(t);  // 0->1->0 smoothly

    // Ring expands/contracts with pulse
    float ring = smoothstep(0.02, 0.0, abs(dist - pulse * 0.4));

    vec3 color = vec3(0.2, 0.8, 1.0) * ring;
    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: 'Rotating Gradient',
    technique: 'rotation',
    description: 'Full rotation using integer turn count',
    code: `#version 300 es
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform float speed;
out vec4 fragColor;

#define TAU 6.283185307179586

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 center = uv - 0.5;

    // Get angle and rotate it
    float angle = atan(center.y, center.x);

    // CORRECT: Integer rotations (1 full turn per loop)
    // speed should be 1, 2, 3, etc for seamless loop
    float rotation = time * TAU * floor(speed);
    angle += rotation;

    // Create gradient based on rotated angle
    float gradient = 0.5 + 0.5 * sin(angle * 3.0);

    vec3 color = mix(vec3(1.0, 0.3, 0.5), vec3(0.3, 0.5, 1.0), gradient);
    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: 'Oscillating Noise',
    technique: 'noise',
    description: 'Noise with time-circle sampling (Bleuje method)',
    code: `#version 300 es
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform float scale;
out vec4 fragColor;

#define TAU 6.283185307179586

// Simple hash for noise
float hash(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}

float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
        f.z
    );
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    float t = time * TAU;

    // TIME-CIRCLE: Map time to a circle for looping noise
    // This is the Bleuje tutorial 3 technique
    float timeX = cos(t);  // x on unit circle
    float timeY = sin(t);  // y on unit circle

    // Sample 3D noise: xy = spatial, z = time-circle
    float n = noise3D(vec3(uv * scale, timeX * 0.5));
    n += 0.5 * noise3D(vec3(uv * scale * 2.0, timeY * 0.5));
    n = n * 0.5 + 0.5;

    vec3 color = vec3(n * 0.8, n * 0.5, n);
    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: 'Plasma Wave',
    technique: 'wave',
    description: 'Classic plasma with proper sin/cos animation',
    code: `#version 300 es
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform float scale;
out vec4 fragColor;

#define TAU 6.283185307179586

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    float t = time * TAU;

    // All wave components use sin/cos with time*TAU
    float v = 0.0;
    v += sin(uv.x * scale + t);
    v += sin(uv.y * scale + t * 0.5);  // 0.5 is fine inside sin()
    v += sin((uv.x + uv.y) * scale * 0.5 + t);
    v += sin(length(uv - 0.5) * scale * 2.0 - t);

    v = v * 0.25 + 0.5;  // Normalize to 0-1

    // Color palette using cos (also loops perfectly)
    vec3 color = 0.5 + 0.5 * cos(TAU * (v + vec3(0.0, 0.33, 0.67)));

    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: 'Breathing Circle',
    technique: 'scale',
    description: 'Pulsing scale with periodicValue helper',
    code: `#version 300 es
precision highp float;
uniform float time;
uniform vec2 resolution;
out vec4 fragColor;

#define TAU 6.283185307179586

// Bleuje periodicValue: returns 0->1->0 smoothly over one loop
float periodicValue(float t, float offset) {
    return 0.5 + 0.5 * sin((t - offset) * TAU);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 center = uv - 0.5;
    float dist = length(center);

    // Three circles with offset phases (Bleuje pattern)
    float c1 = smoothstep(0.02, 0.0, abs(dist - 0.1 - periodicValue(time, 0.0) * 0.2));
    float c2 = smoothstep(0.02, 0.0, abs(dist - 0.15 - periodicValue(time, 0.33) * 0.15));
    float c3 = smoothstep(0.02, 0.0, abs(dist - 0.2 - periodicValue(time, 0.66) * 0.1));

    vec3 color = vec3(c1, c2, c3);
    fragColor = vec4(color, 1.0);
}`,
  },
]

/**
 * Retrieve loop-safe shader examples for GENERATE phase.
 * Returns COMPLETE, WORKING shader examples that demonstrate correct looping.
 *
 * These are curated, minimal examples -- not extracted from indexed docs.
 *
 * @param technique - Optional technique filter (e.g., 'noise', 'rotation')
 * @param limit - Maximum examples to return
 * @returns Formatted GLSL examples for system prompt injection
 */
export function retrieveLoopSafeExamples(technique = '', limit = 2): string {
  // Filter by technique if specified
  let examples: LoopingExample[] = LOOPING_EXAMPLES
  if (technique) {
    const techLower = technique.toLowerCase()
    examples = LOOPING_EXAMPLES.filter(
      (e) =>
        e.technique.includes(techLower) ||
        e.description.toLowerCase().includes(techLower) ||
        e.code.toLowerCase().includes(techLower),
    )
    // If no matches, return all
    if (examples.length === 0) {
      examples = LOOPING_EXAMPLES
    }
  }

  // Limit results
  examples = examples.slice(0, limit)

  if (examples.length === 0) {
    return ''
  }

  // Format for prompt injection
  let result = '## COMPLETE LOOPING SHADER EXAMPLES\n\n'
  result += 'Copy these patterns exactly. They loop seamlessly.\n\n'

  for (const ex of examples) {
    result += `### ${ex.name}\n`
    result += `${ex.description}\n`
    result += '```glsl\n' + ex.code + '\n```\n\n'
  }

  return result
}

/**
 * Search for shaders by looping pattern.
 *
 * Unlike the shade original which accesses db.documents directly,
 * this version accepts a getDocuments callback to avoid coupling
 * to the DB singleton.
 *
 * @param pattern - Pattern type to search for
 * @param limit - Maximum results
 * @param getDocuments - Callback that yields documents to search
 * @returns Matching documents
 */
export function searchByLoopPattern(
  pattern: 'loop-safe' | 'loop-unsafe' | 'all',
  limit = 10,
  getDocuments: () => Iterable<KnowledgeDocument>,
): KnowledgeDocument[] {
  const results: KnowledgeDocument[] = []
  for (const doc of getDocuments()) {
    const tags = doc.tags || []
    let matches = false
    if (pattern === 'loop-safe') {
      matches = tags.includes('loop-safe')
    } else if (pattern === 'loop-unsafe') {
      matches = tags.includes('loop-unsafe')
    } else {
      matches = true
    }
    if (matches) results.push(doc)
    if (results.length >= limit) break
  }
  return results
}
