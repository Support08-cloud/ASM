export const MAX_TIMELINE_CLIPS = 50
export const DEFAULT_CLIP_DURATION_MS = 4000
export const DEFAULT_TRANSITION_MS = 500
export const MIN_CLIP_MS = 200
export const SPEED_MIN = 0.25
export const SPEED_MAX = 8

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.5, 2] as const

export const TRANSITION_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Crossfade' },
  { id: 'fadeblack', label: 'Fade through black' },
  { id: 'slideleft', label: 'Slide' },
  { id: 'wipeleft', label: 'Wipe' },
  { id: 'circleopen', label: 'Circle open' },
] as const

export const FILTER_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'contrast', label: 'Contrast' },
  { id: 'mono', label: 'Mono' },
] as const

export const EFFECT_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'flash', label: 'Flash' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'blur', label: 'Blur' },
  { id: 'vignette', label: 'Vignette' },
  { id: 'grain', label: 'Grain' },
  { id: 'slowzoom', label: 'Slow zoom' },
  { id: 'spin', label: 'Spin' },
] as const

export const INSPECTOR_TABS = [
  { id: 'audio', label: 'Audio' },
  { id: 'fade', label: 'Fade' },
  { id: 'filters', label: 'Filters' },
  { id: 'effects', label: 'Effects' },
  { id: 'color', label: 'Adjust colors' },
  { id: 'speed', label: 'Speed' },
] as const

export type TransitionId = (typeof TRANSITION_OPTIONS)[number]['id']
export type FilterId = (typeof FILTER_OPTIONS)[number]['id']
export type EffectId = (typeof EFFECT_OPTIONS)[number]['id']
export type InspectorTab = (typeof INSPECTOR_TABS)[number]['id']
export type ExtraKind = 'audio' | 'text'

export interface ClipTransform {
  x: number
  y: number
  scale: number
  crop: number
  flipH: boolean
  flipV: boolean
}

export interface ClipGrade {
  exposure: number
  contrast: number
  saturation: number
  temperature: number
  transparency: number
}

export interface EditorClip {
  id: string
  label: string
  sourcePath: string
  absolutePath?: string
  mediaUrl?: string
  proxyPath?: string
  sourceDurationMs: number
  durationProbed?: boolean
  hasAudio?: boolean
  ready?: boolean
  error?: string
  inMs: number
  outMs: number
  speed: number
  volume: number
  muted: boolean
  filter: FilterId
  effect: EffectId
  grade: ClipGrade
  transform: ClipTransform
  fadeInMs: number
  fadeOutMs: number
  transition: TransitionId
  transitionMs: number
  color: string
}

export interface ExtraClip {
  id: string
  kind: ExtraKind
  label: string
  startMs: number
  durationMs: number
  mediaUrl?: string
  absolutePath?: string
  volume: number
  text?: string
  color: string
}

export interface EditorProject {
  diamondName: string
  outputDir: string
  clips: EditorClip[]
  extraClips: ExtraClip[]
  selectedClipId: string | null
  selectedExtraId: string | null
  selectedTransitionIndex: number | null
  inspectorTab: InspectorTab
  playheadMs: number
  pixelsPerSecond: number
  masterVolume: number
}

export const DEFAULT_GRADE: ClipGrade = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  transparency: 1,
}

export const DEFAULT_TRANSFORM: ClipTransform = {
  x: 0,
  y: 0,
  scale: 1,
  crop: 0,
  flipH: false,
  flipV: false,
}

export const CLIP_COLORS = ['#c6691d', '#072c50', '#34434d', '#0c2939', '#a85616', '#011843'] as const
export const AUDIO_COLOR = '#c6691d'
export const TEXT_COLOR = '#0c2939'

/** @deprecated kept so older snippets type-check during the editor rewrite */
export const ANIMATION_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
] as const
export const FX_OPTIONS = EFFECT_OPTIONS.filter((item) => item.id !== 'none')
export type AnimationId = 'none' | 'fade'
export type FxId = EffectId
