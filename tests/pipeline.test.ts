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
