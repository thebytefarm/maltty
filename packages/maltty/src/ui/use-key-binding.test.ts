import { describe, expect, it } from 'vitest'

import { useHotkey } from './use-key-binding.js'

describe('use-key-binding', () => {
  it('should export useHotkey as a function', () => {
    expect(typeof useHotkey).toBe('function')
  })
})
