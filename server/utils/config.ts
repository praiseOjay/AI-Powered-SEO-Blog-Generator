import type { H3Event } from 'h3'
import { configFromEnv } from './pipeline'

export function pipelineConfig(event: H3Event) {
  const cf = (event.context as { cloudflare?: { env?: Record<string, any> } }).cloudflare?.env ?? {}
  const rc = useRuntimeConfig(event)
  // Cloudflare supplies vars/secrets on the binding env; Node uses process.env.
  const env = { ...process.env, ...Object.fromEntries(Object.entries(cf).filter(([, v]) => typeof v === 'string')), GEMINI_API_KEY: (cf.GEMINI_API_KEY as string) || rc.geminiApiKey || process.env.GEMINI_API_KEY }
  return configFromEnv(env as Record<string, string | undefined>, cf.AI)
}
