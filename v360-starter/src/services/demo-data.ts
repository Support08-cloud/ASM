import type { RecordItem, RecordStatus } from '../models/app'

export const DEMO_SOURCE_LABEL = 'Sample dataset'

const NAMES = [
  'Aurora',
  'Basalt',
  'Cinder',
  'Dune',
  'Ember',
  'Fjord',
  'Glacier',
  'Harbor',
  'Indigo',
  'Juniper',
  'Kestrel',
  'Lumen',
  'Meridian',
  'Nimbus',
  'Onyx',
  'Prairie',
  'Quarry',
  'Ridge',
  'Summit',
  'Tundra',
  'Umber',
  'Vertex',
  'Willow',
  'Zephyr',
]

const TAGS = ['batch-a', 'batch-b', 'priority', 'archive', 'review']

/**
 * Deterministic sample data so the UI, tests, and screenshots all agree.
 * Swap this out for the real loader when you start a project from this scaffold.
 */
export function buildDemoRecords(count = NAMES.length): RecordItem[] {
  const random = seeded(20260923)
  const now = Date.now()

  return Array.from({ length: count }, (_, index) => {
    const name = NAMES[index % NAMES.length] ?? `Item ${index + 1}`
    const suffix = index >= NAMES.length ? `-${Math.floor(index / NAMES.length) + 1}` : ''
    const itemCount = 3 + Math.floor(random() * 22)

    return {
      id: `rec-${index + 1}`,
      code: `${name.toUpperCase()}${suffix}`,
      label: `${name} collection${suffix}`,
      status: pickStatus(index),
      itemCount,
      sizeBytes: itemCount * (180_000 + Math.floor(random() * 900_000)),
      updatedAt: new Date(now - index * 37 * 60_000).toISOString(),
      tags: [TAGS[index % TAGS.length] ?? 'batch-a'],
    }
  })
}

function pickStatus(index: number): RecordStatus {
  if (index % 11 === 5) return 'error'
  if (index % 5 === 3) return 'warning'
  return 'ready'
}

function seeded(seed: number): () => number {
  let value = seed % 2_147_483_647
  if (value <= 0) value += 2_147_483_646
  return () => {
    value = (value * 16_807) % 2_147_483_647
    return (value - 1) / 2_147_483_646
  }
}
