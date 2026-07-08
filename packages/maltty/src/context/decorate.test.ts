import { describe, expect, it, vi } from 'vitest'

import { decorateContext } from './decorate.js'
import { createContext } from './index.js'

const mockSpinnerInstance = vi.hoisted(() => ({
  message: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock(import('@clack/prompts'), async (importOriginal) => ({
  ...(await importOriginal()),
  cancel: vi.fn(),
  isCancel: vi.fn(() => false),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  spinner: vi.fn(() => mockSpinnerInstance),
}))

function defaultOptions(): {
  args: { name: string }
  argv: readonly string[]
  config: Record<string, never>
  meta: {
    command: string[]
    dirs: { global: string; local: string }
    name: string
    version: string
  }
} {
  return {
    args: { name: 'test' },
    argv: ['my-cli', 'test'],
    config: {},
    meta: {
      command: ['test'],
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    },
  }
}

describe('decorateContext()', () => {
  it('should add the property to the context', () => {
    const ctx = createContext(defaultOptions())
    decorateContext(ctx, 'github', { baseUrl: 'https://api.github.com' })
    expect((ctx as Record<string, unknown>).github).toEqual({
      baseUrl: 'https://api.github.com',
    })
  })

  it('should return the same context reference', () => {
    const ctx = createContext(defaultOptions())
    const result = decorateContext(ctx, 'myProp', 42)
    expect(result).toBe(ctx)
  })

  it('should make the property immutable (writable: false)', () => {
    const ctx = createContext(defaultOptions())
    decorateContext(ctx, 'immutableProp', 'original')
    expect(() => {
      'use strict'
      ;(ctx as Record<string, unknown>).immutableProp = 'changed'
    }).toThrow()
    expect((ctx as Record<string, unknown>).immutableProp).toBe('original')
  })

  it('should reject duplicate key decoration (configurable: false)', () => {
    const ctx = createContext(defaultOptions())
    decorateContext(ctx, 'once', 'first')
    expect(() => {
      decorateContext(ctx, 'once', 'second')
    }).toThrow()
  })

  it('should make the property enumerable', () => {
    const ctx = createContext(defaultOptions())
    decorateContext(ctx, 'visible', true)
    const descriptor = Object.getOwnPropertyDescriptor(ctx, 'visible')
    expect(descriptor).toBeDefined()
    if (descriptor) {
      expect(descriptor.enumerable).toBeTruthy()
    }
  })

  it('should preserve existing context properties', () => {
    const ctx = createContext(defaultOptions())
    decorateContext(ctx, 'extra', 'value')
    expect(ctx.args.name).toBe('test')
    expect(ctx.meta.name).toBe('my-cli')
    expect((ctx as Record<string, unknown>).extra).toBe('value')
  })
})
