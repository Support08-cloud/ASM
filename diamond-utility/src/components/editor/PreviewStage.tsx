import { useEffect, useRef, useState } from 'react'
import watermark from '../../assets/brand/v360-wordmark-white.png'
import type { DuckingSettings, EditorClip, ExtraClip } from '../../models/editor'
import { DEFAULT_DUCKING } from '../../models/editor'
import { cropInsets, cssClipPathForClip, cssFilterForClip, cssTransformForClip } from '../../services/edit-graph'
import { extraPlaybackVolume } from '../../services/editor-audio'
import { toVideoSrc } from '../../services/media-url'
import { clipPlayDurationMs, extrasForPreview, sourceTimeMs } from '../../services/timeline'
import { titleBoxStyle } from '../../services/title-style'

interface PreviewStageProps {
  clip: EditorClip | undefined
  localMs: number
  playheadMs: number
  playing: boolean
  masterVolume: number
  extras: ExtraClip[]
  ducking?: DuckingSettings
  transitionOpacity: number
  showCrop: boolean
  selectedExtraId?: string | null
  onDuration: (clipId: string, durationMs: number) => void
}

export function PreviewStage({
  clip,
  localMs,
  playheadMs,
  playing,
  masterVolume,
  extras,
  ducking,
  transitionOpacity,
  showCrop,
  selectedExtraId,
  onDuration,
}: PreviewStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const overlayRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const src = clip ? toVideoSrc(clip) : undefined
  const titles = extras.filter((extra) => extra.kind === 'text')
  const musicTracks = extras.filter((extra) => extra.kind === 'audio')
  const overlays = extras.filter((extra) => extra.kind === 'overlay')
  const play = clip ? clipPlayDurationMs(clip) : 0
  const fadeOpacity = fadeOpacityFor(clip, localMs, play)
  const insets = clip ? cropInsets(clip) : null
  const cropOn = Boolean(showCrop && clip?.transform.cropEnabled)
  const effect = clip && clip.effect !== 'none' ? clip.effect : ''

  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip || !src) return
    const same = video.dataset.src === src
    if (!same) {
      video.dataset.src = src
      video.src = src
      setStatus('loading')
    }
  }, [clip?.id, src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip) return
    video.playbackRate = Math.max(0.25, clip.speed)
    const volume = clip.muted ? 0 : Math.min(1, Math.max(0, clip.volume * masterVolume))
    video.volume = volume
  }, [clip?.speed, clip?.volume, clip?.muted, masterVolume])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip || !src) return
    const target = sourceTimeMs(clip, localMs) / 1000
    const apply = () => {
      if (Number.isFinite(target) && Math.abs(video.currentTime - target) > 0.12) {
        video.currentTime = Math.max(0, target)
      }
      video.playbackRate = Math.max(0.25, clip.speed)
      if (playing) {
        const volume = clip.muted ? 0 : Math.min(1, Math.max(0, clip.volume * masterVolume))
        video.muted = true
        void video
          .play()
          .then(() => {
            video.muted = volume === 0
            video.volume = volume
            setStatus('ready')
          })
          .catch(() => setStatus('ready'))
      } else {
        video.pause()
        setStatus((value) => (value === 'loading' ? 'ready' : value))
      }
    }
    if (video.readyState >= 1) apply()
    else video.addEventListener('loadedmetadata', apply, { once: true })
  }, [playing, clip?.id, src, clip?.inMs, clip?.speed])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip || playing) return
    const target = sourceTimeMs(clip, localMs) / 1000
    if (Number.isFinite(target) && video.readyState >= 1 && Math.abs(video.currentTime - target) > 0.04) {
      video.currentTime = Math.max(0, target)
    }
  }, [playing, localMs, clip?.id, clip?.inMs])

  useEffect(() => {
    musicTracks.forEach((music) => {
      const audio = audioRefs.current[music.id]
      if (!audio) return
      const nextSrc = music.mediaUrl || (music.absolutePath && window.desktop?.toMediaUrl?.(music.absolutePath)) || ''
      if (nextSrc && audio.dataset.src !== nextSrc) {
        audio.dataset.src = nextSrc
        audio.src = nextSrc
      }
      audio.volume = extraPlaybackVolume(
        { ducking: ducking ?? DEFAULT_DUCKING, masterVolume, clips: clip ? [clip] : [] },
        music,
        playheadMs,
      )
      const t = Math.max(0, (playheadMs - music.startMs) / 1000)
      if (playing) {
        if (Math.abs(audio.currentTime - t) > 0.25) audio.currentTime = t
        void audio.play().catch(() => undefined)
      } else {
        if (Number.isFinite(t) && Math.abs(audio.currentTime - t) > 0.12) audio.currentTime = t
        audio.pause()
      }
    })
  }, [musicTracks.map((item) => item.id).join(','), playing, playheadMs, masterVolume, ducking])

  useEffect(() => {
    overlays.forEach((overlay) => {
      const node = overlayRefs.current[overlay.id]
      if (!node) return
      const nextSrc = overlay.mediaUrl || (overlay.absolutePath && window.desktop?.toMediaUrl?.(overlay.absolutePath)) || ''
      if (nextSrc && node.dataset.src !== nextSrc) {
        node.dataset.src = nextSrc
        node.src = nextSrc
      }
      const t = Math.max(0, (playheadMs - overlay.startMs) / 1000)
      if (playing) {
        if (Math.abs(node.currentTime - t) > 0.25) node.currentTime = t
        void node.play().catch(() => undefined)
      } else {
        if (Number.isFinite(t) && Math.abs(node.currentTime - t) > 0.12) node.currentTime = t
        node.pause()
      }
    })
  }, [overlays.map((item) => item.id).join(','), playing, playheadMs])

  return (
    <div className="v360-stage">
      {src && clip ? (
        <div className={`v360-fx${effect ? ` is-fx-${effect}` : ''}`}>
          <video
            ref={videoRef}
            className="v360-video"
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
        <div className="v360-stage-label">{clip?.error ?? clip?.label ?? 'Add a clip'}</div>
      )}
      {overlays.map((overlay) => {
        const srcUrl = overlay.mediaUrl || (overlay.absolutePath && window.desktop?.toMediaUrl?.(overlay.absolutePath))
        if (!srcUrl) return null
        const size = Math.round((overlay.overlayScale ?? 0.45) * 100)
        return (
          <video
            key={overlay.id}
            ref={(node) => {
              overlayRefs.current[overlay.id] = node
            }}
            className="v360-overlay"
            src={srcUrl}
            muted
            playsInline
            style={{
              left: `${Math.round((overlay.posX ?? 0.5) * 100)}%`,
              top: `${Math.round((overlay.posY ?? 0.5) * 100)}%`,
              width: `${size}%`,
            }}
          />
        )
      })}
      {status === 'loading' && src ? <div className="v360-stage-status">Loading video…</div> : null}
      {status === 'error' || clip?.error ? (
        <div className="v360-stage-status is-error">{clip?.error || 'This MP4 could not be played.'}</div>
      ) : null}
      {titles.map((title) => {
        const style = titleBoxStyle(title, playheadMs)
        if (title.id === selectedExtraId) style.opacity = Math.max(Number(style.opacity ?? 0), 0.9)
        return (
          <div key={title.id} className={`v360-title is-anim-${title.animIn ?? 'none'}${title.id === selectedExtraId ? ' is-selected' : ''}`} style={style}>
            {title.text || 'Title Overlay'}
          </div>
        )
      })}
      {clip?.effect === 'vignette' ? <div className="v360-vignette" /> : null}
      {clip?.effect === 'grain' ? <div className="v360-grain" /> : null}
      {cropOn && insets ? (
        <div
          className="v360-crop-box"
          style={{
            inset: `${insets.top * 100}% ${insets.right * 100}% ${insets.bottom * 100}% ${insets.left * 100}%`,
          }}
        >
          <span>CROP MODE</span>
        </div>
      ) : (
        <div className="v360-safe" />
      )}
      <img className="v360-mark" src={watermark} alt="" />
      {musicTracks.map((music) => (
        <audio
          key={music.id}
          ref={(node) => {
            audioRefs.current[music.id] = node
          }}
          preload="auto"
        />
      ))}
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

export function extrasOnPreview(extras: ExtraClip[], playheadMs: number, selectedId?: string | null) {
  return extrasForPreview(extras, playheadMs, selectedId)
}
