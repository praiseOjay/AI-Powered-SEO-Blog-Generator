# AI-Powered SEO Blog Generator

Upload any CSV dataset and get a server-rendered, SEO-optimised blog page: title and meta description, introduction, headings, computed statistics, charts, a paginated ranking table, an FAQ and structured data. The copy is written by an LLM; every number is computed in code.

**Live demo:** https://praiseojay-ai-powered-seo-blog-generator.overload-api.workers.dev/
**Showcase page (UK fintech, top 100 by total raised):** `/blog/uk-fintech-companies`

The interviewer needs no keys, installs or setup: open the URL, upload a CSV, and a new page is generated and shown.

## Tools used

| Tool | Purpose |
|---|---|
| [Nuxt 4](https://nuxt.com) (Vue, Nitro) | Server-side rendered pages and API routes |
| Cloudflare Workers | Hosting (free plan) |
| Cloudflare Workers AI (`@cf/google/gemma-4-26b-a4b-it`) | Default LLM for the copy, via an `AI` binding (no API key) |
| Cloudflare KV | Stores generated pages |
| Google Gemini API, Ollama | Optional alternative LLM providers (adapters) |
| Vitest | Unit tests |
| Claude Code | AI-assisted development (see the reflection report) |

CSV parsing is a small in-house RFC 4180 parser (`server/utils/csv.ts`): Papa Parse broke Nitro's Cloudflare build.

## How it works

```
upload (CSV) -> hash / dedupe -> parse -> analyse -> write copy -> store -> /blog/[slug] (SSR)
                                  csv.ts   analyze.ts   llm.ts       KV
```

Three layers are kept separate so the system stays maintainable and reusable:

1. **Dataset layer** (`csv.ts`, `analyze.ts`): infers column types (currency like `£30,314,247` or `$1.2B`, years, ranks, categories, URLs), picks the name and ranking columns, ranks the rows and computes all statistics. Nothing is specific to fintech.
2. **AI layer** (`llm.ts`, `pipeline.ts`, `copy.ts`): a provider chain tried in order (`LLM_PROVIDERS`, default `workers-ai,gemini,ollama`). The LLM only writes prose (title, meta description, intro, takeaways, sections, FAQ) from the precomputed statistics, as schema-constrained JSON that is validated before it is stored. If every provider fails or none is configured, deterministic template copy is used and the user is told.
3. **Presentation layer** (`app/pages/blog/[slug].vue` and components): one page renders any stored page. Charts are plain HTML/CSS with real-text fallbacks. The server renders **every** table row so crawlers and no-JavaScript users get the full ranking; pagination, sorting and page size are applied after hydration. No `v-html`: CSV and LLM text is always escaped.

### What changes per dataset
The title, meta description, Open Graph tags, canonical URL, JSON-LD (`Article`, `ItemList` listing every entry, `FAQPage`), statistics, charts and table all come from the uploaded data. Charts appear only when the data supports them (top-10 bars and histogram need a numeric ranking column; category breakdowns need low-cardinality text columns).

### SEO
Server-rendered HTML, one `<h1>` with a logical heading order, unique title and description per page, canonical link, Open Graph and Twitter tags, JSON-LD, `robots.txt`, `sitemap.xml`, semantic landmarks, skip link, and a fast first paint. A Lighthouse (mobile) run on the earlier design scored 99 / 100 / 100 / 100 (Performance / Accessibility / Best Practices / SEO); re-run it after any design change.

## Run locally

Requires Node 20+ (tested on 22).

```bash
npm install
cp .env.example .env      # optional: set GEMINI_API_KEY and/or OLLAMA_URL
npm run dev               # http://localhost:3000
npm test                  # unit tests
```

Locally, pages are stored in `./.data/` and the Workers AI binding is not available, so set `GEMINI_API_KEY` or run [Ollama](https://ollama.com) (`OLLAMA_URL=http://localhost:11434`) to get AI copy. With no provider you get template copy, which is enough to test the whole workflow.

To try the production build: `npm run build && npm start`.

## Configuration

Set in `.env` locally, or as Worker variables / secrets in Cloudflare.

| Variable | Default | Purpose |
|---|---|---|
| `LLM_PROVIDERS` | `workers-ai,gemini,ollama` | Providers to try, in order. Unconfigured ones are skipped |
| `WORKERS_AI_MODEL` | `@cf/google/gemma-4-26b-a4b-it` | Workers AI model id |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | - , `gemini-2.5-flash` | Gemini (free key: https://aistudio.google.com/apikey) |
| `OLLAMA_URL`, `OLLAMA_MODEL` | - , `llama3.1:8b` | Local or self-hosted Ollama (not reachable from Cloudflare) |
| `ADMIN_TOKEN` | unset | 16+ character secret enabling admin actions (below). Unset = disabled |
| `INDEX_UPLOADED_PAGES` | `false` | `true` lets anonymous uploads be indexed (otherwise `noindex` and not in the sitemap) |
| `NUXT_PUBLIC_SITE_URL` | request host | Public origin used in the sitemap |

Bindings in `nuxt.config.ts`: `AI` (Workers AI) and `BLOGS` (KV). Locally the `blogs` storage uses the filesystem; the Cloudflare build switches it to KV.

## Deploy to Cloudflare Workers

```bash
npm run build:cf
npx wrangler login
npx wrangler deploy --config .output/server/wrangler.json
npx wrangler secret put ADMIN_TOKEN --config .output/server/wrangler.json   # optional
npx wrangler secret put GEMINI_API_KEY --config .output/server/wrangler.json # optional fallback
```

If your Wrangler version does not create the KV namespace automatically, run `npx wrangler kv namespace create BLOGS` and add its `id` under `nitro.cloudflare.wrangler.kv_namespaces` in `nuxt.config.ts`.

Seed pages in `data/seed/` are copied into KV on first request (and refreshed if the seed file changes), so a fresh deployment always has the showcase page.

## Seed the showcase page

```bash
cp /path/to/fintech.csv data/fintech.csv
GEMINI_API_KEY=... npm run seed -- data/fintech.csv "UK fintech companies"
```

This writes `data/seed/<slug>.json` (including the dataset hash so re-uploading the same CSV reuses the page). Commit it and redeploy. With no key it writes template copy.

## Duplicates, regeneration and admin

- **Same dataset twice:** the CSV is hashed (BOM, newline and whitespace insensitive). A repeat upload reuses the existing page: no LLM call and no duplicate. If that page only has template copy and an AI provider is now available, it is upgraded in place.
- **Same topic, different data:** gets a new URL (`topic-2`, `topic-3`, ...). Anonymous uploads never overwrite an existing page, including the showcase.
- **Notices:** the upload form says when template copy was used or an existing page was reused; template-copy pages also show a banner.
- **Admin actions** (need `ADMIN_TOKEN`):
  ```bash
  # replace a page's data and copy, keeping its URL
  curl -H "Authorization: Bearer $ADMIN_TOKEN" -F file=@new.csv -F replace=my-slug $SITE/api/generate
  # re-run only the AI copy
  curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" $SITE/api/blogs/my-slug/regenerate
  # delete a page
  curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" $SITE/api/blogs/my-slug
  ```

## API

| Route | Description |
|---|---|
| `POST /api/generate` | Multipart: `file` (CSV, max 2 MB), optional `topic`. Returns `{ slug, url, generatedBy, warning?, duplicate? }` |
| `GET /api/blogs` | List generated pages |
| `GET /api/blogs/:slug` | One page as JSON |
| `POST /api/blogs/:slug/regenerate`, `DELETE /api/blogs/:slug` | Admin only |
| `GET /sitemap.xml`, `GET /robots.txt` | Crawler files (sitemap lists indexable pages only) |

## Project structure

```
app/            Nuxt pages and components (blog page, ranking table, charts, upload form)
server/api/     generate, list, read, regenerate, delete
server/utils/   csv, analyze, llm (providers), pipeline, copy (template), store, hash, config
shared/         types and formatting helpers used by server and app
data/seed/      pre-generated pages shipped with the repo
tests/          Vitest unit tests
```

## Limitations

- Workers AI's free tier is 10,000 neurons per day (roughly 150 generations by my estimate with the default model). Beyond that the chain falls through to Gemini or Ollama if configured, then template copy.
- Statistics are computed in code, but the model can still misquote a number in prose. There is no automated faithfulness check yet; read generated copy before relying on it.
- Column detection is heuristic: unusual headers can pick a different ranking column than intended.
- Duplicate detection is by exact content: a CSV with one changed cell is a new dataset.
- KV is eventually consistent across regions, so a new page can take a moment to appear everywhere. Storing each page as one JSON blob suits tens to hundreds of pages, not thousands (see the reflection report for the V2 design).
- Upload limit 2 MB; tables show at most 1,000 rows. The per-IP rate limit (15 generations an hour) is in memory, so it is per Worker instance, not global.
- Uploads are public by design for the demo: anyone can generate pages, and the homepage lists them.
