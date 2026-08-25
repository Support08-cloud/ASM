import { isRealDiskPath } from './sample-media'

export function toVideoSrc(clip: {
  absolutePath?: string
  mediaUrl?: string
  sourcePath?: string
}): string | undefined {
  if (clip.absolutePath && isRealDiskPath(clip.absolutePath) && window.desktop?.toMediaUrl) {
    return window.desktop.toMediaUrl(clip.absolutePath)
  }
  if (clip.mediaUrl) return clip.mediaUrl
  if (clip.absolutePath && (clip.absolutePath.startsWith('./') || clip.absolutePath.startsWith('/'))) {
    return clip.absolutePath
  }
  return undefined
}

export function ffmpegInputPath(clip: {
  absolutePath?: string
  mediaUrl?: string
  sourcePath: string
}): string {
  if (clip.absolutePath && isRealDiskPath(clip.absolutePath)) return clip.absolutePath
  if (clip.mediaUrl) return clip.mediaUrl
  return clip.absolutePath || clip.sourcePath
}

export function cssFilterFor(filter: string): string {
  if (filter === 'warm') return 'sepia(0.22) saturate(1.2) contrast(1.05)'
  if (filter === 'cool') return 'hue-rotate(192deg) saturate(0.92) contrast(1.06)'
  if (filter === 'contrast') return 'contrast(1.28) saturate(1.05)'
  if (filter === 'mono') return 'grayscale(1)'
  return 'none'
}
