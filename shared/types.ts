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
  generatedBy: 'workers-ai' | 'gemini' | 'ollama' | 'template'
  model?: string
  sourceFileName: string
  copy: BlogCopy
  metric: Metric | null
  columns: Column[]
  rows: Record<string, Cell>[]
  insights: Insight[]
  categories: CategoryBreakdown[]
  truncated: boolean
}
