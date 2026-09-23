import type { RecordItem } from '../models/app'

export function filterRecords(records: RecordItem[], search: string): RecordItem[] {
  const query = search.trim().toLowerCase()
  if (!query) return records

  const terms = query.split(/\s+/)
  return records.filter((record) => {
    const haystack = `${record.code} ${record.label} ${record.tags.join(' ')} ${record.status}`.toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}
