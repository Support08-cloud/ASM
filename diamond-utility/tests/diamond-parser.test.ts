import { describe, expect, it } from 'vitest'
import { withSelectedFolders } from '../src/models/diamond'
import { classifyFile, groupDiamonds, parseFolderName } from '../src/services/diamond-parser'

describe('parseFolderName', () => {
  it('keeps hyphenated stone IDs as the base and treats -1/-2/-RG as variants', () => {
    expect(parseFolderName('260602-362')).toEqual({ baseName: '260602-362', variant: '', isBase: true })
    expect(parseFolderName('260602-362-1')).toEqual({ baseName: '260602-362', variant: '1', isBase: false })
    expect(parseFolderName('260602-362-2')).toEqual({ baseName: '260602-362', variant: '2', isBase: false })
    expect(parseFolderName('260602-362-RG')).toEqual({ baseName: '260602-362', variant: 'RG', isBase: false })
    expect(parseFolderName('Krish-1')).toEqual({ baseName: 'Krish', variant: '1', isBase: false })
    expect(parseFolderName('Krish')).toEqual({ baseName: 'Krish', variant: '', isBase: true })
  })
})

describe('groupDiamonds', () => {
  it('groups 260602-362 variants under one diamond', () => {
    const diamonds = groupDiamonds([
      { folderName: '260602-362', relativePath: '260602-362', files: [] },
      { folderName: '260602-362-1', relativePath: '260602-362-1', files: [{ name: 'video.mp4' }] },
      { folderName: '260602-362-2', relativePath: '260602-362-2', files: [{ name: 'video.mp4' }] },
      { folderName: '260602-362-3', relativePath: '260602-362-3', files: [{ name: 'video.mp4' }] },
      { folderName: '260602-362-RG', relativePath: '260602-362-RG', files: [{ name: 'video.mp4' }] },
    ])

    expect(diamonds).toHaveLength(1)
    expect(diamonds[0].baseName).toBe('260602-362')
    expect(diamonds[0].folders.map((folder) => folder.folderName)).toEqual([
      '260602-362',
      '260602-362-1',
      '260602-362-2',
      '260602-362-3',
      '260602-362-RG',
    ])
    expect(diamonds[0].status).toBe('ready')
    expect(diamonds[0].mp4).toEqual({ found: 4, expected: 4, availability: 'available' })
  })

  it('does not treat a missing MP4 on the base folder as a warning', () => {
    const diamonds = groupDiamonds([
      { folderName: '260602-362', relativePath: '260602-362', files: [] },
      { folderName: '260602-362-1', relativePath: '260602-362-1', files: [{ name: 'video.mp4' }] },
    ])
    expect(diamonds[0].status).toBe('ready')
  })

  it('groups Krish-* folders even when the base folder is absent', () => {
    const diamonds = groupDiamonds([
      { folderName: 'Krish-1', relativePath: 'Krish-1', files: [{ name: 'video.mp4' }] },
      { folderName: 'Krish-2', relativePath: 'Krish-2', files: [{ name: 'video.mp4' }] },
    ])
    expect(diamonds).toHaveLength(1)
    expect(diamonds[0].baseName).toBe('Krish')
  })

  it('keeps a selected-folder subset without inventing a base MP4', () => {
    const diamonds = groupDiamonds([
      { folderName: '260602-362', relativePath: '260602-362', files: [] },
      { folderName: '260602-362-1', relativePath: '260602-362-1', files: [{ name: 'video.mp4' }] },
      { folderName: '260602-362-RG', relativePath: '260602-362-RG', files: [{ name: 'video.mp4' }] },
    ])
    const selected = withSelectedFolders(
      diamonds,
      diamonds[0].folders.filter((folder) => !folder.isBase).map((folder) => folder.id),
    )
    expect(selected[0].folders.map((folder) => folder.folderName)).toEqual(['260602-362-1', '260602-362-RG'])
  })

  it('keeps different stone IDs separate', () => {
    const diamonds = groupDiamonds([
      { folderName: '260602-362-1', relativePath: 'a', files: [{ name: 'video.mp4' }] },
      { folderName: '250801-125-1', relativePath: 'b', files: [{ name: 'video.mp4' }] },
    ])
    expect(diamonds.map((item) => item.baseName)).toEqual(['250801-125', '260602-362'])
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
