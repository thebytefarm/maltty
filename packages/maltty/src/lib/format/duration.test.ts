import { describe, expect, it } from 'vitest'

import { formatDuration } from './duration'

describe('formatDuration()', () => {
  it('should return "< 1ms" for sub-millisecond values', () => {
    expect(formatDuration(0.5)).toBe('< 1ms')
  })

  it('should return milliseconds for values under 1000ms', () => {
    expect(formatDuration(150)).toBe('150ms')
  })

  it('should return seconds with 2 decimal places for values under 60000ms', () => {
    expect(formatDuration(1234)).toBe('1.23s')
  })

  it('should return minutes and seconds for values >= 60000ms', () => {
    expect(formatDuration(125_000)).toBe('2m 5s')
  })

  it('should return "< 1ms" for zero', () => {
    expect(formatDuration(0)).toBe('< 1ms')
  })

  it('should return "1.00s" for exactly 1000ms', () => {
    expect(formatDuration(1000)).toBe('1.00s')
  })

  it('should return "1m 0s" for exactly 60000ms', () => {
    expect(formatDuration(60_000)).toBe('1m 0s')
  })
})
