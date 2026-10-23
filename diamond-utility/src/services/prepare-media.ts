import type { EditorClip, EditorProject } from '../models/editor'
import { proxyOutputPath } from './edit-graph'
import { shortFfmpegError } from './ffmpeg-error'
import { buildProxyArgs } from './ffmpeg-export'
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
    if (!Number.isFinite(durationMs) || durationMs <= 0) return null
    return { durationMs, hasAudio: true }
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

/** Apply proxy and probed duration onto the timeline the user is already editing. */
export function mergePreparedProject(current: EditorProject, prepared: EditorProject, seed: EditorProject): EditorProject {
  const preparedById = new Map(prepared.clips.map((clip) => [clip.id, clip]))
  const seedById = new Map(seed.clips.map((clip) => [clip.id, clip]))
  return {
    ...current,
    clips: current.clips.map((clip) => {
      const fresh = preparedById.get(clip.id)
      if (!fresh) return clip
      const next: EditorClip = {
        ...clip,
        proxyPath: fresh.proxyPath ?? clip.proxyPath,
        ready: fresh.ready ?? clip.ready,
        hasAudio: fresh.hasAudio ?? clip.hasAudio,
        error: fresh.ready === false ? fresh.error ?? clip.error : fresh.ready ? undefined : clip.error,
      }
      const original = seedById.get(clip.id)
      const edited =
        !original ||
        clip.inMs !== original.inMs ||
        clip.outMs !== original.outMs ||
        clip.speed !== original.speed ||
        Boolean(clip.durationProbed)
      if (edited) return next
      return {
        ...next,
        sourceDurationMs: fresh.sourceDurationMs,
        inMs: fresh.inMs,
        outMs: fresh.outMs,
        durationProbed: fresh.durationProbed,
      }
    }),
  }
}

export async function prepareClip(clip: EditorClip, outputDir: string): Promise<EditorClip> {
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
        if (info) next = applyDuration({ ...next, durationProbed: false }, info.durationMs)
      }
    }

    const desktop = window.desktop
    if (desktop?.runFfmpeg && isRealDiskPath(input)) {
      const proxyPath = proxyOutputPath(outputDir, clip.id)
      const existing = desktop.mediaInfo ? await desktop.mediaInfo(proxyPath).catch(() => null) : null
      if (!existing?.durationMs) {
        await transcodeProxy(input, proxyPath, next.hasAudio !== false)
      }
      const proxyInfo = desktop.mediaInfo ? await desktop.mediaInfo(proxyPath).catch(() => null) : null
      if (!proxyInfo?.durationMs) {
        return { ...next, error: `${clip.label} could not be prepared for playback`, ready: false }
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
    const raw = error instanceof Error ? error.message : 'Could not prepare this MP4'
    return {
      ...next,
      ready: false,
      error: `${clip.label}: ${shortFfmpegError(raw)}`,
    }
  }
}

async function transcodeProxy(input: string, proxyPath: string, hasAudio: boolean): Promise<void> {
  const desktop = window.desktop
  if (!desktop?.runFfmpeg) return
  try {
    await desktop.runFfmpeg(buildProxyArgs(input, proxyPath, hasAudio))
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!/moov atom not found|invalid data found/i.test(message)) throw error
    for (const format of ['h264', 'hevc', 'mpegts']) {
      try {
        await desktop.runFfmpeg([
          '-y',
          '-f',
          format,
          '-i',
          input,
          '-vf',
          'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p',
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-an',
          '-movflags',
          '+faststart',
          proxyPath,
        ])
        const info = await desktop.mediaInfo?.(proxyPath).catch(() => null)
        if (info?.durationMs) return
      } catch {
        // This format was not the file's real layout.
      }
    }
    throw error
  }
}
