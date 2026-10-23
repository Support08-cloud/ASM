import { useEffect, useRef, useState } from 'react'
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
}: PreviewStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const playingRef = useRef(playing)
  playingRef.current = playing
  const localRef = useRef(localMs)
  localRef.current = localMs
  const clipRef = useRef(clip)
  clipRef.current = clip
  const playheadRef = useRef(playheadMs)
  playheadRef.current = playheadMs
  const extrasRef = useRef(extras)
  extrasRef.current = extras
  const masterVolumeRef = useRef(masterVolume)
  masterVolumeRef.current = masterVolume
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const src = clip ? toVideoSrc(clip) : undefined
  const titles = extras.filter((extra) => extra.kind === 'text')
  const music = extras.find((extra) => extra.kind === 'audio')
  const play = clip ? clipPlayDurationMs(clip) : 0
  const fadeOpacity = fadeOpacityFor(clip, localMs, play)

  useEffect(() => {
    const video = videoRef.current
    const current = clipRef.current
    if (!video || !current || !src) return
    if (video.dataset.src !== src) {
      video.dataset.src = src
      video.src = src
      setStatus('loading')
    }
    const start = Math.max(0, sourceTimeMs(current, localRef.current) / 1000)
    const apply = () => {
      video.playbackRate = playbackRateFor(current.speed)
      video.volume = current.muted ? 0 : Math.min(1, Math.max(0, current.volume * masterVolumeRef.current))
      video.muted = video.volume === 0
      if (Math.abs(video.currentTime - start) > 0.08) video.currentTime = start
      if (playingRef.current) void video.play().catch(() => setStatus('error'))
    }
    if (video.readyState >= 1) apply()
    else video.addEventListener('loadedmetadata', apply, { once: true })
  }, [clip?.id, src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip) return
    video.playbackRate = playbackRateFor(clip.speed)
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
    const t = Math.max(0, (playheadRef.current - music.startMs) / 1000)
    if (Number.isFinite(t) && Math.abs(audio.currentTime - t) > 0.12) audio.currentTime = t
    if (playing) void audio.play().catch(() => undefined)
    else audio.pause()
  }, [playing, music?.id, music?.startMs])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const video = videoRef.current
      const current = clipRef.current
      if (!video || !current || video.readyState < 1) return
      const target = Math.max(0, sourceTimeMs(current, localRef.current) / 1000)
      if (Number.isFinite(video.duration) && target >= video.duration - 0.05) return
      if (Math.abs(video.currentTime - target) > 0.45) video.currentTime = target
      if (video.paused) void video.play().catch(() => undefined)
      const audio = audioRef.current
      const track = extrasRef.current.find((extra) => extra.kind === 'audio')
      if (!audio || !track || !audio.src) return
      const musicAt = Math.max(0, (playheadRef.current - track.startMs) / 1000)
      if (Number.isFinite(musicAt) && Math.abs(audio.currentTime - musicAt) > 0.45) audio.currentTime = musicAt
    }, 400)
    return () => window.clearInterval(timer)
  }, [playing, clip?.id])

  const effectClass = clip && clip.effect !== 'none' ? ` is-fx-${clip.effect}` : ''

  return (
    <div className="nle-stage">
      {src && clip ? (
        <div className={`nle-fx${effectClass}`}>
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
        />
        </div>
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
      <audio ref={audioRef} preload="auto" />
    </div>
  )
}

function playbackRateFor(speed: number): number {
  return Math.min(16, Math.max(0.25, speed))
}

function fadeOpacityFor(clip: EditorClip | undefined, localMs: number, play: number): number {
  if (!clip) return 1
  let opacity = 1
  if (clip.fadeInMs > 0 && localMs < clip.fadeInMs) opacity = Math.max(0.05, localMs / clip.fadeInMs)
  if (clip.fadeOutMs > 0 && play - localMs < clip.fadeOutMs) opacity = Math.min(opacity, Math.max(0.05, (play - localMs) / clip.fadeOutMs))
  return opacity
}
