import type { H3Event } from 'h3'

// In-memory, per runtime instance (so only a soft guard on Workers; use Cloudflare rate-limiting rules for a real one).
const hits = new Map<string, number[]>()

/** Counts one generation for this client and throws 429 past the limit. Call only when about to spend LLM quota. */
export function rateLimit(event: H3Event, max = 15, windowMs = 3_600_000) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < windowMs)
  if (recent.length >= max) throw createError({ statusCode: 429, statusMessage: 'Too many uploads, please try again later.' })
  hits.set(ip, [...recent, now])
}
