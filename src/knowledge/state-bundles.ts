/**
 * FSM State-Specific Knowledge Bundles
 *
 * Each bundle contains ONLY what that state needs to be an expert.
 * Composed from the content modules via template literal interpolation.
 *
 * Ported from shade's server/shader-knowledge/index.js (lines 57-370)
 */

import { DSL_CRITICAL_RULES, DSL_SCAFFOLDING_PATTERNS, DSL_REFERENCE } from './dsl-knowledge.js'
import { EFFECT_CATALOG } from './effect-catalog.js'
import {
  EFFECT_DEFINITION_REFERENCE,
  EFFECT_DEFINITION_DEEP,
  EFFECT_ANATOMY_KNOWLEDGE,
  REQUIRED_PATTERNS,
} from './effect-definition.js'
import { GLSL_REFERENCE, GLSL_RECIPES } from './glsl-reference.js'
import { AGENT_WORKFLOW_KNOWLEDGE, COMPACT_SHADER_KNOWLEDGE } from './workflow-knowledge.js'

// ═══════════════════════════════════════════════════════════════════════════
// FSM STATE-SPECIFIC KNOWLEDGE BUNDLES
// Each bundle contains ONLY what that state needs to be an expert
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RESEARCH state knowledge
 * Expert in: Finding templates, understanding effect capabilities
 * Uses: Effect catalog, search/analyze tools, search_shader_knowledge for docs
 */
export const RESEARCH_KNOWLEDGE = `
## RESEARCH PHASE EXPERTISE
You are finding templates and understanding what effects can do.

**USE search_shader_knowledge** when you need to understand DSL syntax, effect patterns, or GLSL techniques.
Query: "how to structure a filter effect", "noise function patterns", etc.

${EFFECT_CATALOG}

${COMPACT_SHADER_KNOWLEDGE}
`

/**
 * PLAN state knowledge
 * Expert in: DSL language, Effect Definition format, prescribing uniforms
 * Creates: definition.js structure, shader directives for GENERATE
 */
export const PLAN_KNOWLEDGE = `
## PLAN PHASE EXPERTISE
You create the effect specification. You are an expert in DSL and Effect Definition format.
You do NOT write GLSL shader code - you prescribe what the GENERATE phase should implement.

${DSL_CRITICAL_RULES}

${DSL_SCAFFOLDING_PATTERNS}

${DSL_REFERENCE}

${EFFECT_DEFINITION_REFERENCE}

${EFFECT_DEFINITION_DEEP}

### Your Output: Effect Specification JSON
{
  "effectName": "camelCaseName",
  "namespace": "synth|filter|points|render|mixer",
  "templateEffectId": "namespace/effectName or null",
  "definitionSpec": {
    "globals": { /* uniform definitions */ }
  },
  "shaderDirectives": {
    "technique": "noise|fractal|voronoi|geometric|flow",
    "colorStrategy": "palette|hsv-rotation|grayscale",
    "animationApproach": "What moves and how",
    "uniformUsage": { "uniformName": "How to use in shader" }
  },
  "dslProgram": "search namespace\\neffectName().write(o0)\\nrender(o0)"
}
`

/**
 * GENERATE state knowledge
 * Expert in: GLSL shader syntax, uniform wiring, shader algorithms
 * Creates: Actual .glsl shader code, wires uniforms correctly
 */
export const GENERATE_KNOWLEDGE = `
## GENERATE PHASE EXPERTISE
You implement the shader code. You are an expert in GLSL and uniform wiring.
You follow the specification from the PLAN phase exactly.

${GLSL_REFERENCE}

${GLSL_RECIPES}

${REQUIRED_PATTERNS}

### Uniform Wiring Rules
1. Every uniform in definition.js MUST be declared in GLSL
2. Types must match: float\u2192float, int\u2192int, boolean\u2192bool, vec2\u2192vec2, vec3\u2192vec3, vec4\u2192vec4
3. Standard uniforms (always available): time, resolution
4. For filters: uniform sampler2D inputTex;

## \u{1F6D1}\u{1F6D1}\u{1F6D1} NOISE LOOPING - READ BEFORE CODING \u{1F6D1}\u{1F6D1}\u{1F6D1}

**For animated noise, ALWAYS use the timeCircle pattern.**

### ANIMATED NOISE PATTERN (use this exactly):
\`\`\`glsl
float t = time * TAU;
vec2 timeCircle = vec2(cos(t), sin(t));
float n = noise(uv * scale + timeCircle * 0.5);
\`\`\`

This is the only pattern for animated noise. There are no alternatives.

###  SEAMLESS LOOPING - HARD REQUIREMENTS

**Time is 1-periodic on [0,1]. The loop must be INVISIBLE - no pop, no stutter, no hard reset.**

**THE DERIVATIVE RULE (WHY LOOPS FAIL):**
Matching value(0) == value(1) is NOT ENOUGH! The **velocity/derivative** must ALSO match:
- value(0) == value(1)  \u2190 position matches
- value'(0) == value'(1) \u2190 velocity matches (smooth motion through boundary)

If velocity doesn't match, you get a "hard reset" feel at t\u22480.999 even though values match.
This is why fract(), mod(), smoothstep(), and linear time ALL fail - they have derivative discontinuities.

**THE BLEUJE PATTERN (Approved Looping Method):**
Use a periodic function + offset. The mental model: "everything uses the same loopable time basis, each element varies via an offset."

\`\`\`glsl
// Core looping helpers - COPY THESE EXACTLY
const float TAU = 6.28318530717958647692;

float normalizedSine(float x) {
    return 0.5 + 0.5 * sin(x);
}

// The Bleuje periodic value pattern: normalized_sine((time - offset) * TAU)
float periodicValue(float time, float offset) {
    return normalizedSine((time - offset) * TAU);
}
\`\`\`

**HARD REQUIREMENTS - VERIFY BEFORE SHIPPING:**

1. **SEAM EQUALITY + DERIVATIVE CONTINUITY**
   - value(0) == value(1) AND value'(0) == value'(1)
   - sin() and cos() satisfy BOTH conditions

2. **ROTATION**: \`angle = float(N) * TAU * time\` where N is integer (1, 2, 3...)

3. **TRANSLATION**: Use circular or oscillating motion
   - Circular: \`pos = start + radius * vec2(cos(TAU * time), sin(TAU * time))\`
   - Oscillation: \`pos = start + dir * (amplitude * sin(TAU * time))\`

4. **NOISE**: Use timeCircle pattern
   - \`vec2 tc = vec2(cos(TAU*time), sin(TAU*time)); noise(uv + tc*0.5);\`

**APPROVED HELPER FUNCTIONS (copy exactly):**
\`\`\`glsl
// Rotation: N MUST be integer
float loopedAngle(float time, float offsetTurns, int rotationsN, float angle0) {
    return angle0 + TAU * (offsetTurns + float(rotationsN) * time);
}

// Translation on circle: cyclesN MUST be integer
vec2 loopedTranslateCircle(vec2 start, float time, float radius, float offsetTurns, int cyclesN) {
    float phase = offsetTurns + float(cyclesN) * time;
    return start + radius * vec2(cos(TAU * phase), sin(TAU * phase));
}

// Linear-looking motion that loops (sine oscillation): cyclesN MUST be integer
vec2 loopedTranslateLine(vec2 start, vec2 dirUnit, float time, float amplitude, float offsetTurns, int cyclesN) {
    float phase = offsetTurns + float(cyclesN) * time;
    float d = sin(TAU * phase);  // smooth, returns to 0 at t=0 and t=1
    return start + dirUnit * (amplitude * d);
}

// Looping noise via time-circle (4D simplex)
float loopedNoise4D(vec2 p, float time, float spatialScale, float offsetTurns, float speedTurns) {
    float phase = (time * speedTurns) + offsetTurns;
    vec2 tc = vec2(cos(TAU * phase), sin(TAU * phase));
    return simplexNoise4D(vec4(p * spatialScale, tc));
}

// Stable hash for seeded offsets
uint hash_u32(uint x) {
    x ^= x >> 16u; x *= 0x7FEB352Du;
    x ^= x >> 15u; x *= 0x846CA68Bu;
    x ^= x >> 16u; return x;
}
float hash01(uint x) { return float(hash_u32(x) & 0x00FFFFFFu) / float(0x01000000u); }

// Looped scalar with noise-driven offset (full Bleuje pattern)
float loopedScalar(float time, float speed, uint baseSeed, float valueNoise) {
    uint timeSeed = baseSeed + 0x9E3779B1u;
    float timeNoise = hash01(timeSeed);
    float scaledTime = periodicValue(time, timeNoise) * speed;
    return periodicValue(scaledTime, valueNoise);
}
\`\`\`

**Animation primitives (use these for all animation):**
\`\`\`glsl
float t = time * TAU;
float pulse = 0.5 + 0.5 * sin(t);        // Smooth 0\u21921\u21920
float wave = sin(t);                      // Smooth -1\u21921\u2192-1
float angle = t * 2.0;                    // 2 full rotations
vec2 timeCircle = vec2(cos(t), sin(t));  // For noise animation
float n = noise(uv * scale + timeCircle * 0.5);  // Animated noise
\`\`\`

##  WILL IT LOOP - MANDATORY VERIFICATION

**Treat time as 1-periodic on [0,1]: t=1 must be IDENTICAL to t=0**
**All time-driven values must be continuous across the boundary with no visible "pop" at the seam.**

### Core Principle: Periodic Function + Offset
The approved mental model (from \u00c9tienne Jacob aka Bleuje):
- "A periodic function plus an offset/delay, where everything uses the same loopable time basis and each element varies via an offset."

### Hard Requirements (VERIFY ALL BEFORE SHIPPING):

1. **SEAM EQUALITY + DERIVATIVE CONTINUITY**
   - For EVERY animated scalar/vector: value(0) == value(1)
   - The seam must be smooth: use periodic functions (sin/cos families)
   - Use sin() or cos() for all time-based animation

2. **ROTATION = INTEGER TURNS**
   - Canonical form: \`angle(t) = angle0 + (offset * TAU) + (N * TAU * time)\`
   - N MUST be an INTEGER (1, 2, 3). Complete turns only.

3. **TRANSLATION = CLOSED LOOP**
   - Must return to EXACT starting point at t=1
   - Circle path: \`pos = start + radius * vec2(cos(TAU * phase), sin(TAU * phase))\`
   - Oscillation: \`pos = start + dir * (amplitude * sin(TAU * phase))\`

4. **NOISE = CIRCLE-SAMPLED (Bleuje Tutorial 3)**
   - Map time to a circle, sample noise at that point:
   \`\`\`glsl
   vec2 tc = vec2(cos(TAU * time), sin(TAU * time));
   float n = noise4D(vec4(uv * scale, tc));
   \`\`\`
   - For spatially-varying looping noise, use 4D noise (2 dims for time-circle, 2 for space)

### PRE-SHIP CHECKLIST (MANDATORY):
- [ ] Is ALL time-based animation using sin(), cos(), or periodicValue()?
- [ ] Are ALL cycle/rotation counts INTEGERS? (1, 2, 3)
- [ ] Is noise sampled on a time-circle?
- [ ] Does the derivative (velocity) also loop? (sin/cos guarantee this)
- [ ] Have you verified value(0) == value(1) for EVERY animated channel?
`

/**
 * VALIDATE state knowledge
 * Expert in: Package validation, uniform consistency, DSL correctness
 * Packaging manager role - ensures everything is wired correctly
 */
export const VALIDATE_KNOWLEDGE = `
## VALIDATE PHASE EXPERTISE
You verify the effect package is complete and correct.

### Validation Checklist
1. All uniforms in definition.js are declared in GLSL
2. All uniforms in GLSL exist in definition.js globals
3. DSL program uses correct scaffolding pattern for effect type
4. Animation uses sin(time*TAU) or cos(time*TAU), never raw time
5. Filter effects chain from a generator
6. Mixer effects have tex: read(surface) parameter
`

/**
 * FIX states knowledge (DIAGNOSE, RESEARCH_FIX, PLAN_FIX, APPLY_FIX)
 * Expert in: Diagnosing issues, applying targeted fixes
 */
export const FIX_KNOWLEDGE = `
## FIX PHASE EXPERTISE
You diagnose and fix specific issues. Focus on the problem, don't rebuild from scratch.

### CRITICAL: "Unknown effect" Error

If you see "Unknown effect: '<name>'" in compile_dsl error:

1. **Did create_effect succeed?** Check the previous tool result.
2. **Is the DSL using 'search user'?** Your effect is in USER namespace!
3. **Is the name EXACT?** Case-sensitive, character-for-character match.

FIX: Ensure your DSL looks like:
\`\`\`
search user
yourEffectName().write(o0)
render(o0)
\`\`\`

### Common Issues and Fixes
- **Unknown effect**: Check DSL has "search user" and name matches create_effect
- isMonochrome: Add color with mix(color1, color2, value) or HSV rotation
- isStatic: Add animation with sin(time * TAU) or cos(time * TAU)
- uniformMismatch: Ensure GLSL declares all definition.js uniforms
- compilationError: Fix GLSL syntax errors

${REQUIRED_PATTERNS}

### Fix Guidelines
- Modify ONLY what's broken
- Don't restructure working code
- Test after each fix with validate_effect
`

// ═══════════════════════════════════════════════════════════════════════════

/**
 * Full knowledge base - USE SPARINGLY
 * Only for edge cases requiring complete context
 */
export const FULL_SHADER_KNOWLEDGE = `
${AGENT_WORKFLOW_KNOWLEDGE}

${DSL_CRITICAL_RULES}

${DSL_SCAFFOLDING_PATTERNS}

${DSL_REFERENCE}

${EFFECT_CATALOG}

${EFFECT_DEFINITION_REFERENCE}

${EFFECT_DEFINITION_DEEP}

${GLSL_REFERENCE}

${GLSL_RECIPES}

${EFFECT_ANATOMY_KNOWLEDGE}

${REQUIRED_PATTERNS}
`
