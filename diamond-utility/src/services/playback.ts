/** About one frame. A paused rewind of 0.05s lands; a 0.01s nudge does not restart the decoder. */
export const SCRUB_SEEK_SEC = 0.04

/** Playback only corrects a missed seek, so the decoder is not restarted on every tick. */
export const PLAY_SEEK_SEC = 0.2

/** A player may seek only when a frame is already decoded and the playhead actually moved. */
export function shouldSeekMedia(
  currentTime: number,
  target: number,
  readyState: number,
  seeking: boolean,
  toleranceSec = SCRUB_SEEK_SEC,
): boolean {
  if (seeking || readyState < 2) return false
  if (!Number.isFinite(currentTime) || !Number.isFinite(target) || !Number.isFinite(toleranceSec)) return false
  return Math.abs(currentTime - target) > toleranceSec
}
