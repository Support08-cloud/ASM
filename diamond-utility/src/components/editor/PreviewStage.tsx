import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { ClipTransform, EditorClip, ExtraClip } from '../../models/editor'
import { cssClipPathForClip, cssFilterForClip, cssTransformForClip, type TransitionLayerStyle } from '../../services/edit-graph'
import { toVideoSrc } from '../../services/media-url'
import { PLAY_SEEK_SEC, SCRUB_SEEK_SEC, shouldSeekMedia } from '../../services/playback'
import { clipPlayDurationMs, sourceTimeMs } from '../../services/timeline'

interface IncomingPreview {
  clip: EditorClip
  localMs: number
  layerStyle: TransitionLayerStyle
}

interface PreviewStageProps {
  clip: EditorClip | undefined
  localMs: number
  playheadMs: number
  playing: boolean
  masterVolume: number
  extras: ExtraClip[]
  outgoingStyle?: TransitionLayerStyle
  incoming?: IncomingPreview | null
  interactive?: boolean
  moveTitles?: boolean
  onTransform?: (transform: ClipTransform) => void
  onPlaceTitle?: (id: string, x: number, y: number) => void
  onGestureStart?: () => void
  onGestureEnd?: () => void
  onDuration: (clipId: string, durationMs: number) => void
}

export function PreviewStage({
  clip,
  localMs,
  playheadMs,
  playing,
  masterVolume,
  extras,
  outgoingStyle,
  incoming,
  interactive = false,
  moveTitles = false,
  onTransform,
  onPlaceTitle,
  onGestureStart,
  onGestureEnd,
  onDuration,
}: PreviewStageProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const playingRef = useRef(playing)
  playingRef.current = playing
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
  const effectClass = clip && clip.effect !== 'none' ? ` is-fx-${clip.effect}` : ''
  const incomingId = incoming?.clip.id
  const [incomingSeen, setIncomingSeen] = useState<{ id?: string; ready: boolean }>({ ready: false })
  const revealIncoming = Boolean(incoming && incomingSeen.id === incomingId && incomingSeen.ready)

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
    const target = Math.max(0, (playheadRef.current - music.startMs) / 1000)
    if (shouldSeekMedia(audio.currentTime, target, audio.readyState, audio.seeking, playing ? PLAY_SEEK_SEC : SCRUB_SEEK_SEC)) {
      audio.currentTime = target
    }
    if (playing) void audio.play().catch(() => undefined)
    else audio.pause()
  }, [playing, music?.id, music?.startMs])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const audio = audioRef.current
      const track = extrasRef.current.find((extra) => extra.kind === 'audio')
      if (!audio || !track || !audio.src || audio.seeking || audio.readyState < 2) return
      const musicAt = Math.max(0, (playheadRef.current - track.startMs) / 1000)
      if (shouldSeekMedia(audio.currentTime, musicAt, audio.readyState, audio.seeking, PLAY_SEEK_SEC)) audio.currentTime = musicAt
    }, 400)
    return () => window.clearInterval(timer)
  }, [playing, music?.id])

  useEffect(() => {
    const audio = audioRef.current
    return () => releaseMedia(audio)
  }, [])

  return (
    <div className="nle-stage">
      {src && clip ? (
        <div className="nle-fx" style={revealIncoming ? outgoingStyle : undefined}>
          <div className={`nle-fx-motion${effectClass}`}>
            <SyncedVideo
              clip={clip}
              localMs={localMs}
              playing={playing}
              masterVolume={masterVolume}
              style={{
                filter: cssFilterForClip(clip),
                transform: cssTransformForClip(clip),
                clipPath: cssClipPathForClip(clip),
                opacity: fadeOpacity * clip.grade.transparency,
              }}
              onDuration={onDuration}
              onStatus={setStatus}
            />
          </div>
        </div>
      ) : (
        <div className="stage-label">{clip?.error ?? clip?.label ?? 'Add a clip'}</div>
      )}
      {incoming ? (
        <div
          className="nle-fx is-incoming"
          style={revealIncoming ? incoming.layerStyle : { opacity: 0 }}
        >
          <div className={`nle-fx-motion${incoming.clip.effect !== 'none' ? ` is-fx-${incoming.clip.effect}` : ''}`}>
            <SyncedVideo
              clip={incoming.clip}
              localMs={incoming.localMs}
              playing={playing}
              masterVolume={masterVolume}
              style={{
                filter: cssFilterForClip(incoming.clip),
                transform: cssTransformForClip(incoming.clip),
                clipPath: cssClipPathForClip(incoming.clip),
                opacity: incoming.clip.grade.transparency,
              }}
              onDuration={onDuration}
              onStatus={(next) => setIncomingSeen({ id: incoming.clip.id, ready: next === 'ready' })}
            />
          </div>
        </div>
      ) : null}
      {status === 'loading' && src ? <div className="stage-status">Loading video…</div> : null}
      {status === 'error' || clip?.error ? (
        <div className="stage-status is-error">{clip?.error || 'This video could not be played.'}</div>
      ) : null}
      {titles.map((title) => (
        <div
          key={title.id}
          className={`stage-title${title.x != null || title.y != null ? ' is-placed' : ''}${moveTitles ? ' is-movable' : ''}`}
          style={
            title.x != null || title.y != null
              ? { left: `${(title.x ?? 0.5) * 100}%`, top: `${(title.y ?? 0.82) * 100}%`, bottom: 'auto', transform: 'translate(-50%, -50%)' }
              : undefined
          }
          onPointerDown={moveTitles ? (event) => dragPoint(event, (x, y) => onPlaceTitle?.(title.id, x, y), onGestureStart, onGestureEnd) : undefined}
        >
          {title.text || 'Title'}
        </div>
      ))}
      {interactive && clip && !playing ? (
        <div
          className="stage-handles"
          style={{ transform: cssTransformForClip(clip) }}
          onPointerDown={(event) => dragMove(event, clip.transform, onTransform, onGestureStart, onGestureEnd)}
        >
          <div className="stage-handle-box">
            <span className="stage-handle-label">Drag to move</span>
            <button
              type="button"
              className="stage-scale"
              aria-label="Scale clip"
              onPointerDown={(event) => {
                event.stopPropagation()
                dragScale(event, clip.transform, onTransform, onGestureStart, onGestureEnd)
              }}
            />
          </div>
        </div>
      ) : null}
      {clip?.effect === 'vignette' ? <div className="stage-vignette" /> : null}
      {clip?.effect === 'grain' ? <div className="stage-grain" /> : null}
      {clip ? (
        <div className="stage-meta">
          {clip.label.replace(/\.mp4$/i, '')}
          {clip.speed !== 1 ? ` · ${clip.speed.toFixed(2)}×` : ''}
          {clip.muted ? ' · muted' : ''}
        </div>
      ) : null}
      <audio ref={audioRef} preload="auto" />
    </div>
  )
}

function releaseMedia(media: HTMLMediaElement | null) {
  if (!media) return
  media.pause()
  media.removeAttribute('src')
  media.load()
}

function SyncedVideo({
  clip,
  localMs,
  playing,
  masterVolume,
  style,
  onDuration,
  onStatus,
}: {
  clip: EditorClip
  localMs: number
  playing: boolean
  masterVolume: number
  style: CSSProperties
  onDuration: (clipId: string, durationMs: number) => void
  onStatus?: (status: 'loading' | 'ready' | 'error') => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const releaseTimer = useRef(0)
  const playingRef = useRef(playing)
  playingRef.current = playing
  const localRef = useRef(localMs)
  localRef.current = localMs
  const clipRef = useRef(clip)
  clipRef.current = clip
  const masterVolumeRef = useRef(masterVolume)
  masterVolumeRef.current = masterVolume
  const onStatusRef = useRef(onStatus)
  onStatusRef.current = onStatus
  const src = toVideoSrc(clip)
  const wantSec = useRef<number | null>(null)
  const issuedSec = useRef<number | null>(null)
  const seekTolerance = useRef(SCRUB_SEEK_SEC)

  const srcRef = useRef(src)
  srcRef.current = src

  const assignSeek = (video: HTMLVideoElement) => {
    const want = wantSec.current
    if (want == null || !mediaMatches(video, srcRef.current)) return
    if (!shouldSeekMedia(video.currentTime, want, video.readyState, video.seeking, seekTolerance.current)) {
      if (!video.seeking && video.readyState >= 2) wantSec.current = null
      return
    }
    if (issuedSec.current === want) return
    issuedSec.current = want
    try {
      video.currentTime = want
    } catch {
      issuedSec.current = null
      /* Wait for loadeddata. A seek before a decoded frame restarts the load and sticks. */
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    issuedSec.current = null
    wantSec.current = null
    const flush = () => {
      assignSeek(video)
      if (video.seeking || !playingRef.current || !video.paused || !mediaMatches(video, srcRef.current)) return
      void video.play().catch(() => undefined)
    }
    video.addEventListener('loadeddata', flush)
    video.addEventListener('seeked', flush)
    return () => {
      video.removeEventListener('loadeddata', flush)
      video.removeEventListener('seeked', flush)
    }
  }, [clip.id, src])

  useEffect(() => {
    const video = videoRef.current
    const current = clipRef.current
    if (!video || !src) return
    const start = Math.max(0, sourceTimeMs(current, localRef.current) / 1000)
    const apply = () => {
      if (!mediaMatches(video, src)) return
      video.playbackRate = playbackRateFor(current.speed)
      video.volume = current.muted ? 0 : Math.min(1, Math.max(0, current.volume * masterVolumeRef.current))
      video.muted = video.volume === 0
      seekTolerance.current = SCRUB_SEEK_SEC
      wantSec.current = start
      assignSeek(video)
      if (playingRef.current && !video.seeking) {
        void video.play().catch(() => onStatusRef.current?.('error'))
      }
    }
    if (mediaMatches(video, src)) apply()
    else video.addEventListener('loadeddata', apply, { once: true })
    return () => video.removeEventListener('loadeddata', apply)
  }, [clip.id, src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = playbackRateFor(clip.speed)
    video.volume = clip.muted ? 0 : Math.min(1, Math.max(0, clip.volume * masterVolume))
    video.muted = video.volume === 0
  }, [clip.speed, clip.volume, clip.muted, masterVolume])

  useEffect(() => {
    const video = videoRef.current
    if (!video || playing) return
    const target = Math.max(0, sourceTimeMs(clip, localMs) / 1000)
    seekTolerance.current = SCRUB_SEEK_SEC
    wantSec.current = target
    assignSeek(video)
  }, [clip.id, clip.inMs, clip.speed, localMs, playing])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!playing) {
      video.pause()
      return
    }
    let cancel = false
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      if (cancel || !playingRef.current) return
      void video.play().catch(() => onStatusRef.current?.('error'))
    }
    const begin = () => {
      if (cancel || !playingRef.current || !mediaMatches(video, src)) return
      const target = Math.max(0, sourceTimeMs(clipRef.current, localRef.current) / 1000)
      const drift = Math.abs((Number.isFinite(video.currentTime) ? video.currentTime : 0) - target)
      seekTolerance.current = SCRUB_SEEK_SEC
      wantSec.current = target
      if (drift > SCRUB_SEEK_SEC || video.seeking) {
        if (!video.seeking) assignSeek(video)
        if (video.seeking) {
          video.addEventListener('seeked', onSeeked)
          return
        }
      }
      void video.play().catch(() => onStatusRef.current?.('error'))
    }
    const onData = () => begin()
    if (mediaMatches(video, src)) begin()
    else video.addEventListener('loadeddata', onData)
    return () => {
      cancel = true
      video.removeEventListener('loadeddata', onData)
      video.removeEventListener('seeked', onSeeked)
    }
  }, [playing, src])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const video = videoRef.current
      const current = clipRef.current
      if (!video || !mediaMatches(video, srcRef.current)) return
      const target = Math.max(0, sourceTimeMs(current, localRef.current) / 1000)
      if (Number.isFinite(video.duration) && target >= video.duration - 0.05) return
      if (shouldSeekMedia(video.currentTime, target, video.readyState, video.seeking, PLAY_SEEK_SEC)) {
        seekTolerance.current = PLAY_SEEK_SEC
        wantSec.current = target
        assignSeek(video)
      }
      if (video.paused && !video.seeking) void video.play().catch(() => undefined)
    }, 400)
    return () => window.clearInterval(timer)
  }, [playing, clip.id])

  useEffect(() => {
    window.clearTimeout(releaseTimer.current)
    const video = videoRef.current
    return () => {
      releaseTimer.current = window.setTimeout(() => releaseMedia(video), 0)
    }
  }, [])

  if (!src) return null
  return (
    <video
      ref={videoRef}
      className="nle-video"
      src={src}
      style={style}
      playsInline
      preload="auto"
      onLoadedMetadata={(event) => {
        onStatus?.('ready')
        const durationMs = event.currentTarget.duration * 1000
        if (Number.isFinite(durationMs) && durationMs > 0) onDuration(clip.id, durationMs)
      }}
      onCanPlay={() => onStatus?.('ready')}
      onError={() => onStatus?.('error')}
    />
  )
}

function dragPoint(
  event: ReactPointerEvent,
  apply: (x: number, y: number) => void,
  onStart?: () => void,
  onEnd?: () => void,
) {
  const frame = event.currentTarget.parentElement?.getBoundingClientRect()
  if (!frame) return
  event.preventDefault()
  event.stopPropagation()
  onStart?.()
  const move = (next: PointerEvent) => {
    const x = Math.min(1, Math.max(0, (next.clientX - frame.left) / frame.width))
    const y = Math.min(1, Math.max(0, (next.clientY - frame.top) / frame.height))
    apply(x, y)
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    onEnd?.()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function dragMove(
  event: ReactPointerEvent,
  origin: ClipTransform,
  apply: ((transform: ClipTransform) => void) | undefined,
  onStart?: () => void,
  onEnd?: () => void,
) {
  if ((event.target as HTMLElement).closest('.stage-scale')) return
  const frame = event.currentTarget.parentElement?.getBoundingClientRect()
  if (!frame || !apply) return
  event.preventDefault()
  onStart?.()
  const startX = event.clientX
  const startY = event.clientY
  const move = (next: PointerEvent) => {
    const x = Math.min(1, Math.max(-1, origin.x + (next.clientX - startX) / frame.width / 0.4))
    const y = Math.min(1, Math.max(-1, origin.y + (next.clientY - startY) / frame.height / 0.4))
    apply({ ...origin, x, y })
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    onEnd?.()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function dragScale(
  event: ReactPointerEvent,
  origin: ClipTransform,
  apply: ((transform: ClipTransform) => void) | undefined,
  onStart?: () => void,
  onEnd?: () => void,
) {
  if (!apply) return
  event.preventDefault()
  onStart?.()
  const startY = event.clientY
  const move = (next: PointerEvent) => {
    const scale = Math.min(2.4, Math.max(0.4, origin.scale + (startY - next.clientY) / 220))
    apply({ ...origin, scale })
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    onEnd?.()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function mediaMatches(video: HTMLMediaElement, src: string | undefined): boolean {
  if (!src || video.readyState < 2 || !video.currentSrc) return false
  try {
    return video.currentSrc === new URL(src, window.location.href).href
  } catch {
    return false
  }
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
