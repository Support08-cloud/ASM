import { describe, expect, it } from 'vitest'
import type { ProcessFileResult } from '../src/models/processing'
import { mergePreparedProject } from '../src/services/prepare-media'
import { projectFromCopiedFiles } from '../src/services/timeline'

const file = (name: string): ProcessFileResult => ({
  diamondName: 'yash',
  viewLabel: name,
  sourcePath: `D:/in/${name}/a.mp4`,
  outputPath: `D:/in/${name}/a.mp4`,
  status: 'copied',
})

describe('mergePreparedProject', () => {
  it('keeps a trim made while the playback copy is still being prepared', () => {
    const seed = projectFromCopiedFiles([file('yash-01')], 'D:/out/yash', 'yash')
    const current = {
      ...seed,
      clips: seed.clips.map((clip) => ({ ...clip, inMs: 500 })),
      playheadMs: 1200,
    }
    const prepared = {
      ...seed,
      clips: seed.clips.map((clip) => ({
        ...clip,
        proxyPath: 'D:/out/yash/.edit-cache/proxy.mp4',
        ready: true,
        hasAudio: true,
        durationProbed: true,
        sourceDurationMs: 9000,
        inMs: 0,
        outMs: 9000,
      })),
      playheadMs: 0,
    }
    const merged = mergePreparedProject(current, prepared, seed)
    expect(merged.playheadMs).toBe(1200)
    expect(merged.clips[0].inMs).toBe(500)
    expect(merged.clips[0].proxyPath).toBe('D:/out/yash/.edit-cache/proxy.mp4')
    expect(merged.clips[0].ready).toBe(true)
    expect(merged.clips[0].sourceDurationMs).toBe(seed.clips[0].sourceDurationMs)
  })

  it('applies the probed duration when the clip has not been edited', () => {
    const seed = projectFromCopiedFiles([file('yash-01')], 'D:/out/yash', 'yash')
    const prepared = {
      ...seed,
      clips: seed.clips.map((clip) => ({
        ...clip,
        ready: true,
        durationProbed: true,
        sourceDurationMs: 9000,
        outMs: 9000,
      })),
    }
    const merged = mergePreparedProject(seed, prepared, seed)
    expect(merged.clips[0].outMs).toBe(9000)
    expect(merged.clips[0].durationProbed).toBe(true)
  })
})
