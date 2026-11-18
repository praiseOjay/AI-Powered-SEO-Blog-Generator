// Admin: re-run only the AI copy step on a stored page (no re-upload). URL and data are preserved.
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const blog = await getBlog(getRouterParam(event, 'slug') ?? '')
  if (!blog) throw createError({ statusCode: 404, statusMessage: 'Blog not found' })
  const body = await readBody<{ topic?: string }>(event).catch(() => ({} as { topic?: string }))
  const { blog: next, warning } = await regenerateBlog(blog, pipelineConfig(event), body?.topic?.slice(0, 100))
  await saveBlog(next)
  return { slug: next.slug, generatedBy: next.generatedBy, model: next.model, warning }
})
