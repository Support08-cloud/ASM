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

export type TransitionId = (typeof TRANSITION_OPTIONS)[number]['id']
export type AnimationId = (typeof ANIMATION_OPTIONS)[number]['id']

export interface EditorClip {
  id: string
  label: string
  sourcePath: string
  absolutePath?: string
  sourceDurationMs: number
  inMs: number
  outMs: number
  speed: number
  animationIn: AnimationId
  animationOut: AnimationId
  transition: TransitionId
  transitionMs: number
  color: string
}

export interface EditorProject {
  diamondName: string
  outputDir: string
  clips: EditorClip[]
  selectedClipId: string | null
  selectedTransitionIndex: number | null
  playheadMs: number
  pixelsPerSecond: number
}

export const CLIP_COLORS = ['#c6691d', '#072c50', '#34434d', '#0c2939', '#a85616', '#011843'] as const
