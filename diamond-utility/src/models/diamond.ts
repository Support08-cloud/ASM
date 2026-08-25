export const VIEW_TYPES = ['Front', '3D', 'Top', '360', 'ER'] as const
export type ViewType = (typeof VIEW_TYPES)[number]
export type ViewKey = ViewType | 'Unknown'

export type DiamondStatus = 'ready' | 'warning' | 'error'
export type Mp4Availability = 'available' | 'missing' | 'multiple'

export interface MediaFile {
  name: string
  relativePath: string
  size: number
  kind: 'mp4' | 'json' | 'image' | 'other'
}

export interface DiamondView {
  id: string
  folderName: string
  relativePath: string
  view: ViewKey
  accessible: boolean
  errorMessage?: string
  files: MediaFile[]
}

export interface Diamond {
  id: string
  baseName: string
  views: DiamondView[]
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

export interface AppError {
  title: string
  detail: string
  path?: string
  cause?: string
}

export interface Filters {
  views: ViewType[]
  mp4: Mp4Availability[]
  status: DiamondStatus[]
}

export const EMPTY_FILTERS: Filters = {
  views: [],
  mp4: [],
  status: [],
}

export function countKind(view: DiamondView, kind: MediaFile['kind']): number {
  return view.files.filter((file) => file.kind === kind).length
}

export function summarizeDiamond(views: DiamondView[]): Pick<
  Diamond,
  'status' | 'mp4' | 'json' | 'images' | 'sourceFolderCount'
> {
  const expected = Math.max(views.length, 1)
  const mp4Found = views.filter((view) => countKind(view, 'mp4') > 0).length
  const jsonFound = views.filter((view) => countKind(view, 'json') > 0).length
  const imageFound = views.filter((view) => countKind(view, 'image') > 0).length

  const inaccessible = views.some((view) => !view.accessible)
  const hasMultiple = views.some((view) => countKind(view, 'mp4') > 1)
  const hasMissing = views.some((view) => view.accessible && countKind(view, 'mp4') === 0)

  let availability: Mp4Availability = 'available'
  if (hasMultiple) availability = 'multiple'
  else if (hasMissing || mp4Found === 0) availability = 'missing'

  let status: DiamondStatus = 'ready'
  if (inaccessible) status = 'error'
  else if (hasMultiple || hasMissing || views.length === 0) status = 'warning'

  return {
    status,
    mp4: { found: mp4Found, expected, availability },
    json: { found: jsonFound, expected },
    images: { found: imageFound, expected },
    sourceFolderCount: views.length,
  }
}

export function buildDiamond(baseName: string, views: DiamondView[]): Diamond {
  const summary = summarizeDiamond(views)
  return {
    id: baseName.trim().toLowerCase(),
    baseName,
    views,
    ...summary,
  }
}
