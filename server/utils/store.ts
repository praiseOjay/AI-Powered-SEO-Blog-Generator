import type { BlogData } from '../../shared/types'

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/
const store = () => useStorage<BlogData>('blogs')
const raw = () => useStorage('blogs') // for the small hash -> slug index entries
const hashKey = (h: string) => `hash:${h}`

// Seeds (data/seed/*.json, committed to the repo) are copied into the store lazily on first use per
// runtime instance. A startup plugin can't do this: Cloudflare Workers have no bindings or I/O in
// global scope. Seeds are the source of truth for their own slugs: a changed seed replaces the stored
// copy (so redeploying updates it), but an unchanged one causes no write (KV free tier limits writes).
let seeding: Promise<void> | null = null
function ensureSeeded(): Promise<void> {
  return seeding ??= (async () => {
    const seeds = useStorage('assets:seed')
    for (const key of await seeds.getKeys()) {
      const blog = await seeds.getItem(key) as BlogData | null
      if (!blog?.slug || !SLUG_RE.test(blog.slug)) continue
      const existing = await store().getItem(`${blog.slug}.json`)
      if (!existing || JSON.stringify(existing) !== JSON.stringify(blog)) await store().setItem(`${blog.slug}.json`, blog as never)
      if (blog.sourceHash && (await raw().getItem(hashKey(blog.sourceHash))) !== blog.slug) await raw().setItem(hashKey(blog.sourceHash), blog.slug)
    }
  })().catch((e) => { seeding = null; console.error('[seed]', e) })
}

export const saveBlog = (b: BlogData) => store().setItem(`${b.slug}.json`, b as never)
export async function getBlog(slug: string): Promise<BlogData | null> {
  if (!SLUG_RE.test(slug)) return null
  await ensureSeeded()
  return (await store().getItem(`${slug}.json`)) as BlogData | null
}
export async function listBlogs(): Promise<BlogData[]> {
  await ensureSeeded()
  const keys = (await store().getKeys()).filter(k => k.endsWith('.json'))
  const all = await Promise.all(keys.map(k => store().getItem(k) as Promise<BlogData | null>))
  return all.filter((b): b is BlogData => !!b).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Duplicate detection: which page was generated from this exact dataset? */
export async function getSlugByHash(hash: string): Promise<string | null> {
  await ensureSeeded()
  const v = await raw().getItem(hashKey(hash))
  return typeof v === 'string' && SLUG_RE.test(v) ? v : null
}
export const deleteHashIndex = (hash: string) => raw().removeItem(hashKey(hash))
export const saveHashIndex = (hash: string, slug: string) => raw().setItem(hashKey(hash), slug)

export async function deleteBlog(slug: string): Promise<boolean> {
  const blog = await getBlog(slug)
  if (!blog) return false
  await store().removeItem(`${slug}.json`)
  if (blog.sourceHash && (await raw().getItem(hashKey(blog.sourceHash))) === slug) await raw().removeItem(hashKey(blog.sourceHash))
  return true
}
