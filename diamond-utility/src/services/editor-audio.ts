import type { AudioKeyframe, DuckingSettings, EditorProject, ExtraClip } from '../models/editor'
import { DEFAULT_DUCKING } from '../models/editor'
import { uid } from '../utils/format'
import { extrasAtTime, timelineDurationMs } from './timeline'

export function interpolateVolume(extra: ExtraClip, localMs: number): number {
  const keys = [...(extra.keyframes ?? [])].sort((a, b) => a.timeMs - b.timeMs)
  if (keys.length === 0) return extra.volume
  if (localMs <= keys[0].timeMs) return keys[0].value
  const last = keys[keys.length - 1]
  if (localMs >= last.timeMs) return last.value
  const rightIndex = keys.findIndex((key) => key.timeMs >= localMs)
  const right = keys[rightIndex]
  const left = keys[rightIndex - 1]
  if (extra.interpolation === 'hold') return left.value
  const span = Math.max(1, right.timeMs - left.timeMs)
  const t = (localMs - left.timeMs) / span
  const eased = extra.interpolation === 'bezier' ? t * t * (3 - 2 * t) : t
  return left.value + (right.value - left.value) * eased
}

export function duckingGain(ducking: DuckingSettings | undefined, extra: ExtraClip, playheadMs: number, hasProgram = true): number {
  const settings = ducking ?? DEFAULT_DUCKING
  if (!settings.enabled || extra.kind !== 'audio' || !hasProgram) return 1
  const depth = Math.abs(settings.depthDb) * Math.min(1, Math.max(0.1, settings.sensitivity))
  const linear = Math.pow(10, -depth / 20)
  const fade = Math.max(1, settings.fadeMs)
  const local = playheadMs - extra.startMs
  let envelope = 1
  if (local < fade) envelope = 1 - (1 - linear) * (local / fade)
  else if (extra.durationMs - local < fade) envelope = 1 - (1 - linear) * ((extra.durationMs - local) / fade)
  else envelope = linear
  return envelope
}

export function extraPlaybackVolume(
  project: Pick<EditorProject, 'ducking' | 'masterVolume' | 'clips'>,
  extra: ExtraClip,
  playheadMs: number,
): number {
  const local = playheadMs - extra.startMs
  const base = interpolateVolume(extra, local)
  const duck = duckingGain(project.ducking, extra, playheadMs, timelineDurationMs(project.clips) > 0)
  return clamp(base * duck * project.masterVolume, 0, 1)
}

export function addVolumeKeyframe(extra: ExtraClip, timeMs: number, value?: number): ExtraClip {
  const local = Math.max(0, Math.min(extra.durationMs, timeMs))
  const next: AudioKeyframe = { id: uid('kf'), timeMs: local, value: value ?? interpolateVolume(extra, local) }
  const kept = (extra.keyframes ?? []).filter((key) => Math.abs(key.timeMs - local) > 40)
  return { ...extra, keyframes: [...kept, next].sort((a, b) => a.timeMs - b.timeMs) }
}

export function removeVolumeKeyframe(extra: ExtraClip, id: string): ExtraClip {
  return { ...extra, keyframes: (extra.keyframes ?? []).filter((key) => key.id !== id) }
}

export function musicAtTime(extras: ExtraClip[], timeMs: number): ExtraClip | undefined {
  return extrasAtTime(extras, timeMs).find((extra) => extra.kind === 'audio')
}

export function volumeKeyframeExpr(extra: ExtraClip, master = 1): string {
  const keys = [...(extra.keyframes ?? [])].sort((a, b) => a.timeMs - b.timeMs)
  if (keys.length === 0) return (extra.volume * master).toFixed(3)
  let expr = (keys[keys.length - 1].value * master).toFixed(3)
  for (let i = keys.length - 2; i >= 0; i -= 1) {
    const left = keys[i]
    const right = keys[i + 1]
    const t2 = (right.timeMs / 1000).toFixed(3)
    const v1 = (left.value * master).toFixed(3)
    const v2 = (right.value * master).toFixed(3)
    const t1 = (left.timeMs / 1000).toFixed(3)
    const span = Math.max(0.001, right.timeMs / 1000 - left.timeMs / 1000).toFixed(3)
    const mid = extra.interpolation === 'hold' ? v1 : `${v1}+(${v2}-${v1})*(t-${t1})/${span}`
    expr = `if(lt(t\\,${t2})\\,${mid}\\,${expr})`
  }
  return expr
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
