import { describe, it, expect } from 'vitest'
import {
  // Classes
  ShaderKnowledgeDB,
  // Search functions
  searchShaderKnowledge,
  getShaderKnowledgeDB,
  getKnowledgeByTopic,
  retrieveForAgent,
  // Loop examples
  retrieveLoopSafeExamples,
  // Query utilities
  expandQueryWithSynonyms,
  CURATED_KNOWLEDGE,
  // Innate knowledge
  INNATE_SHADER_KNOWLEDGE,
  CRITICAL_RULES,
  // Content modules
  DSL_CRITICAL_RULES,
  DSL_SCAFFOLDING_PATTERNS,
  DSL_REFERENCE,
  EFFECT_CATALOG,
  EFFECT_DEFINITION_REFERENCE,
  EFFECT_DEFINITION_DEEP,
  EFFECT_ANATOMY_KNOWLEDGE,
  REQUIRED_PATTERNS,
  GLSL_REFERENCE,
  GLSL_RECIPES,
  AGENT_WORKFLOW_KNOWLEDGE,
  COMPACT_SHADER_KNOWLEDGE,
  // FSM bundles
  RESEARCH_KNOWLEDGE,
  PLAN_KNOWLEDGE,
  GENERATE_KNOWLEDGE,
  VALIDATE_KNOWLEDGE,
  FIX_KNOWLEDGE,
  FULL_SHADER_KNOWLEDGE,
} from '../knowledge/index.js'

describe('knowledge barrel export', () => {
  it('exports all content modules as non-empty strings', () => {
    const modules = {
      DSL_CRITICAL_RULES,
      DSL_SCAFFOLDING_PATTERNS,
      DSL_REFERENCE,
      EFFECT_CATALOG,
      EFFECT_DEFINITION_REFERENCE,
      EFFECT_DEFINITION_DEEP,
      EFFECT_ANATOMY_KNOWLEDGE,
      REQUIRED_PATTERNS,
      GLSL_REFERENCE,
      GLSL_RECIPES,
      AGENT_WORKFLOW_KNOWLEDGE,
      COMPACT_SHADER_KNOWLEDGE,
    }
    for (const [name, value] of Object.entries(modules)) {
      expect(typeof value, `${name} should be a string`).toBe('string')
      expect(value.length, `${name} should be non-empty`).toBeGreaterThan(100)
    }
  })

  it('exports FSM state bundles as non-empty strings', () => {
    const bundles = {
      RESEARCH_KNOWLEDGE,
      PLAN_KNOWLEDGE,
      GENERATE_KNOWLEDGE,
      VALIDATE_KNOWLEDGE,
      FIX_KNOWLEDGE,
      FULL_SHADER_KNOWLEDGE,
    }
    for (const [name, value] of Object.entries(bundles)) {
      expect(typeof value, `${name} should be a string`).toBe('string')
      expect(value.length, `${name} should be non-empty`).toBeGreaterThan(100)
    }
  })

  it('GENERATE_KNOWLEDGE contains GLSL content', () => {
    expect(GENERATE_KNOWLEDGE).toContain('GLSL')
    expect(GENERATE_KNOWLEDGE).toContain('fragColor')
    expect(GENERATE_KNOWLEDGE).toContain('WILL IT LOOP')
  })

  it('PLAN_KNOWLEDGE contains DSL content', () => {
    expect(PLAN_KNOWLEDGE).toContain('DSL')
    expect(PLAN_KNOWLEDGE).toContain('search')
  })

  it('RESEARCH_KNOWLEDGE contains effect catalog', () => {
    expect(RESEARCH_KNOWLEDGE).toContain('Effect Catalog')
  })

  it('exports INNATE_SHADER_KNOWLEDGE and CRITICAL_RULES', () => {
    expect(INNATE_SHADER_KNOWLEDGE).toContain('NOISEMAKER SHADER SYSTEM')
    expect(CRITICAL_RULES.generate).toContain('DERIVATIVE RULE')
    expect(CRITICAL_RULES.fix).toContain('COMMON FIXES')
  })
})

describe('search functions', () => {
  it('searchShaderKnowledge returns results for noise query', () => {
    const results = searchShaderKnowledge('noise')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].score).toBeGreaterThan(0)
  })

  it('getShaderKnowledgeDB returns initialized DB', () => {
    const db = getShaderKnowledgeDB()
    const stats = db.getStats()
    expect(stats.totalDocuments).toBeGreaterThan(0)
    expect(stats.indexed).toBe(true)
  })

  it('retrieveForAgent returns content with critical rules', () => {
    const result = retrieveForAgent('noise animation', 'generate')
    expect(result).toContain('DERIVATIVE RULE')
  })

  it('expandQueryWithSynonyms expands known techniques', () => {
    const expanded = expandQueryWithSynonyms('voronoi')
    expect(expanded).toContain('cellular')
    expect(expanded).toContain('worley')
  })
})

describe('loop-safe examples', () => {
  it('retrieveLoopSafeExamples returns formatted GLSL', () => {
    const result = retrieveLoopSafeExamples()
    expect(result).toContain('LOOPING SHADER EXAMPLES')
    expect(result).toContain('#version 300 es')
  })

  it('retrieveLoopSafeExamples filters by technique', () => {
    const result = retrieveLoopSafeExamples('noise')
    expect(result).toContain('noise')
  })
})
