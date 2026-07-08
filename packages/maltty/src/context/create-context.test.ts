import { describe, expect, it } from 'vitest'

import { createContext } from './create-context.js'
import type { ContextError } from './error.js'
import { isContextError } from './error.js'

function defaultOptions(): {
  args: { name: string; verbose: boolean }
  argv: readonly string[]
  meta: {
    command: string[]
    dirs: { global: string; local: string }
    name: string
    version: string
  }
} {
  return {
    args: { name: 'test', verbose: true },
    argv: ['my-cli', 'deploy', 'preview', '--verbose'],
    meta: {
      command: ['deploy', 'preview'],
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    },
  }
}

describe('createContext()', () => {
  // ---------------------------------------------------------------------------
  // Args
  // ---------------------------------------------------------------------------

  describe('args', () => {
    it('contains the provided args', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.args.verbose).toBeTruthy()
      expect(ctx.args.name).toBe('test')
    })
  })

  // ---------------------------------------------------------------------------
  // Meta
  // ---------------------------------------------------------------------------

  describe('meta', () => {
    it('has the correct name', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.meta.name).toBe('my-cli')
    })

    it('has the correct version', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.meta.version).toBe('1.0.0')
    })

    it('has the correct command path', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.meta.command).toEqual(['deploy', 'preview'])
    })
  })

  // ---------------------------------------------------------------------------
  // Raw
  // ---------------------------------------------------------------------------

  describe('raw', () => {
    it('should contain the normalized argv', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.raw.argv).toEqual(['my-cli', 'deploy', 'preview', '--verbose'])
    })

    it('should have argv[0] as the CLI name', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.raw.argv[0]).toBe('my-cli')
    })

    it('should freeze the argv array', () => {
      const ctx = createContext(defaultOptions())
      expect(Object.isFrozen(ctx.raw.argv)).toBeTruthy()
    })

    it('should freeze the raw object', () => {
      const ctx = createContext(defaultOptions())
      expect(Object.isFrozen(ctx.raw)).toBeTruthy()
    })

    it('should not share references with the input array', () => {
      const argv = ['my-cli', 'deploy']
      const ctx = createContext({ ...defaultOptions(), argv })
      expect(ctx.raw.argv).not.toBe(argv)
    })
  })

  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------

  describe('store', () => {
    it('get() returns undefined for missing keys', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.store.get('nonexistent')).toBeUndefined()
    })

    it('set() and get() round-trip a value', () => {
      const ctx = createContext(defaultOptions())
      ctx.store.set('foo', 'bar')
      expect(ctx.store.get('foo')).toBe('bar')
    })

    it('set() overwrites existing values', () => {
      const ctx = createContext(defaultOptions())
      ctx.store.set('key', 'first')
      ctx.store.set('key', 'second')
      expect(ctx.store.get('key')).toBe('second')
    })

    it('has() returns false for missing keys', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.store.has('missing')).toBeFalsy()
    })

    it('has() returns true for existing keys', () => {
      const ctx = createContext(defaultOptions())
      ctx.store.set('present', 42)
      expect(ctx.store.has('present')).toBeTruthy()
    })

    it('delete() removes a key and returns true', () => {
      const ctx = createContext(defaultOptions())
      ctx.store.set('key', 'value')
      const result = ctx.store.delete('key')
      expect(result).toBeTruthy()
      expect(ctx.store.has('key')).toBeFalsy()
    })

    it('delete() returns false for non-existent keys', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.store.delete('nope')).toBeFalsy()
    })

    it('clear() removes all entries', () => {
      const ctx = createContext(defaultOptions())
      ctx.store.set('a', 1)
      ctx.store.set('b', 2)
      ctx.store.clear()
      expect(ctx.store.has('a')).toBeFalsy()
      expect(ctx.store.has('b')).toBeFalsy()
    })

    it('stores complex objects', () => {
      const ctx = createContext(defaultOptions())
      const obj = { nested: { data: [1, 2, 3] } }
      ctx.store.set('complex', obj)
      expect(ctx.store.get('complex')).toBe(obj)
    })

    it('each context has an independent store', () => {
      const ctx1 = createContext(defaultOptions())
      const ctx2 = createContext(defaultOptions())
      ctx1.store.set('key', 'from-ctx1')
      expect(ctx2.store.has('key')).toBeFalsy()
    })
  })

  // ---------------------------------------------------------------------------
  // Fail
  // ---------------------------------------------------------------------------

  describe('fail()', () => {
    it('throws a ContextError', () => {
      const ctx = createContext(defaultOptions())
      expect(() => ctx.fail('boom')).toThrow('boom')
      try {
        ctx.fail('boom')
      } catch (error) {
        expect(isContextError(error)).toBeTruthy()
      }
    })

    it('throws with the given message', () => {
      const ctx = createContext(defaultOptions())
      expect(() => ctx.fail('something broke')).toThrow('something broke')
    })

    it('sets default exitCode to 1', () => {
      const ctx = createContext(defaultOptions())
      try {
        ctx.fail('test')
      } catch (error) {
        expect(isContextError(error)).toBeTruthy()
        expect((error as ContextError).exitCode).toBe(1)
      }
    })

    it('accepts a custom exitCode', () => {
      const ctx = createContext(defaultOptions())
      try {
        ctx.fail('test', { exitCode: 42 })
      } catch (error) {
        expect((error as ContextError).exitCode).toBe(42)
      }
    })

    it('accepts a code string', () => {
      const ctx = createContext(defaultOptions())
      try {
        ctx.fail('test', { code: 'ERR_CUSTOM' })
      } catch (error) {
        expect((error as ContextError).code).toBe('ERR_CUSTOM')
      }
    })

    it('has code undefined when not provided', () => {
      const ctx = createContext(defaultOptions())
      try {
        ctx.fail('test')
      } catch (error) {
        expect((error as ContextError).code).toBeUndefined()
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Format
  // ---------------------------------------------------------------------------

  describe('format', () => {
    describe('json()', () => {
      it('serializes a string as JSON', () => {
        const ctx = createContext(defaultOptions())
        const result = ctx.format.json('hello')
        expect(result).toBe(`${JSON.stringify('hello', null, 2)}\n`)
      })

      it('serializes an object as pretty JSON', () => {
        const ctx = createContext(defaultOptions())
        const result = ctx.format.json({ key: 'value' })
        expect(result).toBe(`${JSON.stringify({ key: 'value' }, null, 2)}\n`)
      })
    })

    describe('table()', () => {
      it('formats a table with header and rows', () => {
        const ctx = createContext(defaultOptions())
        const result = ctx.format.table([
          { age: 30, name: 'Alice' },
          { age: 25, name: 'Bob' },
        ])
        const lines = result.split('\n')
        expect(lines[0]).toContain('name')
        expect(lines[0]).toContain('age')
        // Separator line
        expect(lines[1]).toMatch(/^-+/)
        // Data rows
        expect(lines[2]).toContain('Alice')
        expect(lines[3]).toContain('Bob')
      })

      it('returns empty string for empty arrays', () => {
        const ctx = createContext(defaultOptions())
        const result = ctx.format.table([])
        expect(result).toBe('')
      })
    })
  })
})
