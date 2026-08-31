import type { ExtraClip, TextAnim } from '../models/editor'

export function titleLocalMs(extra: ExtraClip, playheadMs: number): number {
  return playheadMs - extra.startMs
}

export function titleAnimMs(extra: ExtraClip, edge: 'in' | 'out'): number {
  if (edge === 'in') return Math.max(extra.animIn && extra.animIn !== 'none' ? 400 : 0, extra.fadeInMs ?? 0)
  return Math.max(extra.animOut && extra.animOut !== 'none' ? 400 : 0, extra.fadeOutMs ?? 0)
}

export function titleOpacity(extra: ExtraClip, playheadMs: number): number {
  const local = titleLocalMs(extra, playheadMs)
  const duration = extra.durationMs
  const fadeIn = titleAnimMs(extra, 'in')
  const fadeOut = titleAnimMs(extra, 'out')
  let opacity = 1
  if (fadeIn > 0 && local < fadeIn) opacity = Math.max(0.2, local / fadeIn)
  if (fadeOut > 0 && duration - local < fadeOut) opacity = Math.min(opacity, Math.max(0, (duration - local) / fadeOut))
  return opacity
}

export function titleTransform(extra: ExtraClip, playheadMs: number): string {
  const local = titleLocalMs(extra, playheadMs)
  const duration = extra.durationMs
  const fadeIn = titleAnimMs(extra, 'in')
  const fadeOut = titleAnimMs(extra, 'out')
  const parts = ['translate(-50%, -50%)']
  applyAnim(parts, extra.animIn ?? 'none', fadeIn > 0 ? 1 - Math.min(1, local / Math.max(fadeIn, 1)) : 0)
  applyAnim(parts, extra.animOut ?? 'none', fadeOut > 0 ? 1 - Math.min(1, (duration - local) / Math.max(fadeOut, 1)) : 0)
  return parts.join(' ')
}

function applyAnim(parts: string[], anim: TextAnim, amount: number) {
  if (anim === 'none' || amount <= 0) return
  if (anim === 'slide') parts.push(`translateX(${(amount * 48).toFixed(1)}px)`)
  if (anim === 'zoom') parts.push(`scale(${(1 - amount * 0.28).toFixed(3)})`)
}

export function titleBoxStyle(extra: ExtraClip, playheadMs: number): Record<string, string | number> {
  const align = extra.textAlign ?? 'center'
  return {
    left: `${Math.round((extra.posX ?? 0.5) * 100)}%`,
    top: `${Math.round((extra.posY ?? 0.82) * 100)}%`,
    transform: titleTransform(extra, playheadMs),
    opacity: titleOpacity(extra, playheadMs),
    color: extra.textColor ?? '#ffffff',
    fontFamily: extra.fontFamily ?? 'Geist, sans-serif',
    fontSize: extra.fontSize ?? 48,
    textAlign: align,
  }
}

export function drawtextAlphaExpr(extra: ExtraClip): string {
  const start = extra.startMs / 1000
  const end = (extra.startMs + extra.durationMs) / 1000
  const fadeIn = titleAnimMs(extra, 'in') / 1000
  const fadeOut = titleAnimMs(extra, 'out') / 1000
  const rise = fadeIn > 0.04 ? `if(lt(t,${(start + fadeIn).toFixed(3)}),(t-${start.toFixed(3)})/${fadeIn.toFixed(3)},1)` : '1'
  const fall = fadeOut > 0.04 ? `if(gt(t,${(end - fadeOut).toFixed(3)}),(${end.toFixed(3)}-t)/${fadeOut.toFixed(3)},1)` : '1'
  return `min(${rise}\\,${fall})`
}

export function drawtextXY(extra: ExtraClip): { x: string; y: string } {
  const px = extra.posX ?? 0.5
  const py = extra.posY ?? 0.82
  const align = extra.textAlign ?? 'center'
  const x = align === 'left' ? `(w*${px.toFixed(3)})` : align === 'right' ? `(w*${px.toFixed(3)}-text_w)` : `(w*${px.toFixed(3)}-text_w/2)`
  return { x, y: `(h*${py.toFixed(3)}-text_h/2)` }
}
