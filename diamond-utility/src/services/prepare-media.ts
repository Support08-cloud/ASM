import type { EditorClip, EditorProject } from '../models/editor'
import { buildProxyArgs, proxyOutputPath } from './ffmpeg-export'
import { ffmpegInputPath } from './media-url'
import { isRealDiskPath } from './sample-media'
import { applyDuration } from './timeline'

export interface PrepareProgress {
  current: number
  total: number
  message: string
}

export async function probeHtmlDuration(src: string): Promise<{ durationMs: number; hasAudio: boolean } | null> {
  if (!src || typeof document === 'undefined') return null
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.src = src
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('timeout')), 8000)
      video.onloadedmetadata = () => {
        window.clearTimeout(timer)
        resolve()
      }
      video.onerror = () => {
        window.clearTimeout(timer)
        reject(new Error('media'))
      }
    })
    const durationMs = Math.round((video.duration || 0) * 1000)
    return durationMs > 0 ? { durationMs, hasAudio: true } : null
  } catch {
    return null
  } finally {
    video.src = ''
  }
}

export async function prepareEditorProject(
  project: EditorProject,
  onProgress: (progress: PrepareProgress) => void,
): Promise<EditorProject> {
  const clips: EditorClip[] = []
  for (let index = 0; index < project.clips.length; index += 1) {
    const clip = project.clips[index]
    onProgress({
      current: index + 1,
      total: project.clips.length,
      message: `Preparing ${clip.label}`,
    })
    clips.push(await prepareClip(clip, project.outputDir))
  }
  return { ...project, clips }
}

async function prepareClip(clip: EditorClip, outputDir: string): Promise<EditorClip> {
  const input = ffmpegInputPath(clip)
  let next = { ...clip }
  try {
    if (window.desktop?.mediaInfo && (isRealDiskPath(input) || input)) {
      const info = await window.desktop.mediaInfo(input)
      if (info?.durationMs) {
        next = applyDuration({ ...next, durationProbed: false, hasAudio: info.hasAudio }, info.durationMs)
        next.hasAudio = info.hasAudio
      }
    } else {
      const src = clip.mediaUrl
      if (src) {
        const info = await probeHtmlDuration(src)
        if (info) next = applyDuration({ ...next, durationProbed: false, hasAudio: info.hasAudio }, info.durationMs)
      }
    }

    const desktop = window.desktop
    if (desktop?.runFfmpeg && isRealDiskPath(input)) {
      const proxyPath = proxyOutputPath(outputDir, clip.id)
      const existing = desktop.mediaInfo ? await desktop.mediaInfo(proxyPath).catch(() => null) : null
      if (!existing?.durationMs) {
        await desktop.runFfmpeg(buildProxyArgs(input, proxyPath, next.hasAudio !== false))
      }
      const proxyInfo = desktop.mediaInfo ? await desktop.mediaInfo(proxyPath).catch(() => null) : null
      if (!proxyInfo?.durationMs) {
        return { ...next, error: 'Could not prepare this MP4 for playback', ready: false }
      }
      next = {
        ...next,
        proxyPath,
        ready: true,
        error: undefined,
        hasAudio: proxyInfo.hasAudio,
      }
      if (!next.durationProbed && proxyInfo.durationMs) {
        next = applyDuration({ ...next, durationProbed: false }, proxyInfo.durationMs)
      }
      return next
    }

    return { ...next, ready: true, error: undefined }
  } catch (error) {
    return {
      ...next,
      ready: false,
      error: error instanceof Error ? error.message : 'Could not prepare this MP4',
    }
  }
}
