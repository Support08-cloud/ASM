import { describe, expect, it } from 'vitest'
import { projectFromCopiedFiles } from '../src/services/timeline'
import { applyTransition } from '../src/services/timeline'
import { buildExportPlan } from '../src/services/ffmpeg-export'
import type { ProcessFileResult } from '../src/models/processing'

const file = (name: string): ProcessFileResult => ({
  diamondName: '260602-362',
  viewLabel: name,
  sourcePath: `${name}/video.mp4`,
  outputPath: `D:/Output_Testing/260602-362/${name}.mp4`,
  status: 'copied',
})

describe('ffmpeg export plan', () => {
  it('writes a single merged file named after the diamond', () => {
    const project = projectFromCopiedFiles(
      ['260602-362-1', '260602-362-2', '260602-362-RG'].map(file),
      'D:/Output_Testing/260602-362',
      '260602-362',
    )
    project.clips = project.clips.map((clip, index) =>
      applyTransition(clip, index === project.clips.length - 1 ? 'none' : 'fade', 500),
    )
    const plan = buildExportPlan(project)
    expect(plan.outputPath).toBe('D:/Output_Testing/260602-362/260602-362-edit.mp4')
    expect(plan.clipCount).toBe(3)
    expect(plan.steps.some((step) => step.label === 'Merge with transitions')).toBe(true)
    expect(plan.steps.at(-1)?.args.includes('xfade=transition=fade:duration=0.500') || plan.steps.at(-1)?.args.join(' ').includes('xfade')).toBe(true)
    expect(plan.steps[0].args.join(' ')).toContain('volume=1.000')
    expect(plan.steps[0].args.join(' ')).toContain('-c:a')
  })

  it('bakes speed, volume, filters, music, titles, and effects into ffmpeg', () => {
    const project = projectFromCopiedFiles(['260602-362-1', '260602-362-2'].map(file), 'D:/Output_Testing/260602-362', '260602-362')
    project.clips[0].speed = 2
    project.clips[0].volume = 0.5
    project.clips[0].filter = 'warm'
    project.clips[0].transition = 'none'
    project.clips[1].transition = 'none'
    project.extraClips = [
      {
        id: 'mus-1',
        kind: 'audio',
        label: 'Music',
        startMs: 0,
        durationMs: 8000,
        mediaUrl: './samples/music.m4a',
        volume: 0.8,
        color: '#c6691d',
      },
      {
        id: 'tx-1',
        kind: 'text',
        label: 'Title',
        startMs: 500,
        durationMs: 2000,
        text: 'Vision360',
        volume: 1,
        color: '#0c2939',
      },
    ]
    const plan = buildExportPlan(project, { fontFile: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf' })
    const prepare = plan.steps[0].args.join(' ')
    expect(prepare).toContain('setpts=PTS/2')
    expect(prepare).toContain('atempo=2')
    expect(prepare.indexOf('-i')).toBeLessThan(prepare.indexOf('-ss'))
    expect(prepare).toContain('volume=0.500')
    expect(prepare).toContain('gamma_r=1.12')
    const finish = plan.steps.at(-1)?.args.join(' ') ?? ''
    expect(finish).toContain('drawtext')
    expect(finish).toContain('amix')
    expect(plan.outputPath).toBe('D:/Output_Testing/260602-362/260602-362-edit.mp4')
  })
})
