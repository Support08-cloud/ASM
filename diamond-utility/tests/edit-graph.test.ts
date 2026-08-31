import { describe, expect, it } from 'vitest'
import { DEFAULT_GRADE, DEFAULT_TRANSFORM, type EditorClip } from '../src/models/editor'
import { atempoChain, cropInsets, videoFiltersForClip } from '../src/services/edit-graph'

const clip = (patch: Partial<EditorClip> = {}): EditorClip => ({
  id: 'c1',
  label: 'a.mp4',
  sourcePath: 'D:/a.mp4',
  absolutePath: 'D:/a.mp4',
  sourceDurationMs: 4000,
  inMs: 0,
  outMs: 4000,
  speed: 1,
  volume: 1,
  muted: false,
  filter: 'none',
  effect: 'none',
  grade: { ...DEFAULT_GRADE },
  transform: { ...DEFAULT_TRANSFORM },
  fadeInMs: 0,
  fadeOutMs: 0,
  transition: 'none',
  transitionMs: 0,
  color: '#c6691d',
  ...patch,
})

describe('edit graph', () => {
  it('chains atempo so ffmpeg stays in 0.5–2', () => {
    expect(atempoChain(1)).toBe('')
    expect(atempoChain(2)).toBe('atempo=2')
    expect(atempoChain(4)).toBe('atempo=2,atempo=2')
    expect(atempoChain(0.25)).toBe('atempo=0.5,atempo=0.5')
  })

  it('puts visual filters and speed in one ffmpeg chain', () => {
    const vf = videoFiltersForClip(
      clip({
        speed: 2,
        filter: 'warm',
        fadeInMs: 350,
        transform: { ...DEFAULT_TRANSFORM, flipH: true, crop: 0.1 },
      }),
      2,
    ).join(',')
    expect(vf).toContain('hflip')
    expect(vf).toContain('crop=')
    expect(vf).toContain('setpts=PTS/2')
    expect(vf).toContain('fade=t=in')
    expect(vf).toContain('gamma_r=1.12')
  })

  it('locks crop sides to the chosen aspect', () => {
    const boxed = cropInsets(
      clip({
        transform: { ...DEFAULT_TRANSFORM, cropEnabled: true, cropTop: 0, cropBottom: 0, cropLeft: 0.1, cropRight: 0.1, cropAspect: '1:1' },
      }),
    )
    const width = 1 - boxed.left - boxed.right
    const height = 1 - boxed.top - boxed.bottom
    expect(width / height).toBeCloseTo(9 / 16, 2)
  })
})
