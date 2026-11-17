<script setup lang="ts">
import type { BlogData } from '#shared/types'
const route = useRoute()
const { data: blog } = await useFetch<BlogData>(`/api/blogs/${route.params.slug}`)
if (!blog.value) throw createError({ statusCode: 404, statusMessage: 'Blog not found', fatal: true })
const b = blog.value
const url = `${useRequestURL().origin}/blog/${b.slug}`
useSeoMeta({
  title: b.copy.title, description: b.copy.metaDescription,
  ogTitle: b.copy.title, ogDescription: b.copy.metaDescription, ogType: 'article', ogUrl: url,
  twitterCard: 'summary'
})
useHead({
  link: [{ rel: 'canonical', href: url }],
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify([
    { '@context': 'https://schema.org', '@type': 'Article', headline: b.copy.title, description: b.copy.metaDescription, datePublished: b.createdAt, mainEntityOfPage: url },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: b.copy.h1, numberOfItems: b.rows.length },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: b.copy.faq.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }
  ]).replace(/</g, '\\u003c') }]
})
const max = (items: { count: number }[]) => Math.max(...items.map(i => i.count))
</script>
<template>
  <article>
    <h1>{{ b.copy.h1 }}</h1>
    <p v-for="(p, i) in b.copy.intro" :key="i" :class="{ lead: i === 0 }">{{ p }}</p>

    <h2>Key takeaways</h2>
    <ul><li v-for="(t, i) in b.copy.takeaways" :key="i">{{ t }}</li></ul>

    <h2>Statistics at a glance</h2>
    <dl class="stats"><div v-for="s in b.insights" :key="s.label" class="stat"><dt>{{ s.label }}</dt><dd>{{ s.value }}</dd></div></dl>

    <template v-for="cat in b.categories" :key="cat.key">
      <h2>Breakdown by {{ cat.label }}</h2>
      <ul class="bars">
        <li v-for="i in cat.items" :key="i.name"><span>{{ i.name }}</span>
          <span class="bar" :style="{ width: `${(i.count / max(cat.items)) * 100}%` }" aria-hidden="true" /><span>{{ i.count }}</span></li>
      </ul>
    </template>

    <h2>Full ranking</h2>
    <RankingTable :blog="b" />

    <section v-for="s in b.copy.sections" :key="s.heading"><h2>{{ s.heading }}</h2><p>{{ s.body }}</p></section>

    <h2>Frequently asked questions</h2>
    <details v-for="f in b.copy.faq" :key="f.question"><summary>{{ f.question }}</summary><p>{{ f.answer }}</p></details>
    <p><small>Source: {{ b.sourceFileName }} · {{ b.generatedBy === 'template' ? 'template copy' : `copy by ${b.model}` }} · {{ b.createdAt.slice(0, 10) }}</small></p>
  </article>
</template>
