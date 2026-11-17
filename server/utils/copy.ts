import type { BlogCopy, BlogData } from '../../shared/types'

type Analysis = Pick<BlogData, 'sourceFileName' | 'metric' | 'columns' | 'rows' | 'insights' | 'categories'>

export function topicFromFileName(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Dataset'
}

/** Deterministic copy used when no LLM key is configured or the LLM call fails. */
export function templateCopy(a: Analysis, topicHint?: string): BlogCopy {
  const topic = topicHint?.trim() || topicFromFileName(a.sourceFileName)
  const n = a.rows.length
  const year = new Date().getFullYear()
  const byMetric = a.metric ? ` by ${a.metric.label}` : ''
  const lead = a.insights.find(i => i.label === 'Largest entry')
  return {
    topic,
    title: `${topic}: Top ${n} Ranked${byMetric} (${year})`.slice(0, 70),
    metaDescription: `Explore the top ${n} ${topic.toLowerCase()}${byMetric}, with a full ranking table, key statistics and insights.`.slice(0, 158),
    h1: `${topic}: Top ${n}${byMetric}`,
    intro: [
      `This page ranks ${n} entries in ${topic.toLowerCase()}${byMetric}. Use the table below to compare them side by side.`,
      lead ? `${lead.detail}` : `Scroll down for the key statistics derived from the dataset.`
    ],
    takeaways: a.insights.slice(0, 4).map(i => i.detail),
    sections: [
      { heading: 'Key statistics', body: a.insights.map(i => i.detail).join(' ') },
      { heading: 'How the ranking works', body: `Entries are ordered${byMetric}. All figures come directly from the uploaded dataset (${a.sourceFileName}).` }
    ],
    faq: [
      { question: `How many entries are in this ranking?`, answer: `There are ${n} entries.` },
      ...(lead ? [{ question: `Who is ranked first?`, answer: lead.detail }] : [])
    ]
  }
}
