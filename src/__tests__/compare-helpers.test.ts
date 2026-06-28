import { describe, it, expect } from 'vitest'
import { extractUniforms, extractFunctionNames, stripComments } from '../tools/analysis/compare.js'

describe('extractUniforms', () => {
  it('extracts GLSL uniform names', () => {
    const src = 'uniform float u_speed;\nuniform vec3 u_color;'
    expect(extractUniforms(src, 'glsl')).toEqual(['u_speed', 'u_color'])
  })

  it('extracts WGSL uniform names', () => {
    const src = '@group(0) @binding(0) var<uniform> realUniform: f32;'
    expect(extractUniforms(src, 'wgsl')).toEqual(['realUniform'])
  })

  it('ignores WGSL uniforms inside line comments (parity with GLSL)', () => {
    const src = [
      '// @group(1) @binding(1) var<uniform> fakeUniform: f32;',
      '@group(0) @binding(0) var<uniform> realUniform: f32;',
    ].join('\n')
    expect(extractUniforms(src, 'wgsl')).toEqual(['realUniform'])
  })

  it('ignores WGSL uniforms inside block comments (parity with GLSL)', () => {
    const src = [
      '/* @group(2) @binding(2) var<uniform> blockFake: f32; */',
      '@group(0) @binding(0) var<uniform> realUniform: f32;',
    ].join('\n')
    expect(extractUniforms(src, 'wgsl')).toEqual(['realUniform'])
  })

  it('ignores GLSL uniforms inside comments (existing behavior)', () => {
    const src = [
      '// uniform float commentedOut;',
      'uniform float u_real;',
    ].join('\n')
    expect(extractUniforms(src, 'glsl')).toEqual(['u_real'])
  })
})

describe('extractFunctionNames', () => {
  it('extracts GLSL functions with basic return types (existing behavior)', () => {
    const src = 'float foo() {}\nvec3 bar(vec2 p) {}\nvoid baz() {}'
    expect(extractFunctionNames(src, 'glsl')).toEqual(['foo', 'bar', 'baz'])
  })

  it('extracts GLSL functions with integer/sampler/extended return types', () => {
    const src = [
      'uint hash(uint x) { return x; }',
      'uvec2 pair() { return uvec2(0u); }',
      'ivec3 grid() {}',
      'bvec2 mask() {}',
      'sampler2D pick() {}',
      'mat3x4 build() {}',
    ].join('\n')
    const fns = extractFunctionNames(src, 'glsl')
    expect(fns).toEqual(['hash', 'pair', 'grid', 'mask', 'pick', 'build'])
  })

  it('does not capture GLSL function calls or constructors as definitions', () => {
    const src = [
      'float useStuff() {',
      '  float v = clamp(texture(tex, uv).r, 0.0, 1.0);',
      '  return mix(v, dot(uv, uv), 0.5);',
      '}',
    ].join('\n')
    expect(extractFunctionNames(src, 'glsl')).toEqual(['useStuff'])
  })

  it('extracts WGSL functions', () => {
    const src = 'fn main() {}\nfn helper(x: f32) -> f32 { return x; }'
    expect(extractFunctionNames(src, 'wgsl')).toEqual(['main', 'helper'])
  })
})

describe('stripComments', () => {
  it('removes single-line and block comments', () => {
    const src = 'a // line\nb /* block */ c'
    expect(stripComments(src)).toBe('a \nb  c')
  })
})
