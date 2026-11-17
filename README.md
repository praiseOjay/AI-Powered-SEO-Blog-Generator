# AI-Powered SEO Blog Generator

Upload any ranked CSV → get a server-rendered, SEO-optimised blog page (title, meta, intro, stats, ranking table, FAQ + JSON-LD).

**Stack:** Nuxt 4 (SSR) · Cloudflare Workers + Workers AI + KV · Gemini / Ollama adapters · Nitro storage · Vitest

## How it works
`CSV → parse (csv.ts) → analyse (analyze.ts, deterministic) → copy (llm.ts providers, template fallback) → store (Nitro storage: KV / fs) → /blog/[slug] (SSR)`

- **Dataset layer:** columns are type-detected (currency, year, rank, category, URL); the ranking metric and name column are inferred; all statistics are computed in code. Nothing is hardcoded to fintech.
- **AI layer:** a provider chain (`LLM_PROVIDERS`, default `workers-ai,gemini,ollama`). Each adapter implements one function. The first that works wins; if none do, deterministic template copy is used and the UI says so. The LLM only writes prose from pre-computed stats, so figures cannot be hallucinated. Model output is validated (`cleanCopy`) before it is stored.
- **Presentation layer:** one Nuxt page renders any `BlogData` JSON; no `v-html`, so CSV and LLM text is always escaped.
- **Providers:** Workers AI (default on Cloudflare, no key; model `WORKERS_AI_MODEL`, default `@cf/google/gemma-4-26b-a4b-it`), Gemini (API key), Ollama (`OLLAMA_URL`; local/self-hosted only, not reachable from Cloudflare).

## Run locally
```bash
npm install
cp .env.example .env   # set GEMINI_API_KEY and/or OLLAMA_URL
npm run dev            # http://localhost:3000 (storage: .data/, no Workers AI)
npm test
```

## Seed the showcase (fintech) page
```bash
cp /path/to/fintech.csv data/fintech.csv
GEMINI_API_KEY=... npm run seed -- data/fintech.csv "UK fintech companies"
```
This writes `data/seed/<slug>.json`; commit it. Seeds load into storage on every boot.

## Deploy to Cloudflare Workers
```bash
npm run build:cf                     # Nitro cloudflare_module build -> .output/
npx wrangler login
npx wrangler deploy --config .output/server/wrangler.json
```
Bindings come from `nuxt.config.ts` (`AI` = Workers AI, `BLOGS` = KV). If your Wrangler version does not auto-create the KV namespace, run `npx wrangler kv namespace create BLOGS` and add its `id` under `nitro.cloudflare.wrangler.kv_namespaces`. Optional secret fallback: `npx wrangler secret put GEMINI_API_KEY --config .output/server/wrangler.json`.
Seed pages in `data/seed/` are copied into KV on first request. Anyone can then upload a CSV at the public URL with no keys on their side.

## Limitations
- Workers AI free tier is 10,000 neurons/day (roughly 150 generations with the default model, by my estimate); beyond that the chain falls through to Gemini/Ollama if configured, then template copy.
- KV is eventually consistent across regions: a freshly generated page can take a short while to appear elsewhere.
- The Workers AI adapter assumes the model supports `response_format: json_schema`; output is also parsed leniently and validated. It has not been tested against the live binding (local dev can't reach it).
- Upload limit 2 MB, 1000 table rows; per-IP rate limit (15/hour) is in-memory, so it is per Worker instance, not global; use Cloudflare rate-limiting rules for real protection.
- Column inference is heuristic; unusual CSVs may pick a different ranking metric.
- No auth on uploads (by design for the demo).
