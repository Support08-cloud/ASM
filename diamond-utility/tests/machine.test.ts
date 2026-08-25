import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS } from '../src/models/diamond'
import { initialState, reducer } from '../src/app/state/machine'
import { buildDemoDiamonds } from '../src/services/demo-data'

describe('app state machine', () => {
  it('walks idle → scanning → ready → confirming → processing → completed', () => {
    const diamonds = buildDemoDiamonds().slice(0, 2)
    let state = reducer(initialState, { type: 'set-source', path: 'D:/DiamondData', kind: 'demo' })
    state = reducer(state, { type: 'set-output', path: 'D:/DiamondOutput' })
    state = reducer(state, { type: 'scan-start' })
    expect(state.phase).toBe('scanning')

    state = reducer(state, {
      type: 'scan-success',
      diamonds,
      foldersScanned: 10,
      scannedAt: '2026-08-25T10:42:00.000Z',
    })
    expect(state.phase).toBe('ready')

    state = reducer(state, { type: 'toggle-select', id: diamonds[0].id })
    state = reducer(state, { type: 'open-confirm' })
    expect(state.phase).toBe('confirming')

    state = reducer(state, {
      type: 'process-start',
      progress: { diamondIndex: 0, diamondTotal: 1, currentDiamond: diamonds[0].baseName, percent: 0, jobs: [] },
    })
    expect(state.phase).toBe('processing')
    expect(state.route).toBe('operations')

    state = reducer(state, {
      type: 'process-complete',
      result: {
        outcome: 'success',
        copied: 5,
        skipped: 0,
        failed: 0,
        total: 5,
        outputPath: 'D:/DiamondOutput',
        files: [],
      },
      record: {
        id: 'job-1',
        startedAt: '2026-08-25T10:43:00.000Z',
        finishedAt: '2026-08-25T10:43:10.000Z',
        diamondCount: 1,
        diamondNames: [diamonds[0].baseName],
        copied: 5,
        skipped: 0,
        failed: 0,
        outcome: 'success',
        outputPath: 'D:/DiamondOutput',
        sourcePath: 'D:/DiamondData',
      },
    })
    expect(state.phase).toBe('completed')
    expect(state.history).toHaveLength(1)

    state = reducer(state, { type: 'dismiss-completion' })
    expect(state.phase).toBe('ready')
    expect(state.route).toBe('dashboard')
  })

  it('does not confirm without a selection and output path', () => {
    const blocked = reducer({ ...initialState, phase: 'ready', selectedIds: ['x'] }, { type: 'open-confirm' })
    expect(blocked.phase).toBe('ready')
  })

  it('keeps search orthogonal to phase', () => {
    const state = reducer({ ...initialState, phase: 'ready', filters: EMPTY_FILTERS }, { type: 'set-search', search: 'Krish' })
    expect(state.phase).toBe('ready')
    expect(state.search).toBe('Krish')
  })
})
