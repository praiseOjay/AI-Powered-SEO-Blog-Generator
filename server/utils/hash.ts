/** SHA-256 of the CSV with BOM/newline/whitespace differences normalised away (Web Crypto: Node + Workers). */
export async function hashCsv(text: string): Promise<string> {
  const norm = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim()
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** First free slug: base, base-2, base-3 ... */
export async function pickSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = base, n = 2
  while (await exists(slug)) slug = `${base}-${n++}`
  return slug
}
