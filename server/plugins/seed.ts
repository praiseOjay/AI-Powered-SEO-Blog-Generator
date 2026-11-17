import type { BlogData } from '../../shared/types'

// Loads blogs committed under data/seed/ into the store on boot, so a fresh
// deployment (or one with an ephemeral disk) always has the showcase page.
export default defineNitroPlugin(async () => {
  const seeds = useStorage('assets:seed')
  for (const key of await seeds.getKeys()) {
    const blog = await seeds.getItem(key) as BlogData | null
    if (blog?.slug && !(await getBlog(blog.slug))) await saveBlog(blog)
  }
})
