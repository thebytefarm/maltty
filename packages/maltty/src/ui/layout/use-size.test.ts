import { describe, expect, it } from 'vitest'

import { useSize } from './use-size.js'

describe('use-size', () => {
  it('should export useSize as a function', () => {
    expect(typeof useSize).toBe('function')
  })
})
