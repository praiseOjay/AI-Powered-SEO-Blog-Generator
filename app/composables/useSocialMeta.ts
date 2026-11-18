/**
 * Canonical URL + Open Graph + Twitter Card tags, with an absolute share image.
 * One place so every page gets the full, consistent set.
 */
export function useSocialMeta(o: { title: string; description: string; path: string; type?: 'website' | 'article' }) {
  const origin = useRequestURL().origin
  const url = `${origin}${o.path}`
  const image = `${origin}/og-image.png`
  const alt = 'AI SEO Blog Generator: turn any CSV into an SEO-optimised blog'
  useSeoMeta({
    title: o.title, description: o.description,
    ogTitle: o.title, ogDescription: o.description, ogType: o.type ?? 'website', ogUrl: url,
    ogSiteName: 'AI SEO Blog Generator', ogLocale: 'en_GB',
    ogImage: image, ogImageWidth: 1200, ogImageHeight: 630, ogImageAlt: alt,
    twitterCard: 'summary_large_image', twitterTitle: o.title, twitterDescription: o.description,
    twitterImage: image, twitterImageAlt: alt
  })
  useHead({ link: [{ rel: 'canonical', href: url }] })
  return { url, origin }
}
