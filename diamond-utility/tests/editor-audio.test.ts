import { describe, expect, it } from 'vitest'
import { DEFAULT_DUCKING, DEFAULT_EXPORT, DEFAULT_GRADE, DEFAULT_TRANSFORM, type ExtraClip } from '../src/models/editor'
import { addVolumeKeyframe, duckingGain, interpolateVolume, volumeKeyframeExpr } from '../src/services/editor-audio'
import { cropInsets, cssClipPathForClip, videoFiltersForClip } from '../src/services/edit-graph'
import { projectFromCopiedFiles } from '../src/services/timeline'
import { formatFrames } from '../src/utils/format'
import type { EditorClip } from '../src/models/editor'
import type { ProcessFileResult } from '../src/models/processing'

const extra = (patch: Partial<ExtraClip> = {}): ExtraClip => ({
  id: 'a1',
  kind: 'audio',
  label: 'Music',
  startMs: 0,
  durationMs: 4000,
  volume: 0.8,
  interpolation: 'linear',
  keyframes: [],
  color: '#2C7A7B',
  ...patch,
})

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
  color: '#4A6478',
  ...patch,
})

const file = (name: string): ProcessFileResult => ({
  diamondName: '260602-362',
  viewLabel: name,
  sourcePath: `${name}/video.mp4`,
  outputPath: `D:/Output_Testing/260602-362/${name}.mp4`,
  status: 'copied',
})

describe('professional editor model', () => {
  it('starts a project with ducking and export defaults', () => {
    const project = projectFromCopiedFiles([file('Front')], '/out', 'KRISH')
    expect(project.libraryTab).toBe('media')
    expect(project.ducking).toEqual(DEFAULT_DUCKING)
    expect(project.exportSettings.format).toBe(DEFAULT_EXPORT.format)
  })

  it('interpolates audio keyframes and ducks music', () => {
    const keyed = addVolumeKeyframe(addVolumeKeyframe(extra(), 0, 1), 4000, 0)
    expect(interpolateVolume(keyed, 2000)).toBeCloseTo(0.5)
    expect(duckingGain({ ...DEFAULT_DUCKING, enabled: true, depthDb: -12, sensitivity: 1, fadeMs: 1 }, extra(), 2000)).toBeCloseTo(10 ** (-12 / 20))
    expect(duckingGain({ ...DEFAULT_DUCKING, enabled: false }, extra(), 2000)).toBe(1)
  })

  it('uses four-side crop and rotation in the edit graph', () => {
    const cropped = clip({
      transform: { ...DEFAULT_TRANSFORM, cropEnabled: true, cropTop: 0.1, cropBottom: 0.1, cropLeft: 0.1, cropRight: 0.1, rotation: 15 },
    })
    expect(cropInsets(cropped)).toEqual({ top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 })
    expect(cssClipPathForClip(cropped)).toContain('inset')
    const vf = videoFiltersForClip(cropped, 2).join(',')
    expect(vf).toContain('crop=iw*0.800')
    expect(vf).toContain('rotate=')
  })

  it('formats frame timecode', () => {
    expect(formatFrames(12004, 24)).toBe('00:00:12:00')
  })

  it('writes a ffmpeg volume expression from keyframes', () => {
    const keyed = addVolumeKeyframe(addVolumeKeyframe(extra(), 0, 1), 1000, 0.2)
    expect(volumeKeyframeExpr(keyed, 1)).toContain('if(lt(t')
  })
})
