import { describe, expect, it } from 'vitest'
import { groupDiamonds } from '../src/services/diamond-parser'
import {
  applyDuration,
  applyTransition,
  editOutputDir,
  clipAtTime,
  clipPlayDurationMs,
  clipStartMs,
  createExtra,
  mediaFilesForEdit,
  moveClip,
  projectDurationMs,
  projectFromCopiedFiles,
  setVolume,
  splitClip,
  timelineDurationMs,
  timeInsideClip,
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
    expect(project.clips[0].transition).toBe('none')
    expect(project.clips[0].fadeInMs).toBe(0)
    expect(timelineDurationMs(project.clips)).toBe(16000)
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

  it('plays into the next clip from its start when clips are back to back', () => {
    const project = projectFromCopiedFiles([file('A'), file('B')], '/out', 'A')
    const end = clipStartMs(project.clips, 0) + clipPlayDurationMs(project.clips[0])
    const hit = clipAtTime(project.clips, end)
    expect(hit?.index).toBe(1)
    expect(hit?.localMs).toBe(0)
    expect(hit?.startMs).toBe(end)
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

  it('collects every MP4 from the selected machine folders for one merge', () => {
    const diamonds = groupDiamonds([
      { folderName: 'yash-01', relativePath: 'D:/in/yash-01', files: [{ name: 'a.mp4', absolutePath: 'D:/in/yash-01/a.mp4' }] },
      { folderName: 'yash-02', relativePath: 'D:/in/yash-02', files: [{ name: 'b.mp4', absolutePath: 'D:/in/yash-02/b.mp4' }] },
    ])
    const files = mediaFilesForEdit(diamonds, false)
    expect(files.map((file) => file.outputPath)).toEqual(['D:/in/yash-01/a.mp4', 'D:/in/yash-02/b.mp4'])
    expect(files.every((file) => file.diamondName === 'yash')).toBe(true)
  })

  it('writes a merge export into the output folder, not beside the source videos', () => {
    const sources = [
      file('yash-01'),
      { ...file('yash-02'), outputPath: 'D:/in/yash-02/b.mp4' },
    ]
    expect(editOutputDir(sources, 'D:/out/yash')).toBe('D:/out/yash')
    expect(editOutputDir(
      [{ ...file('260602-362-1'), outputPath: 'D:/out/260602-362/260602-362-1.mp4' }],
      'D:/out',
    )).toBe('D:/out/260602-362')
  })

  it('maps a click on the second clip to that point on the timeline', () => {
    const project = projectFromCopiedFiles([file('260602-362-1'), file('260602-362-2')], 'D:/out', '260602-362')
    expect(timeInsideClip(project.clips, 1, 0.5)).toBe(6000)
    expect(timeInsideClip(project.clips, 0, 0)).toBe(0)
  })

  it('ignores a duration the player could not measure', () => {
    const project = projectFromCopiedFiles([file('260602-362-1')], 'D:/out', '260602-362')
    const clip = project.clips[0]
    expect(applyDuration(clip, Number.POSITIVE_INFINITY)).toBe(clip)
    expect(applyDuration(clip, Number.NaN).outMs).toBe(clip.outMs)
  })
})
