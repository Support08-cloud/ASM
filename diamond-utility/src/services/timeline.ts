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
import type { Diamond } from '../models/diamond'
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

export function timeInsideClip(clips: EditorClip[], index: number, ratio: number): number {
  const clip = clips[index]
  if (!clip) return 0
  const span = clipPlayDurationMs(clip)
  const clamped = Math.min(1, Math.max(0, ratio))
  return clipStartMs(clips, index) + clamped * span
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
  if (!Number.isFinite(durationMs) || durationMs <= 0) return clip
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

export function canSplitAt(clip: EditorClip, localMs: number): boolean {
  const play = clipPlayDurationMs(clip)
  if (localMs <= MIN_CLIP_MS / clip.speed || play - localMs <= MIN_CLIP_MS / clip.speed) return false
  const at = sourceTimeMs(clip, localMs)
  return at > clip.inMs + MIN_CLIP_MS && at < clip.outMs - MIN_CLIP_MS
}

export function splitClip(clip: EditorClip, localMs: number): [EditorClip, EditorClip] | null {
  if (!canSplitAt(clip, localMs)) return null
  const at = sourceTimeMs(clip, localMs)
  const left: EditorClip = { ...clip, id: uid('clip'), outMs: at, transition: 'none' }
  const right: EditorClip = { ...clip, id: uid('clip'), inMs: at }
  return [left, right]
}

export function duplicateClip(clips: EditorClip[], id: string): EditorClip[] {
  if (clips.length >= MAX_TIMELINE_CLIPS) return clips
  const index = clips.findIndex((clip) => clip.id === id)
  if (index < 0) return clips
  const source = clips[index]
  const copy: EditorClip = {
    ...source,
    id: uid('clip'),
    label: `${source.label} copy`,
    grade: { ...source.grade },
    transform: { ...source.transform },
    transition: 'none',
    transitionMs: 0,
  }
  const next = [...clips]
  next.splice(index + 1, 0, copy)
  return next
}

const SNAP_MS = 120

export function snapTrim(clips: EditorClip[], index: number, edge: 'in' | 'out', playheadMs: number): EditorClip {
  const clip = clips[index]
  if (!clip) return clips[0]
  const start = clipStartMs(clips, index)
  const edgeAt = edge === 'in' ? start : start + clipPlayDurationMs(clip)
  const points = [0, playheadMs]
  clips.forEach((_, other) => {
    if (other === index) return
    const otherStart = clipStartMs(clips, other)
    points.push(otherStart, otherStart + clipPlayDurationMs(clips[other]))
  })
  let nearest = edgeAt
  let best = SNAP_MS + 1
  for (const point of points) {
    const distance = Math.abs(point - edgeAt)
    if (distance < best) {
      best = distance
      nearest = point
    }
  }
  if (best > SNAP_MS) return clip
  return trimClip(clip, edge, (nearest - edgeAt) * clip.speed)
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

export function mediaFilesForEdit(diamonds: Diamond[], demo: boolean): ProcessFileResult[] {
  const files: ProcessFileResult[] = []
  for (const diamond of diamonds) {
    for (const folder of diamond.folders) {
      for (const file of folder.files) {
        if (file.kind !== 'mp4') continue
        const demoPath = `Sample Dataset / Output_Testing/${diamond.baseName}/${folder.folderName}.mp4`
        const mediaPath = file.absolutePath || (demo ? demoPath : file.relativePath)
        files.push({
          diamondName: diamond.baseName,
          viewLabel: folder.folderName,
          sourcePath: file.relativePath || mediaPath,
          outputPath: mediaPath,
          status: 'copied',
        })
      }
    }
  }
  return files
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
    aspect: '16:9',
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
    fadeInMs: 0,
    fadeOutMs: 0,
    transition: 'none',
    transitionMs: 0,
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

/** Export directory for a timeline. Source videos stay where they are; the edit is written under the chosen output folder. */
export function editOutputDir(files: ProcessFileResult[], resultOutputPath: string): string {
  const root = resultOutputPath.replace(/[\\/]+$/, '')
  const dirs = [
    ...new Set(
      files
        .map((file) => file.outputPath.replace(/[/\\][^/\\]+$/, ''))
        .filter(Boolean),
    ),
  ]
  const norm = (value: string) => value.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
  const rootKey = norm(root)
  const inside = dirs.length > 0 && dirs.every((dir) => {
    const key = norm(dir)
    return key === rootKey || key.startsWith(`${rootKey}/`)
  })
  if (inside && dirs.length === 1) return dirs[0]
  if (inside) return outputDirFromFiles(files, root)
  return root || outputDirFromFiles(files, root)
}

function fileName(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export { clamp }
