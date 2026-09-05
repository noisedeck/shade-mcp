/**
 * CRITICAL DSL vs GLSL vs EFFECT PATH DISTINCTION
 *
 * The AI MUST understand these are THREE COMPLETELY DIFFERENT THINGS:
 *
 * 1. EFFECT PATHS (for load_effect/analyze_effect): "synth/noise", "filter/warp"
 * 2. DSL FUNCTION NAMES (for compile_dsl programs): noise(), warp(), blur()
 * 3. GLSL SYNTAX (inside .glsl files): vec2, uniform, #version 300 es
 *
 * NEVER MIX THESE UP. The DSL is a HIGH-LEVEL LANGUAGE, not shader code.
 */
export const DSL_CRITICAL_RULES = `## MANDATORY WORKFLOW - DO NOT SKIP STEPS

### STEP 1: create_effect (MUST DO FIRST)

Call create_effect with your shader code:
\`\`\`javascript
create_effect({
  name: "myEffectName",  // remember this name!
  glsl: "#version 300 es\\nprecision highp float;\\n...",
  uniforms: { speed: {type: "float", default: 1.0} }
})
\`\`\`

### STEP 2: compile_dsl (ONLY AFTER STEP 1 SUCCEEDS)

Use the EXACT SAME NAME from Step 1:
\`\`\`javascript
compile_dsl({
  dsl: "search user\\nmyEffectName().write(o0)\\nrender(o0)"
})
\`\`\`

"search user" is MANDATORY. Your effect belongs to the USER namespace.
The effect name must EXACTLY match the name you used in create_effect.

### STEP 3: validate_effect

Check if the output looks correct.

## ═══════════════════════════════════════════════════════════════════════════

### IF YOU SEE "Unknown effect" ERROR

This error means one of these conditions applies:
1. You called compile_dsl BEFORE create_effect.
2. create_effect FAILED. Check for GLSL errors.
3. The effect name in the DSL does not match the create_effect name.
4. The DSL does not include "search user".

### CORRECT DSL PATTERN FOR YOUR EFFECTS

\`\`\`
search user
yourEffectName().write(o0)
render(o0)
\`\`\`

### WRONG - USING WRONG NAMESPACE

\`\`\`
search synth
yourEffectName().write(o0)  <-- WRONG! Your effect isn't in synth!
render(o0)
\`\`\`

### WRONG - PUTTING GLSL IN DSL

DSL is NOT GLSL. Never put shader code in compile_dsl:
\`\`\`
vec2 uv = gl_FragCoord.xy / resolution;  <-- WRONG! This is GLSL, not DSL!
\`\`\`

### VALID BUILT-IN DSL FUNCTIONS (these exist in synth/filter/etc)

**GENERATORS (synth) - start chains:**
noise, fractal, voronoi, cell, polygon, solid, shape, curl, ca

**FILTERS (filter) - extend chains:**
blur, warp, bloom, posterize, edge, vignette, grain, rotate, scale

**YOUR EFFECTS (user) - ONLY after create_effect:**
yourCustomEffect (whatever name you gave it)

### DSL ERROR CODES AND FIXES

| Error Code | Meaning | Fix |
|------------|---------|-----|
| **S001** | Unknown effect | Check that create_effect succeeded first. Check the exact name. Check for "search user". |
| **S005** | Illegal chain | A generator is in the middle of a chain. Generators must be first. |
| **S006** | Missing write() | Add \`.write(o0)\` at end of chain |

### PARAMETER NAMES - USE analyze_effect TO DISCOVER

**Problem: "Starter chain missing write()"**
Fix: Add .write(o0): \`noise().write(o0)\`

**Problem: Using effect path instead of function name**
Fix: Use \`noise()\` not \`synth/noise()\`

**Problem: Using GLSL in DSL**
Fix: DSL is high-level: \`noise().write(o0)\` not \`vec2 uv = ...\`

### Parameter Syntax in DSL

**Named parameters:** \`noise(xScale: 50, ridges: true, seed: 42)\`
**Surface references:** \`read(o0)\`, \`read3d(vol0)\`, \`read3d(geo0)\`
**Enum values (unquoted):** \`colorMode: rgb\`, \`blendMode: multiply\`
`

/**
 * DSL Scaffolding Patterns - CRITICAL for correct effect wrapping
 */
export const DSL_SCAFFOLDING_PATTERNS = `## DSL Scaffolding Patterns

The DSL program structure depends on the effect type.

### Effect Type Detection

1. **STARTER (synth/*):** The effect needs no input.
2. **Has a tex: parameter:** The effect is a mixer and needs two inputs.
3. **3D effect:** The chain needs render3d() at the end.
4. **POINTS effect:** You MUST wrap the effect with pointsEmit/pointsRender.

### SCAFFOLDING: Starter (synth/)
\`\`\`
search synth
myEffect(param1: value).write(o0)
render(o0)
\`\`\`

### SCAFFOLDING: Filter (filter/)
\`\`\`
search synth, filter
noise(ridges: true).myFilter(param1: value).write(o0)
render(o0)
\`\`\`

### SCAFFOLDING: Mixer (mixer/)
\`\`\`
search synth, mixer
noise(seed: 1, ridges: true).write(o0)
gradient().myMixer(tex: read(o0), blend: 0.5).write(o1)
render(o1)
\`\`\`

### SCAFFOLDING: Points (points/) - CRITICAL
\`\`\`
search points, synth, render
noise().pointsEmit().myPointsEffect(param: 1.0).pointsRender().write(o0)
render(o0)
\`\`\`

### SCAFFOLDING: Loop (feedback)
\`\`\`
search synth, filter
noise(ridges: true).loopBegin(alpha: 95).warp().loopEnd().write(o0)
render(o0)
\`\`\`

### SCAFFOLDING: 3D Generator (synth3d/)
\`\`\`
search synth3d, filter3d, render
myEffect3d(volumeSize: x32).render3d().write(o0)
render(o0)
\`\`\`

### SCAFFOLDING: User-Created Effect (user/) - MOST COMMON
\`\`\`
search user
myCustomEffect().write(o0)
render(o0)
\`\`\`

ALL effects created with create_effect belong to the 'user' namespace.
The DSL MUST use 'search user' to find these effects.

### Search Directive by Namespace

| Namespace | Search Directive |
|-----------|------------------|
| **user** | **\`search user\`** (YOUR created effects!) |
| synth | \`search synth\` |
| filter | \`search synth, filter\` |
| mixer | \`search synth, mixer\` |
| points | \`search points, synth, render\` |
| synth3d | \`search synth3d, filter3d, render\` |

### CRITICAL RULES

1. ALWAYS wrap points effects with pointsEmit/pointsRender.
2. ALWAYS end 3D effect chains with render3d().
3. ALWAYS chain filters from a generator. Never use filters alone.
4. ALWAYS supply a tex: read(surface) parameter to mixers.
5. Always use noise() with ridges: true as the default starter.`

/**
 * DSL Grammar and Semantics Reference
 */
export const DSL_REFERENCE = `## Polymorphic DSL Grammar

Structure: \`SearchDirective Statement* RenderDirective\`

### Required Components

1. **SearchDirective** (first line): \`search <namespace1>, <namespace2>, ...\`
2. **Statements**: Effect chains ending with \`.write(surface)\`
3. **RenderDirective** (last line): \`render(o0)\`

### Namespaces

| Namespace | Type | Purpose |
|-----------|------|---------|
| synth | Starter | 2D generators |
| filter | Processor | 2D transforms |
| mixer | Combiner | Blend two sources |
| points | Simulation | Agent/particle behaviors |
| render | Utility | pointsEmit, pointsRender, loops |
| synth3d | Starter | 3D volumetric generators |
| filter3d | Processor | 3D volumetric transforms |

### Parameter Syntax

- Numbers: \`4.0\`, \`10\`, \`-0.5\`
- Texture reads: \`read(o0)\`, \`read3d(vol0)\`
- Enums: \`rainbow\`, \`multiply\`, \`circle\`

### Surface References

- \`o0\`-\`o7\`: 2D surfaces
- \`vol0\`-\`vol7\`: 3D volumes
- \`geo0\`-\`geo7\`: 3D geometry
- \`read(surface)\`: Read previous frame
- \`write(surface)\`: Write to surface

### CRITICAL RULES

1. Namespaces are NOT functions. NEVER call \`synth()\` or \`filter()\`
2. Every chain MUST end with \`.write(surface)\`
3. The search directive is MANDATORY on the first line.
4. render() is MANDATORY on the last line.
5. Use YOUR effect name from create_effect instead of a library name.`
