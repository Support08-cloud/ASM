export const COMMON_VARIANTS = ['1', '2', '3', 'RG'] as const

export type DiamondStatus = 'ready' | 'warning' | 'error'
export type Mp4Availability = 'available' | 'missing' | 'multiple'

export interface MediaFile {
  name: string
  relativePath: string
  size: number
  kind: 'mp4' | 'json' | 'image' | 'other'
  absolutePath?: string
}

export interface DiamondFolder {
  id: string
  folderName: string
  relativePath: string
  variant: string
  isBase: boolean
  accessible: boolean
  errorMessage?: string
  files: MediaFile[]
}

export interface Diamond {
  id: string
  baseName: string
  folders: DiamondFolder[]
  status: DiamondStatus
  mp4: { found: number; expected: number; availability: Mp4Availability }
  json: { found: number; expected: number }
  images: { found: number; expected: number }
  sourceFolderCount: number
}

export interface ScanProgress {
  foldersScanned: number
  filesSeen: number
  percent: number
  message: string
}

export interface Filters {
  variants: string[]
  mp4: Mp4Availability[]
  status: DiamondStatus[]
}

export const EMPTY_FILTERS: Filters = {
  variants: [],
  mp4: [],
  status: [],
}

export function countKind(folder: DiamondFolder, kind: MediaFile['kind']): number {
  return folder.files.filter((file) => file.kind === kind).length
}

export function summarizeDiamond(folders: DiamondFolder[]): Pick<
  Diamond,
  'status' | 'mp4' | 'json' | 'images' | 'sourceFolderCount'
> {
  const variants = folders.filter((folder) => !folder.isBase)
  const tracked = variants.length > 0 ? variants : folders
  const expected = Math.max(tracked.length, 1)
  const mp4Found = tracked.filter((folder) => countKind(folder, 'mp4') > 0).length
  const jsonFound = folders.filter((folder) => countKind(folder, 'json') > 0).length
  const imageFound = folders.filter((folder) => countKind(folder, 'image') > 0).length

  const inaccessible = folders.some((folder) => !folder.accessible)
  const hasMultiple = folders.some((folder) => countKind(folder, 'mp4') > 1)
  const hasMissing = tracked.some((folder) => folder.accessible && countKind(folder, 'mp4') === 0)

  let availability: Mp4Availability = 'available'
  if (hasMultiple) availability = 'multiple'
  else if (hasMissing || mp4Found === 0) availability = 'missing'

  let status: DiamondStatus = 'ready'
  if (inaccessible) status = 'error'
  else if (hasMultiple || hasMissing || folders.length === 0) status = 'warning'

  return {
    status,
    mp4: { found: mp4Found, expected, availability },
    json: { found: jsonFound, expected: Math.max(folders.length, 1) },
    images: { found: imageFound, expected: Math.max(folders.length, 1) },
    sourceFolderCount: folders.length,
  }
}

export function buildDiamond(baseName: string, folders: DiamondFolder[]): Diamond {
  const summary = summarizeDiamond(folders)
  return {
    id: baseName.trim().toLowerCase(),
    baseName,
    folders,
    ...summary,
  }
}

export function folderIds(diamond: Diamond): string[] {
  return diamond.folders.map((folder) => folder.id)
}

export function withSelectedFolders(diamonds: Diamond[], selectedIds: string[]): Diamond[] {
  return diamonds
    .map((diamond) =>
      buildDiamond(
        diamond.baseName,
        diamond.folders.filter((folder) => selectedIds.includes(folder.id)),
      ),
    )
    .filter((diamond) => diamond.folders.length > 0)
}
