<script setup lang="ts">
const { data: blogs } = await useFetch('/api/blogs')
useSeoMeta({ title: 'AI-Powered SEO Blog Generator', description: 'Upload a CSV dataset and get a server-rendered, SEO-optimised ranking blog page generated with AI.' })
</script>
<template>
  <section>
    <h1>Turn any CSV into an SEO-optimised blog</h1>
    <p class="lead">Upload a ranked dataset. Statistics are computed in code, the copy is written by an LLM, and a server-rendered page is created from the same template.</p>
    <UploadForm />
    <h2>Generated pages</h2>
    <ul v-if="blogs?.length">
      <li v-for="b in blogs" :key="b.slug"><NuxtLink :to="`/blog/${b.slug}`">{{ b.title }}</NuxtLink> <small>· {{ b.rows }} rows · {{ b.generatedBy === 'template' ? 'template copy' : 'AI copy' }}</small></li>
    </ul>
    <p v-else>No pages yet — upload a CSV above.</p>
  </section>
</template>
