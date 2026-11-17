import type { H3Event } from 'h3'
export function pipelineConfig(event: H3Event) {
  const c = useRuntimeConfig(event)
  return { geminiApiKey: c.geminiApiKey || process.env.GEMINI_API_KEY || '', geminiModel: c.geminiModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash' }
}
