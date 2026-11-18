import type { BlogCopy, BlogData } from '../../shared/types'
import { slugify } from '../../shared/format'
import { analyzeDataset } from './analyze'
import { parseCsv } from './csv'
import { templateCopy } from './copy'
import { geminiProvider, ollamaProvider, workersAiProvider, type Analysis, type AiBinding, type CopyProvider } from './llm'

export interface PipelineConfig {
  /** Order to try providers in, e.g. ['workers-ai','gemini','ollama']. Unconfigured ones are skipped. */
  providers?: string[]
  ai?: AiBinding; workersAiModel?: string
  geminiApiKey?: string; geminiModel?: string
  ollamaUrl?: string; ollamaModel?: string
}

export function configFromEnv(env: Record<string, string | undefined>, ai?: AiBinding): PipelineConfig {
  return {
    providers: (env.LLM_PROVIDERS || 'workers-ai,gemini,ollama').split(',').map(x => x.trim()).filter(Boolean),
    ai, workersAiModel: env.WORKERS_AI_MODEL,
    geminiApiKey: env.GEMINI_API_KEY, geminiModel: env.GEMINI_MODEL,
    ollamaUrl: env.OLLAMA_URL, ollamaModel: env.OLLAMA_MODEL
  }
}

export function buildProviders(cfg: PipelineConfig): CopyProvider[] {
  const out: CopyProvider[] = []
  for (const name of cfg.providers ?? ['workers-ai', 'gemini', 'ollama']) {
    if (name === 'workers-ai' && cfg.ai) out.push(workersAiProvider(cfg.ai, cfg.workersAiModel || '@cf/google/gemma-4-26b-a4b-it'))
    else if (name === 'gemini' && cfg.geminiApiKey) out.push(geminiProvider(cfg.geminiApiKey, cfg.geminiModel || 'gemini-2.5-flash'))
    else if (name === 'ollama' && cfg.ollamaUrl) out.push(ollamaProvider(cfg.ollamaUrl, cfg.ollamaModel || 'llama3.1:8b'))
  }
  return out
}

export interface CopyResult { copy: BlogCopy; generatedBy: BlogData['generatedBy']; model?: string; warning?: string }

/** First working provider wins; if none work (or none are configured) deterministic template copy is used. */
export async function generateCopy(a: Analysis, providers: CopyProvider[], topicHint?: string): Promise<CopyResult> {
  const failures: string[] = []
  for (const p of providers) {
    try {
      const copy = await p.generate(a, topicHint)
      return { copy, generatedBy: p.name, model: p.model, warning: failures.length ? `Fell back after ${failures.join(', ')} failed; copy written by ${p.name}.` : undefined }
    } catch (e) { failures.push(p.name); console.error(`[llm:${p.name}]`, e instanceof Error ? e.message : e) }
  }
  return {
    copy: templateCopy(a, topicHint), generatedBy: 'template',
    warning: providers.length ? `The AI service was unavailable (${failures.join(', ')} failed), so template copy was used.` : 'No AI provider is configured, so template copy was used.'
  }
}

export interface BuildOptions { sourceHash?: string; indexable?: boolean }

/** CSV text -> BlogData. Layers: parse -> analyse (deterministic) -> copy (providers, template fallback). */
export async function buildBlog(csvText: string, fileName: string, cfg: PipelineConfig, topicHint?: string, providers: CopyProvider[] = buildProviders(cfg), opts: BuildOptions = {}): Promise<{ blog: BlogData; warning?: string }> {
  const analysis = analyzeDataset(parseCsv(csvText), fileName)
  const { copy, generatedBy, model, warning } = await generateCopy(analysis, providers, topicHint)
  const blog: BlogData = { slug: slugify(copy.topic), createdAt: new Date().toISOString(), generatedBy, model, ...analysis, copy, sourceHash: opts.sourceHash }
  if (opts.indexable === false) blog.indexable = false
  return { blog, warning }
}

/** Re-runs only the copy step on a stored page. Data, slug and creation date are preserved. */
export async function regenerateBlog(blog: BlogData, cfg: PipelineConfig, topicHint?: string, providers: CopyProvider[] = buildProviders(cfg)): Promise<{ blog: BlogData; warning?: string }> {
  const { copy, generatedBy, model, warning } = await generateCopy(blog, providers, topicHint ?? blog.copy.topic)
  return { blog: { ...blog, copy, generatedBy, model, updatedAt: new Date().toISOString() }, warning }
}
