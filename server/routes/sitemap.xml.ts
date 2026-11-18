export default defineEventHandler(async (event) => {
  const origin = useRuntimeConfig(event).public.siteUrl || getRequestURL(event).origin
  const blogs = (await listBlogs()).filter(b => b.indexable !== false)
  setHeader(event, 'content-type', 'application/xml')
  const urls = [`<url><loc>${origin}/</loc></url>`, ...blogs.map(b => `<url><loc>${origin}/blog/${b.slug}</loc><lastmod>${b.createdAt.slice(0, 10)}</lastmod></url>`)]
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`
})
