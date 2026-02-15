export const EFFECT_DEFINITION_REFERENCE = `## Effect Definition Specification

Effects are JavaScript modules exporting an Effect instance.

### Minimal Structure

\`\`\`javascript
import { Effect } from '../../../src/runtime/effect.js'

export default new Effect({
  name: "MyEffect",           // Human-readable name
  namespace: "synth",         // Pipeline namespace
  func: "myEffect",           // DSL function name
  tags: ["noise"],            // Searchable tags
  description: "...",

  globals: {
    myParam: {
      type: "float",
      default: 1.0,
      uniform: "myParam",
      min: 0.0, max: 10.0,
      ui: { label: "My Parameter", control: "slider" }
    }
  },

  passes: [{
    name: "main",
    program: "myShader",      // Maps to glsl/myShader.glsl
    inputs: {},               // For starters: empty
    outputs: { fragColor: "outputTex" }
  }]
})
\`\`\`

### Uniform Types

| Type | GLSL | Default Format |
|------|------|----------------|
| float | float | Number: \`1.0\` |
| int | int | Number: \`4\` |
| boolean | bool | Boolean: \`false\` |
| vec2 | vec2 | **Array**: \`[0.5, 0.5]\` |
| vec3 | vec3 | **Array**: \`[1.0, 0.0, 0.5]\` |
| vec4 | vec4 | **Array**: \`[1.0, 0.0, 0.5, 1.0]\` |

**CRITICAL: vec defaults MUST be arrays, NOT objects!**

### Uniform Properties

\`\`\`javascript
myUniform: {
  type: "float",
  default: 1.0,
  uniform: "myUniform",       // GLSL uniform name
  min: 0.0, max: 10.0,
  step: 0.1,
  choices: { opt1: 0, opt2: 1 },  // For dropdowns
  ui: {
    label: "Display Name",
    control: "slider",        // slider, checkbox, dropdown, button, color
    category: "transform",    // Group controls (camelCase only!)
    enabledBy: "otherUniform"
  }
}
\`\`\`

### Multi-Pass Effects

\`\`\`javascript
textures: {
  _temp: { width: "input", height: "input", format: "rgba8unorm" }
},
passes: [
  { name: "pass1", program: "blur1", inputs: { inputTex: "inputTex" }, outputs: { fragColor: "_temp" } },
  { name: "pass2", program: "blur2", inputs: { inputTex: "_temp" }, outputs: { fragColor: "outputTex" } }
]
\`\`\``

export const EFFECT_DEFINITION_DEEP = `## Effect Definition - Guru Level

### The Three Data Flows

1. **Uniform Flow** (CPU → GPU): globals → GLSL uniforms
2. **Texture Flow** (GPU → GPU): passes inputs/outputs
3. **Pass Execution**: Sequential shader programs

### Reserved Texture Names

| Name | Direction | Purpose |
|------|-----------|---------|
| inputTex | Read | Input from chain |
| outputTex | Write | Output to chain |
| inputTex3d | Read | 3D volume input |
| outputTex3d | Write | 3D volume output |
| inputGeo | Read | Geometry buffer |

### Effect Types by I/O Pattern

**STARTER (synth/):** passes[].inputs = {} (empty)
**FILTER (filter/):** passes[].inputs = { inputTex: "inputTex" }
**MIXER (mixer/):** Has tex: { type: "surface" } in globals

### Special Pass Properties

- \`repeat: "iterations"\` - Run pass N times
- \`pingpong: ["_a", "_b"]\` - Swap textures each iteration
- \`drawBuffers: 2\` - Multiple render targets
- \`drawMode: "points"\` - Particle rendering
- \`blend: true\` - Additive blending`

export const EFFECT_ANATOMY_KNOWLEDGE = `## Effect Anatomy - Deep Knowledge

### Namespace Roles (300+ Library Effects)

| Namespace | Role | DSL Pattern |
|-----------|------|-------------|
| synth/ | Starters | \`noise().write(o0)\` |
| filter/ | Processors | \`noise().blur().write(o0)\` |
| mixer/ | Blenders | \`a.write(o0)\\nb.mixer(tex:read(o0)).write(o1)\` |
| points/ | Agents | \`noise().pointsEmit().flow().pointsRender().write(o0)\` |
| render/ | Pipeline | Wrappers: pointsEmit, render3d, loops |
| synth3d/ | 3D volumes | \`noise3d().render3d().write(o0)\` |

### Common Uniform Patterns

**Animation:** \`speed: { type: "int", default: 0, min: -5, max: 5 }\`
**Scale:** \`xScale: { type: "float", default: 75, min: 1, max: 100 }\`
**Seed:** \`seed: { type: "int", default: 1, min: 1, max: 100 }\`
**Toggle:** \`ridges: { type: "boolean", default: false }\`
**Color:** \`tint: { type: "vec3", default: [1.0, 1.0, 1.0], ui: { control: "color" } }\`

### Multi-Pass Pattern (bloom)

\`\`\`javascript
textures: {
  _bright: { width: "input", height: "input", format: "rgba16float" },
  _bloom: { width: "input", height: "input", format: "rgba16float" }
},
passes: [
  { name: "bright", program: "bright", inputs: { inputTex: "inputTex" }, outputs: { fragColor: "_bright" } },
  { name: "blur", program: "blur", inputs: { inputTex: "_bright" }, outputs: { fragColor: "_bloom" } },
  { name: "final", program: "composite", inputs: { inputTex: "inputTex", bloomTex: "_bloom" }, outputs: { fragColor: "outputTex" } }
]
\`\`\`

### Points/Agents State Textures

- \`global_xyz\`: [x, y, heading, alive]
- \`global_vel\`: [vx, vy, age, seed]
- \`global_rgba\`: [r, g, b, a]

### What Makes a "Good" Effect

1. 2-6 meaningful uniforms
2. Smooth animation (sin/cos of time*TAU)
3. Wrap/seed controls
4. Proper min/max ranges
5. Visible uniform changes`

export const REQUIRED_PATTERNS = `## REQUIRED Patterns

### GLSL Requirements

| Requirement | Correct Pattern |
|-------------|-----------------|
| Aspect ratio | \`#define aspectRatio (resolution.x / resolution.y)\` |
| Animated UV offset | \`uv + vec2(sin(time * TAU), cos(time * TAU))\` |
| Animated noise | \`noise(pos + vec2(sin(time * TAU), cos(time * TAU)) * 0.5)\` |
| Uniform declaration | All uniforms in definition.js must be declared in GLSL |

### DSL Requirements

| Requirement | Correct Pattern |
|-------------|-----------------|
| Generator call | \`noise().write(o0)\` |
| Search directive | First line: \`search synth\` |
| Render call | Last line: \`render(o0)\` |

### Definition Requirements

| Requirement | Correct Pattern |
|-------------|-----------------|
| Vec2 defaults | \`default: [0.5, 0.5]\` (array format) |
| Custom uniforms | Always add 2-6 uniforms |
| Category format | \`category: "colorGrading"\` (camelCase) |`
