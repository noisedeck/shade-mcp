const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'and', 'but', 'or', 'if', 'it',
  'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'us',
  'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom',
])

export interface KnowledgeDocument {
  id: string
  title: string
  content: string
  category: string
  source?: string
  tags?: string[]
}

export interface SearchResult {
  id: string
  title: string
  content: string
  category: string
  score: number
  snippet: string
  source?: string
  tags?: string[]
}

export interface SearchOptions {
  limit?: number
  category?: string
  minScore?: number
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t))
}

function termFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const t of tokens) {
    freq.set(t, (freq.get(t) || 0) + 1)
  }
  const len = tokens.length || 1
  for (const [k, v] of freq) {
    freq.set(k, v / len)
  }
  return freq
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0
  for (const [k, v] of a) {
    dot += v * (b.get(k) || 0)
    normA += v * v
  }
  for (const [, v] of b) {
    normB += v * v
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export class ShaderKnowledgeDB {
  private documents = new Map<string, KnowledgeDocument>()
  private tfVectors = new Map<string, Map<string, number>>()
  private documentFrequency = new Map<string, number>()
  private totalDocuments = 0
  private indexBuilt = false

  addDocument(doc: KnowledgeDocument): void {
    this.documents.set(doc.id, doc)
    this.indexBuilt = false
  }

  addDocuments(docs: KnowledgeDocument[]): void {
    for (const doc of docs) {
      this.documents.set(doc.id, doc)
    }
    this.indexBuilt = false
  }

  buildIndex(): void {
    this.documentFrequency.clear()
    this.tfVectors.clear()
    this.totalDocuments = this.documents.size

    // Compute TF for each document
    for (const [id, doc] of this.documents) {
      const text = `${doc.title} ${doc.content} ${(doc.tags || []).join(' ')}`
      const tokens = tokenize(text)
      const tf = termFrequency(tokens)
      this.tfVectors.set(id, tf)

      // Update document frequency
      for (const term of tf.keys()) {
        this.documentFrequency.set(term, (this.documentFrequency.get(term) || 0) + 1)
      }
    }

    // Convert TF to TF-IDF
    for (const [id, tf] of this.tfVectors) {
      const tfidf = new Map<string, number>()
      for (const [term, tfVal] of tf) {
        const df = this.documentFrequency.get(term) || 0
        const idf = Math.log((this.totalDocuments + 1) / (df + 1)) + 1
        tfidf.set(term, tfVal * idf)
      }
      this.tfVectors.set(id, tfidf)
    }

    this.indexBuilt = true
  }

  search(query: string, options: SearchOptions = {}): SearchResult[] {
    if (!this.indexBuilt) this.buildIndex()

    const { limit = 10, category, minScore = 0.05 } = options

    // Build query vector
    const queryTokens = tokenize(query)
    const queryTf = termFrequency(queryTokens)
    const queryVec = new Map<string, number>()
    for (const [term, tfVal] of queryTf) {
      const df = this.documentFrequency.get(term) || 0
      const idf = Math.log((this.totalDocuments + 1) / (df + 1)) + 1
      queryVec.set(term, tfVal * idf)
    }

    // Score all documents
    const results: SearchResult[] = []
    for (const [id, docVec] of this.tfVectors) {
      const doc = this.documents.get(id)!
      if (category && doc.category !== category) continue

      const score = cosineSimilarity(queryVec, docVec)
      if (score >= minScore) {
        results.push({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          category: doc.category,
          score: Math.round(score * 1000) / 1000,
          snippet: this.extractSnippet(doc.content, queryTokens),
          source: doc.source,
          tags: doc.tags,
        })
      }
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit)
  }

  extractSnippet(content: string, queryTokens: string[], snippetLength = 200): string {
    const lower = content.toLowerCase()
    let bestStart = 0
    let bestScore = 0

    const words = content.split(/\s+/)
    for (let i = 0; i < words.length; i++) {
      let score = 0
      const windowEnd = Math.min(i + 30, words.length)
      for (let j = i; j < windowEnd; j++) {
        const w = words[j].toLowerCase().replace(/[^\w]/g, '')
        if (queryTokens.includes(w)) score++
      }
      if (score > bestScore) {
        bestScore = score
        bestStart = content.indexOf(words[i])
      }
    }

    const start = Math.max(0, bestStart)
    const end = Math.min(content.length, start + snippetLength)
    let snippet = content.slice(start, end).trim()
    if (start > 0) snippet = '...' + snippet
    if (end < content.length) snippet += '...'
    return snippet
  }

  getCategories(): string[] {
    const cats = new Set<string>()
    for (const doc of this.documents.values()) {
      cats.add(doc.category)
    }
    return Array.from(cats)
  }

  getByCategory(category: string): KnowledgeDocument[] {
    return Array.from(this.documents.values())
      .filter(doc => doc.category === category)
  }

  getStats(): { totalDocuments: number; totalTerms: number; indexed: boolean; categories: Record<string, number> } {
    const categoryCounts: Record<string, number> = {}
    for (const doc of this.documents.values()) {
      const cat = doc.category || 'uncategorized'
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    }
    return {
      totalDocuments: this.documents.size,
      totalTerms: this.documentFrequency.size,
      indexed: this.indexBuilt,
      categories: categoryCounts,
    }
  }
}
