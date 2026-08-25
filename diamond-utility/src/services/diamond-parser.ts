import {
  VIEW_TYPES,
  buildDiamond,
  type Diamond,
  type DiamondView,
  type MediaFile,
  type ViewKey,
  type ViewType,
} from '../models/diamond'

const VIEW_LOOKUP: Record<string, ViewType> = {
  front: 'Front',
  '3d': '3D',
  threed: '3D',
  top: 'Top',
  '360': '360',
  er: 'ER',
}

export interface ScannedFolderInput {
  folderName: string
  relativePath: string
  accessible?: boolean
  errorMessage?: string
  files: Array<{ name: string; relativePath?: string; size?: number }>
}

export function classifyFile(name: string): MediaFile['kind'] {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : ''
  if (ext === '.mp4' || ext === '.m4v' || ext === '.mov') return 'mp4'
  if (ext === '.json') return 'json'
  if (['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.bmp'].includes(ext)) return 'image'
  return 'other'
}

export function parseFolderName(folderName: string): { baseName: string; view: ViewKey } {
  const trimmed = folderName.trim()
  const splitIndex = Math.max(trimmed.lastIndexOf('_'), trimmed.lastIndexOf('-'), trimmed.lastIndexOf(' '))
  if (splitIndex > 0) {
    const suffix = trimmed.slice(splitIndex + 1).toLowerCase()
    const view = VIEW_LOOKUP[suffix]
    if (view) {
      const baseName = trimmed.slice(0, splitIndex).trim()
      if (baseName) return { baseName, view }
    }
  }
  return { baseName: trimmed, view: 'Unknown' }
}

export function isKnownView(value: string): value is ViewType {
  return (VIEW_TYPES as readonly string[]).includes(value)
}

export function groupDiamonds(folders: ScannedFolderInput[]): Diamond[] {
  const grouped = new Map<string, { baseName: string; views: DiamondView[] }>()

  folders.forEach((folder, index) => {
    const parsed = parseFolderName(folder.folderName)
    const key = parsed.baseName.toLowerCase()
    const view: DiamondView = {
      id: `${key}:${parsed.view}:${folder.relativePath || folder.folderName}:${index}`,
      folderName: folder.folderName,
      relativePath: folder.relativePath || folder.folderName,
      view: parsed.view,
      accessible: folder.accessible !== false,
      errorMessage: folder.errorMessage,
      files: folder.files.map((file) => ({
        name: file.name,
        relativePath: file.relativePath ?? `${folder.folderName}/${file.name}`,
        size: file.size ?? 0,
        kind: classifyFile(file.name),
      })),
    }

    const existing = grouped.get(key)
    if (existing) {
      existing.views.push(view)
      return
    }
    grouped.set(key, { baseName: parsed.baseName, views: [view] })
  })

  return [...grouped.values()]
    .map((entry) =>
      buildDiamond(
        entry.baseName,
        [...entry.views].sort((a, b) => viewOrder(a.view) - viewOrder(b.view)),
      ),
    )
    .sort((a, b) => a.baseName.localeCompare(b.baseName, undefined, { sensitivity: 'base' }))
}

function viewOrder(view: ViewKey): number {
  const index = VIEW_TYPES.indexOf(view as ViewType)
  return index === -1 ? VIEW_TYPES.length : index
}
