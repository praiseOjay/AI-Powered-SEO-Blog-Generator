export interface ParsedCsv { headers: string[]; rows: string[][] }

/**
 * Minimal RFC 4180 parser: quoted fields, escaped quotes (""), commas and newlines inside quotes,
 * CRLF/LF. Written in-house because Papa Parse's worker-blob code breaks Nitro's Cloudflare build.
 */
export function parseRecords(text: string): string[][] {
  const out: string[][] = []
  let row: string[] = [], field = '', inQuotes = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') { if (src[i + 1] === '"') { field += '"'; i++ } else inQuotes = false }
      else field += ch
    } else if (ch === '"' && field === '') inQuotes = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(c => c.trim() !== '')) out.push(row) // skip blank lines
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some(c => c.trim() !== '')) out.push(row)
  return out
}

export function parseCsv(text: string): ParsedCsv {
  const data = parseRecords(text)
  if (data.length < 2) throw new Error('The CSV needs a header row and at least one data row.')
  const seen = new Map<string, number>()
  const headers = data[0].map((h, i) => {
    const base = (h ?? '').trim() || `Column ${i + 1}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n > 1 ? `${base} (${n})` : base
  })
  if (headers.length < 2) throw new Error('The CSV needs at least two columns.')
  return { headers, rows: data.slice(1).map(r => headers.map((_, i) => (r[i] ?? '').trim())) }
}
