import { describe, expect, it, vi } from 'vitest'
import { groupDiamonds } from '../src/services/diamond-parser'
import { extractMp4s } from '../src/services/mp4-processor'

describe('extractMp4s', () => {
  it('copies one MP4 per view into a diamond output folder and does not fail when source is complete', async () => {
    vi.useFakeTimers()
    const diamonds = groupDiamonds([
      { folderName: 'Krish_Front', relativePath: 'Krish_Front', files: [{ name: 'video.mp4' }] },
      { folderName: 'Krish_Top', relativePath: 'Krish_Top', files: [{ name: 'clip.mp4' }] },
    ])

    const pending = extractMp4s({
      diamonds,
      outputPath: 'D:/DiamondOutput',
      duplicatePolicy: 'rename',
      onProgress: () => undefined,
    })
    await vi.runAllTimersAsync()
    const result = await pending

    expect(result.outcome).toBe('success')
    expect(result.copied).toBe(2)
    expect(result.files.map((file) => file.outputPath)).toEqual([
      'D:/DiamondOutput/Krish/Front.mp4',
      'D:/DiamondOutput/Krish/Top.mp4',
    ])
    vi.useRealTimers()
  })

  it('skips missing MP4s and reports inaccessible folders as failures', async () => {
    vi.useFakeTimers()
    const diamonds = groupDiamonds([
      { folderName: 'Rahul_Front', relativePath: 'Rahul_Front', files: [] },
      {
        folderName: 'Rahul_ER',
        relativePath: 'Rahul_ER',
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
