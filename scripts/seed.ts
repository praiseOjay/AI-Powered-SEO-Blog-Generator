// Usage: npx tsx scripts/seed.ts data/fintech.csv "UK fintech companies"
// Generates a blog from a CSV and writes it to data/seed/ so it ships with the repo.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename } from 'node:path'
import { buildBlog, configFromEnv } from '../server/utils/pipeline'
import { hashCsv } from '../server/utils/hash'

const [file, topic] = process.argv.slice(2)
if (!file) { console.error('Usage: tsx scripts/seed.ts <file.csv> [topic]'); process.exit(1) }
const csv = readFileSync(file, 'utf8')
const { blog, warning } = await buildBlog(csv, basename(file), configFromEnv(process.env), topic, undefined, { sourceHash: await hashCsv(csv) })
mkdirSync('data/seed', { recursive: true })
writeFileSync(`data/seed/${blog.slug}.json`, JSON.stringify(blog, null, 2))
console.log(`Wrote data/seed/${blog.slug}.json (${blog.generatedBy})`, warning ?? '')
