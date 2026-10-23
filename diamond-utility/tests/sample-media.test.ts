import { describe, expect, it } from 'vitest'
import { isDemoPath, isRealDiskPath, sampleFileForName, sampleMediaUrl } from '../src/services/sample-media'

describe('sample media mapping', () => {
  it('maps variant suffixes onto the shipped sample clips', () => {
    expect(sampleFileForName('260602-362-1.mp4')).toBe('clip-1.mp4')
    expect(sampleFileForName('260602-362-2.mp4')).toBe('clip-2.mp4')
    expect(sampleFileForName('260602-362-3.mp4')).toBe('clip-3.mp4')
    expect(sampleFileForName('260602-362-RG.mp4')).toBe('clip-rg.mp4')
    expect(sampleMediaUrl('Meera-RG')).toBe('./samples/clip-rg.mp4')
  })

  it('treats the sample dataset as demo and Windows paths as real disk', () => {
    expect(isDemoPath('Sample Dataset / Output_Testing/260602-362/260602-362-1.mp4')).toBe(true)
    expect(isDemoPath('./samples/clip-1.mp4')).toBe(true)
    expect(isRealDiskPath('D:/Output_Testing/260602-362/260602-362-1.mp4')).toBe(true)
    expect(isRealDiskPath('Sample Dataset / Output_Testing/a.mp4')).toBe(false)
  })
})
