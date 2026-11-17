import Papa from 'papaparse'

export interface ParsedCsv { headers: string[]; rows: string[][] }

export function parseCsv(text: string): ParsedCsv {
  const res = Papa.parse<string[]>(text.replace(/^﻿/, ''), { skipEmptyLines: 'greedy' })
  const data = res.data as string[][]
  if (data.length < 2) throw new Error('The CSV needs a header row and at least one data row.')
  const seen = new Map<string, number>()
  const headers = data[0].map((h, i) => {
    const base = (h ?? '').trim() || `Column ${i + 1}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n > 1 ? `${base} (${n})` : base
  })
  if (headers.length < 2) throw new Error('The CSV needs at least two columns.')
  const rows = data.slice(1).map(r => headers.map((_, i) => (r[i] ?? '').trim()))
  return { headers, rows }
}
