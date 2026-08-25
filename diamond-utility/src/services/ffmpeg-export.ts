import type { EditorClip, EditorProject } from '../models/editor'
import { clipPlayDurationMs, exportFileName, transitionOverlapMs } from './timeline'

export interface FfmpegStep {
  label: string
  args: string[]
}

export interface ExportPlan {
  outputPath: string
  steps: FfmpegStep[]
  clipCount: number
  durationMs: number
}

export function buildExportPlan(project: EditorProject): ExportPlan {
  const outputPath = joinPath(project.outputDir, exportFileName(project.diamondName))
  const steps: FfmpegStep[] = []

  project.clips.forEach((clip, index) => {
    const trimmed = joinPath(project.outputDir, `.edit-cache/${index}-${safe(clip.id)}.mp4`)
    const duration = clipPlayDurationMs(clip) / 1000
    const filters = [
      `setpts=PTS/${clip.speed}`,
      animationFilter(clip, duration),
    ].filter(Boolean)
    steps.push({
      label: `Prepare ${clip.label}`,
      args: [
        '-y',
        '-ss',
        (clip.inMs / 1000).toFixed(3),
        '-t',
        ((clip.outMs - clip.inMs) / 1000).toFixed(3),
        '-i',
        clip.absolutePath || clip.sourcePath,
        '-an',
        '-vf',
        `${filters.join(',')},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p`,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        trimmed,
      ],
    })
  })

  const intermediates = project.clips.map((clip, index) =>
    joinPath(project.outputDir, `.edit-cache/${index}-${safe(clip.id)}.mp4`),
  )

  if (project.clips.length === 1) {
    steps.push({
      label: 'Write output',
      args: ['-y', '-i', intermediates[0], '-c', 'copy', outputPath],
    })
  } else if (project.clips.every((clip, index) => index === project.clips.length - 1 || clip.transition === 'none')) {
    const listPath = joinPath(project.outputDir, '.edit-cache/concat.txt')
    steps.push({
      label: 'Concatenate',
      args: ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:v', 'libx264', '-preset', 'veryfast', outputPath],
    })
  } else {
    steps.push({
      label: 'Merge with transitions',
      args: buildXfadeArgs(project.clips, intermediates, outputPath),
    })
  }

  const durationMs = project.clips.reduce((sum, clip, index) => {
    const next = project.clips[index + 1]
    return sum + clipPlayDurationMs(clip) - transitionOverlapMs(clip, next)
  }, 0)

  return { outputPath, steps, clipCount: project.clips.length, durationMs }
}

export function buildXfadeArgs(clips: EditorClip[], inputs: string[], outputPath: string): string[] {
  const args: string[] = ['-y']
  inputs.forEach((input) => {
    args.push('-i', input)
  })
  const parts: string[] = []
  let last = '[0:v]'
  let offset = clipPlayDurationMs(clips[0]) / 1000
  for (let i = 1; i < clips.length; i += 1) {
    const left = clips[i - 1]
    const overlap = transitionOverlapMs(left, clips[i]) / 1000
    offset -= overlap
    const filter = xfadeName(left.transition)
    const out = i === clips.length - 1 ? '[outv]' : `[v${i}]`
    parts.push(`${last}[${i}:v]xfade=transition=${filter}:duration=${overlap.toFixed(3)}:offset=${Math.max(0, offset).toFixed(3)}${out}`)
    last = out
    offset += clipPlayDurationMs(clips[i]) / 1000
  }
  args.push('-filter_complex', parts.join(';'), '-map', '[outv]', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', outputPath)
  return args
}

function xfadeName(id: EditorClip['transition']): string {
  if (id === 'fadeblack') return 'fadeblack'
  if (id === 'slideleft') return 'slideleft'
  if (id === 'wipeleft') return 'wipeleft'
  if (id === 'circleopen') return 'circleopen'
  return 'fade'
}

function animationFilter(clip: EditorClip, durationSec: number): string {
  const fade = 0.35
  const filters: string[] = []
  if (clip.animationIn === 'fade') filters.push(`fade=t=in:st=0:d=${fade}`)
  if (clip.animationOut === 'fade') filters.push(`fade=t=out:st=${Math.max(0, durationSec - fade).toFixed(3)}:d=${fade}`)
  if (clip.animationIn === 'zoom') filters.push('zoompan=z=min(zoom+0.0015,1.12):d=1:s=1920x1080')
  return filters.join(',')
}

function joinPath(...parts: string[]): string {
  const root = parts[0] ?? ''
  const sep = root.includes('\\') ? '\\' : '/'
  return parts
    .map((part, index) => (index === 0 ? part.replace(/[\\/]+$/, '') : part.replace(/^[\\/]+/, '')))
    .join(sep)
}

function safe(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '')
}

export function concatListContents(clips: EditorClip[], outputDir: string): string {
  return clips
    .map((clip, index) => `file '${joinPath(outputDir, `.edit-cache/${index}-${safe(clip.id)}.mp4`).replace(/'/g, "'\\''")}'`)
    .join('\n')
}
