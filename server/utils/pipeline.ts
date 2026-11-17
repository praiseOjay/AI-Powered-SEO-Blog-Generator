import type { BlogData } from '../../shared/types'
import { slugify } from '../../shared/format'
import { analyzeDataset } from './analyze'
import { parseCsv } from './csv'
import { templateCopy } from './copy'
import { geminiProvider, ollamaProvider, workersAiProvider, type AiBinding, type CopyProvider } from './llm'

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

/** CSV text -> BlogData. Layers: parse -> analyse (deterministic) -> copy (first working provider, else template). */
export async function buildBlog(csvText: string, fileName: string, cfg: PipelineConfig, topicHint?: string, providers: CopyProvider[] = buildProviders(cfg)): Promise<{ blog: BlogData; warning?: string }> {
  const analysis = analyzeDataset(parseCsv(csvText), fileName)
  let copy, generatedBy: BlogData['generatedBy'] = 'template', model: string | undefined, warning: string | undefined
  const failures: string[] = []
  for (const p of providers) {
    try { copy = await p.generate(analysis, topicHint); generatedBy = p.name; model = p.model; break }
    catch (e) { failures.push(p.name); console.error(`[llm:${p.name}]`, e instanceof Error ? e.message : e) }
  }
  if (!copy) warning = providers.length ? `AI providers failed (${failures.join(', ')}); template copy was used instead.` : 'No AI provider is configured; template copy was used instead.'
  else if (failures.length) warning = `Fell back after ${failures.join(', ')} failed; copy written by ${generatedBy}.`
  copy ??= templateCopy(analysis, topicHint)
  const slug = `${slugify(copy.topic)}-${Date.now().toString(36)}`
  return { blog: { slug, createdAt: new Date().toISOString(), generatedBy, model, ...analysis, copy }, warning }
}
