import { groupDiamonds, type ScannedFolderInput } from './diamond-parser'
import type { Diamond } from '../models/diamond'

interface Seed {
  base: string
  includeBaseFolder: boolean
  baseHasMp4?: boolean
  variants: Array<{ suffix: string; mp4?: boolean; error?: string }>
}

const SEEDS: Seed[] = [
  {
    base: '260602-362',
    includeBaseFolder: true,
    baseHasMp4: false,
    variants: [
      { suffix: '1', mp4: true },
      { suffix: '2', mp4: true },
      { suffix: '3', mp4: true },
      { suffix: 'RG', mp4: true },
    ],
  },
  {
    base: '250801-125',
    includeBaseFolder: true,
    baseHasMp4: false,
    variants: [
      { suffix: '1', mp4: true },
      { suffix: '2', mp4: true },
      { suffix: '3', mp4: true },
      { suffix: 'RG', mp4: true },
    ],
  },
  {
    base: 'Krish',
    includeBaseFolder: true,
    baseHasMp4: false,
    variants: [
      { suffix: '1', mp4: true },
      { suffix: '2', mp4: true },
      { suffix: '3', mp4: true },
      { suffix: 'RG', mp4: true },
    ],
  },
  {
    base: 'Rahul',
    includeBaseFolder: false,
    variants: [
      { suffix: '1', mp4: true },
      { suffix: '2', mp4: true },
      { suffix: '3', mp4: false },
    ],
  },
  {
    base: 'ABC123',
    includeBaseFolder: true,
    baseHasMp4: true,
    variants: [
      { suffix: '1', mp4: true },
      { suffix: '2', mp4: true },
      { suffix: 'RG', mp4: true },
    ],
  },
  {
    base: 'V360-1044',
    includeBaseFolder: true,
    variants: [
      { suffix: '1', mp4: true },
      { suffix: '2', mp4: true },
      { suffix: '3', mp4: true },
      { suffix: 'RG', error: 'The folder may have been moved, deleted, or you may not have permission to access it.' },
    ],
  },
  {
    base: 'Lot-204',
    includeBaseFolder: false,
    variants: [
      { suffix: '1', mp4: false },
      { suffix: '2', mp4: true },
    ],
  },
  {
    base: 'Meera',
    includeBaseFolder: true,
    variants: [
      { suffix: '1', mp4: true },
      { suffix: '2', mp4: true },
      { suffix: 'RG', mp4: true },
    ],
  },
]

export const DEMO_SOURCE_PATH = 'Sample Dataset / DiamondData'
export const DEMO_OUTPUT_PATH = 'Sample Dataset / Output_Testing'

export function buildDemoFolders(): ScannedFolderInput[] {
  const folders: ScannedFolderInput[] = []
  for (const seed of SEEDS) {
    if (seed.includeBaseFolder) {
      folders.push(
        seed.baseHasMp4
          ? mediaFolder(seed.base, { mp4: true })
          : { folderName: seed.base, relativePath: seed.base, files: [] },
      )
    }
    for (const variant of seed.variants) {
      const folderName = `${seed.base}-${variant.suffix}`
      if (variant.error) {
        folders.push({
          folderName,
          relativePath: folderName,
          accessible: false,
          errorMessage: variant.error,
          files: [],
        })
        continue
      }
      folders.push(mediaFolder(folderName, { mp4: variant.mp4 !== false }))
    }
  }
  return folders
}

function mediaFolder(folderName: string, spec: { mp4: boolean }): ScannedFolderInput {
  const files: ScannedFolderInput['files'] = []
  if (spec.mp4) {
    files.push({
      name: 'video.mp4',
      relativePath: `${folderName}/video.mp4`,
      size: 12_000_000,
    })
  }
  return { folderName, relativePath: folderName, files }
}

export function buildDemoDiamonds(): Diamond[] {
  return groupDiamonds(buildDemoFolders())
}
