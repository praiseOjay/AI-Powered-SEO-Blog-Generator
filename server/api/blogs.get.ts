export default defineEventHandler(async () =>
  (await listBlogs()).map(b => ({ slug: b.slug, title: b.copy.title, description: b.copy.metaDescription, createdAt: b.createdAt, rows: b.rows.length, generatedBy: b.generatedBy })))
