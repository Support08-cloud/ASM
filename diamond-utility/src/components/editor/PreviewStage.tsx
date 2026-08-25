import { useEffect, useRef } from 'react'
import watermark from '../../assets/brand/v360-wordmark-white.png'
import type { EditorClip, ExtraClip } from '../../models/editor'
import { cssFilterFor, toVideoSrc } from '../../services/media-url'
import { sourceTimeMs } from '../../services/timeline'

interface PreviewStageProps {
  clip: EditorClip | undefined
  localMs: number
  playheadMs: number
  playing: boolean
  masterVolume: number
  extras: ExtraClip[]
  transitionOpacity: number
  animationClass: string
  onDuration: (clipId: string, durationMs: number) => void
  onSourceTime: (sourceMs: number) => void
  onClipBoundary: () => void
}

export function PreviewStage({
  clip,
  localMs,
  playheadMs,
  playing,
  masterVolume,
  extras,
  transitionOpacity,
  animationClass,
  onDuration,
  onSourceTime,
  onClipBoundary,
}: PreviewStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const src = clip ? toVideoSrc(clip) : undefined
  const titles = extras.filter((extra) => extra.kind === 'text')
  const fx = extras.filter((extra) => extra.kind === 'fx')
  const music = extras.find((extra) => extra.kind === 'audio')

  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip || !src) return
    const token = src.replace(/^\.\//, '')
    if (!video.src.includes(token)) video.src = src
    video.playbackRate = Math.max(0.25, clip.speed)
    video.volume = Math.min(1, Math.max(0, clip.volume * masterVolume))
    video.muted = video.volume === 0
  }, [clip?.id, clip?.speed, clip?.volume, src, masterVolume])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip) return
    const target = sourceTimeMs(clip, localMs) / 1000
    if (!Number.isFinite(target)) return
    if (!playing || Math.abs(video.currentTime - target) > 0.25) {
      if (Math.abs(video.currentTime - target) > 0.05) video.currentTime = Math.max(0, target)
    }
  }, [clip?.id, clip?.inMs, localMs, playing])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (playing && src) void video.play().catch(() => undefined)
    else video.pause()
  }, [playing, src, clip?.id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!music) {
      audio.pause()
      return
    }
    const nextSrc =
      music.mediaUrl || (music.absolutePath && window.desktop?.toMediaUrl?.(music.absolutePath)) || ''
    if (nextSrc && !audio.src.includes(nextSrc.replace('./', ''))) audio.src = nextSrc
    audio.volume = Math.min(1, Math.max(0, music.volume * masterVolume))
    const t = Math.max(0, (playheadMs - music.startMs) / 1000)
    if (Math.abs(audio.currentTime - t) > 0.3 && Number.isFinite(t)) audio.currentTime = t
    if (playing) void audio.play().catch(() => undefined)
    else audio.pause()
  }, [music?.id, music?.mediaUrl, music?.absolutePath, music?.volume, music?.startMs, playing, masterVolume, playheadMs])

  return (
    <div className={`editor-stage${animationClass}${fxClass(fx)}`} style={{ background: clip?.color ?? '#011843' }}>
      {src ? (
        <video
          key={clip?.id ?? 'empty'}
          ref={videoRef}
          className="stage-video"
          style={{
            filter: cssFilterFor(clip?.filter ?? 'none'),
            opacity: transitionOpacity,
          }}
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => {
            if (!clip) return
            onDuration(clip.id, event.currentTarget.duration * 1000)
            const target = sourceTimeMs(clip, localMs) / 1000
            event.currentTarget.currentTime = Math.max(0, target)
          }}
          onTimeUpdate={(event) => {
            if (!playing || !clip) return
            const sourceMs = event.currentTarget.currentTime * 1000
            onSourceTime(sourceMs)
            if (sourceMs >= clip.outMs - 20) onClipBoundary()
          }}
          onEnded={onClipBoundary}
        />
      ) : (
        <div className="stage-label">{clip?.label ?? 'Add a clip'}</div>
      )}
      {titles.map((title) => (
        <div key={title.id} className="stage-title">
          {title.text || 'Title'}
        </div>
      ))}
      {fx.some((item) => item.fx === 'vignette') ? <div className="stage-vignette" /> : null}
      {fx.some((item) => item.fx === 'grain') ? <div className="stage-grain" /> : null}
      <img className="stage-mark" src={watermark} alt="Vision360" />
      <audio ref={audioRef} preload="auto" />
    </div>
  )
}

function fxClass(fx: ExtraClip[]): string {
  const names = fx.map((item) => item.fx)
  if (names.includes('flash')) return ' is-flash'
  if (names.includes('blur')) return ' is-blur'
  return ''
}
