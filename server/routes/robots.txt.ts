export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/plain')
  return `User-agent: *\nAllow: /\nSitemap: ${getRequestURL(event).origin}/sitemap.xml\n`
})
