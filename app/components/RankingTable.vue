<script setup lang="ts">
import type { BlogData, Cell, Column } from '#shared/types'
import { formatCompact } from '#shared/format'

const props = defineProps<{ blog: BlogData }>()

// Progressive enhancement: the server renders EVERY row (crawlers and no-JS users get the full ranking).
// After hydration we switch to paginated slices.
const enhanced = ref(false)
onMounted(() => { enhanced.value = true })

const sortKey = ref('_rank'); const asc = ref(true)
const page = ref(1); const pageSize = ref(10)
const sizes = [10, 25, 50, 100]
const wrap = ref<HTMLElement | null>(null)

const sorted = computed(() => {
  const k = sortKey.value
  return [...props.blog.rows].sort((a, b) => {
    const x = a[k], y = b[k]
    if (x == null) return 1
    if (y == null) return -1
    const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    return asc.value ? r : -r
  })
})
const total = computed(() => sorted.value.length)
const pages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const visible = computed(() => enhanced.value ? sorted.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value) : sorted.value)
const first = computed(() => enhanced.value ? (page.value - 1) * pageSize.value + 1 : 1)
const last = computed(() => enhanced.value ? Math.min(page.value * pageSize.value, total.value) : total.value)

const pageList = computed(() => {
  const p = page.value, n = pages.value
  const set = new Set([1, n, p - 1, p, p + 1])
  const nums = [...set].filter(x => x >= 1 && x <= n).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  nums.forEach((x, i) => { if (i && x - nums[i - 1] > 1) out.push('…'); out.push(x) })
  return out
})

function go(p: number) {
  page.value = Math.min(Math.max(p, 1), pages.value)
  nextTick(() => wrap.value?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }))
}
function sortBy(k: string) { if (sortKey.value === k) asc.value = !asc.value; else { sortKey.value = k; asc.value = true }; page.value = 1 }
watch(pageSize, () => { page.value = 1 })

const metricKey = computed(() => props.blog.metric?.key)
const metricMax = computed(() => Math.max(...props.blog.rows.map(r => (metricKey.value ? Number(r[metricKey.value]) : 0)).filter(Number.isFinite), 1))
const nameKey = computed(() => props.blog.nameKey ?? props.blog.columns.find(c => c.type === 'text')?.key)
const longCols = computed(() => new Set(props.blog.columns.filter(c => c.type === 'text' && props.blog.rows.slice(0, 20).reduce((s, r) => s + String(r[c.key] ?? '').length, 0) / 20 > 40).map(c => c.key)))

const isNum = (c: Column) => ['number', 'currency', 'rank', 'year'].includes(c.type)
function show(c: Column, v: Cell) {
  if (v == null) return '—'
  if (c.type === 'currency') return formatCompact(v as number, props.blog.metric?.key === c.key ? props.blog.metric.symbol : '£')
  if (c.type === 'number') return Number(v).toLocaleString('en-GB')
  return String(v)
}
const href = (v: Cell) => /^https?:/i.test(String(v)) ? String(v) : `https://${v}`
const ariaSort = (k: string) => sortKey.value === k ? (asc.value ? 'ascending' : 'descending') : 'none'
const barWidth = (c: Column, v: Cell) => c.key === metricKey.value && typeof v === 'number' ? `${Math.max((v / metricMax.value) * 100, 2)}%` : undefined
</script>
<template>
  <div class="ranking">
    <p class="table-status" aria-live="polite">
      Showing <strong>{{ first }}–{{ last }}</strong> of <strong>{{ total }}</strong> entries{{ blog.truncated ? ' (list truncated)' : '' }}
    </p>
    <div ref="wrap" class="table-wrap" tabindex="0" role="region" aria-label="Ranking table (scrollable)">
      <table>
        <caption class="sr-only">Ranking of {{ total }} entries. Use the column headings to sort.</caption>
        <thead><tr>
          <th v-for="c in blog.columns" :key="c.key" scope="col"
              :class="{ num: isNum(c), 'sticky-rank': c.type === 'rank', 'sticky-name': c.key === nameKey, long: longCols.has(c.key) }" :aria-sort="ariaSort(c.key)">
            <button type="button" @click="sortBy(c.key)">{{ c.label }}<span class="sort-ind" aria-hidden="true">{{ sortKey === c.key ? (asc ? ' ▲' : ' ▼') : '' }}</span></button>
          </th>
        </tr></thead>
        <tbody>
          <tr v-for="r in visible" :key="String(r._rank)">
            <template v-for="c in blog.columns" :key="c.key">
              <th v-if="c.type === 'rank'" scope="row" class="num sticky-rank"><span class="rank-pill" :class="{ top: Number(r[c.key]) <= 3 }">{{ r[c.key] }}</span></th>
              <td v-else :class="{ num: isNum(c), 'sticky-name': c.key === nameKey, long: longCols.has(c.key), 'has-bar': c.key === metricKey }">
                <a v-if="c.type === 'url' && r[c.key]" :href="href(r[c.key])" rel="noopener nofollow">{{ String(r[c.key]).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') }}</a>
                <template v-else>{{ show(c, r[c.key]) }}<span v-if="barWidth(c, r[c.key])" class="mini-bar" aria-hidden="true"><span :style="{ width: barWidth(c, r[c.key]) }" /></span></template>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="enhanced" class="pager" aria-label="Ranking pagination">
      <label class="pager-size">Rows per page
        <select v-model.number="pageSize"><option v-for="s in sizes" :key="s" :value="s">{{ s }}</option></select>
      </label>
      <ol>
        <li><button type="button" :disabled="page === 1" aria-label="Previous page" @click="go(page - 1)">‹ Prev</button></li>
        <li v-for="(p, i) in pageList" :key="i">
          <span v-if="p === '…'" class="ellipsis" aria-hidden="true">…</span>
          <button v-else type="button" :aria-current="p === page ? 'page' : undefined" :aria-label="`Page ${p}`" :class="{ active: p === page }" @click="go(p)">{{ p }}</button>
        </li>
        <li><button type="button" :disabled="page === pages" aria-label="Next page" @click="go(page + 1)">Next ›</button></li>
      </ol>
    </nav>
  </div>
</template>
