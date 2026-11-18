export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug') ?? ''
  if (!(await deleteBlog(slug))) throw createError({ statusCode: 404, statusMessage: 'Blog not found' })
  return { deleted: slug }
})
