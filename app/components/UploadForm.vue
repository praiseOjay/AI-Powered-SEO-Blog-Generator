<script setup lang="ts">
interface Result { url: string; generatedBy: string; warning?: string; duplicate?: boolean; regenerated?: boolean }
const busy = ref(false)
const error = ref('')
const result = ref<Result | null>(null)

const notice = computed(() => {
  const r = result.value
  if (!r) return ''
  const parts: string[] = []
  if (r.duplicate && r.regenerated) parts.push('This dataset was already uploaded, but its copy was a template fallback, so it has now been regenerated.')
  else if (r.duplicate) parts.push('This exact dataset was already generated, so the existing page is being reused instead of creating a duplicate.')
  if (r.warning) parts.push(r.warning)
  return parts.join(' ')
})

const headline = computed(() => {
  const r = result.value
  if (!r) return ''
  if (r.regenerated) return 'Existing page upgraded with AI copy.'
  if (r.duplicate) return 'Existing page found.'
  return r.generatedBy === 'template' ? 'Page created with template copy.' : 'Page ready.'
})

async function submit(e: Event) {
  error.value = ''
  result.value = null
  busy.value = true
  try {
    const res = await $fetch<Result>('/api/generate', { method: 'POST', body: new FormData(e.target as HTMLFormElement) })
    // Clean AI success: go straight to the page. Anything the user should know about (fallback, duplicate): tell them first.
    if (!res.warning && !res.duplicate) await navigateTo(res.url)
    else result.value = res
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.statusMessage || 'Upload failed.'
  } finally { busy.value = false }
}
</script>
<template>
  <form class="upload" @submit.prevent="submit">
    <div><label for="file"><strong>CSV dataset</strong> (max 2 MB, first row = headers)</label>
      <input id="file" name="file" type="file" accept=".csv,text/csv" required></div>
    <div><label for="topic"><strong>Topic hint</strong> (optional, e.g. “UK healthtech startups”)</label>
      <input id="topic" name="topic" type="text" maxlength="100"></div>
    <button class="primary" type="submit" :disabled="busy">{{ busy ? 'Generating… (up to ~30s)' : 'Generate blog page' }}</button>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="result" class="notice" :class="{ warn: result.generatedBy === 'template' }" role="status">
      <p><strong>{{ headline }}</strong> {{ notice }}</p>
      <p><NuxtLink :to="result.url">View the page →</NuxtLink></p>
    </div>
  </form>
</template>
