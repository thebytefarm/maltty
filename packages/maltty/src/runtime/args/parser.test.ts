import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createArgsParser } from './parser.js'

describe('createArgsParser()', () => {
  describe('parse with no schemas', () => {
    it('should return cleaned args when no zod schemas are defined', () => {
      const parser = createArgsParser({ options: undefined, positionals: undefined })
      const [error, result] = parser.parse({ foo: 'bar', verbose: true })

      expect(error).toBeNull()
      expect(result).toEqual({ foo: 'bar', verbose: true })
    })

    it('should strip the _ key from raw args', () => {
      const parser = createArgsParser({ options: undefined, positionals: undefined })
      const [error, result] = parser.parse({ _: ['cmd'], name: 'test' })

      expect(error).toBeNull()
      expect(result).toEqual({ name: 'test' })
    })

    it('should strip the $0 key from raw args', () => {
      const parser = createArgsParser({ options: undefined, positionals: undefined })
      const [error, result] = parser.parse({ $0: 'my-cli', file: 'index.ts' })

      expect(error).toBeNull()
      expect(result).toEqual({ file: 'index.ts' })
    })

    it('should strip hyphenated keys (camelCase duplicates)', () => {
      const parser = createArgsParser({ options: undefined, positionals: undefined })
      const [error, result] = parser.parse({
        'dry-run': true,
        dryRun: true,
        output: 'dist',
      })

      expect(error).toBeNull()
      expect(result).toEqual({ dryRun: true, output: 'dist' })
    })

    it('should strip all yargs-internal keys simultaneously', () => {
      const parser = createArgsParser({ options: undefined, positionals: undefined })
      const [error, result] = parser.parse({
        $0: 'cli',
        _: ['build'],
        'dry-run': true,
        dryRun: true,
        name: 'test',
      })

      expect(error).toBeNull()
      expect(result).toEqual({ dryRun: true, name: 'test' })
    })

    it('should return an empty object when all keys are internal', () => {
      const parser = createArgsParser({ options: undefined, positionals: undefined })
      const [error, result] = parser.parse({ $0: 'cli', _: [] })

      expect(error).toBeNull()
      expect(result).toEqual({})
    })
  })

  describe('parse with options zod schema', () => {
    it('should validate args against a zod options schema', () => {
      const options = z.object({ name: z.string() })
      const parser = createArgsParser({ options, positionals: undefined })
      const [error, result] = parser.parse({ name: 'Alice' })

      expect(error).toBeNull()
      expect(result).toEqual({ name: 'Alice' })
    })

    it('should return an error when required args are missing', () => {
      const options = z.object({ name: z.string() })
      const parser = createArgsParser({ options, positionals: undefined })
      const [error, result] = parser.parse({})

      expect(error).toBeInstanceOf(Error)
      expect(result).toBeNull()
    })

    it('should apply default values from the zod schema', () => {
      const options = z.object({ greeting: z.string().default('hello') })
      const parser = createArgsParser({ options, positionals: undefined })
      const [error, result] = parser.parse({})

      expect(error).toBeNull()
      expect(result).toEqual({ greeting: 'hello' })
    })

    it('should pass through extra keys when only options is zod (passthrough)', () => {
      const options = z.object({ name: z.string() })
      const parser = createArgsParser({ options, positionals: undefined })
      const [error, result] = parser.parse({ extra: 'value', name: 'Bob' })

      expect(error).toBeNull()
      expect(result).toMatchObject({ name: 'Bob' })
    })

    it('should return error message with "Invalid arguments" prefix', () => {
      const options = z.object({ count: z.number() })
      const parser = createArgsParser({ options, positionals: undefined })
      const [error] = parser.parse({ count: 'not-a-number' })

      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Invalid arguments')
    })
  })

  describe('parse with positionals zod schema', () => {
    it('should validate args against a zod positionals schema', () => {
      const positionals = z.object({ file: z.string() })
      const parser = createArgsParser({ options: undefined, positionals })
      const [error, result] = parser.parse({ file: 'index.ts' })

      expect(error).toBeNull()
      expect(result).toEqual({ file: 'index.ts' })
    })

    it('should return error when required positional is missing', () => {
      const positionals = z.object({ file: z.string() })
      const parser = createArgsParser({ options: undefined, positionals })
      const [error, result] = parser.parse({})

      expect(error).toBeInstanceOf(Error)
      expect(result).toBeNull()
    })

    it('should pass through extra keys when only positionals is zod', () => {
      const positionals = z.object({ file: z.string() })
      const parser = createArgsParser({ options: undefined, positionals })
      const [error, result] = parser.parse({ extra: 42, file: 'main.ts' })

      expect(error).toBeNull()
      expect(result).toMatchObject({ file: 'main.ts' })
    })
  })

  describe('parse with both options and positionals zod schemas', () => {
    it('should validate merged schema of options and positionals', () => {
      const options = z.object({ verbose: z.boolean() })
      const positionals = z.object({ file: z.string() })
      const parser = createArgsParser({ options, positionals })
      const [error, result] = parser.parse({ file: 'src/index.ts', verbose: true })

      expect(error).toBeNull()
      expect(result).toEqual({ file: 'src/index.ts', verbose: true })
    })

    it('should return error when merged schema validation fails', () => {
      const options = z.object({ verbose: z.boolean() })
      const positionals = z.object({ file: z.string() })
      const parser = createArgsParser({ options, positionals })
      const [error, result] = parser.parse({ verbose: true })

      expect(error).toBeInstanceOf(Error)
      expect(result).toBeNull()
    })

    it('should strip extra keys when both schemas are zod (merged schema strips unknown)', () => {
      const options = z.object({ verbose: z.boolean() })
      const positionals = z.object({ file: z.string() })
      const parser = createArgsParser({ options, positionals })
      const [error, result] = parser.parse({ extra: 'dropped', file: 'index.ts', verbose: true })

      expect(error).toBeNull()
      expect(result).toEqual({ file: 'index.ts', verbose: true })
    })
  })

  describe('parse with yargs-native definitions', () => {
    it('should skip validation when options is yargs-native', () => {
      const options = {
        name: { description: 'Name', required: true, type: 'string' as const },
      }
      const parser = createArgsParser({ options, positionals: undefined })
      const [error, result] = parser.parse({ name: 'Alice' })

      expect(error).toBeNull()
      expect(result).toEqual({ name: 'Alice' })
    })

    it('should skip validation when both are yargs-native', () => {
      const options = {
        verbose: { description: 'Verbose', type: 'boolean' as const },
      }
      const positionals = {
        file: { description: 'File', required: true, type: 'string' as const },
      }
      const parser = createArgsParser({ options, positionals })
      const [error, result] = parser.parse({ file: 'index.ts', verbose: true })

      expect(error).toBeNull()
      expect(result).toEqual({ file: 'index.ts', verbose: true })
    })

    it('should use passthrough when options is zod but positionals is yargs-native', () => {
      const options = z.object({ name: z.string() })
      const positionals = {
        file: { description: 'File', required: true, type: 'string' as const },
      }
      const parser = createArgsParser({ options, positionals })
      const [error, result] = parser.parse({ file: 'index.ts', name: 'test' })

      expect(error).toBeNull()
      expect(result).toMatchObject({ name: 'test' })
    })

    it('should use passthrough when positionals is zod but options is yargs-native', () => {
      const options = {
        verbose: { description: 'Verbose', type: 'boolean' as const },
      }
      const positionals = z.object({ file: z.string() })
      const parser = createArgsParser({ options, positionals })
      const [error, result] = parser.parse({ file: 'main.ts', verbose: true })

      expect(error).toBeNull()
      expect(result).toMatchObject({ file: 'main.ts' })
    })
  })
})
