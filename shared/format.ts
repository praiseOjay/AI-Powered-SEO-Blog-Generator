export function formatCompact(value: number, symbol = ''): string {
  const abs = Math.abs(value)
  const units: [number, string][] = [[1e9, 'bn'], [1e6, 'm'], [1e3, 'k']]
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const n = value / size
      return `${symbol}${n >= 100 ? Math.round(n) : Number(n.toFixed(1))}${suffix}`
    }
  }
  return `${symbol}${Number(value.toFixed(2))}`
}

export function slugify(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 70).replace(/^-|-$/g, '') || 'blog'
}
