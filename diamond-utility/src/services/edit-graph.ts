import type { EditorClip, EffectId, FilterId } from '../models/editor'
import { SPEED_MAX, SPEED_MIN } from '../models/editor'

export function clampSpeed(speed: number): number {
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed))
}

export function atempoChain(speed: number): string {
  const parts: number[] = []
  let rest = clampSpeed(speed)
  while (rest > 2.0001) {
    parts.push(2)
    rest /= 2
  }
  while (rest < 0.4999) {
    parts.push(0.5)
    rest /= 0.5
  }
  if (Math.abs(rest - 1) > 0.01) parts.push(Number(rest.toFixed(4)))
  return parts.map((value) => `atempo=${value}`).join(',')
}

export function cssFilterForClip(clip: EditorClip): string {
  const named = namedCssFilter(clip.filter)
  const g = clip.grade
  const brightness = 1 + g.exposure * 0.25
  const contrast = 1 + g.contrast * 0.4
  const saturate = 1 + g.saturation * 0.5
  const hue = g.temperature * -12
  const effect = effectCss(clip.effect)
  return [named, `brightness(${brightness})`, `contrast(${contrast})`, `saturate(${saturate})`, `hue-rotate(${hue}deg)`, effect]
    .filter(Boolean)
    .join(' ')
}

export function cssTransformForClip(clip: EditorClip): string {
  const t = clip.transform
  const flips = `${t.flipH ? ' scaleX(-1)' : ''}${t.flipV ? ' scaleY(-1)' : ''}`
  return `translate(${t.x * 40}%, ${t.y * 40}%) scale(${Math.max(0.2, t.scale)})${flips}`
}

export function cssClipPathForClip(clip: EditorClip): string | undefined {
  const crop = Math.min(0.4, Math.max(0, clip.transform.crop))
  if (crop < 0.005) return undefined
  const p = (crop * 100).toFixed(1)
  return `inset(${p}% ${p}% ${p}% ${p}%)`
}

export function videoFiltersForClip(clip: EditorClip, playSec: number): string[] {
  const crop = Math.min(0.4, Math.max(0, clip.transform.crop))
  const cropExpr =
    crop > 0.005
      ? `crop=iw*(${(1 - crop * 2).toFixed(3)}):ih*(${(1 - crop * 2).toFixed(3)}):iw*${crop.toFixed(3)}:ih*${crop.toFixed(3)}`
      : ''
  const scale = Math.max(0.2, clip.transform.scale)
  const ox = Math.round((clip.transform.x + 0.5) * 1920 - 960 * scale)
  const oy = Math.round((clip.transform.y + 0.5) * 1080 - 540 * scale)
  const sized = `scale=${Math.round(1920 * scale)}:${Math.round(1080 * scale)}:force_original_aspect_ratio=decrease`
  const pad = `pad=1920:1080:${ox}:${oy}:black`
  const fadeIn = clip.fadeInMs > 40 ? `fade=t=in:st=0:d=${(clip.fadeInMs / 1000).toFixed(3)}` : ''
  const fadeOut =
    clip.fadeOutMs > 40
      ? `fade=t=out:st=${Math.max(0, playSec - clip.fadeOutMs / 1000).toFixed(3)}:d=${(clip.fadeOutMs / 1000).toFixed(3)}`
      : ''
  const alpha =
    clip.grade.transparency < 0.995
      ? `format=gbrp,geq=r='r(X,Y)*${clip.grade.transparency.toFixed(3)}':g='g(X,Y)*${clip.grade.transparency.toFixed(3)}':b='b(X,Y)*${clip.grade.transparency.toFixed(3)}'`
      : ''
  return [
    cropExpr,
    clip.transform.flipH ? 'hflip' : '',
    clip.transform.flipV ? 'vflip' : '',
    sized,
    pad,
    namedEqFilter(clip.filter),
    gradeEqFilter(clip),
    alpha,
    effectFilter(clip.effect, playSec),
    `setpts=PTS/${Math.max(clip.speed, 0.01)}`,
    fadeIn,
    fadeOut,
    'fps=30',
    'format=yuv420p',
  ].filter(Boolean)
}

export function proxyFilter(): string {
  return 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p'
}

export function proxyOutputPath(outputDir: string, clipId: string): string {
  const sep = outputDir.includes('\\') ? '\\' : '/'
  const root = outputDir.replace(/[\\/]+$/, '')
  return `${root}${sep}.edit-cache${sep}proxy-${clipId.replace(/[^a-zA-Z0-9_-]/g, '')}.mp4`
}

function namedCssFilter(id: FilterId): string {
  if (id === 'warm') return 'sepia(0.18) saturate(1.15)'
  if (id === 'cool') return 'hue-rotate(192deg) saturate(0.92)'
  if (id === 'contrast') return 'contrast(1.25) saturate(1.05)'
  if (id === 'mono') return 'grayscale(1)'
  return ''
}

function namedEqFilter(id: FilterId): string {
  if (id === 'warm') return 'eq=gamma_r=1.12:gamma_g=1.04:gamma_b=0.88:saturation=1.08'
  if (id === 'cool') return 'eq=gamma_r=0.9:gamma_g=1.0:gamma_b=1.12:saturation=1.05'
  if (id === 'contrast') return 'eq=contrast=1.25:brightness=0.03'
  if (id === 'mono') return 'hue=s=0'
  return ''
}

function gradeEqFilter(clip: EditorClip): string {
  const g = clip.grade
  if (
    Math.abs(g.exposure) < 0.01 &&
    Math.abs(g.contrast) < 0.01 &&
    Math.abs(g.saturation) < 0.01 &&
    Math.abs(g.temperature) < 0.01
  ) {
    return ''
  }
  const brightness = (g.exposure * 0.12).toFixed(3)
  const contrast = (1 + g.contrast * 0.4).toFixed(3)
  const saturation = (1 + g.saturation * 0.5).toFixed(3)
  const gammaR = (1 + g.temperature * 0.12).toFixed(3)
  const gammaB = (1 - g.temperature * 0.12).toFixed(3)
  return `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}:gamma_r=${gammaR}:gamma_b=${gammaB}`
}

function effectCss(id: EffectId): string {
  if (id === 'blur') return 'blur(5px)'
  if (id === 'flash') return 'brightness(1.28) contrast(1.08)'
  return ''
}

function effectFilter(id: EffectId, playSec: number): string {
  if (id === 'flash') return 'eq=brightness=0.18'
  if (id === 'pulse') return 'eq=contrast=1.12:brightness=0.04'
  if (id === 'blur') return 'gblur=sigma=6'
  if (id === 'vignette') return 'vignette=angle=PI/4'
  if (id === 'grain') return 'noise=alls=10:allf=t'
  if (id === 'slowzoom') return `zoompan=z='min(zoom+0.0008,1.18)':d=${Math.max(1, Math.round(playSec * 30))}:s=1920x1080:fps=30`
  if (id === 'spin') return 'rotate=0.08*sin(2*PI*t/4):ow=1920:oh=1080:c=black'
  return ''
}
