import { describe, expect, it } from 'vitest'
import {
  applyTransition,
  clipPlayDurationMs,
  createExtra,
  extrasAtTime,
  extrasForPreview,
  moveClip,
  projectDurationMs,
  projectFromCopiedFiles,
  setVolume,
  skipPlayhead,
  slipClip,
  splitClip,
  timelineDurationMs,
  trimClip,
} from '../src/services/timeline'
import type { ProcessFileResult } from '../src/models/processing'

const file = (name: string): ProcessFileResult => ({
  diamondName: '260602-362',
  viewLabel: name,
  sourcePath: `${name}/video.mp4`,
  outputPath: `D:/Output_Testing/260602-362/${name}.mp4`,
  status: 'copied',
})

describe('timeline', () => {
  it('builds one project from copied variant MP4s', () => {
    const files = ['260602-362-1', '260602-362-2', '260602-362-3', '260602-362-RG'].map(file)
    const project = projectFromCopiedFiles(files, 'D:/Output_Testing/260602-362', '260602-362')
    expect(project.clips).toHaveLength(4)
    expect(project.extraClips).toEqual([])
    expect(project.masterVolume).toBe(1)
    expect(project.clips[0].volume).toBe(1)
    expect(project.clips[0].filter).toBe('none')
    expect(project.clips[0].mediaUrl).toBeUndefined()
    expect(project.clips[0].effect).toBe('none')
    expect(project.clips[0].grade.transparency).toBe(1)
    expect(project.clips.map((clip) => clip.label)).toEqual([
      '260602-362-1.mp4',
      '260602-362-2.mp4',
      '260602-362-3.mp4',
      '260602-362-RG.mp4',
    ])
  })

  it('trims in/out and changes play duration with speed', () => {
    const project = projectFromCopiedFiles([file('A')], '/out', 'A')
    const trimmed = trimClip(project.clips[0], 'in', 1000)
    expect(trimmed.inMs).toBe(1000)
    expect(clipPlayDurationMs({ ...trimmed, speed: 2 })).toBe(1500)
  })

  it('subtracts transition overlap from the total duration', () => {
    const project = projectFromCopiedFiles([file('A'), file('B')], '/out', 'A')
    const withFade = project.clips.map((clip) => applyTransition(clip, 'fade', 500))
    expect(timelineDurationMs(withFade)).toBe(4000 + 4000 - 500)
    const hardCut = project.clips.map((clip) => applyTransition(clip, 'none'))
    expect(timelineDurationMs(hardCut)).toBe(8000)
  })

  it('splits a clip at the playhead and can reorder', () => {
    const project = projectFromCopiedFiles([file('A'), file('B')], '/out', 'A')
    const split = splitClip(project.clips[0], 2000)
    expect(split).not.toBeNull()
    expect(split![0].outMs).toBe(2000)
    expect(split![1].inMs).toBe(2000)
    const moved = moveClip(project.clips, 0, 1)
    expect(moved.map((clip) => clip.label)).toEqual(['B.mp4', 'A.mp4'])
  })

  it('keeps extra tracks in the project duration and scales clip volume', () => {
    const project = projectFromCopiedFiles([file('A')], '/out', 'A')
    const quieter = setVolume(project.clips[0], 0.25)
    expect(quieter.volume).toBe(0.25)
    const music = createExtra('audio', 2000, { durationMs: 8000 })
    expect(projectDurationMs({ clips: project.clips, extraClips: [music] })).toBe(10000)
    expect(clipPlayDurationMs(project.clips[0])).toBe(4000)
  })

  it('slips media without changing duration and skips clip to clip', () => {
    const project = projectFromCopiedFiles([file('A'), file('B')], '/out', 'A')
    const clip = { ...project.clips[0], sourceDurationMs: 8000, outMs: 4000 }
    const slipped = slipClip(clip, 500)
    expect(slipped.outMs - slipped.inMs).toBe(4000)
    expect(slipped.inMs).toBe(500)
    expect(skipPlayhead(project.clips, 100, 1)).toBeGreaterThan(0)
    expect(skipPlayhead(project.clips, 100, -1)).toBe(0)
  })

  it('keeps a selected extra on Program even when the playhead is outside it', () => {
    const title = createExtra('text', 4000, { durationMs: 2000 })
    expect(extrasAtTime([title], 100)).toEqual([])
    expect(extrasForPreview([title], 100, title.id)).toEqual([title])
    expect(extrasForPreview([title], 4500, title.id)).toEqual([title])
  })
})
