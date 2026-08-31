import { describe, expect, it, vi } from 'vitest'
import { groupDiamonds } from '../src/services/diamond-parser'
import { extractMp4s } from '../src/services/mp4-processor'
import { withSelectedFolders } from '../src/models/diamond'

describe('extractMp4s', () => {
  it('copies selected variant MP4s into one base folder named after the source folders', async () => {
    vi.useFakeTimers()
    const diamonds = groupDiamonds([
      { folderName: '260602-362', relativePath: '260602-362', files: [] },
      { folderName: '260602-362-1', relativePath: '260602-362-1', files: [{ name: 'video.mp4' }] },
      { folderName: '260602-362-2', relativePath: '260602-362-2', files: [{ name: 'clip.mp4' }] },
      { folderName: '260602-362-3', relativePath: '260602-362-3', files: [{ name: 'video.mp4' }] },
      { folderName: '260602-362-RG', relativePath: '260602-362-RG', files: [{ name: 'video.mp4' }] },
    ])
    const selected = withSelectedFolders(
      diamonds,
      diamonds[0].folders.filter((folder) => !folder.isBase).map((folder) => folder.id),
    )

    const pending = extractMp4s({
      diamonds: selected,
      outputPath: 'D:/Output_Testing',
      duplicatePolicy: 'rename',
      onProgress: () => undefined,
    })
    await vi.runAllTimersAsync()
    const result = await pending

    expect(result.outcome).toBe('success')
    expect(result.copied).toBe(4)
    expect(result.files.map((file) => file.outputPath)).toEqual([
      'D:/Output_Testing/260602-362/260602-362-1.mp4',
      'D:/Output_Testing/260602-362/260602-362-2.mp4',
      'D:/Output_Testing/260602-362/260602-362-3.mp4',
      'D:/Output_Testing/260602-362/260602-362-RG.mp4',
    ])
    expect(result.files.some((file) => file.outputPath.endsWith('260602-362.mp4'))).toBe(false)
    vi.useRealTimers()
  })

  it('includes the base folder MP4 only when that folder is selected', async () => {
    vi.useFakeTimers()
    const diamonds = groupDiamonds([
      { folderName: 'ABC123', relativePath: 'ABC123', files: [{ name: 'video.mp4' }] },
      { folderName: 'ABC123-1', relativePath: 'ABC123-1', files: [{ name: 'video.mp4' }] },
      { folderName: 'ABC123-RG', relativePath: 'ABC123-RG', files: [{ name: 'video.mp4' }] },
    ])
    const allIds = diamonds[0].folders.map((folder) => folder.id)
    const pending = extractMp4s({
      diamonds: withSelectedFolders(diamonds, allIds),
      outputPath: 'D:/Output_Testing',
      duplicatePolicy: 'rename',
      onProgress: () => undefined,
    })
    await vi.runAllTimersAsync()
    const result = await pending
    expect(result.files.map((file) => file.outputPath)).toEqual([
      'D:/Output_Testing/ABC123/ABC123.mp4',
      'D:/Output_Testing/ABC123/ABC123-1.mp4',
      'D:/Output_Testing/ABC123/ABC123-RG.mp4',
    ])
    vi.useRealTimers()
  })

  it('skips missing MP4s and reports inaccessible folders as failures', async () => {
    vi.useFakeTimers()
    const diamonds = groupDiamonds([
      { folderName: 'Rahul-1', relativePath: 'Rahul-1', files: [] },
      {
        folderName: 'Rahul-RG',
        relativePath: 'Rahul-RG',
        accessible: false,
        errorMessage: 'denied',
        files: [{ name: 'video.mp4' }],
      },
    ])
    const pending = extractMp4s({
      diamonds,
      outputPath: '/out',
      duplicatePolicy: 'skip',
      onProgress: () => undefined,
    })
    await vi.runAllTimersAsync()
    const result = await pending
    expect(result.skipped).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.outcome).toBe('error')
    vi.useRealTimers()
  })
})
