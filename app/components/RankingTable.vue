<script setup lang="ts">
import type { BlogData, Cell, Column } from '#shared/types'
import { formatCompact } from '#shared/format'
const props = defineProps<{ blog: BlogData }>()
const sortKey = ref('_rank'); const asc = ref(true)
const rows = computed(() => {
  const k = sortKey.value
  return [...props.blog.rows].sort((a, b) => {
    const x = a[k], y = b[k]
    if (x == null) return 1; if (y == null) return -1
    const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    return asc.value ? r : -r
  })
})
function sortBy(k: string) { if (sortKey.value === k) asc.value = !asc.value; else { sortKey.value = k; asc.value = true } }
const isNum = (c: Column) => ['number', 'currency', 'rank', 'year'].includes(c.type)
function show(c: Column, v: Cell) {
  if (v == null) return '—'
  if (c.type === 'currency') return formatCompact(v as number, props.blog.metric?.key === c.key ? props.blog.metric.symbol : '£')
  if (c.type === 'number') return Number(v).toLocaleString('en-GB')
  return String(v)
}
const href = (v: Cell) => /^https?:/i.test(String(v)) ? String(v) : `https://${v}`
const ariaSort = (k: string) => sortKey.value === k ? (asc.value ? 'ascending' : 'descending') : 'none'
</script>
<template>
  <div class="table-wrap" tabindex="0" role="region" aria-label="Ranking table (scrollable)">
    <table>
      <caption>{{ blog.rows.length }} entries{{ blog.truncated ? ' (truncated)' : '' }}. Click a column heading to sort.</caption>
      <thead><tr>
        <th v-for="c in blog.columns" :key="c.key" scope="col" :class="{ num: isNum(c) }" :aria-sort="ariaSort(c.key)">
          <button type="button" @click="sortBy(c.key)">{{ c.label }}</button>
        </th>
      </tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="String(r._rank)">
          <template v-for="c in blog.columns" :key="c.key">
            <th v-if="c.type === 'rank'" scope="row" class="num">{{ r[c.key] }}</th>
            <td v-else :class="{ num: isNum(c) }">
              <a v-if="c.type === 'url' && r[c.key]" :href="href(r[c.key])" rel="noopener nofollow">{{ r[c.key] }}</a>
              <template v-else>{{ show(c, r[c.key]) }}</template>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
