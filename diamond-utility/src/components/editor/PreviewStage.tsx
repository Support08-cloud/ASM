import { useEffect, useRef, useState } from 'react'
import watermark from '../../assets/brand/v360-wordmark-white.png'
import type { EditorClip, ExtraClip } from '../../models/editor'
import { cssClipPathForClip, cssFilterForClip, cssTransformForClip } from '../../services/edit-graph'
import { toVideoSrc } from '../../services/media-url'
import { clipPlayDurationMs, sourceTimeMs } from '../../services/timeline'

interface PreviewStageProps {
  clip: EditorClip | undefined
  localMs: number
  playheadMs: number
  playing: boolean
  masterVolume: number
  extras: ExtraClip[]
  transitionOpacity: number
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
  const music = extras.find((extra) => extra.kind === 'audio')
  const play = clip ? clipPlayDurationMs(clip) : 0
  const fadeOpacity = fadeOpacityFor(clip, localMs, play)

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
      video.volume = clip.muted ? 0 : Math.min(1, Math.max(0, clip.volume * masterVolume))
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
    video.volume = clip.muted ? 0 : Math.min(1, Math.max(0, clip.volume * masterVolume))
    video.muted = video.volume === 0
  }, [clip?.speed, clip?.volume, clip?.muted, masterVolume])

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

  const effectClass = clip && clip.effect !== 'none' ? ` is-fx-${clip.effect}` : ''

  return (
    <div className={`nle-stage${effectClass}`}>
      {src && clip ? (
        <video
          ref={videoRef}
          className="nle-video"
          style={{
            filter: cssFilterForClip(clip),
            transform: cssTransformForClip(clip),
            clipPath: cssClipPathForClip(clip),
            opacity: fadeOpacity * transitionOpacity * clip.grade.transparency,
          }}
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => {
            setStatus('ready')
            onDuration(clip.id, event.currentTarget.duration * 1000)
          }}
          onCanPlay={() => setStatus('ready')}
          onError={() => setStatus('error')}
          onTimeUpdate={(event) => {
            if (!playing) return
            const sourceMs = event.currentTarget.currentTime * 1000
            onSourceTime(sourceMs)
            if (sourceMs >= clip.outMs - 30) onClipBoundary()
          }}
          onEnded={onClipBoundary}
        />
      ) : (
        <div className="stage-label">{clip?.error ?? clip?.label ?? 'Add a clip'}</div>
      )}
      {status === 'loading' && src ? <div className="stage-status">Loading video…</div> : null}
      {status === 'error' || clip?.error ? (
        <div className="stage-status is-error">{clip?.error || 'This MP4 could not be played. Preparing a playback copy may still be running.'}</div>
      ) : null}
      {titles.map((title) => (
        <div key={title.id} className="stage-title">
          {title.text || 'Title'}
        </div>
      ))}
      {clip?.effect === 'vignette' ? <div className="stage-vignette" /> : null}
      {clip?.effect === 'grain' ? <div className="stage-grain" /> : null}
      <div className="nle-handles" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <img className="stage-mark" src={watermark} alt="Vision360" />
      <audio ref={audioRef} preload="auto" />
    </div>
  )
}

function fadeOpacityFor(clip: EditorClip | undefined, localMs: number, play: number): number {
  if (!clip) return 1
  let opacity = 1
  if (clip.fadeInMs > 0 && localMs < clip.fadeInMs) opacity = Math.max(0.05, localMs / clip.fadeInMs)
  if (clip.fadeOutMs > 0 && play - localMs < clip.fadeOutMs) opacity = Math.min(opacity, Math.max(0.05, (play - localMs) / clip.fadeOutMs))
  return opacity
}
