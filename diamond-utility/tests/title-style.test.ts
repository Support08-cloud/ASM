import { describe, expect, it } from 'vitest'
import { createExtra } from '../src/services/timeline'
import { titleOpacity, titleBoxStyle } from '../src/services/title-style'

describe('title style', () => {
  it('fades a title in and out', () => {
    const title = createExtra('text', 0, { durationMs: 2000, animIn: 'fade', animOut: 'fade', fadeInMs: 400, fadeOutMs: 400 })
    expect(titleOpacity(title, 0)).toBeCloseTo(0)
    expect(titleOpacity(title, 400)).toBeCloseTo(1)
    expect(titleOpacity(title, 2000)).toBeCloseTo(0)
    expect(titleBoxStyle(title, 1000).color).toBe('#ffffff')
  })
})
