/** A paused player may seek only when a frame is already decoded and the playhead actually moved. */
export function shouldSeekMedia(currentTime: number, target: number, readyState: number, seeking: boolean): boolean {
  if (seeking || readyState < 2) return false
  if (!Number.isFinite(currentTime) || !Number.isFinite(target)) return false
  return Math.abs(currentTime - target) > 0.2
}
