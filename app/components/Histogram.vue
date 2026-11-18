<script setup lang="ts">
// Distribution of a numeric column as columns, one hue. The tallest bin is labelled; the rest are in the
// tooltip and the "view as table" fallback.
const props = defineProps<{ title: string; subtitle?: string; values: number[]; format: (n: number) => string; bins?: number }>()
const bins = computed(() => {
  const n = props.bins ?? 8
  const vs = props.values.filter(Number.isFinite)
  if (!vs.length) return []
  const lo = Math.min(...vs), hi = Math.max(...vs), w = (hi - lo) / n || 1
  const out = Array.from({ length: n }, (_, i) => ({ from: lo + i * w, to: lo + (i + 1) * w, count: 0 }))
  for (const v of vs) out[Math.min(Math.floor((v - lo) / w), n - 1)].count++
  return out
})
const peak = computed(() => Math.max(...bins.value.map(b => b.count), 1))
const peakIndex = computed(() => bins.value.findIndex(b => b.count === peak.value))
const range = (b: { from: number; to: number }) => `${props.format(b.from)} – ${props.format(b.to)}`
</script>
<template>
  <figure v-if="bins.length" class="chart">
    <figcaption>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </figcaption>
    <div class="hist" role="img" :aria-label="`${title}. Most entries, ${bins[peakIndex].count}, fall between ${range(bins[peakIndex])}.`">
      <div class="hist-plot">
        <span class="hist-grid" style="bottom: 100%"><i>{{ peak }}</i></span>
        <span class="hist-grid" style="bottom: 50%"><i>{{ Math.round(peak / 2) }}</i></span>
        <div v-for="(b, i) in bins" :key="i" class="hist-col" tabindex="0" :data-tip="`${range(b)}: ${b.count} ${b.count === 1 ? 'entry' : 'entries'}`">
          <span v-if="i === peakIndex" class="hist-peak">{{ b.count }}</span>
          <span class="hist-bar" :style="{ height: `${(b.count / peak) * 100}%` }" />
        </div>
      </div>
      <div class="hist-axis"><span v-for="(b, i) in bins" :key="i">{{ format(b.from) }}</span></div>
    </div>
    <details class="table-view">
      <summary>View as table</summary>
      <table>
        <caption class="sr-only">{{ title }}</caption>
        <thead><tr><th scope="col">Range</th><th scope="col" class="num">Entries</th></tr></thead>
        <tbody><tr v-for="(b, i) in bins" :key="i"><th scope="row">{{ range(b) }}</th><td class="num">{{ b.count }}</td></tr></tbody>
      </table>
    </details>
  </figure>
</template>
