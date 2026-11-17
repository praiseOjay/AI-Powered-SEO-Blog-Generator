const onCloudflare = (process.env.NITRO_PRESET || '').startsWith('cloudflare')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    geminiApiKey: '', // NUXT_GEMINI_API_KEY (or GEMINI_API_KEY, see server/utils/llm.ts)
    geminiModel: 'gemini-2.5-flash',
    public: { siteUrl: '' }
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en-GB' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  },
  nitro: {
    // Generated blogs live in a key-value store: Cloudflare KV when built for Cloudflare, the
    // local filesystem otherwise. Swap the driver without touching application code.
    storage: { blogs: onCloudflare ? { driver: 'cloudflare-kv-binding', binding: 'BLOGS' } : { driver: 'fs', base: './.data/blogs' } },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
      // Bindings: AI = Workers AI (no key), BLOGS = KV namespace holding generated pages.
      wrangler: { ai: { binding: 'AI' }, kv_namespaces: [{ binding: 'BLOGS' }], observability: { enabled: true } }
    },
    // Pre-generated blogs committed to the repo; loaded on boot (server/plugins/seed.ts)
    serverAssets: [{ baseName: 'seed', dir: './data/seed' }]
  }
})
