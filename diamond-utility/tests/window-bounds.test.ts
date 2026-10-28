import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { boundsOnScreen } = require('../electron/window-bounds.cjs') as {
  boundsOnScreen: (
    saved: { x?: number; y?: number; width?: number; height?: number; isMaximized?: boolean } | null,
    displays: Array<{ workArea: { x: number; y: number; width: number; height: number } }>,
  ) => { width: number; height: number; x?: number; y?: number; center: boolean; maximized: boolean }
}

const laptop = { workArea: { x: 0, y: 0, width: 1920, height: 1080 } }

describe('window bounds', () => {
  it('keeps a window that still sits on a display', () => {
    const bounds = boundsOnScreen({ x: 40, y: 30, width: 1440, height: 900, isMaximized: true }, [laptop])
    expect(bounds).toMatchObject({ x: 40, y: 30, width: 1440, height: 900, center: false, maximized: true })
  })

  it('centers a window that was saved on a monitor that is gone', () => {
    const bounds = boundsOnScreen({ x: 4000, y: -1200, width: 1600, height: 1000 }, [laptop])
    expect(bounds.center).toBe(true)
    expect(bounds.x).toBeUndefined()
    expect(bounds.maximized).toBe(false)
  })

  it('centers when no position was saved', () => {
    const bounds = boundsOnScreen({ width: 1200, height: 800 }, [laptop])
    expect(bounds.center).toBe(true)
    expect(bounds.width).toBe(1200)
    expect(bounds.height).toBe(800)
  })
})
