<script setup lang="ts">
// Ranked horizontal bars, one hue. Real text in an HTML list, so it works without JS and for screen readers.
export interface BarItem { label: string; value: number; text: string; note?: string; muted?: boolean }
const props = defineProps<{ title: string; subtitle?: string; items: BarItem[] }>()
const max = computed(() => Math.max(...props.items.map(i => i.value), 1))
const width = (v: number) => `${Math.max((v / max.value) * 100, 1.5)}%`
</script>
<template>
  <figure class="chart">
    <figcaption>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </figcaption>
    <ul class="bars">
      <li v-for="i in items" :key="i.label" class="bar-row" tabindex="0" :data-tip="`${i.label}: ${i.text}${i.note ? ' · ' + i.note : ''}`">
        <span class="bar-label">{{ i.label }}</span>
        <span class="bar-track"><span class="bar-fill" :class="{ muted: i.muted }" :style="{ width: width(i.value) }" /></span>
        <span class="bar-value">{{ i.text }}</span>
        <span v-if="i.note" class="bar-note">{{ i.note }}</span>
      </li>
    </ul>
  </figure>
</template>
