import { describe, expect, it } from 'vitest'

import { getOutputStore, injectOutputStore } from './store-key.js'
import { createOutputStore } from './store.js'

describe('injectOutputStore()', () => {
  it('should round-trip: inject then extract returns the same store', () => {
    const store = createOutputStore()
    const ctx = {}

    const injected = injectOutputStore({ ctx, store })
    const extracted = getOutputStore(injected as never)

    expect(extracted).toBe(store)
  })

  it('should not mutate the original context', () => {
    const store = createOutputStore()
    const ctx = { existing: 'value' }

    const injected = injectOutputStore({ ctx, store })

    expect(injected).not.toBe(ctx)
    expect(Object.keys(ctx)).toEqual(['existing'])
  })

  it('should preserve existing context properties', () => {
    const store = createOutputStore()
    const ctx = { alpha: 1, beta: 'two' }

    const injected = injectOutputStore({ ctx, store })

    expect((injected as Record<string, unknown>)['alpha']).toBe(1)
    expect((injected as Record<string, unknown>)['beta']).toBe('two')
  })
})

describe('getOutputStore()', () => {
  it('should throw when store has not been injected', () => {
    const ctx = {}

    expect(() => getOutputStore(ctx as never)).toThrow(
      'OutputStore not found on ScreenContext. Ensure useOutputStore is called within a screen() context.'
    )
  })
})
