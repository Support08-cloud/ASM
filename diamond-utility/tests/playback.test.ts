import { describe, expect, it } from 'vitest'
import { initialState, reducer } from '../src/app/state/machine'
import { shouldSeekMedia } from '../src/services/playback'
import type { ProcessResult } from '../src/models/processing'

const exported: ProcessResult = {
  outcome: 'success',
  copied: 1,
  skipped: 0,
  failed: 0,
  total: 1,
  outputPath: 'D:/Output/260602-362/260602-362-edit.mp4',
  files: [],
}

describe('pause does not seek a busy decoder', () => {
  it('waits until a frame is decoded', () => {
    expect(shouldSeekMedia(0, 1.2, 0, false)).toBe(false)
    expect(shouldSeekMedia(0, 1.2, 1, false)).toBe(false)
  })

  it('does not seek again while a seek is running or the frame is already close', () => {
    expect(shouldSeekMedia(1.2, 1.3, 2, true)).toBe(false)
    expect(shouldSeekMedia(1.2, 1.3, 2, false)).toBe(false)
  })

  it('seeks once when the playhead has moved', () => {
    expect(shouldSeekMedia(1.2, 2.4, 2, false)).toBe(true)
  })
})

describe('export leaves the editor mounted', () => {
  it('returns to the same timeline instead of opening the completion page', () => {
    const source: ProcessResult = {
      outcome: 'success',
      copied: 2,
      skipped: 0,
      failed: 0,
      total: 2,
      outputPath: 'D:/Output',
      files: [],
    }
    const editing = {
      ...initialState,
      phase: 'exporting' as const,
      editorDiamond: '260602-362',
      editorOutputDir: 'D:/Output/260602-362',
      lastProcessResult: source,
    }
    const next = reducer(editing, { type: 'export-complete', result: exported })
    expect(next.phase).toBe('editing')
    expect(next.exportProgress).toBeNull()
    expect(next.editorDiamond).toBe('260602-362')
    expect(next.editorOutputDir).toBe('D:/Output/260602-362')
    expect(next.lastProcessResult).toBe(source)
    expect(next.processResult).toBeNull()
  })
})
