import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildBlog, buildProviders } from '../server/utils/pipeline'
import { extractJson, workersAiProvider, type CopyProvider } from '../server/utils/llm'

const csv = readFileSync('tests/fixtures/sample.csv', 'utf8')
const goodCopy = { topic: 'Test', title: 'T', metaDescription: 'M', h1: 'H', intro: ['i'], takeaways: ['t'], sections: [{ heading: 'h', body: 'b' }], faq: [{ question: 'q', answer: 'a' }] }
const fail = (name: CopyProvider['name']): CopyProvider => ({ name, model: 'x', generate: async () => { throw new Error('boom') } })
const ok = (name: CopyProvider['name']): CopyProvider => ({ name, model: 'm', generate: async () => goodCopy })

describe('provider chain', () => {
  it('uses the first provider that works and reports fallbacks', async () => {
    const { blog, warning } = await buildBlog(csv, 's.csv', {}, undefined, [fail('workers-ai'), ok('gemini')])
    expect(blog.generatedBy).toBe('gemini'); expect(warning).toMatch(/workers-ai/)
  })
  it('falls back to template when every provider fails', async () => {
    const { blog } = await buildBlog(csv, 's.csv', {}, undefined, [fail('workers-ai'), fail('gemini')])
    expect(blog.generatedBy).toBe('template')
  })
  it('skips providers that are not configured', () => {
    expect(buildProviders({ providers: ['workers-ai', 'gemini', 'ollama'] })).toHaveLength(0)
    expect(buildProviders({ providers: ['ollama', 'gemini'], ollamaUrl: 'http://x', geminiApiKey: 'k' }).map(p => p.name)).toEqual(['ollama', 'gemini'])
  })
})

describe('workers ai adapter', () => {
  const a: any = { sourceFileName: 'f', metric: null, columns: [], rows: [], insights: [], categories: [] }
  it.each([
    ['{response: string}', { response: '```json\n' + JSON.stringify(goodCopy) + '\n```' }],
    ['{response: object}', { response: goodCopy }],
    ['openai style', { choices: [{ message: { content: JSON.stringify(goodCopy) } }] }]
  ])('parses %s', async (_n, out) => {
    expect((await workersAiProvider({ run: async () => out }, 'm').generate(a)).title).toBe('T')
  })
  it('extractJson rejects non-JSON', () => { expect(() => extractJson('nope')).toThrow() })
})

import { hashCsv, pickSlug } from '../server/utils/hash'
import { regenerateBlog } from '../server/utils/pipeline'

describe('duplicate detection helpers', () => {
  it('hashCsv ignores BOM, CRLF and surrounding whitespace but not content', async () => {
    const a = await hashCsv('a,b\n1,2\n')
    expect(await hashCsv('﻿a,b\r\n1,2\r\n\r\n')).toBe(a)
    expect(await hashCsv('a,b\n1,3\n')).not.toBe(a)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })
  it('pickSlug returns the first free slug', async () => {
    const taken = new Set(['topic', 'topic-2'])
    expect(await pickSlug('topic', async s => taken.has(s))).toBe('topic-3')
    expect(await pickSlug('fresh', async s => taken.has(s))).toBe('fresh')
  })
})

describe('regenerateBlog', () => {
  it('keeps slug, createdAt and data; replaces copy and stamps updatedAt', async () => {
    const { blog } = await buildBlog(csv, 's.csv', {}, undefined, [fail('workers-ai')])
    expect(blog.generatedBy).toBe('template')
    const { blog: next } = await regenerateBlog(blog, {}, undefined, [ok('gemini')])
    expect(next.generatedBy).toBe('gemini')
    expect(next.slug).toBe(blog.slug); expect(next.createdAt).toBe(blog.createdAt); expect(next.rows).toEqual(blog.rows)
    expect(next.updatedAt).toBeTruthy()
  })
  it('marks anonymous builds non-indexable only when asked', async () => {
    expect((await buildBlog(csv, 's.csv', {}, undefined, [ok('gemini')], { indexable: false })).blog.indexable).toBe(false)
    expect((await buildBlog(csv, 's.csv', {}, undefined, [ok('gemini')])).blog.indexable).toBeUndefined()
  })
})
