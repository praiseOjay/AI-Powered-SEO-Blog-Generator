import type { BlogData } from '../../shared/types'

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/
const store = () => useStorage<BlogData>('blogs')

export const saveBlog = (b: BlogData) => store().setItem(`${b.slug}.json`, b as never)
export async function getBlog(slug: string): Promise<BlogData | null> {
  if (!SLUG_RE.test(slug)) return null
  return (await store().getItem(`${slug}.json`)) as BlogData | null
}
export async function listBlogs(): Promise<BlogData[]> {
  const keys = (await store().getKeys()).filter(k => k.endsWith('.json'))
  const all = await Promise.all(keys.map(k => store().getItem(k) as Promise<BlogData | null>))
  return all.filter((b): b is BlogData => !!b).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
