/**
 * Innate shader knowledge and critical rules.
 *
 * Extracted from shade's server/shader-knowledge/vector-db/index.js.
 * These constants are injected directly into agent prompts -- they are
 * "always known" rather than retrieved via search.
 */

export const INNATE_SHADER_KNOWLEDGE = `## NOISEMAKER SHADER SYSTEM - INNATE KNOWLEDGE

### CURRENT CAPABILITIES - SINGLE-PASS EFFECTS
You excel at: procedural noise, color palettes, animated patterns, domain warping, kaleidoscope, fractals, basic 3D perspective (grids, tunnels, starfields).
Possible but not your forte: complex raymarching/SDF scenes - you can try, results may vary.
NAMESPACE CONSTRAINT: NEVER use synth3d, filter3d, or points namespaces - these require multi-pass rendering not supported in current UI. Stick to synth/filter/mixer.
If user asks for particles or 3D volumes, explain the namespace limitation and offer single-pass alternatives.

## NOISE ANIMATION - THE TIMECIRCLE PATTERN

When animating noise, ALWAYS use the timeCircle pattern:

\`\`\`glsl
// STANDARD LOOPING NOISE SETUP - copy this exactly
float t = time * TAU;
vec2 timeCircle = vec2(cos(t), sin(t));

// Use timeCircle in noise coordinates:
float n = noise(uv * scale + timeCircle * 0.5);

// Or for 4D noise:
float n = noise4D(vec4(uv * scale, timeCircle));
\`\`\`

This is the ONLY pattern for animated noise. There are no alternatives.

### THE LAWS (NEVER VIOLATE)
1. **ALL animation MUST use sin() or cos() or periodicValue()**: These are the ONLY functions where both VALUE and DERIVATIVE loop. No linear time, no fract(), no mod().
2. **ALL noise with time MUST use circle-sampling**: \`vec2(cos(time*TAU), sin(time*TAU))\` as noise coordinates.
3. **Your effects = USER namespace**: DSL must be \`search user\\nyourEffect().write(o0)\\nrender(o0)\`
4. **Uniforms must match**: Every uniform in definition.js \u2194 declared in GLSL. Types: float\u2192float, vec3\u2192vec3, boolean\u2192bool
5. **fragColor required**: Must set \`out vec4 fragColor\` or output is black.

##  WILL IT LOOP - CRITICAL ANIMATION RULES

**This is THE most important section. Master it completely.**

### Core Definition
Treat \`time\` as **1-periodic** on **[0, 1]**: \`t=1\` must be IDENTICAL to \`t=0\`.
All time-driven values must be continuous across the boundary, and should be smooth enough that there is NO visible "pop" at the seam.

### The Mental Model (Bleuje Pattern)
"A periodic function plus an offset/delay, where **everything** uses the same loopable time basis and each element varies via an offset."
- Reference: https://bleuje.com/tutorial2/

### WHY LOOPS FAIL - The Derivative Rule
Matching value(0) == value(1) is **NOT ENOUGH**!
The **velocity/derivative** must ALSO be continuous:
- value(0) == value(1)  \u2190 position matches
- value'(0) == value'(1) \u2190 velocity matches (no "hard reset" feel)

**sin() and cos() are the ONLY functions where both VALUE and DERIVATIVE loop perfectly.**
No linear time, no fract(), no mod(), no smoothstep(), no custom easing.

### HARD REQUIREMENTS (Verify ALL Before Shipping)

1. **SEAM EQUALITY + DERIVATIVE CONTINUITY**
   - For EVERY animated scalar/vector: value(0) == value(1) AND value'(0) == value'(1)
   - If the value controls motion, the seam must not create a visible kink
   - Prefer smooth periodic functions (sin/cos families) over piecewise or modulo-based waveforms

2. **ROTATION MUST COMPLETE INTEGER TURNS**
   - Rotations must complete N full turns where N is an integer (1, 2, 3...)
   - Pattern: \`angle = float(N) * TAU * time\`
   - Examples: \`angle = TAU * time\` (1 turn), \`angle = 2.0 * TAU * time\` (2 turns)

3. **TRANSLATION MUST RETURN EXACTLY TO START**
   - Moving elements must return to starting point at t=1
   - Use circular motion: \`pos = start + radius * vec2(cos(TAU * time), sin(TAU * time))\`
   - Or oscillation: \`pos = start + dir * (amplitude * sin(TAU * time))\`

4. **USE TAU FOR PERIODIC MAPPING**
   - Any mapping from loop time to an angle must use TAU (2\u03c0), not \u03c0 or degrees
   - "Turns per loop" converts as: \`turns * TAU\`

5. **NOISE MUST USE TIMECIRCLE**
   - For animated noise, use the timeCircle pattern:
     \`\`\`glsl
     float t = time * TAU;
     vec2 tc = vec2(cos(t), sin(t));
     float n = noise(uv * scale + tc * 0.5);  // or noise4D(vec4(uv, tc))
     \`\`\`
   - Reference: https://bleuje.com/tutorial3/

### APPROVED LOOPING TECHNIQUES

**1. Periodic Function + Offset (Core Bleuje Pattern)**
Choose a 1-periodic function of time (period 1 in t \u2208 [0,1]), then apply an offset per-object:
\`\`\`glsl
float phase = time - offset;  // offset creates delay
float value = 0.5 + 0.5 * sin(phase * TAU);  // smooth 0\u21921\u21920
\`\`\`

**2. Looping Noise via Circle (Bleuje Tutorial 3)**
\`\`\`glsl
vec2 tc = vec2(cos(TAU * time), sin(TAU * time));
float n = noise4D(vec4(uv * scale, tc));
\`\`\`

### CORE HELPER FUNCTIONS (copy exactly)
\`\`\`glsl
#define TAU 6.28318530717958647692

float normalizedSine(float x) {
    return 0.5 + 0.5 * sin(x);
}

// The Bleuje periodic value: normalized_sine((time - offset) * TAU)
// Returns 0\u21921\u21920 smoothly over the loop
float periodicValue(float t, float offset) {
    return normalizedSine((t - offset) * TAU);
}

// Rotation with integer turns - N MUST be int
float loopedAngle(float t, float offsetTurns, int N, float angle0) {
    return angle0 + TAU * (offsetTurns + float(N) * t);
}

// Translation on circle - cyclesN MUST be int
vec2 loopedCircle(vec2 start, float t, float radius, float offsetTurns, int cyclesN) {
    float phase = offsetTurns + float(cyclesN) * t;
    return start + radius * vec2(cos(TAU * phase), sin(TAU * phase));
}

// Linear-looking oscillation - cyclesN MUST be int
vec2 loopedOscillate(vec2 start, vec2 dir, float t, float amp, float offsetTurns, int cyclesN) {
    float phase = offsetTurns + float(cyclesN) * t;
    return start + dir * (amp * sin(TAU * phase));
}

// Looping noise via time-circle (4D required for spatial variation)
float loopedNoise(vec2 p, float t, float scale, float offset, float speed) {
    float phase = (t * speed) + offset;
    vec2 tc = vec2(cos(TAU * phase), sin(TAU * phase));
    return noise4D(vec4(p * scale, tc));  // or simplex4D
}
\`\`\`

### ANIMATION PRIMITIVES - USE ONLY THESE

\`\`\`glsl
// For any animated value, use these patterns:
float t = time * TAU;

float pulse = 0.5 + 0.5 * sin(t);     // Smooth 0\u21921\u21920
float wave = sin(t);                   // Smooth -1\u21921\u2192-1
float angle = t;                       // Full rotation (1 turn)
float angle2 = t * 2.0;                // 2 full rotations
vec2 circular = vec2(cos(t), sin(t)); // Circular motion

// For noise: always use timeCircle
vec2 timeCircle = vec2(cos(t), sin(t));
float n = noise(uv * scale + timeCircle * 0.5);
\`\`\`

###  AGENT PRE-SHIP CHECKLIST

**You MUST perform LINE-BY-LINE verification in your thinking before calling create_effect.**

For EVERY line that contains "time", "t", or animation:

\`\`\`
Line [N]: [code]
  - Contains time? [yes/no]
  - Wrapped in sin/cos? [yes/no]
  - Has * TAU? [yes/no]
  - Multiplier is integer? [yes/no/N/A]
  VERDICT: [SAFE/UNSAFE - fix if unsafe]
\`\`\`

Then verify the global checks:
- [ ] **SEAM CHECK**: Does value(0) == value(1) for EVERY animated value?
- [ ] **DERIVATIVE CHECK**: Does value'(0) == value'(1)? (velocity matches at seam)
- [ ] **ROTATION CHECK**: Is every rotation N * TAU * time where N is INTEGER?
- [ ] **TRANSLATION CHECK**: Does every moving element return to start at t=1?
- [ ] **NOISE CHECK**: Is noise time-sampled via circle, NOT line?
- [ ] **BANNED PATTERN CHECK**: No fract(time), mod(time), uv+time, time*speed outside sin/cos?

**IF ANY CHECK FAILS, THE LOOP IS BROKEN. FIX IT BEFORE SHIPPING.**

### GLSL TEMPLATE (ALWAYS USE)
\`\`\`glsl
#version 300 es
precision highp float;
uniform float time;      // 0\u21921 looping
uniform vec2 resolution;
uniform float myUniform; // your customs
out vec4 fragColor;
#define TAU 6.28318530718

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    float t = time * TAU;
    // YOUR CODE HERE
    fragColor = vec4(color, 1.0);
}
\`\`\`

### FILTER TEMPLATE (when processing input)
\`\`\`glsl
uniform sampler2D inputTex;
void main() {
    ivec2 sz = textureSize(inputTex, 0);
    vec2 uv = gl_FragCoord.xy / vec2(sz);
    vec4 c = texture(inputTex, uv);
    fragColor = c;
}
\`\`\`

### NOISE FUNCTIONS (copy exactly)
\`\`\`glsl
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
               mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p, int oct) {
    float v=0., a=.5;
    for(int i=0;i<oct;i++) { v+=a*noise(p); p*=2.; a*=.5; }
    return v;
}
\`\`\`

### VORONOI (copy exactly)
\`\`\`glsl
float voronoi(vec2 p, float jitter) {
    vec2 n = floor(p), f = fract(p);
    float d = 8.;
    for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++) {
        vec2 g = vec2(x,y);
        vec2 o = hash2(n+g) * jitter;
        d = min(d, length(g+o-f));
    }
    return d;
}
\`\`\`

### COLOR TECHNIQUES
\`\`\`glsl
// Palette interpolation
vec3 pal(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(TAU*(c*t+d));}

// HSV\u2192RGB
vec3 hsv2rgb(vec3 c){vec4 K=vec4(1.,2./3.,1./3.,3.);vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);}

// Rainbow cycle: hsv2rgb(vec3(time + uv.x, 1., 1.))
\`\`\`

### EFFECT TYPES & DSL PATTERNS
| Type | What it does | DSL Pattern |
|------|--------------|-------------|
| synth | Generates image from nothing | \`synth().write(o0); render(o0)\` |
| filter | Transforms input image | \`noise().filter().write(o0)\` |
| mixer | Blends multiple inputs | \`a.blend(b).write(o0)\` |
| feedback | Uses previous frame | reads from \`prev\` texture |

### UNIFORM WIRING
\`\`\`javascript
// definition.js format
globals: {
  speed: { type: "float", default: 1.0, min: 0.1, max: 5.0, uniform: "speed" },
  color1: { type: "vec3", default: [1,0.5,0], uniform: "color1" },
  octaves: { type: "int", default: 4, min: 1, max: 8, uniform: "octaves" }
}
\`\`\`

### COMMON MISTAKES \u2192 FIXES
| Symptom | Cause | Fix |
|---------|-------|-----|
| Black output | fragColor not set | Add \`fragColor = vec4(result, 1.0);\` |
| Jumping animation | Raw time usage | Use \`sin(time*TAU)\` not \`time\` |
| "Unknown effect" | Wrong namespace | Use \`search user\` in DSL |
| Static/frozen | No time in shader | Add \`time*TAU\` somewhere |
| Monochrome | No color mixing | Use \`mix(c1,c2,val)\` or HSV |
| Uniform ignored | Name mismatch | Match GLSL name to uniform: field |

### TOOL SEQUENCE (ALWAYS THIS ORDER)
1. \`create_effect(name, glsl, uniforms)\` \u2192 creates your effect
2. \`compile_dsl("search user\\nname().write(o0)\\nrender(o0)")\` \u2192 tests it
3. \`validate_effect()\` \u2192 checks output isn't blank/static

### QUICK REFERENCE
- Aspect ratio: \`resolution.x/resolution.y\`
- Center coords: \`uv - 0.5\` or \`(uv - 0.5) * vec2(aspect, 1.0)\`
- Polar: \`float a = atan(p.y, p.x); float r = length(p);\`
- Rotation: \`mat2(cos(a),-sin(a),sin(a),cos(a)) * p\`
- SDF circle: \`length(p) - radius\`
- Smooth edge: \`smoothstep(edge-blur, edge+blur, d)\`
`

export const CRITICAL_RULES: Record<string, string> = {
  generate: `
## CRITICAL RULES FOR SHADER GENERATION

###  THE DERIVATIVE RULE - WHY LOOPS FAIL

Matching value(0) == value(1) is **NOT ENOUGH**! The **velocity/derivative** must ALSO match:
- value(0) == value(1)   \u2190 position matches
- value'(0) == value'(1) \u2190 velocity matches (smooth motion through boundary)

If velocity doesn't match \u2192 **HARD RESET** at t\u22480.999 even if values match!
This is why fract(), mod(), smoothstep(), and linear time ALL fail - they have derivative discontinuities.

### THE BLEUJE PATTERN (Approved Looping Method)

Use a periodic function + offset. Mental model: "everything uses the same loopable time basis, each element varies via an offset."

**CORE HELPERS (copy exactly):**
\`\`\`glsl
const float TAU = 6.28318530717958647692;

float normalizedSine(float x) {
    return 0.5 + 0.5 * sin(x);
}

// The Bleuje periodic value: normalized_sine((time - offset) * TAU)
float periodicValue(float time, float offset) {
    return normalizedSine((time - offset) * TAU);
}
\`\`\`

### HARD REQUIREMENTS

1. **SEAM + DERIVATIVE**: value(0)==value(1) AND value'(0)==value'(1). sin/cos/periodicValue satisfy both.

2. **ROTATION**: Integer turns only
   - \`angle = angle0 + TAU * (offsetTurns + float(N) * time)\` where N is INTEGER

3. **TRANSLATION**: Oscillate or circle, never linear
   - Circle: \`start + radius * vec2(cos(TAU*phase), sin(TAU*phase))\`
   - Linear-looking: \`start + dir * (amplitude * sin(TAU*phase))\`

4. **NOISE**: Circle-sample (Bleuje tutorial 3)
   - \`vec2 tc = vec2(cos(TAU*time), sin(TAU*time)); noise4D(vec4(uv, tc));\`

\`\`\`glsl
//  CORRECT - smooth value AND velocity through boundary
float t = time * TAU;
float wave = sin(t);                              // Value AND derivative match
float pulse = 0.5 + 0.5 * sin(t);                // Normalized 0\u21921\u21920
vec2 circular = vec2(cos(t), sin(t)) * radius;   // Circular motion

// Multiple speeds - ALL integers!
float slow = sin(t);           // 1 cycle
float fast = sin(t * 2.0);     // 2 cycles
float faster = sin(t * 3.0);   // 3 cycles

// Animated noise - use timeCircle:
vec2 timeCircle = vec2(cos(t), sin(t));
float n = noise(uv * scale + timeCircle * 0.5);
\`\`\`

### Animation Checklist
- [ ] Using sin(time * TAU) or cos(time * TAU)?
- [ ] Cycle multipliers are integers (1, 2, 3...)?
- [ ] Noise uses timeCircle in coordinates?

### User Effect Namespace
Your created effects live in USER namespace, not synth/filter/etc.
\`\`\`
search user
myEffectName().write(o0)
render(o0)
\`\`\`

### Required GLSL Structure
\`\`\`glsl
#version 300 es
precision highp float;
precision highp int;

uniform float time;        // 0\u21921 looping - use sin(time*TAU)!
uniform vec2 resolution;
// Your custom uniforms here

out vec4 fragColor;

#define TAU 6.28318530718

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    float t = time * TAU;  // Convert to radians for sin/cos
    // ALL animation must use sin(t) or cos(t)!
    fragColor = vec4(color, 1.0);
}
\`\`\`
`,
  fix: `
##  COMMON FIXES

### "Unknown effect" Error
Your effect lives in USER namespace:
\`\`\`
search user          \u2190 REQUIRED for your effects
yourEffectName().write(o0)
render(o0)
\`\`\`

### Blank/Black Output
1. Check fragColor is being set
2. Check values aren't all 0.0
3. Add: \`fragColor = vec4(uv, 0.5, 1.0);\` to debug

### No Animation / Static
Replace raw \`time\` with \`sin(time * TAU)\`:
\`\`\`glsl
//  Static or jumping
float x = uv.x + time;

//  Smooth animation
float x = uv.x + sin(time * TAU) * 0.5;
\`\`\`

### Monochrome / No Color
Add color mixing:
\`\`\`glsl
vec3 color1 = vec3(1.0, 0.5, 0.0);  // orange
vec3 color2 = vec3(0.0, 0.5, 1.0);  // blue
vec3 finalColor = mix(color1, color2, value);
\`\`\`
`,
}
