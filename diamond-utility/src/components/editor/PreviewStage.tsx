import { useEffect, useRef, useState } from 'react'
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
  const playingRef = useRef(playing)
  playingRef.current = playing
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const src = clip ? toVideoSrc(clip) : undefined
  const titles = extras.filter((extra) => extra.kind === 'text')
  const fx = extras.filter((extra) => extra.kind === 'fx')
  const music = extras.find((extra) => extra.kind === 'audio')

  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip || !src) return
    setStatus('loading')
    if (video.dataset.src !== src) {
      video.dataset.src = src
      video.src = src
    }
    const start = Math.max(0, sourceTimeMs(clip, playingRef.current ? 0 : localMs) / 1000)
    const apply = () => {
      video.playbackRate = Math.max(0.25, clip.speed)
      video.volume = Math.min(1, Math.max(0, clip.volume * masterVolume))
      video.muted = video.volume === 0
      if (Math.abs(video.currentTime - start) > 0.08) video.currentTime = start
      if (playingRef.current) void video.play().catch(() => undefined)
    }
    if (video.readyState >= 1) apply()
    else video.addEventListener('loadedmetadata', apply, { once: true })
  }, [clip?.id, src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip) return
    video.playbackRate = Math.max(0.25, clip.speed)
    video.volume = Math.min(1, Math.max(0, clip.volume * masterVolume))
    video.muted = video.volume === 0
  }, [clip?.speed, clip?.volume, masterVolume])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip || playing) return
    const target = sourceTimeMs(clip, localMs) / 1000
    if (Number.isFinite(target) && Math.abs(video.currentTime - target) > 0.08) {
      video.currentTime = Math.max(0, target)
    }
  }, [clip?.id, clip?.inMs, localMs, playing])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (playing && src) void video.play().catch(() => setStatus('error'))
    else video.pause()
  }, [playing, src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!music) {
      audio.pause()
      return
    }
    const nextSrc =
      music.mediaUrl || (music.absolutePath && window.desktop?.toMediaUrl?.(music.absolutePath)) || ''
    if (nextSrc && audio.dataset.src !== nextSrc) {
      audio.dataset.src = nextSrc
      audio.src = nextSrc
    }
    audio.volume = Math.min(1, Math.max(0, music.volume * masterVolume))
  }, [music?.id, music?.mediaUrl, music?.absolutePath, music?.volume, masterVolume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !music) return
    const t = Math.max(0, (playheadMs - music.startMs) / 1000)
    if (playing) {
      void audio.play().catch(() => undefined)
      return
    }
    if (Number.isFinite(t) && Math.abs(audio.currentTime - t) > 0.12) audio.currentTime = t
    audio.pause()
  }, [playing, playheadMs, music?.id, music?.startMs])

  return (
    <div className={`editor-stage${animationClass}${fxClass(fx)}`}>
      {src ? (
        <video
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
            setStatus('ready')
            onDuration(clip.id, event.currentTarget.duration * 1000)
          }}
          onCanPlay={() => setStatus('ready')}
          onWaiting={() => setStatus('loading')}
          onError={() => setStatus('error')}
          onTimeUpdate={(event) => {
            if (!playing || !clip) return
            const sourceMs = event.currentTarget.currentTime * 1000
            onSourceTime(sourceMs)
            if (sourceMs >= clip.outMs - 30) onClipBoundary()
          }}
          onEnded={onClipBoundary}
        />
      ) : (
        <div className="stage-label">{clip?.label ?? 'Add a clip'}</div>
      )}
      {status === 'loading' && src ? <div className="stage-status">Loading video…</div> : null}
      {status === 'error' ? <div className="stage-status is-error">This MP4 could not be played. Export still uses the original file.</div> : null}
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
