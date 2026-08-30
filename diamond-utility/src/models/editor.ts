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

export const LIBRARY_TABS = [
  { id: 'media', label: 'Media', icon: 'video_library' },
  { id: 'text', label: 'Text', icon: 'title' },
  { id: 'audio', label: 'Audio', icon: 'audiotrack' },
  { id: 'effects', label: 'Effects', icon: 'auto_fix_high' },
] as const

export const TEXT_ANIMS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide', label: 'Slide' },
  { id: 'zoom', label: 'Zoom' },
] as const

export const CROP_ASPECTS = ['free', '1:1', '4:5', '16:9', '9:16'] as const
export const TEXT_FONTS = ['Geist', 'Inter', 'Roboto'] as const
export const KEYFRAME_INTERPOLATIONS = [
  { id: 'linear', label: 'Linear' },
  { id: 'bezier', label: 'Bezier (Smooth)' },
  { id: 'hold', label: 'Hold' },
] as const

export type TransitionId = (typeof TRANSITION_OPTIONS)[number]['id']
export type FilterId = (typeof FILTER_OPTIONS)[number]['id']
export type EffectId = (typeof EFFECT_OPTIONS)[number]['id']
export type InspectorTab = (typeof INSPECTOR_TABS)[number]['id']
export type LibraryTab = (typeof LIBRARY_TABS)[number]['id']
export type ExtraKind = 'audio' | 'text' | 'overlay'
export type TextAnim = (typeof TEXT_ANIMS)[number]['id']
export type TextAlign = 'left' | 'center' | 'right'
export type CropAspect = (typeof CROP_ASPECTS)[number]
export type KeyframeInterpolation = (typeof KEYFRAME_INTERPOLATIONS)[number]['id']
export type ExportFormat = 'h264' | 'prores' | 'hevc'
export type ExportResolution = '3840x2160' | '1920x1080' | '1280x720'
export type TimelineTool = 'select' | 'blade' | 'slip'

export interface ClipTransform {
  x: number
  y: number
  scale: number
  rotation: number
  crop: number
  cropTop: number
  cropBottom: number
  cropLeft: number
  cropRight: number
  cropAspect: CropAspect
  cropEnabled: boolean
  flipH: boolean
  flipV: boolean
}

export interface AudioKeyframe {
  id: string
  timeMs: number
  value: number
}

export interface DuckingSettings {
  enabled: boolean
  depthDb: number
  fadeMs: number
  sensitivity: number
}

export interface ExportSettings {
  format: ExportFormat
  resolution: ExportResolution
  fps: 24 | 30 | 60
  bitrateMbps: number
  audioFormat: 'aac' | 'wav'
  sampleRate: 48000 | 44100
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
  fontFamily?: string
  fontSize?: number
  textColor?: string
  textAlign?: TextAlign
  posX?: number
  posY?: number
  animIn?: TextAnim
  animOut?: TextAnim
  overlayScale?: number
  fadeInMs?: number
  fadeOutMs?: number
  interpolation?: KeyframeInterpolation
  keyframes?: AudioKeyframe[]
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
  libraryTab: LibraryTab
  timelineTool: TimelineTool
  playheadMs: number
  pixelsPerSecond: number
  masterVolume: number
  ducking: DuckingSettings
  exportSettings: ExportSettings
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
  rotation: 0,
  crop: 0,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  cropAspect: '16:9',
  cropEnabled: false,
  flipH: false,
  flipV: false,
}

export const DEFAULT_DUCKING: DuckingSettings = {
  enabled: false,
  depthDb: -12,
  fadeMs: 200,
  sensitivity: 0.7,
}

export const DEFAULT_EXPORT: ExportSettings = {
  format: 'h264',
  resolution: '1920x1080',
  fps: 24,
  bitrateMbps: 16,
  audioFormat: 'aac',
  sampleRate: 48000,
}

export const CLIP_COLORS = ['#4A6478', '#4A5568', '#3d5a73', '#2C4A5E', '#5A7184', '#3A5064'] as const
export const AUDIO_COLOR = '#2C7A7B'
export const TEXT_COLOR = '#FF6B00'

export const ANIMATION_OPTIONS = TEXT_ANIMS
export const FX_OPTIONS = EFFECT_OPTIONS.filter((item) => item.id !== 'none')
export type AnimationId = TextAnim
export type FxId = EffectId
