import type { AppPhase } from '../models/processing'

export function getMp4BlockedReason(state: {
  phase: AppPhase
  sourcePath: string | null
  outputPath: string | null
  selectedIds: string[]
}): string | undefined {
  if (state.phase === 'scanning') return 'Scan in progress'
  if (!state.sourcePath) return 'Select a source folder first'
  if (!state.outputPath) return 'Choose an output folder first'
  if (state.selectedIds.length === 0) return 'Select one or more variant folders'
  return undefined
}
