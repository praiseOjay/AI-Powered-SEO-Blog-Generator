import type { BlogData } from '../../shared/types'
import { slugify } from '../../shared/format'
import { analyzeDataset } from './analyze'
import { parseCsv } from './csv'
import { templateCopy } from './copy'
import { generateCopyWithGemini } from './llm'

export interface PipelineConfig { geminiApiKey?: string; geminiModel?: string }

/** CSV text -> BlogData. Layers: parse -> analyse (deterministic) -> copy (LLM, template fallback). */
export async function buildBlog(csvText: string, fileName: string, cfg: PipelineConfig, topicHint?: string): Promise<{ blog: BlogData; warning?: string }> {
  const analysis = analyzeDataset(parseCsv(csvText), fileName)
  let copy, generatedBy: BlogData['generatedBy'] = 'template', model: string | undefined, warning: string | undefined
  if (cfg.geminiApiKey) {
    try {
      model = cfg.geminiModel || 'gemini-2.5-flash'
      copy = await generateCopyWithGemini(analysis, cfg.geminiApiKey, model, topicHint)
      generatedBy = 'gemini'
    } catch (e) {
      console.error('[llm] falling back to template:', e instanceof Error ? e.message : e)
      model = undefined
      warning = 'The AI service was unavailable, so template copy was used instead.'
    }
  } else warning = 'No AI key is configured, so template copy was used instead.'
  copy ??= templateCopy(analysis, topicHint)
  const slug = `${slugify(copy.topic)}-${Date.now().toString(36)}`
  return { blog: { slug, createdAt: new Date().toISOString(), generatedBy, model, ...analysis, copy }, warning }
}
