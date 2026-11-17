const MAX_BYTES = 2 * 1024 * 1024
const hits = new Map<string, number[]>()

export default defineEventHandler(async (event) => {
  // Basic per-IP rate limit (in-memory) to protect the free LLM quota.
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < 3_600_000)
  if (recent.length >= 15) throw createError({ statusCode: 429, statusMessage: 'Too many uploads, please try again later.' })
  hits.set(ip, [...recent, now])

  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Attach a CSV file in the "file" field.' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'CSV is larger than 2 MB.' })
  const topic = parts?.find(p => p.name === 'topic')?.data.toString().slice(0, 100)

  try {
    const { blog, warning } = await buildBlog(file.data.toString('utf8'), file.filename!.slice(0, 120), pipelineConfig(event), topic)
    await saveBlog(blog)
    return { slug: blog.slug, url: `/blog/${blog.slug}`, generatedBy: blog.generatedBy, warning }
  } catch (e) {
    throw createError({ statusCode: 422, statusMessage: e instanceof Error ? e.message : 'Could not process the CSV.' })
  }
})
