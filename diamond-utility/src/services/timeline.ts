import {
  CLIP_COLORS,
  DEFAULT_CLIP_DURATION_MS,
  DEFAULT_TRANSITION_MS,
  MAX_TIMELINE_CLIPS,
  MIN_CLIP_MS,
  type EditorClip,
  type EditorProject,
  type TransitionId,
} from '../models/editor'
import type { ProcessFileResult } from '../models/processing'
import { uid } from '../utils/format'

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

export interface TimelineHit {
  index: number
  clip: EditorClip
  localMs: number
  startMs: number
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
      return {
        index: i,
        clip: clips[i],
        localMs: Math.min(Math.max(0, timeMs - start), duration),
        startMs: start,
      }
    }
    cursor = end - overlap
  }
  const last = clips[clips.length - 1]
  return { index: clips.length - 1, clip: last, localMs: clipPlayDurationMs(last), startMs: cursor }
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
  return { ...clip, speed: clamp(speed, 0.25, 4) }
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
    selectedClipId: clips[0]?.id ?? null,
    selectedTransitionIndex: null,
    playheadMs: 0,
    pixelsPerSecond: 80,
  }
}

export function createClipFromFile(file: ProcessFileResult, index: number): EditorClip {
  const duration = DEFAULT_CLIP_DURATION_MS
  return {
    id: uid('clip'),
    label: fileName(file.outputPath || file.viewLabel),
    sourcePath: file.outputPath || file.sourcePath,
    absolutePath: file.outputPath || undefined,
    sourceDurationMs: duration,
    inMs: 0,
    outMs: duration,
    speed: 1,
    animationIn: index === 0 ? 'fade' : 'none',
    animationOut: 'none',
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
