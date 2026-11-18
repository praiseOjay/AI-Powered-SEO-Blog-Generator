export type ColumnType = 'text' | 'number' | 'currency' | 'year' | 'url' | 'rank'
export type Cell = string | number | null

export interface Column { key: string; label: string; type: ColumnType }
export interface Insight { label: string; value: string; detail: string }
export interface Metric { key: string; label: string; unit: 'currency' | 'number'; symbol: string }
export interface CategoryBreakdown {
  key: string
  label: string
  items: { name: string; count: number; total: number | null }[]
}

export interface BlogCopy {
  topic: string
  title: string
  metaDescription: string
  h1: string
  intro: string[]
  takeaways: string[]
  sections: { heading: string; body: string }[]
  faq: { question: string; answer: string }[]
}

export interface BlogData {
  slug: string
  createdAt: string
  updatedAt?: string
  /** SHA-256 of the normalised source CSV; used to detect duplicate uploads. */
  sourceHash?: string
  /** false = served with noindex and left out of the sitemap (anonymous uploads by default). Absent = indexable. */
  indexable?: boolean
  generatedBy: 'workers-ai' | 'gemini' | 'ollama' | 'template'
  model?: string
  sourceFileName: string
  copy: BlogCopy
  metric: Metric | null
  columns: Column[]
  /** Key of the column holding each entry's name (older seeds may lack it). */
  nameKey?: string | null
  rows: Record<string, Cell>[]
  insights: Insight[]
  categories: CategoryBreakdown[]
  truncated: boolean
}
