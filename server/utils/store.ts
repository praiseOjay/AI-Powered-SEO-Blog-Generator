import type { BlogData } from '../../shared/types'

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/
const store = () => useStorage<BlogData>('blogs')

// Seeds (data/seed/*.json, committed to the repo) are copied into the store lazily on first use per
// runtime instance. A startup plugin can't do this: Cloudflare Workers have no bindings or I/O in
// global scope. Existing keys are never overwritten, so re-deploys don't clobber edited pages.
let seeding: Promise<void> | null = null
function ensureSeeded(): Promise<void> {
  return seeding ??= (async () => {
    const seeds = useStorage('assets:seed')
    for (const key of await seeds.getKeys()) {
      const blog = await seeds.getItem(key) as BlogData | null
      if (blog?.slug && SLUG_RE.test(blog.slug) && !(await store().hasItem(`${blog.slug}.json`))) await store().setItem(`${blog.slug}.json`, blog as never)
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
