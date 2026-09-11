import {
  AUDIO_COLOR,
  CLIP_COLORS,
  DEFAULT_CLIP_DURATION_MS,
  DEFAULT_GRADE,
  DEFAULT_TRANSFORM,
  DEFAULT_TRANSITION_MS,
  MAX_TIMELINE_CLIPS,
  MIN_CLIP_MS,
  TEXT_COLOR,
  type EditorClip,
  type EditorProject,
  type ExtraClip,
  type ExtraKind,
  type TransitionId,
} from '../models/editor'
import type { ProcessFileResult } from '../models/processing'
import { uid } from '../utils/format'
import { clampSpeed } from './edit-graph'
import { isDemoPath, isRealDiskPath, sampleMediaUrl, sampleMusicUrl } from './sample-media'

export function clipPlayDurationMs(clip: EditorClip): number {
  const span = Math.max(0, clip.outMs - clip.inMs)
  return span / Math.max(clip.speed, 0.01)
}

export function transitionOverlapMs(left: EditorClip, right: EditorClip | undefined): number {
  if (!right || left.transition === 'none') return 0
  const max = Math.min(clipPlayDurationMs(left), clipPlayDurationMs(right)) / 2
  return Math.min(Math.max(0, left.transitionMs), max)
}

export function timelineDurationMs(clips: EditorClip[]): number {
  if (clips.length === 0) return 0
  let total = clips.reduce((sum, clip) => sum + clipPlayDurationMs(clip), 0)
  for (let i = 0; i < clips.length - 1; i += 1) {
    total -= transitionOverlapMs(clips[i], clips[i + 1])
  }
  return Math.max(0, total)
}

export function extraEndMs(extra: ExtraClip): number {
  return extra.startMs + extra.durationMs
}

export function projectDurationMs(project: Pick<EditorProject, 'clips' | 'extraClips'>): number {
  const extras = project.extraClips.length === 0 ? 0 : Math.max(...project.extraClips.map(extraEndMs))
  return Math.max(timelineDurationMs(project.clips), extras, 1000)
}

export interface TimelineHit {
  index: number
  clip: EditorClip
  localMs: number
  startMs: number
  overlapMs: number
}

export function clipAtTime(clips: EditorClip[], timeMs: number): TimelineHit | null {
  if (clips.length === 0) return null
  let cursor = 0
  for (let i = 0; i < clips.length; i += 1) {
    const duration = clipPlayDurationMs(clips[i])
    const overlap = transitionOverlapMs(clips[i], clips[i + 1])
    const start = cursor
    const end = cursor + duration
    if (timeMs < end || i === clips.length - 1) {
      const intoTail = Math.max(0, timeMs - (end - overlap))
      return {
        index: i,
        clip: clips[i],
        localMs: Math.min(Math.max(0, timeMs - start), duration),
        startMs: start,
        overlapMs: overlap > 0 && timeMs >= end - overlap ? intoTail : 0,
      }
    }
    cursor = end - overlap
  }
  const last = clips[clips.length - 1]
  return { index: clips.length - 1, clip: last, localMs: clipPlayDurationMs(last), startMs: cursor, overlapMs: 0 }
}

export function clipStartMs(clips: EditorClip[], index: number): number {
  let cursor = 0
  for (let i = 0; i < index; i += 1) {
    cursor += clipPlayDurationMs(clips[i]) - transitionOverlapMs(clips[i], clips[i + 1])
  }
  return cursor
}

export function sourceTimeMs(clip: EditorClip, localMs: number): number {
  return clip.inMs + localMs * clip.speed
}

export function trimClip(clip: EditorClip, edge: 'in' | 'out', deltaMs: number): EditorClip {
  if (edge === 'in') {
    const nextIn = clamp(clip.inMs + deltaMs, 0, clip.outMs - MIN_CLIP_MS)
    return { ...clip, inMs: nextIn }
  }
  const nextOut = clamp(clip.outMs + deltaMs, clip.inMs + MIN_CLIP_MS, clip.sourceDurationMs)
  return { ...clip, outMs: nextOut }
}

export function setSpeed(clip: EditorClip, speed: number): EditorClip {
  return { ...clip, speed: clampSpeed(speed) }
}

export function setVolume(clip: EditorClip, volume: number): EditorClip {
  return { ...clip, volume: clamp(volume, 0, 1) }
}

export function applyDuration(clip: EditorClip, durationMs: number): EditorClip {
  const next = Math.max(MIN_CLIP_MS, Math.round(durationMs))
  if (clip.durationProbed) return clip
  const outMs = clip.inMs === 0 && clip.outMs === clip.sourceDurationMs ? next : Math.min(clip.outMs, next)
  return {
    ...clip,
    sourceDurationMs: next,
    outMs: Math.max(clip.inMs + MIN_CLIP_MS, outMs),
    durationProbed: true,
  }
}

export function splitClip(clip: EditorClip, localMs: number): [EditorClip, EditorClip] | null {
  const play = clipPlayDurationMs(clip)
  if (localMs <= MIN_CLIP_MS / clip.speed || play - localMs <= MIN_CLIP_MS / clip.speed) return null
  const at = sourceTimeMs(clip, localMs)
  if (at <= clip.inMs + MIN_CLIP_MS || at >= clip.outMs - MIN_CLIP_MS) return null
  const left: EditorClip = { ...clip, id: uid('clip'), outMs: at, transition: 'none' }
  const right: EditorClip = { ...clip, id: uid('clip'), inMs: at }
  return [left, right]
}

export function moveClip(clips: EditorClip[], from: number, to: number): EditorClip[] {
  if (from === to || from < 0 || to < 0 || from >= clips.length || to >= clips.length) return clips
  const next = [...clips]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function extrasAtTime(extras: ExtraClip[], timeMs: number): ExtraClip[] {
  return extras.filter((extra) => timeMs >= extra.startMs && timeMs < extraEndMs(extra))
}

export function moveExtra(extra: ExtraClip, deltaMs: number): ExtraClip {
  return { ...extra, startMs: Math.max(0, extra.startMs + deltaMs) }
}

export function trimExtra(extra: ExtraClip, edge: 'in' | 'out', deltaMs: number): ExtraClip {
  if (edge === 'in') {
    const startMs = Math.max(0, extra.startMs + deltaMs)
    const durationMs = Math.max(MIN_CLIP_MS, extraEndMs(extra) - startMs)
    return { ...extra, startMs, durationMs }
  }
  return { ...extra, durationMs: Math.max(MIN_CLIP_MS, extra.durationMs + deltaMs) }
}

export function createExtra(kind: ExtraKind, startMs: number, patch?: Partial<ExtraClip>): ExtraClip {
  const base: ExtraClip = {
    id: uid(kind),
    kind,
    label: kind === 'audio' ? 'Music' : kind === 'text' ? 'Title' : 'Effect',
    startMs: Math.max(0, startMs),
    durationMs: kind === 'audio' ? 12000 : 4000,
    volume: kind === 'audio' ? 0.8 : 1,
    text: kind === 'text' ? 'Vision360' : undefined,
    mediaUrl: kind === 'audio' ? sampleMusicUrl() : undefined,
    color: kind === 'audio' ? AUDIO_COLOR : TEXT_COLOR,
  }
  return { ...base, ...patch }
}

export function projectFromCopiedFiles(
  files: ProcessFileResult[],
  outputDir: string,
  diamondName: string,
): EditorProject {
  const copied = files.filter((file) => file.status === 'copied').slice(0, MAX_TIMELINE_CLIPS)
  const clips = copied.map((file, index) => createClipFromFile(file, index))
  return {
    diamondName,
    outputDir,
    clips,
    extraClips: [],
    selectedClipId: clips[0]?.id ?? null,
    selectedExtraId: null,
    selectedTransitionIndex: null,
    inspectorTab: 'speed',
    playheadMs: 0,
    pixelsPerSecond: 80,
    masterVolume: 1,
  }
}

export function createClipFromFile(file: ProcessFileResult, index: number): EditorClip {
  const duration = DEFAULT_CLIP_DURATION_MS
  const output = file.outputPath || file.sourcePath
  const demo = isDemoPath(output) || isDemoPath(file.sourcePath)
  const real = isRealDiskPath(output)
  return {
    id: uid('clip'),
    label: fileName(file.outputPath || file.viewLabel),
    sourcePath: output,
    absolutePath: file.outputPath || undefined,
    mediaUrl: real ? undefined : demo ? sampleMediaUrl(file.outputPath || file.viewLabel) : undefined,
    hasAudio: demo ? true : undefined,
    sourceDurationMs: duration,
    inMs: 0,
    outMs: duration,
    speed: 1,
    volume: 1,
    muted: false,
    filter: 'none',
    effect: 'none',
    grade: { ...DEFAULT_GRADE },
    transform: { ...DEFAULT_TRANSFORM },
    fadeInMs: index === 0 ? 350 : 0,
    fadeOutMs: 0,
    transition: 'fade',
    transitionMs: DEFAULT_TRANSITION_MS,
    color: CLIP_COLORS[index % CLIP_COLORS.length],
  }
}

export function applyTransition(clip: EditorClip, transition: TransitionId, ms = DEFAULT_TRANSITION_MS): EditorClip {
  return { ...clip, transition, transitionMs: transition === 'none' ? 0 : ms }
}

export function exportFileName(diamondName: string): string {
  const safe = diamondName.trim() || 'diamond'
  return `${safe}-edit.mp4`
}

export function outputDirFromFiles(files: ProcessFileResult[], fallback: string): string {
  const path = files.find((file) => file.outputPath)?.outputPath
  if (!path) return fallback
  return path.replace(/[/\\][^/\\]+$/, '')
}

function fileName(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export { clamp }
