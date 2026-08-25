import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS } from '../src/models/diamond'
import { groupDiamonds } from '../src/services/diamond-parser'
import { filterDiamonds, fuzzyIncludes, matchesQuery } from '../src/services/search'

const diamonds = groupDiamonds([
  { folderName: 'Krish_Front', relativePath: 'Krish_Front', files: [{ name: 'video.mp4' }] },
  { folderName: 'Krish_360', relativePath: 'Krish_360', files: [{ name: 'video.mp4' }] },
  { folderName: 'KRISH_ER', relativePath: 'KRISH_ER', files: [{ name: 'video.mp4' }] },
  { folderName: 'Rahul_Front', relativePath: 'Rahul_Front', files: [] },
])

describe('search', () => {
  it('matches base name, folder name, and view regardless of case', () => {
    expect(matchesQuery(diamonds[0], 'krish')).toBe(true)
    expect(matchesQuery(diamonds[0], 'Krish_Front')).toBe(true)
    expect(matchesQuery(diamonds[0], '360')).toBe(true)
    expect(matchesQuery(diamonds[0], 'nope')).toBe(false)
  })

  it('supports fuzzy subsequence matching', () => {
    expect(fuzzyIncludes('krish', 'ksh')).toBe(true)
    expect(fuzzyIncludes('krish', 'z')).toBe(false)
  })

  it('filters by view and MP4 availability', () => {
    const found = filterDiamonds(diamonds, 'Krish', {
      ...EMPTY_FILTERS,
      views: ['ER'],
    })
    expect(found.map((item) => item.id)).toEqual(['krish'])

    const missing = filterDiamonds(diamonds, '', {
      ...EMPTY_FILTERS,
      mp4: ['missing'],
    })
    expect(missing.map((item) => item.id)).toEqual(['rahul'])
  })
})
