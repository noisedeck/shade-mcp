import { describe, it, expect } from 'vitest'
import { ShaderKnowledgeDB } from '../knowledge/vector-db.js'

describe('ShaderKnowledgeDB', () => {
  it('indexes and searches documents', () => {
    const db = new ShaderKnowledgeDB()
    db.addDocuments([
      { id: '1', title: 'Voronoi Noise', content: 'Voronoi noise creates cellular patterns using distance fields', category: 'technique' },
      { id: '2', title: 'Perlin Noise', content: 'Perlin noise generates smooth gradient noise', category: 'technique' },
      { id: '3', title: 'DSL Basics', content: 'The DSL uses function chaining with write and render', category: 'dsl' },
    ])
    db.buildIndex()

    const results = db.search('cellular noise patterns')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('1')
  })

  it('filters by category', () => {
    const db = new ShaderKnowledgeDB()
    db.addDocuments([
      { id: '1', title: 'Voronoi', content: 'cellular noise', category: 'technique' },
      { id: '2', title: 'DSL', content: 'DSL noise function', category: 'dsl' },
    ])
    db.buildIndex()

    const results = db.search('noise', { category: 'dsl' })
    expect(results.every(r => r.category === 'dsl')).toBe(true)
  })

  it('returns empty for no matches', () => {
    const db = new ShaderKnowledgeDB()
    db.addDocuments([
      { id: '1', title: 'Test', content: 'shader effect', category: 'test' },
    ])
    db.buildIndex()

    const results = db.search('completely unrelated query about databases')
    expect(results.length).toBe(0)
  })

  it('extracts relevant snippets', () => {
    const db = new ShaderKnowledgeDB()
    db.addDocuments([
      { id: '1', title: 'Voronoi Guide', content: 'Voronoi noise creates beautiful cellular patterns using distance fields to nearest seed points.', category: 'technique' },
      { id: '2', title: 'Other', content: 'Something completely different about color grading.', category: 'technique' },
    ])
    db.buildIndex()

    const results = db.search('voronoi cellular', { minScore: 0.01 })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].snippet).toContain('Voronoi')
  })

  it('reports stats correctly', () => {
    const db = new ShaderKnowledgeDB()
    db.addDocuments([
      { id: '1', title: 'A', content: 'content', category: 'cat1' },
      { id: '2', title: 'B', content: 'content', category: 'cat2' },
    ])

    const stats = db.getStats()
    expect(stats.totalDocuments).toBe(2)
    expect(stats.categories).toContain('cat1')
    expect(stats.categories).toContain('cat2')
  })
})
