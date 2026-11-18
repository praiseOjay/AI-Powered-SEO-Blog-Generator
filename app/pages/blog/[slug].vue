<script setup lang="ts">
import type { BlogData } from '#shared/types'
import { formatCompact } from '#shared/format'
const route = useRoute()
const { data: blog } = await useFetch<BlogData>(`/api/blogs/${route.params.slug}`)
if (!blog.value) throw createError({ statusCode: 404, statusMessage: 'Blog not found', fatal: true })
const b = blog.value
const url = `${useRequestURL().origin}/blog/${b.slug}`
// Entry list for the ItemList JSON-LD: name column + optional website column, capped to keep the page light.
const nameKey = b.nameKey ?? b.columns.find(c => c.type === 'text')?.key
const urlKey = b.columns.find(c => c.type === 'url')?.key
const itemList = b.rows.slice(0, 100).flatMap((r, i) => {
  const name = nameKey ? r[nameKey] : null
  if (typeof name !== 'string') return []
  const site = urlKey ? String(r[urlKey] ?? '') : ''
  return [{ '@type': 'ListItem', position: Number(r._rank ?? i + 1), name, ...(site ? { url: /^https?:/i.test(site) ? site : `https://${site}` } : {}) }]
})
useSeoMeta({
  title: b.copy.title, description: b.copy.metaDescription,
  ogTitle: b.copy.title, ogDescription: b.copy.metaDescription, ogType: 'article', ogUrl: url,
  twitterCard: 'summary'
})
useHead({
  link: [{ rel: 'canonical', href: url }],
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify([
    { '@context': 'https://schema.org', '@type': 'Article', headline: b.copy.title, description: b.copy.metaDescription, datePublished: b.createdAt, mainEntityOfPage: url },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: b.copy.h1, numberOfItems: b.rows.length, itemListOrder: 'https://schema.org/ItemListOrderAscending', itemListElement: itemList },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: b.copy.faq.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }
  ]).replace(/</g, '\\u003c') }]
})
const n = b.rows.length
const fmt = (v: number) => b.metric?.unit === 'currency' ? formatCompact(v, b.metric.symbol) : formatCompact(v)
const metricKey = b.metric?.key
const totalInsight = b.insights.find(i => /^total/i.test(i.label))
const tiles = b.insights.filter(i => i !== totalInsight && i.label !== 'Entries ranked')
const topItems = metricKey ? b.rows.slice(0, 10).flatMap((r) => {
  const name = nameKey ? r[nameKey] : null, v = r[metricKey]
  return typeof name === 'string' && typeof v === 'number' ? [{ label: name, value: v, text: fmt(v) }] : []
}) : []
const metricValues = metricKey ? b.rows.map(r => r[metricKey]).filter((v): v is number => typeof v === 'number') : []
const categoryCharts = b.categories.map((c) => {
  const shown = c.items.reduce((s, i) => s + i.count, 0)
  const items = c.items.map(i => ({ label: i.name, value: i.count, text: `${i.count} · ${Math.round(i.count / n * 100)}%`, note: i.total ? `${fmt(i.total)} total` : undefined }))
  if (shown < n) items.push({ label: 'Other', value: n - shown, text: `${n - shown} · ${Math.round((n - shown) / n * 100)}%`, note: undefined, muted: true } as never)
  return { key: c.key, title: `Entries by ${c.label}`, subtitle: `Number of entries per ${c.label.toLowerCase()}${b.metric ? `; ${b.metric.label} totals shown beneath` : ''}`, items }
})
</script>
<template>
  <article class="post">
    <header class="hero">
      <p class="eyebrow">Ranking · {{ n }} entries</p>
      <h1>{{ b.copy.h1 }}</h1>
      <p v-for="(p, i) in b.copy.intro" :key="i" :class="{ lead: i === 0 }">{{ p }}</p>
      <ul class="chips" aria-label="Page details">
        <li v-if="b.metric">Ranked by {{ b.metric.label }}</li>
        <li>Updated {{ b.createdAt.slice(0, 10) }}</li>
        <li>Source: {{ b.sourceFileName }}</li>
      </ul>
    </header>

    <section aria-labelledby="stats-h" class="block">
      <h2 id="stats-h">Statistics at a glance</h2>
      <div class="kpi-wrap">
        <div v-if="totalInsight" class="hero-figure">
          <span class="hero-label">{{ totalInsight.label }}</span>
          <span class="hero-value">{{ totalInsight.value }}</span>
          <span class="hero-detail">{{ totalInsight.detail }}</span>
        </div>
        <dl class="stats"><div v-for="s in tiles" :key="s.label" class="stat"><dt>{{ s.label }}</dt><dd>{{ s.value }}</dd></div></dl>
      </div>
    </section>

    <section aria-labelledby="take-h" class="block">
      <h2 id="take-h">Key takeaways</h2>
      <ul class="takeaways"><li v-for="(t, i) in b.copy.takeaways" :key="i">{{ t }}</li></ul>
    </section>

    <section v-if="topItems.length || categoryCharts.length" aria-labelledby="viz-h" class="block">
      <h2 id="viz-h">Visual breakdown</h2>
      <div class="charts">
        <div v-if="topItems.length" class="card"><BarChart :title="`Top ${topItems.length} by ${b.metric?.label}`" subtitle="Highest-ranked entries" :items="topItems" /></div>
        <div class="charts-masonry">
          <div v-if="metricValues.length >= 5" class="card"><Histogram :title="`Distribution of ${b.metric?.label}`" subtitle="Number of entries in each range" :values="metricValues" :format="fmt" /></div>
          <div v-for="c in categoryCharts" :key="c.key" class="card"><BarChart :title="c.title" :subtitle="c.subtitle" :items="c.items" /></div>
        </div>
      </div>
    </section>

    <section aria-labelledby="rank-h" class="block">
      <h2 id="rank-h">Full ranking</h2>
      <RankingTable :blog="b" />
    </section>

    <section v-for="s in b.copy.sections" :key="s.heading" class="block prose"><h2>{{ s.heading }}</h2><p>{{ s.body }}</p></section>

    <section aria-labelledby="faq-h" class="block">
      <h2 id="faq-h">Frequently asked questions</h2>
      <details v-for="f in b.copy.faq" :key="f.question" class="faq"><summary>{{ f.question }}</summary><p>{{ f.answer }}</p></details>
    </section>
    <p class="source"><small>{{ b.generatedBy === 'template' ? 'Template copy' : `Copy by ${b.model}` }} · every figure computed from {{ b.sourceFileName }}</small></p>
  </article>
</template>
