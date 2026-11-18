import type { H3Event } from 'h3'
import { configFromEnv } from './pipeline'

function bindingEnv(event: H3Event): Record<string, any> {
  return (event.context as { cloudflare?: { env?: Record<string, any> } }).cloudflare?.env ?? {}
}

export function pipelineConfig(event: H3Event) {
  const cf = bindingEnv(event)
  const rc = useRuntimeConfig(event)
  // Cloudflare supplies vars/secrets on the binding env; Node uses process.env.
  const env = { ...process.env, ...Object.fromEntries(Object.entries(cf).filter(([, v]) => typeof v === 'string')), GEMINI_API_KEY: (cf.GEMINI_API_KEY as string) || rc.geminiApiKey || process.env.GEMINI_API_KEY }
  return configFromEnv(env as Record<string, string | undefined>, cf.AI)
}

const setting = (event: H3Event, name: string): string => String(bindingEnv(event)[name] ?? process.env[name] ?? '')

/** Anonymous uploads are noindex unless INDEX_UPLOADED_PAGES=true. */
export const indexUploads = (event: H3Event) => setting(event, 'INDEX_UPLOADED_PAGES') === 'true'

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** True when the request carries `Authorization: Bearer <ADMIN_TOKEN>`. */
export function isAdmin(event: H3Event): boolean {
  const token = setting(event, 'ADMIN_TOKEN')
  const given = (getHeader(event, 'authorization') ?? '').replace(/^Bearer\s+/i, '')
  return token.length >= 16 && safeEqual(given, token)
}

export function requireAdmin(event: H3Event) {
  if (!setting(event, 'ADMIN_TOKEN')) throw createError({ statusCode: 403, statusMessage: 'Admin actions are disabled (no ADMIN_TOKEN configured).' })
  if (!isAdmin(event)) throw createError({ statusCode: 401, statusMessage: 'Invalid or missing admin token.' })
}
