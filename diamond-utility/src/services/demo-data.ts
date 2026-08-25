import { groupDiamonds, type ScannedFolderInput } from './diamond-parser'
import type { Diamond } from '../models/diamond'

interface SeedSpec {
  name: string
  views: Record<string, { mp4?: number; json?: boolean; images?: number; error?: string }>
}

const SEEDS: SeedSpec[] = [
  { name: 'Krish', views: completeViews() },
  {
    name: 'Rahul',
    views: {
      Front: { mp4: 1, json: true, images: 4 },
      '3D': { mp4: 1, json: true, images: 4 },
      Top: { mp4: 1, json: true, images: 3 },
      '360': { mp4: 1, json: true, images: 8 },
    },
  },
  {
    name: 'ABC123',
    views: {
      Front: { mp4: 1, json: true, images: 2 },
      '3D': { mp4: 1, json: true, images: 2 },
      Top: { mp4: 0, json: true, images: 1 },
      '360': { mp4: 1, json: false, images: 0 },
      ER: { mp4: 1, json: true, images: 2 },
    },
  },
  { name: 'Meera', views: completeViews() },
  {
    name: 'V360-1044',
    views: {
      Front: { mp4: 2, json: true, images: 3 },
      '3D': { mp4: 1, json: true, images: 3 },
      Top: { mp4: 1, json: true, images: 3 },
      '360': { mp4: 1, json: true, images: 6 },
      ER: { mp4: 1, json: true, images: 2 },
    },
  },
  {
    name: 'Arjun',
    views: {
      Front: { mp4: 1, json: true, images: 2 },
      Top: { mp4: 1, json: false, images: 0 },
      ER: { mp4: 0, json: true, images: 1 },
    },
  },
  { name: 'Nisha', views: completeViews() },
  {
    name: 'Stone-88',
    views: {
      Front: { mp4: 1, json: true, images: 5 },
      '3D': { mp4: 1, json: true, images: 5 },
      Top: { mp4: 1, json: true, images: 5 },
      '360': { mp4: 1, json: true, images: 12 },
      ER: { error: 'The folder may have been moved, deleted, or you may not have permission to access it.' },
    },
  },
  { name: 'Kavya', views: completeViews() },
  { name: 'Dev', views: { Front: { mp4: 1, json: true, images: 2 }, '360': { mp4: 1, json: true, images: 7 } } },
  { name: 'Priya', views: completeViews() },
  {
    name: 'Lot-204',
    views: {
      Front: { mp4: 0, json: true, images: 3 },
      '3D': { mp4: 0, json: true, images: 3 },
      Top: { mp4: 1, json: true, images: 3 },
    },
  },
  { name: 'Ishaan', views: completeViews() },
  { name: 'Anaya', views: completeViews() },
  { name: 'Rohan', views: { Front: { mp4: 1, json: true, images: 1 }, '3D': { mp4: 1, json: true, images: 1 }, Top: { mp4: 1, json: true, images: 1 }, '360': { mp4: 1, json: true, images: 1 }, ER: { mp4: 1, json: true, images: 1 } } },
  { name: 'Sana', views: completeViews() },
  { name: 'V360-2210', views: completeViews() },
  { name: 'Tara', views: { Front: { mp4: 1, json: false, images: 0 }, ER: { mp4: 1, json: false, images: 0 } } },
  { name: 'Kabir', views: completeViews() },
  { name: 'Zara', views: completeViews() },
  { name: 'Om', views: { '360': { mp4: 1, json: true, images: 9 }, Front: { mp4: 1, json: true, images: 2 } } },
  { name: 'Diya', views: completeViews() },
  { name: 'Ayaan', views: completeViews() },
  {
    name: 'Parcel-17',
    views: {
      Front: { mp4: 3, json: true, images: 2 },
      '3D': { mp4: 1, json: true, images: 2 },
      Top: { mp4: 1, json: true, images: 2 },
      '360': { mp4: 1, json: true, images: 2 },
      ER: { mp4: 1, json: true, images: 2 },
    },
  },
]

function completeViews(): SeedSpec['views'] {
  return {
    Front: { mp4: 1, json: true, images: 4 },
    '3D': { mp4: 1, json: true, images: 4 },
    Top: { mp4: 1, json: true, images: 4 },
    '360': { mp4: 1, json: true, images: 10 },
    ER: { mp4: 1, json: true, images: 3 },
  }
}

export const DEMO_SOURCE_PATH = 'Sample Dataset / DiamondData'
export const DEMO_OUTPUT_PATH = 'Sample Dataset / DiamondOutput'

export function buildDemoFolders(): ScannedFolderInput[] {
  const folders: ScannedFolderInput[] = []
  for (const seed of SEEDS) {
    for (const [view, spec] of Object.entries(seed.views)) {
      const folderName = `${seed.name}_${view}`
      if (spec.error) {
        folders.push({
          folderName,
          relativePath: folderName,
          accessible: false,
          errorMessage: spec.error,
          files: [],
        })
        continue
      }
      const files: ScannedFolderInput['files'] = []
      const mp4Count = spec.mp4 ?? 0
      for (let i = 0; i < mp4Count; i += 1) {
        const suffix = mp4Count > 1 ? `_${i + 1}` : ''
        files.push({
          name: i === 0 ? 'video.mp4' : `video${suffix}.mp4`,
          relativePath: `${folderName}/video${suffix}.mp4`,
          size: 12_000_000 + i * 250_000,
        })
      }
      if (spec.json) {
        files.push({ name: 'meta.json', relativePath: `${folderName}/meta.json`, size: 2048 })
      }
      const imageCount = spec.images ?? 0
      for (let i = 0; i < imageCount; i += 1) {
        files.push({
          name: `frame_${String(i + 1).padStart(2, '0')}.jpg`,
          relativePath: `${folderName}/frame_${String(i + 1).padStart(2, '0')}.jpg`,
          size: 180_000,
        })
      }
      folders.push({ folderName, relativePath: folderName, files })
    }
  }
  return folders
}

export function buildDemoDiamonds(): Diamond[] {
  return groupDiamonds(buildDemoFolders())
}
