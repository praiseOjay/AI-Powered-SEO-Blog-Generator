import type { BlogData, Cell, CategoryBreakdown, Column, Insight, Metric } from '../../shared/types'
import { formatCompact } from '../../shared/format'
import type { ParsedCsv } from './csv'

const MULT: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 }
const NUM_RE = /^(-?\d+(?:\.\d+)?)\s*(k|m|mn|b|bn|thousand|million|billion)?$/i

export function parseNumber(raw: string): { value: number; symbol: string } | null {
  const s = raw.trim()
  if (!s) return null
  const symbol = s.match(/[£$€]/)?.[0] ?? ''
  const m = s.replace(/[£$€,]/g, '').replace(/^(gbp|usd|eur)\s*/i, '').trim().match(NUM_RE)
  if (!m) return null
  return { value: parseFloat(m[1]) * (m[2] ? MULT[m[2].toLowerCase()] : 1), symbol }
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
const pct = (n: number) => `${Math.round(n * 100)}%`

export interface Options { maxRows?: number }

/** Turns raw CSV into typed columns, ranked rows, and deterministic statistics. No LLM involved. */
export function analyzeDataset(csv: ParsedCsv, sourceFileName: string, opts: Options = {}): Omit<BlogData, 'slug' | 'createdAt' | 'generatedBy' | 'copy' | 'model'> {
  const maxRows = opts.maxRows ?? 1000
  const { headers } = csv
  const n = csv.rows.length

  // --- column typing ---
  const info = headers.map((label, i) => {
    const vals = csv.rows.map(r => r[i]).filter(v => v !== '')
    const nums = vals.map(parseNumber)
    const numeric = vals.length > 0 && nums.filter(Boolean).length / vals.length >= 0.8
    const symbol = numeric ? (nums.find(x => x?.symbol)?.symbol ?? '') : ''
    const ints = numeric && nums.every(x => !x || Number.isInteger(x.value))
    const isYear = numeric && ints && /found|year|est|since|incep/i.test(label) && nums.every(x => !x || (x.value >= 1800 && x.value <= 2100))
    const isRank = numeric && ints && /^(#|rank|position|no\.?)$|rank/i.test(label)
    const isUrl = !numeric && vals.length > 0 && vals.filter(v => /^(https?:\/\/|www\.)/i.test(v) || /\.[a-z]{2,}$/i.test(v) && !v.includes(' ')).length / vals.length >= 0.8 && /web|url|site|domain|link/i.test(label)
    const isCurrency = numeric && !isYear && !isRank && (!!symbol || /fund|rais|revenue|valuation|amount|capital|£|\$|usd|gbp|eur|invest/i.test(label))
    const type: Column['type'] = isRank ? 'rank' : isYear ? 'year' : isCurrency ? 'currency' : numeric ? 'number' : isUrl ? 'url' : 'text'
    const distinct = new Set(vals).size
    return { i, label, vals, type, symbol, distinct }
  })

  const nameCol = info.find(c => c.type === 'text' && /company|name|organi[sz]ation|business|firm|brand|title/i.test(c.label))
    ?? info.find(c => c.type === 'text' && c.distinct === n)
    ?? info.find(c => c.type === 'text')
  const rankCol = info.find(c => c.type === 'rank')
  const metricCands = info.filter(c => c.type === 'currency' || c.type === 'number')
  const metricCol = metricCands.find(c => /total|fund|rais|revenue|valuation|amount|capital|value/i.test(c.label)) ?? metricCands[0]
  const metric: Metric | null = metricCol
    ? { key: `c${metricCol.i}`, label: metricCol.label, unit: metricCol.type === 'currency' ? 'currency' : 'number', symbol: metricCol.type === 'currency' ? (metricCol.symbol || '£') : '' }
    : null

  // --- rows: typed values, sorted + ranked ---
  const columns: Column[] = [{ key: '_rank', label: 'Rank', type: 'rank' }]
  for (const c of info) if (c.type !== 'rank') columns.push({ key: `c${c.i}`, label: c.label, type: c.type })

  let rows = csv.rows.map((r, idx) => {
    const row: Record<string, Cell> = { _rank: null }
    info.forEach((c) => {
      const raw = r[c.i]
      if (raw === '') row[`c${c.i}`] = null
      else if (c.type === 'rank' || c.type === 'number' || c.type === 'currency' || c.type === 'year') row[`c${c.i}`] = parseNumber(raw)?.value ?? null
      else row[`c${c.i}`] = raw
    })
    if (rankCol) row._rank = row[`c${rankCol.i}`] as number | null
    row._idx = idx
    return row
  })
  if (rankCol) rows.sort((a, b) => ((a._rank as number) ?? 1e9) - ((b._rank as number) ?? 1e9))
  else if (metric) rows.sort((a, b) => ((b[metric.key] as number) ?? -Infinity) - ((a[metric.key] as number) ?? -Infinity))
  rows.forEach((r, i) => { r._rank = rankCol ? (r._rank ?? i + 1) : i + 1; delete r._idx })
  const truncated = rows.length > maxRows
  rows = rows.slice(0, maxRows)

  // --- insights (all numbers computed here, never by the LLM) ---
  const insights: Insight[] = []
  const fmt = (v: number) => metric?.unit === 'currency' ? formatCompact(v, metric.symbol) : formatCompact(v)
  insights.push({ label: 'Entries ranked', value: String(n), detail: `The dataset contains ${n} entries.` })

  const nameKey = nameCol ? `c${nameCol.i}` : null
  if (metric) {
    const vs = rows.map(r => r[metric.key]).filter((v): v is number => typeof v === 'number')
    if (vs.length) {
      const total = vs.reduce((a, b) => a + b, 0)
      insights.push({ label: /^total/i.test(metric.label) ? metric.label : `Total ${metric.label}`, value: fmt(total), detail: `Combined ${metric.label} across all ${vs.length} entries is ${fmt(total)}.` })
      insights.push({ label: `Median ${metric.label}`, value: fmt(median(vs)), detail: `The median entry has ${fmt(median(vs))}, versus a mean of ${fmt(total / vs.length)}.` })
      const sorted = [...vs].sort((a, b) => b - a)
      if (nameKey) {
        const top = rows.find(r => r[metric.key] === sorted[0])!
        insights.push({ label: 'Largest entry', value: String(top[nameKey]), detail: `${top[nameKey]} leads with ${fmt(sorted[0])}, ${pct(sorted[0] / total)} of the total.` })
      }
      if (sorted.length >= 2 && sorted[1] > 0) insights.push({ label: 'Gap between #1 and #2', value: `${(sorted[0] / sorted[1]).toFixed(1)}×`, detail: `The top entry is ${(sorted[0] / sorted[1]).toFixed(1)} times the size of the runner-up.` })
      if (sorted.length >= 20) {
        const k = 10
        const share = sorted.slice(0, k).reduce((a, b) => a + b, 0) / total
        insights.push({ label: `Top ${k} share`, value: pct(share), detail: `The ${k} biggest entries account for ${pct(share)} of the overall total.` })
      }
    }
  }

  const categories: CategoryBreakdown[] = []
  for (const c of info.filter(c => c.type === 'text' && c !== nameCol && c.distinct >= 2 && c.distinct <= Math.max(12, n * 0.2)).slice(0, 2)) {
    const groups = new Map<string, { count: number; total: number }>()
    for (const r of rows) {
      const k = r[`c${c.i}`]
      if (typeof k !== 'string') continue
      const g = groups.get(k) ?? { count: 0, total: 0 }
      g.count++
      if (metric && typeof r[metric.key] === 'number') g.total += r[metric.key] as number
      groups.set(k, g)
    }
    const items = [...groups].map(([name, g]) => ({ name, count: g.count, total: metric ? g.total : null }))
      .sort((a, b) => b.count - a.count).slice(0, 8)
    if (!items.length) continue
    categories.push({ key: `c${c.i}`, label: c.label, items })
    insights.push({ label: `Most common ${c.label}`, value: items[0].name, detail: `${items[0].name} appears in ${items[0].count} of ${rows.length} entries.` })
    if (metric) {
      const best = [...items].sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0]
      if (best.total) insights.push({ label: `Top ${c.label} by ${metric.label}`, value: best.name, detail: `${best.name} entries total ${fmt(best.total)}.` })
    }
  }

  const yearCol = info.find(c => c.type === 'year')
  if (yearCol) {
    const ys = rows.map(r => r[`c${yearCol.i}`]).filter((v): v is number => typeof v === 'number')
    if (ys.length) {
      const decades = new Map<number, number>()
      ys.forEach(y => decades.set(Math.floor(y / 10) * 10, (decades.get(Math.floor(y / 10) * 10) ?? 0) + 1))
      const [dec, cnt] = [...decades].sort((a, b) => b[1] - a[1])[0]
      insights.push({ label: `Median ${yearCol.label}`, value: String(Math.round(median(ys))), detail: `${yearCol.label} ranges from ${Math.min(...ys)} to ${Math.max(...ys)}; the ${dec}s are the most common decade (${cnt} entries).` })
    }
  }

  return { sourceFileName, metric, columns, rows, insights, categories, truncated }
}
