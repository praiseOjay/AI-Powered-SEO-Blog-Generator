import { SLUG_RE } from '../utils/store'

const MAX_BYTES = 2 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Attach a CSV file in the "file" field.' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'CSV is larger than 2 MB.' })
  const field = (name: string) => parts?.find(p => p.name === name)?.data.toString().trim().slice(0, 100)
  const topic = field('topic') || undefined
  const text = file.data.toString('utf8')
  const admin = isAdmin(event)
  const replace = admin ? field('replace') : undefined
  if (replace && !SLUG_RE.test(replace)) throw createError({ statusCode: 400, statusMessage: 'Invalid slug in "replace".' })

  const cfg = pipelineConfig(event)
  const hash = await hashCsv(text)
  const reply = (b: { slug: string; generatedBy: string }, extra: Record<string, unknown> = {}) => ({ slug: b.slug, url: `/blog/${b.slug}`, generatedBy: b.generatedBy, ...extra })

  // 1) Same dataset already generated -> reuse it (no LLM call, no duplicate page).
  const existingSlug = replace ? null : await getSlugByHash(hash)
  const existing = existingSlug ? await getBlog(existingSlug) : null
  if (existing) {
    if (existing.generatedBy !== 'template' || !buildProviders(cfg).length) return reply(existing, { duplicate: true })
    // The earlier copy was a template fallback and AI is available now: upgrade it in place.
    rateLimit(event)
    const { blog, warning } = await regenerateBlog(existing, cfg, topic)
    await saveBlog(blog)
    return reply(blog, { duplicate: true, regenerated: true, warning })
  }

  try {
    rateLimit(event)
    const { blog, warning } = await buildBlog(text, file.filename!.slice(0, 120), cfg, topic, undefined, { sourceHash: hash, indexable: admin || indexUploads(event) })
    if (replace) {
      // Admin-only: overwrite a specific page, keeping its URL and creation date.
      const old = await getBlog(replace)
      blog.slug = replace
      if (old) { blog.createdAt = old.createdAt; blog.updatedAt = new Date().toISOString(); if (old.sourceHash && old.sourceHash !== hash) await deleteHashIndex(old.sourceHash) }
    } else {
      // Anonymous uploads never overwrite: a taken slug gets -2, -3, ...
      blog.slug = await pickSlug(blog.slug, async s => !!(await getBlog(s)))
    }
    await saveBlog(blog)
    await saveHashIndex(hash, blog.slug)
    return reply(blog, { warning, replaced: !!replace })
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode) throw e
    throw createError({ statusCode: 422, statusMessage: e instanceof Error ? e.message : 'Could not process the CSV.' })
  }
})
