import { describe, expect, it } from 'vitest'
import { classifyFile, groupDiamonds, parseFolderName } from '../src/services/diamond-parser'

describe('parseFolderName', () => {
  it('groups view suffixes into a diamond base name', () => {
    expect(parseFolderName('Krish_Front')).toEqual({ baseName: 'Krish', view: 'Front' })
    expect(parseFolderName('Krish_3D')).toEqual({ baseName: 'Krish', view: '3D' })
    expect(parseFolderName('KRISH_ER')).toEqual({ baseName: 'KRISH', view: 'ER' })
    expect(parseFolderName('Rahul-360')).toEqual({ baseName: 'Rahul', view: '360' })
  })

  it('keeps folders without a known view as the diamond name', () => {
    expect(parseFolderName('ABC123')).toEqual({ baseName: 'ABC123', view: 'Unknown' })
  })
})

describe('groupDiamonds', () => {
  it('turns Krish_* folders into one diamond record', () => {
    const diamonds = groupDiamonds([
      { folderName: 'Krish_Front', relativePath: 'Krish_Front', files: [{ name: 'video.mp4' }, { name: 'meta.json' }, { name: 'a.jpg' }] },
      { folderName: 'Krish_3D', relativePath: 'Krish_3D', files: [{ name: 'video.mp4' }, { name: 'meta.json' }, { name: 'a.jpg' }] },
      { folderName: 'Krish_Top', relativePath: 'Krish_Top', files: [{ name: 'video.mp4' }, { name: 'meta.json' }, { name: 'a.jpg' }] },
      { folderName: 'Krish_360', relativePath: 'Krish_360', files: [{ name: 'video.mp4' }, { name: 'meta.json' }, { name: 'a.jpg' }] },
      { folderName: 'KRISH_ER', relativePath: 'KRISH_ER', files: [{ name: 'video.mp4' }, { name: 'meta.json' }, { name: 'a.jpg' }] },
    ])

    expect(diamonds).toHaveLength(1)
    expect(diamonds[0].id).toBe('krish')
    expect(diamonds[0].views.map((view) => view.view)).toEqual(['Front', '3D', 'Top', '360', 'ER'])
    expect(diamonds[0].status).toBe('ready')
    expect(diamonds[0].mp4).toEqual({ found: 5, expected: 5, availability: 'available' })
    expect(diamonds[0].json).toEqual({ found: 5, expected: 5 })
    expect(diamonds[0].images).toEqual({ found: 5, expected: 5 })
  })

  it('counts media presence per view, not raw file totals', () => {
    const diamonds = groupDiamonds([
      {
        folderName: 'Krish_Front',
        relativePath: 'Krish_Front',
        files: [{ name: 'a.jpg' }, { name: 'b.jpg' }, { name: 'c.jpg' }, { name: 'video.mp4' }],
      },
    ])
    expect(diamonds[0].images.found).toBe(1)
    expect(diamonds[0].images.expected).toBe(1)
    expect(diamonds[0].mp4.found).toBe(1)
  })

  it('marks missing and multiple MP4s as warnings and inaccessible folders as errors', () => {
    const diamonds = groupDiamonds([
      { folderName: 'ABC123_Front', relativePath: 'ABC123_Front', files: [{ name: 'video.mp4' }] },
      { folderName: 'ABC123_Top', relativePath: 'ABC123_Top', files: [{ name: 'meta.json' }] },
      {
        folderName: 'Stone_ER',
        relativePath: 'Stone_ER',
        accessible: false,
        errorMessage: 'denied',
        files: [],
      },
      {
        folderName: 'Lot_Front',
        relativePath: 'Lot_Front',
        files: [{ name: 'a.mp4' }, { name: 'b.mp4' }],
      },
    ])

    const abc = diamonds.find((item) => item.id === 'abc123')
    const stone = diamonds.find((item) => item.id === 'stone')
    const lot = diamonds.find((item) => item.id === 'lot')
    expect(abc?.status).toBe('warning')
    expect(abc?.mp4.availability).toBe('missing')
    expect(stone?.status).toBe('error')
    expect(lot?.mp4).toEqual({ found: 1, expected: 1, availability: 'multiple' })
  })
})

describe('classifyFile', () => {
  it('classifies media by extension', () => {
    expect(classifyFile('video.mp4')).toBe('mp4')
    expect(classifyFile('meta.json')).toBe('json')
    expect(classifyFile('frame_01.jpg')).toBe('image')
    expect(classifyFile('notes.txt')).toBe('other')
  })
})
