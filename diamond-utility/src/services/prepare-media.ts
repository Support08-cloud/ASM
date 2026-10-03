import type { EditorClip, EditorProject } from '../models/editor'
import { buildProxyArgs, proxyOutputPath } from './ffmpeg-export'
import { ffmpegInputPath } from './media-url'
import { isRealDiskPath } from './sample-media'
import { applyDuration, clipSourceKey } from './timeline'

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
  const library = project.libraryClips ?? []
  const unique = new Map<string, EditorClip>()
  for (const clip of [...library, ...project.clips]) {
    const key = clipSourceKey(clip)
    if (!unique.has(key)) unique.set(key, clip)
  }
  const queue = [...unique.values()]
  const preparedByKey = new Map<string, EditorClip>()
  for (let index = 0; index < queue.length; index += 1) {
    const clip = queue[index]
    onProgress({
      current: index + 1,
      total: Math.max(queue.length, 1),
      message: `Preparing ${clip.label}`,
    })
    preparedByKey.set(clipSourceKey(clip), await prepareClip(clip, project.outputDir))
  }

  const applyPrepared = (clip: EditorClip): EditorClip => {
    const prepared = preparedByKey.get(clipSourceKey(clip))
    if (!prepared) return clip
    return {
      ...clip,
      proxyPath: prepared.proxyPath ?? clip.proxyPath,
      mediaUrl: prepared.mediaUrl ?? clip.mediaUrl,
      absolutePath: prepared.absolutePath ?? clip.absolutePath,
      ready: prepared.ready ?? clip.ready,
      error: prepared.error,
      hasAudio: prepared.hasAudio ?? clip.hasAudio,
      sourceDurationMs: clip.durationProbed ? clip.sourceDurationMs : prepared.sourceDurationMs,
      durationProbed: clip.durationProbed || prepared.durationProbed,
      outMs: clip.durationProbed ? clip.outMs : prepared.outMs,
    }
  }

  return {
    ...project,
    libraryClips: library.map(applyPrepared),
    clips: project.clips.map(applyPrepared),
  }
}

async function prepareClip(clip: EditorClip, outputDir: string): Promise<EditorClip> {
  const input = ffmpegInputPath({ ...clip, proxyPath: undefined })
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
        try {
          await desktop.runFfmpeg(buildProxyArgs(input, proxyPath, next.hasAudio !== false))
        } catch {
          return { ...next, ready: true, error: undefined }
        }
      }
      const proxyInfo = desktop.mediaInfo ? await desktop.mediaInfo(proxyPath).catch(() => null) : null
      if (!proxyInfo?.durationMs) {
        return { ...next, ready: true, error: undefined }
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
      ready: true,
      error: error instanceof Error ? error.message : 'Could not prepare this MP4',
    }
  }
}
