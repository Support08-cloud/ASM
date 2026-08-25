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
  })
})
