import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseCsv } from '../server/utils/csv'
import { analyzeDataset, parseNumber } from '../server/utils/analyze'
import { templateCopy } from '../server/utils/copy'

describe('parseNumber', () => {
  it('handles currency, commas and suffixes', () => {
    expect(parseNumber('£1.2bn')?.value).toBe(1.2e9)
    expect(parseNumber('$420,000,000')?.value).toBe(420e6)
    expect(parseNumber('abc')).toBeNull()
  })
})

describe('analyzeDataset', () => {
  const a = analyzeDataset(parseCsv(readFileSync('tests/fixtures/sample.csv', 'utf8')), 'sample.csv')
  it('detects metric, ranks and categories generically', () => {
    expect(a.metric?.label).toBe('Total Funding')
    expect(a.metric?.symbol).toBe('£')
    expect(a.rows.map(r => r._rank)).toEqual([1, 2, 3, 4, 5])
    expect(a.categories[0].label).toBe('City')
    expect(a.categories[0].items[0]).toMatchObject({ name: 'London', count: 3 })
  })
  it('computes insights in code', () => {
    expect(a.insights.find(i => i.label === 'Largest entry')?.value).toBe('Alpha Pay')
  })
  it('template copy respects SEO length limits', () => {
    const c = templateCopy(a)
    expect(c.title.length).toBeLessThanOrEqual(70)
    expect(c.metaDescription.length).toBeLessThanOrEqual(160)
  })
})
