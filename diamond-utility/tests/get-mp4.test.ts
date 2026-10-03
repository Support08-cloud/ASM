import { describe, expect, it } from 'vitest'
import { getMp4BlockedReason } from '../src/services/get-mp4'
import { clipPlaybackSources } from '../src/services/media-url'

describe('get mp4 toolbar', () => {
  it('blocks Get MP4 until source, output, and folders are chosen', () => {
    expect(getMp4BlockedReason({ phase: 'idle', sourcePath: null, outputPath: null, selectedIds: [] })).toBe(
      'Select a source folder first',
    )
    expect(
      getMp4BlockedReason({ phase: 'ready', sourcePath: 'D:/in', outputPath: null, selectedIds: ['a'] }),
    ).toBe('Choose an output folder first')
    expect(
      getMp4BlockedReason({ phase: 'ready', sourcePath: 'D:/in', outputPath: 'D:/out', selectedIds: [] }),
    ).toBe('Select one or more variant folders')
    expect(
      getMp4BlockedReason({ phase: 'ready', sourcePath: 'D:/in', outputPath: 'D:/out', selectedIds: ['a'] }),
    ).toBeUndefined()
  })
})

describe('clip playback sources', () => {
  it('falls back from a proxy to the original file URL', () => {
    const sources = clipPlaybackSources({
      proxyPath: undefined,
      absolutePath: './samples/clip.mp4',
      mediaUrl: './samples/clip.mp4',
      sourcePath: './samples/clip.mp4',
    })
    expect(sources[0]).toBe('./samples/clip.mp4')
    expect(sources).toHaveLength(1)
  })
})
