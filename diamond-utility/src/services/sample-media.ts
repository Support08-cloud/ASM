const SAMPLE_BASE = './samples'

export function sampleFileForName(name: string): string {
  const stem = (name.replace(/\\/g, '/').split('/').pop() ?? name).replace(/\.(mp4|mov|m4v)$/i, '')
  if (/-rg$/i.test(stem) || /_rg$/i.test(stem)) return 'clip-rg.mp4'
  const match = stem.match(/[-_](\d{1,2})$/)
  if (match) {
    const n = Number(match[1])
    if (n === 2) return 'clip-2.mp4'
    if (n === 3) return 'clip-3.mp4'
  }
  return 'clip-1.mp4'
}

export function sampleMediaUrl(name: string): string {
  return `${SAMPLE_BASE}/${sampleFileForName(name)}`
}

export function sampleMusicUrl(): string {
  return `${SAMPLE_BASE}/music.m4a`
}

export function isDemoPath(path: string | undefined): boolean {
  if (!path) return true
  return path.includes('Sample Dataset') || path.startsWith('./samples/') || path.startsWith('samples/')
}

export function isRealDiskPath(path: string | undefined): boolean {
  if (!path || isDemoPath(path)) return false
  return /^[a-zA-Z]:[\\/]/.test(path) || (path.startsWith('/') && !path.startsWith('/samples'))
}
