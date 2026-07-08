import { afterEach, beforeEach, vi } from 'vitest'

import type { TestLifecycle } from './types.js'

/**
 * Wire up beforeEach / afterEach hooks that save and restore process.argv,
 * stub process.exit, and clear all mocks between tests.
 *
 * @returns An object with a `getExitSpy` accessor for assertions.
 */
export function setupTestLifecycle(): TestLifecycle {
  const state: { originalArgv: string[]; exitSpy: ReturnType<typeof vi.spyOn> | undefined } = {
    exitSpy: undefined,
    originalArgv: [],
  }

  // eslint-disable-next-line jest/no-hooks -- lifecycle encapsulation for test helpers
  beforeEach(() => {
    state.originalArgv = [...process.argv]
    state.exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never)
    vi.clearAllMocks()
  })

  // eslint-disable-next-line jest/no-hooks -- lifecycle encapsulation for test helpers
  afterEach(() => {
    process.argv = [...state.originalArgv]
    if (state.exitSpy) {
      state.exitSpy.mockRestore()
    }
  })

  return {
    getExitSpy: () => {
      if (!state.exitSpy) {
        // Accepted exception: test helper — explicit throw for developer feedback.
        throw new Error('setupTestLifecycle: exitSpy not initialized — is beforeEach running?')
      }
      return state.exitSpy
    },
  }
}
