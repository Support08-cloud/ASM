import { describe, expect, it } from 'vitest'
import { filterRecords } from '../src/services/search'
import type { RecordItem } from '../src/models/app'

const records: RecordItem[] = [
  {
    id: 'a',
    code: 'AURORA',
    label: 'Aurora collection',
    status: 'ready',
    itemCount: 4,
    sizeBytes: 1024,
    updatedAt: '2026-09-23T00:00:00.000Z',
    tags: ['batch-a'],
  },
  {
    id: 'b',
    code: 'BASALT',
    label: 'Basalt collection',
    status: 'warning',
    itemCount: 9,
    sizeBytes: 2048,
    updatedAt: '2026-09-23T00:00:00.000Z',
    tags: ['priority'],
  },
]

describe('filterRecords', () => {
  it('returns everything for an empty query', () => {
    expect(filterRecords(records, '   ')).toHaveLength(2)
  })

  it('matches on code, label, tag, and status', () => {
    expect(filterRecords(records, 'aurora').map((record) => record.id)).toEqual(['a'])
    expect(filterRecords(records, 'basalt collection').map((record) => record.id)).toEqual(['b'])
    expect(filterRecords(records, 'priority').map((record) => record.id)).toEqual(['b'])
    expect(filterRecords(records, 'warning').map((record) => record.id)).toEqual(['b'])
  })

  it('requires every term to match', () => {
    expect(filterRecords(records, 'aurora priority')).toEqual([])
  })

  it('ignores case and surrounding whitespace', () => {
    expect(filterRecords(records, '  AuRoRa  ').map((record) => record.id)).toEqual(['a'])
  })
})
