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
    // Generated blogs live in a key-value store. Default: filesystem. Swap the
    // driver (Redis, Cloudflare KV, ...) without touching application code.
    storage: { blogs: { driver: 'fs', base: './.data/blogs' } },
    // Pre-generated blogs committed to the repo; loaded on boot (server/plugins/seed.ts)
    serverAssets: [{ baseName: 'seed', dir: './data/seed' }]
  }
})
