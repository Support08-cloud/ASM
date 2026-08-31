import type { EditorClip, EditorProject, ExtraClip } from '../models/editor'
import { volumeKeyframeExpr } from './editor-audio'
import { atempoChain, proxyOutputPath, videoFiltersForClip } from './edit-graph'
import { ffmpegInputPath } from './media-url'
import { drawtextAlphaExpr, drawtextXY } from './title-style'
import { clipPlayDurationMs, exportFileName, projectDurationMs, transitionOverlapMs } from './timeline'

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

export interface ExportPlanOptions {
  fontFile?: string
}

export function buildExportPlan(project: EditorProject, options: ExportPlanOptions = {}): ExportPlan {
  const outputPath = joinPath(project.outputDir, exportFileName(project.diamondName))
  const steps: FfmpegStep[] = []
  const master = clamp(project.masterVolume, 0, 1)

  project.clips.forEach((clip, index) => {
    const trimmed = joinPath(project.outputDir, `.edit-cache/${index}-${safe(clip.id)}.mp4`)
    steps.push({
      label: `Prepare ${clip.label}`,
      args: buildPrepareArgs(clip, trimmed, master, project.exportSettings?.fps ?? 30),
    })
  })

  const intermediates = project.clips.map((clip, index) =>
    joinPath(project.outputDir, `.edit-cache/${index}-${safe(clip.id)}.mp4`),
  )

  const extras = extrasNeedReencode(project)
  const merged = extras ? joinPath(project.outputDir, '.edit-cache/merged.mp4') : outputPath

  if (project.clips.length === 1) {
    steps.push({
      label: extras ? 'Write video bed' : 'Write output',
      args: ['-y', '-i', intermediates[0], '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', merged],
    })
  } else if (project.clips.every((clip, index) => index === project.clips.length - 1 || clip.transition === 'none')) {
    const listPath = joinPath(project.outputDir, '.edit-cache/concat.txt')
    steps.push({
      label: 'Concatenate',
      args: ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', merged],
    })
  } else {
    steps.push({
      label: 'Merge with transitions',
      args: buildXfadeArgs(project.clips, intermediates, merged),
    })
  }

  if (extras) {
    steps.push({
      label: 'Mix music and titles',
      args: buildFinishArgs(project, merged, outputPath, options.fontFile),
    })
  }

  const last = steps[steps.length - 1]
  if (last) last.args = applyExportSettings(last.args, project)

  return { outputPath, steps, clipCount: project.clips.length, durationMs: projectDurationMs(project) }
}

function applyExportSettings(args: string[], project: EditorProject): string[] {
  const settings = project.exportSettings
  if (!settings) return args
  const next = [...args]
  const out = next.pop()
  const strip = (flag: string) => {
    const index = next.lastIndexOf(flag)
    if (index >= 0) next.splice(index, 2)
  }
  if (settings.resolution && settings.resolution !== '1920x1080') {
    strip('-s')
    next.push('-s', settings.resolution)
  }
  strip('-r')
  next.push('-r', String(settings.fps ?? 24))
  if (settings.format === 'hevc') {
    strip('-c:v')
    next.push('-c:v', 'libx265')
  } else if (settings.format === 'prores') {
    strip('-c:v')
    next.push('-c:v', 'prores_ks')
  }
  strip('-b:v')
  next.push('-b:v', `${settings.bitrateMbps}M`)
  if (settings.audioFormat === 'wav') {
    strip('-c:a')
    next.push('-c:a', 'pcm_s16le')
  }
  strip('-ar')
  next.push('-ar', String(settings.sampleRate ?? 48000))
  if (out) next.push(out)
  return next
}

export function buildPrepareArgs(clip: EditorClip, output: string, masterVolume: number, fps = 30): string[] {
  const playSec = clipPlayDurationMs(clip) / 1000
  const spanSec = (clip.outMs - clip.inMs) / 1000
  const input = ffmpegInputPath(clip)
  const videoFilters = videoFiltersForClip(clip, playSec, fps)
  const volume = clip.muted ? 0 : clamp(clip.volume * masterVolume, 0, 4)
  const tempo = atempoChain(clip.speed)
  const audioFilters = [tempo, `volume=${volume.toFixed(3)}`].filter(Boolean)

  if (clip.hasAudio === false) {
    return [
      '-y',
      '-i',
      input,
      '-ss',
      (clip.inMs / 1000).toFixed(3),
      '-t',
      spanSec.toFixed(3),
      '-f',
      'lavfi',
      '-t',
      playSec.toFixed(3),
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-vf',
      videoFilters.join(','),
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-c:a',
      'aac',
      '-shortest',
      output,
    ]
  }

  return [
    '-y',
    '-i',
    input,
    '-ss',
    (clip.inMs / 1000).toFixed(3),
    '-t',
    spanSec.toFixed(3),
    '-vf',
    videoFilters.join(','),
    '-af',
    audioFilters.join(','),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-c:a',
    'aac',
    output,
  ]
}

export function buildProxyArgs(input: string, output: string, hasAudio: boolean): string[] {
  const vf = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p'
  if (!hasAudio) {
    return [
      '-y',
      '-i',
      input,
      '-f',
      'lavfi',
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-vf',
      vf,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-c:a',
      'aac',
      '-shortest',
      '-movflags',
      '+faststart',
      output,
    ]
  }
  return [
    '-y',
    '-i',
    input,
    '-vf',
    vf,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-c:a',
    'aac',
    '-ac',
    '2',
    '-ar',
    '44100',
    '-movflags',
    '+faststart',
    output,
  ]
}

export function buildXfadeArgs(clips: EditorClip[], inputs: string[], outputPath: string): string[] {
  const args: string[] = ['-y']
  inputs.forEach((input) => {
    args.push('-i', input)
  })
  const videoParts: string[] = []
  const audioParts: string[] = []
  let lastVideo = '[0:v]'
  let lastAudio = '[0:a]'
  let offset = clipPlayDurationMs(clips[0]) / 1000
  for (let i = 1; i < clips.length; i += 1) {
    const left = clips[i - 1]
    const overlap = transitionOverlapMs(left, clips[i]) / 1000
    offset -= overlap
    const filter = xfadeName(left.transition)
    const videoOut = i === clips.length - 1 ? '[outv]' : `[v${i}]`
    const audioOut = i === clips.length - 1 ? '[outa]' : `[a${i}]`
    videoParts.push(
      `${lastVideo}[${i}:v]xfade=transition=${filter}:duration=${Math.max(0.01, overlap).toFixed(3)}:offset=${Math.max(0, offset).toFixed(3)}${videoOut}`,
    )
    if (overlap >= 0.05) {
      audioParts.push(`${lastAudio}[${i}:a]acrossfade=d=${overlap.toFixed(3)}${audioOut}`)
    } else {
      audioParts.push(`${lastAudio}[${i}:a]concat=n=2:v=0:a=1${audioOut}`)
    }
    lastVideo = videoOut
    lastAudio = audioOut
    offset += clipPlayDurationMs(clips[i]) / 1000
  }
  args.push(
    '-filter_complex',
    [...videoParts, ...audioParts].join(';'),
    '-map',
    '[outv]',
    '-map',
    '[outa]',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    outputPath,
  )
  return args
}

function extrasNeedReencode(project: EditorProject): boolean {
  return project.extraClips.length > 0
}

function buildFinishArgs(project: EditorProject, merged: string, outputPath: string, fontFile?: string): string[] {
  const args: string[] = ['-y', '-i', merged]
  const audioExtras = project.extraClips.filter((extra) => extra.kind === 'audio')
  const overlays = project.extraClips.filter((extra) => extra.kind === 'overlay')
  audioExtras.forEach((extra) => {
    args.push('-i', extra.absolutePath || extra.mediaUrl || '')
  })
  overlays.forEach((extra) => {
    args.push('-i', extra.absolutePath || extra.mediaUrl || '')
  })

  const videoChain: string[] = []
  let videoLabel = '[0:v]'
  overlays.forEach((extra, index) => {
    const input = 1 + audioExtras.length + index
    const scaled = `[ov${index}]`
    const out = `[vox${index}]`
    const size = Math.round(1920 * (extra.overlayScale ?? 0.45))
    const x = Math.round((extra.posX ?? 0.5) * 1920 - size / 2)
    const y = Math.round((extra.posY ?? 0.5) * 1080 - size / 2)
    videoChain.push(`[${input}:v]scale=${size}:-2${scaled}`)
    videoChain.push(`${videoLabel}${scaled}overlay=${x}:${y}:enable='${enableRaw(extra)}'${out}`)
    videoLabel = out
  })
  project.extraClips
    .filter((extra) => extra.kind === 'text' && extra.text)
    .forEach((extra, index) => {
      const out = `[tx${index}]`
      videoChain.push(`${videoLabel}${drawTextFilter(extra, fontFile)}${out}`)
      videoLabel = out
    })
  if (videoLabel === '[0:v]') {
    videoChain.push('[0:v]format=yuv420p[outv]')
  } else {
    videoChain.push(`${videoLabel}format=yuv420p[outv]`)
  }

  const audioChain: string[] = []
  if (audioExtras.length === 0) {
    audioChain.push('[0:a]anull[outa]')
  } else {
    const mixInputs = ['[0:a]']
    audioExtras.forEach((extra, index) => {
      const delay = Math.max(0, Math.round(extra.startMs))
      const duck = project.ducking?.enabled
        ? Math.pow(10, (project.ducking.depthDb * Math.min(1, Math.max(0.1, project.ducking.sensitivity))) / 20)
        : 1
      const fade = Math.max(0.02, (project.ducking?.enabled ? project.ducking.fadeMs : extra.fadeInMs ?? 0) / 1000)
      const vol = volumeKeyframeExpr(extra, project.masterVolume * duck)
      const dur = (extra.durationMs / 1000).toFixed(3)
      audioChain.push(
        `[${index + 1}:a]atrim=0:${dur},asetpts=PTS-STARTPTS,adelay=${delay}|${delay},volume='${vol}',afade=t=in:d=${fade.toFixed(3)}[mus${index}]`,
      )
      mixInputs.push(`[mus${index}]`)
    })
    audioChain.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=0[outa]`)
  }

  args.push(
    '-filter_complex',
    [...videoChain, ...audioChain].join(';'),
    '-map',
    '[outv]',
    '-map',
    '[outa]',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    outputPath,
  )
  return args
}

function drawTextFilter(extra: ExtraClip, fontFile?: string): string {
  const text = escapeDrawtext(extra.text || 'Title')
  const enable = enableBetween(extra)
  const font = fontFile ? `:fontfile=${escapePath(fontFile)}` : ''
  const size = extra.fontSize ?? 48
  const color = (extra.textColor ?? '#ffffff').replace('#', '')
  const { x, y } = drawtextXY(extra)
  const alpha = drawtextAlphaExpr(extra)
  return `drawtext=text='${text}'${font}:fontsize=${size}:fontcolor=0x${color}:borderw=2:bordercolor=black@0.6:x=${x}:y=${y}:alpha='${alpha}':${enable}`
}

function enableRaw(extra: ExtraClip): string {
  const start = (extra.startMs / 1000).toFixed(3)
  const end = ((extra.startMs + extra.durationMs) / 1000).toFixed(3)
  return `between(t,${start},${end})`
}

function enableBetween(extra: ExtraClip): string {
  const start = (extra.startMs / 1000).toFixed(3)
  const end = ((extra.startMs + extra.durationMs) / 1000).toFixed(3)
  return `enable='between(t,${start},${end})'`
}

function escapeDrawtext(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/'/g, '’').replace(/:/g, '\\:').replace(/%/g, '\\%')
}

function escapePath(file: string): string {
  return file.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
}

function xfadeName(id: EditorClip['transition']): string {
  if (id === 'fadeblack') return 'fadeblack'
  if (id === 'slideleft') return 'slideleft'
  if (id === 'wipeleft') return 'wipeleft'
  if (id === 'circleopen') return 'circleopen'
  return 'fade'
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function concatListContents(clips: EditorClip[], outputDir: string): string {
  return clips
    .map((clip, index) => `file '${joinPath(outputDir, `.edit-cache/${index}-${safe(clip.id)}.mp4`).replace(/'/g, "'\\''")}'`)
    .join('\n')
}

export function durationMatches(actualMs: number, expectedMs: number): boolean {
  const slack = Math.max(400, expectedMs * 0.04)
  return actualMs > 0 && Math.abs(actualMs - expectedMs) <= slack
}

export { proxyOutputPath }
