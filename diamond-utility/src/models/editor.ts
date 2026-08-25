export const MAX_TIMELINE_CLIPS = 50
export const DEFAULT_CLIP_DURATION_MS = 4000
export const DEFAULT_TRANSITION_MS = 500
export const MIN_CLIP_MS = 200

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.5, 2] as const

export const TRANSITION_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Crossfade' },
  { id: 'fadeblack', label: 'Fade through black' },
  { id: 'slideleft', label: 'Slide' },
  { id: 'wipeleft', label: 'Wipe' },
  { id: 'circleopen', label: 'Circle open' },
] as const

export const ANIMATION_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide', label: 'Slide' },
  { id: 'zoom', label: 'Zoom' },
] as const

export const FILTER_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'contrast', label: 'Contrast' },
  { id: 'mono', label: 'Mono' },
] as const

export const FX_OPTIONS = [
  { id: 'vignette', label: 'Vignette' },
  { id: 'flash', label: 'Flash' },
  { id: 'blur', label: 'Blur' },
  { id: 'grain', label: 'Grain' },
] as const

export type TransitionId = (typeof TRANSITION_OPTIONS)[number]['id']
export type AnimationId = (typeof ANIMATION_OPTIONS)[number]['id']
export type FilterId = (typeof FILTER_OPTIONS)[number]['id']
export type FxId = (typeof FX_OPTIONS)[number]['id']
export type ExtraKind = 'audio' | 'text' | 'fx'

export interface EditorClip {
  id: string
  label: string
  sourcePath: string
  absolutePath?: string
  mediaUrl?: string
  sourceDurationMs: number
  durationProbed?: boolean
  hasAudio?: boolean
  inMs: number
  outMs: number
  speed: number
  volume: number
  filter: FilterId
  animationIn: AnimationId
  animationOut: AnimationId
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
  fx?: FxId
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
  playheadMs: number
  pixelsPerSecond: number
  masterVolume: number
}

export const CLIP_COLORS = ['#c6691d', '#072c50', '#34434d', '#0c2939', '#a85616', '#011843'] as const
export const AUDIO_COLOR = '#c6691d'
export const TEXT_COLOR = '#0c2939'
export const FX_COLOR = '#34434d'
