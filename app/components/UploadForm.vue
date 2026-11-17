<script setup lang="ts">
const busy = ref(false); const error = ref(''); const warning = ref('')
async function submit(e: Event) {
  error.value = warning.value = ''; busy.value = true
  try {
    const res = await $fetch<{ url: string; warning?: string }>('/api/generate', { method: 'POST', body: new FormData(e.target as HTMLFormElement) })
    await navigateTo(res.url)
  } catch (err: any) { error.value = err?.data?.statusMessage || err?.statusMessage || 'Upload failed.' }
  finally { busy.value = false }
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
  </form>
</template>
