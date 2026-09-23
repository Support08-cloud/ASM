import { describe, expect, it } from 'vitest'
import { formatBytes, formatCount, formatRelativeTime } from '../src/utils/format'

describe('formatBytes', () => {
  it('scales through the unit ladder', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2_048)).toBe('2 KB')
    expect(formatBytes(5_242_880)).toBe('5.0 MB')
    expect(formatBytes(3_221_225_472)).toBe('3.00 GB')
  })
})

describe('formatCount', () => {
  it('pluralizes based on the value', () => {
    expect(formatCount(1, 'record')).toBe('1 record')
    expect(formatCount(4, 'record')).toBe('4 records')
    expect(formatCount(2, 'entry', 'entries')).toBe('2 entries')
  })
})

describe('formatRelativeTime', () => {
  it('handles a missing timestamp', () => {
    expect(formatRelativeTime(null)).toBe('Never')
  })

  it('describes recent timestamps relatively', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('Just now')
    expect(formatRelativeTime(new Date(Date.now() - 30_000).toISOString())).toMatch(/^\d+s ago$/)
    expect(formatRelativeTime(new Date(Date.now() - 600_000).toISOString())).toMatch(/^\d+m ago$/)
  })
})
