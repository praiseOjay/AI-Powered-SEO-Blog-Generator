<script setup lang="ts">
const { data: blogs } = await useFetch('/api/blogs')
useSeoMeta({ title: 'AI-Powered SEO Blog Generator', description: 'Upload a CSV dataset and get a server-rendered, SEO-optimised ranking blog page generated with AI.' })
const steps = [
  { t: 'Upload', d: 'Drop in any ranked CSV: companies, products, places.' },
  { t: 'Analyse', d: 'Statistics and charts are computed in code, never invented by the AI.' },
  { t: 'Publish', d: 'An LLM writes the copy and a server-rendered page goes live from one shared template.' }
]
</script>
<template>
  <div>
    <section class="hero home-hero">
      <p class="eyebrow">CSV → SEO blog</p>
      <h1>Turn any CSV into an SEO-optimised blog</h1>
      <p class="lead">Upload a ranked dataset. Statistics are computed in code, the copy is written by an LLM, and a fast, accessible, server-rendered page is created from the same template.</p>
    </section>
    <section class="block" aria-labelledby="up-h"><h2 id="up-h" class="sr-only">Upload a dataset</h2><UploadForm /></section>
    <section class="block" aria-labelledby="how-h">
      <h2 id="how-h">How it works</h2>
      <ol class="steps"><li v-for="(s, i) in steps" :key="s.t" class="card"><span class="step-n">{{ i + 1 }}</span><h3>{{ s.t }}</h3><p>{{ s.d }}</p></li></ol>
    </section>
    <section class="block" aria-labelledby="pages-h">
      <h2 id="pages-h">Generated pages</h2>
      <ul v-if="blogs?.length" class="page-list">
        <li v-for="b in blogs" :key="b.slug" class="card">
          <NuxtLink :to="`/blog/${b.slug}`">{{ b.title }}</NuxtLink>
          <p>{{ b.description }}</p>
          <small>{{ b.rows }} rows · {{ b.generatedBy === 'template' ? 'template copy' : 'AI copy' }}</small>
        </li>
      </ul>
      <p v-else>No pages yet. Upload a CSV above.</p>
    </section>
  </div>
</template>
