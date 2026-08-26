import { isDemoPath, isRealDiskPath } from './sample-media'

export function toVideoSrc(clip: {
  proxyPath?: string
  absolutePath?: string
  mediaUrl?: string
  sourcePath?: string
}): string | undefined {
  if (clip.proxyPath && window.desktop?.toMediaUrl) {
    return window.desktop.toMediaUrl(clip.proxyPath)
  }
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
