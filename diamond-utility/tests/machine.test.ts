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

    state = reducer(state, { type: 'toggle-select', id: diamonds[0].folders[0].id })
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

  it('toggles every folder in a diamond group together', () => {
    const diamonds = buildDemoDiamonds()
    const ids = diamonds[0].folders.map((folder) => folder.id)
    let state = reducer(
      { ...initialState, phase: 'ready', diamonds, outputPath: 'D:/out' },
      { type: 'toggle-group', ids },
    )
    expect(state.selectedIds).toEqual(ids)
    state = reducer(state, { type: 'toggle-group', ids })
    expect(state.selectedIds).toEqual([])
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

  it('clears source path, scan results, and selection', () => {
    const diamonds = buildDemoDiamonds().slice(0, 1)
    const state = reducer(
      {
        ...initialState,
        phase: 'ready',
        sourcePath: 'D:/DiamondData',
        sourceKind: 'directory',
        diamonds,
        foldersScanned: 12,
        lastScanAt: '2026-08-25T10:00:00.000Z',
        selectedIds: [diamonds[0].folders[0].id],
        detailsId: diamonds[0].id,
        search: '260609',
        scanError: { title: 'Failed', detail: 'x' },
      },
      { type: 'clear-source' },
    )
    expect(state.sourcePath).toBeNull()
    expect(state.sourceKind).toBe('none')
    expect(state.diamonds).toEqual([])
    expect(state.selectedIds).toEqual([])
    expect(state.detailsId).toBeNull()
    expect(state.search).toBe('')
    expect(state.phase).toBe('idle')
    expect(state.foldersScanned).toBe(0)
    expect(state.lastScanAt).toBeNull()
  })

  it('clears the output path', () => {
    const state = reducer({ ...initialState, outputPath: 'D:/DiamondOutput' }, { type: 'clear-output' })
    expect(state.outputPath).toBeNull()
  })

  it('opens the editor for one named diamond when several were copied', () => {
    const files = [
      { diamondName: '260609-151', viewLabel: '1', sourcePath: 's1', outputPath: 'o/260609-151-1.mp4', status: 'copied' as const },
      { diamondName: '260609-152', viewLabel: '1', sourcePath: 's2', outputPath: 'o/260609-152-1.mp4', status: 'copied' as const },
    ]
    const result = {
      outcome: 'success' as const,
      copied: 2,
      skipped: 0,
      failed: 0,
      total: 2,
      outputPath: 'D:/out',
      files,
    }
    const completed = {
      ...initialState,
      phase: 'completed' as const,
      route: 'operations' as const,
      processResult: result,
      lastProcessResult: result,
    }
    const blocked = reducer(completed, { type: 'open-editor' })
    expect(blocked.phase).toBe('completed')
    expect(blocked.editorDiamond).toBeNull()

    const opened = reducer(completed, { type: 'open-editor', diamondName: '260609-151' })
    expect(opened.phase).toBe('editing')
    expect(opened.editorDiamond).toBe('260609-151')
  })

  it('keeps original copied files after export so Edit stays available', () => {
    const files = [
      { diamondName: '260609-151', viewLabel: '1', sourcePath: 's1', outputPath: 'o/260609-151-1.mp4', status: 'copied' as const },
    ]
    const result = {
      outcome: 'success' as const,
      copied: 1,
      skipped: 0,
      failed: 0,
      total: 1,
      outputPath: 'D:/out',
      files,
    }
    const opened = {
      ...initialState,
      phase: 'exporting' as const,
      lastProcessResult: result,
      editorDrafts: {},
    }
    const done = reducer(opened, {
      type: 'export-complete',
      result: {
        outcome: 'success',
        copied: 1,
        skipped: 0,
        failed: 0,
        total: 1,
        outputPath: 'D:/out/260609-151-edit.mp4',
        files: [
          { diamondName: '260609-151', viewLabel: '260609-151-edit.mp4', sourcePath: 'timeline', outputPath: 'D:/out/260609-151-edit.mp4', status: 'copied' },
        ],
      },
    })
    expect(done.processResult?.files.some((file) => file.outputPath.endsWith('260609-151-1.mp4'))).toBe(true)
    expect(done.processResult?.files.some((file) => file.outputPath.endsWith('-edit.mp4'))).toBe(true)
  })
})
