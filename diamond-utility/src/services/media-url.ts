import { isDemoPath, isRealDiskPath } from './sample-media'

export function clipPlaybackSources(clip: {
  proxyPath?: string
  absolutePath?: string
  mediaUrl?: string
  sourcePath?: string
}): string[] {
  const sources: string[] = []
  const push = (value?: string) => {
    if (value && !sources.includes(value)) sources.push(value)
  }
  if (clip.proxyPath && window.desktop?.toMediaUrl) push(window.desktop.toMediaUrl(clip.proxyPath))
  if (clip.absolutePath && isRealDiskPath(clip.absolutePath) && window.desktop?.toMediaUrl) {
    push(window.desktop.toMediaUrl(clip.absolutePath))
  }
  push(clip.mediaUrl)
  if (clip.absolutePath && (clip.absolutePath.startsWith('./') || clip.absolutePath.startsWith('/'))) {
    push(clip.absolutePath)
  }
  if (clip.sourcePath && (clip.sourcePath.startsWith('./') || clip.sourcePath.startsWith('/'))) {
    push(clip.sourcePath)
  }
  return sources
}

export function toVideoSrc(clip: {
  proxyPath?: string
  absolutePath?: string
  mediaUrl?: string
  sourcePath?: string
}): string | undefined {
  return clipPlaybackSources(clip)[0]
}

export function ffmpegInputPath(clip: {
  proxyPath?: string
  absolutePath?: string
  mediaUrl?: string
  sourcePath: string
}): string {
  if (clip.proxyPath && isRealDiskPath(clip.proxyPath)) return clip.proxyPath
  if (clip.absolutePath && isRealDiskPath(clip.absolutePath)) return clip.absolutePath
  if (clip.mediaUrl && !clip.mediaUrl.startsWith('blob:')) return clip.mediaUrl
  return clip.absolutePath || clip.sourcePath
}

export function shouldUseSampleFallback(path: string | undefined): boolean {
  return isDemoPath(path) && !isRealDiskPath(path)
}
