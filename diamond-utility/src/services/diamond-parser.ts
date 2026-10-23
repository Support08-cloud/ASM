import { buildDiamond, countKind, type Diamond, type DiamondFolder, type MediaFile } from '../models/diamond'

export interface ScannedFolderInput {
  folderName: string
  relativePath: string
  accessible?: boolean
  errorMessage?: string
  files: Array<{ name: string; relativePath?: string; size?: number; absolutePath?: string }>
}

export function classifyFile(name: string): MediaFile['kind'] {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : ''
  if (ext === '.mp4' || ext === '.m4v' || ext === '.mov') return 'mp4'
  if (ext === '.json') return 'json'
  if (['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.bmp'].includes(ext)) return 'image'
  return 'other'
}

/** Last -/_ piece is a view if it is 1–2 digits, RG, or contains a letter (front, PV, top, …). */
export function isViewSuffix(suffix: string): boolean {
  if (/^(?:\d{1,2}|RG)$/i.test(suffix)) return true
  return /[A-Za-z]/.test(suffix)
}

export function parseFolderName(folderName: string): { baseName: string; variant: string; isBase: boolean } {
  const trimmed = folderName.trim()
  const splitIndex = Math.max(trimmed.lastIndexOf('-'), trimmed.lastIndexOf('_'))
  if (splitIndex > 0) {
    const suffix = trimmed.slice(splitIndex + 1)
    if (isViewSuffix(suffix)) {
      const baseName = trimmed.slice(0, splitIndex).trim()
      if (baseName) {
        return {
          baseName,
          variant: normalizeVariant(suffix),
          isBase: false,
        }
      }
    }
  }
  return { baseName: trimmed, variant: '', isBase: true }
}

export function normalizeVariant(suffix: string): string {
  return suffix.toUpperCase() === 'RG' ? 'RG' : suffix
}

export function groupDiamonds(folders: ScannedFolderInput[]): Diamond[] {
  const grouped = new Map<string, { baseName: string; folders: DiamondFolder[] }>()

  folders.forEach((folder, index) => {
    const parsed = parseFolderName(folder.folderName)
    const key = parsed.baseName.toLowerCase()
    const item: DiamondFolder = {
      id: `${key}:${folder.relativePath || folder.folderName}:${index}`,
      folderName: folder.folderName,
      relativePath: folder.relativePath || folder.folderName,
      variant: parsed.variant,
      isBase: parsed.isBase,
      accessible: folder.accessible !== false,
      errorMessage: folder.errorMessage,
      files: folder.files.map((file) => ({
        name: file.name,
        relativePath: file.relativePath ?? `${folder.folderName}/${file.name}`,
        size: file.size ?? 0,
        kind: classifyFile(file.name),
        absolutePath: file.absolutePath,
      })),
    }

    const existing = grouped.get(key)
    if (existing) {
      existing.folders.push(item)
      return
    }
    grouped.set(key, { baseName: parsed.baseName, folders: [item] })
  })

  return [...grouped.values()]
    .map((entry) => buildDiamond(entry.baseName, [...entry.folders].sort(compareFolders)))
    .sort((a, b) => a.baseName.localeCompare(b.baseName, undefined, { numeric: true, sensitivity: 'base' }))
}

function compareFolders(a: DiamondFolder, b: DiamondFolder): number {
  if (a.isBase !== b.isBase) return a.isBase ? -1 : 1
  const aNum = Number(a.variant)
  const bNum = Number(b.variant)
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum
  if (Number.isFinite(aNum)) return -1
  if (Number.isFinite(bNum)) return 1
  return a.folderName.localeCompare(b.folderName, undefined, { numeric: true, sensitivity: 'base' })
}

export function folderHasMp4(folder: DiamondFolder): boolean {
  return countKind(folder, 'mp4') > 0
}
