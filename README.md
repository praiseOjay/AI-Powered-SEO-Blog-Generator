# AI-Powered SEO Blog Generator

Upload any ranked CSV → get a server-rendered, SEO-optimised blog page (title, meta, intro, stats, ranking table, FAQ + JSON-LD).

**Stack:** Nuxt 4 (SSR) · Papa Parse · Google Gemini API (free tier) · Nitro storage · Vitest

## How it works
`CSV → parse (csv.ts) → analyse (analyze.ts, deterministic) → copy (llm.ts, Gemini; copy.ts fallback) → store (Nitro storage, JSON) → /blog/[slug] (SSR)`

- **Dataset layer:** columns are type-detected (currency, year, rank, category, URL), the ranking metric and name column are inferred, and all statistics are computed in code. Nothing is hardcoded to fintech.
- **AI layer:** Gemini only writes prose (title, meta, intro, sections, FAQ) from the pre-computed stats, using a JSON response schema. It never computes numbers, so figures cannot be hallucinated. If no key is set or the call fails, deterministic template copy is used and the UI says so.
- **Presentation layer:** one Nuxt page template renders any `BlogData` JSON; no `v-html`, so CSV/LLM text is always escaped.

## Run locally
```bash
npm install
cp .env.example .env   # add GEMINI_API_KEY (free: https://aistudio.google.com/apikey)
npm run dev            # http://localhost:3000
npm test
```

## Seed the showcase (fintech) page
```bash
cp /path/to/fintech.csv data/fintech.csv
GEMINI_API_KEY=... npm run seed -- data/fintech.csv "UK fintech companies"
```
This writes `data/seed/<slug>.json`; commit it. Seeds load into storage on every boot.

## Deploy (free, e.g. Render web service)
Build `npm install && npm run build`, start `npm start`, set env `GEMINI_API_KEY` (and optionally `NUXT_PUBLIC_SITE_URL`). Anyone can then upload a CSV at the public URL without keys.

## Limitations
- Default storage is the local filesystem: on hosts with ephemeral disks, uploaded pages vanish on restart (seeded pages return). Swap the `blogs` driver in `nuxt.config.ts` (Redis/KV) for persistence.
- Upload limit 2 MB, 1000 table rows; in-memory per-IP rate limit (15/hour) protects the free LLM quota.
- Column inference is heuristic; unusual CSVs may pick a different ranking metric.
- No auth on uploads (by design for the demo).
