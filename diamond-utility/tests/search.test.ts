import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS } from '../src/models/diamond'
import { groupDiamonds } from '../src/services/diamond-parser'
import { filterDiamonds, fuzzyIncludes, matchesQuery } from '../src/services/search'

const diamonds = groupDiamonds([
  { folderName: '260602-362', relativePath: '260602-362', files: [] },
  { folderName: '260602-362-1', relativePath: '260602-362-1', files: [{ name: 'video.mp4' }] },
  { folderName: '260602-362-RG', relativePath: '260602-362-RG', files: [{ name: 'video.mp4' }] },
  { folderName: 'Rahul-1', relativePath: 'Rahul-1', files: [] },
])

describe('search', () => {
  it('matches base name and variant folder names', () => {
    expect(matchesQuery(diamonds[0], '260602-362')).toBe(true)
    expect(matchesQuery(diamonds[0], '260602-362-1')).toBe(true)
    expect(matchesQuery(diamonds[0], 'RG')).toBe(true)
    expect(matchesQuery(diamonds[0], 'nope')).toBe(false)
  })

  it('supports fuzzy subsequence matching', () => {
    expect(fuzzyIncludes('260602-362', '260362')).toBe(true)
    expect(fuzzyIncludes('krish', 'z')).toBe(false)
  })

  it('filters by variant and MP4 availability', () => {
    const found = filterDiamonds(diamonds, '260602', {
      ...EMPTY_FILTERS,
      variants: ['RG'],
    })
    expect(found.map((item) => item.id)).toEqual(['260602-362'])

    const missing = filterDiamonds(diamonds, '', {
      ...EMPTY_FILTERS,
      mp4: ['missing'],
    })
    expect(missing.map((item) => item.baseName)).toEqual(['Rahul'])
  })
})
