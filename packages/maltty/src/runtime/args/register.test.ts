import { describe, expect, it, vi } from 'vitest'
import type { Argv } from 'yargs'
import { z } from 'zod'

import { registerCommandArgs } from './register.js'

/**
 * Create a mock yargs builder that records all option() and positional() calls.
 */
function createMockBuilder(): {
  readonly builder: Argv
  readonly optionCalls: readonly { readonly key: string; readonly opt: unknown }[]
  readonly positionalCalls: readonly { readonly key: string; readonly opt: unknown }[]
} {
  const optionCalls: { readonly key: string; readonly opt: unknown }[] = []
  const positionalCalls: { readonly key: string; readonly opt: unknown }[] = []

  const builder = {
    option: vi.fn((key: string, opt: unknown) => {
      optionCalls.push({ key, opt })
      return builder
    }),
    positional: vi.fn((key: string, opt: unknown) => {
      positionalCalls.push({ key, opt })
      return builder
    }),
  } as unknown as Argv

  return { builder, optionCalls, positionalCalls }
}

describe('registerCommandArgs()', () => {
  describe('with no definitions', () => {
    it('should not call option or positional when both are undefined', () => {
      const { builder, optionCalls, positionalCalls } = createMockBuilder()

      registerCommandArgs({ builder, options: undefined, positionals: undefined })

      expect(optionCalls).toEqual([])
      expect(positionalCalls).toEqual([])
    })
  })

  describe('with zod options', () => {
    it('should register a required string option', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = z.object({ name: z.string() })

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls).toHaveLength(1)
      expect(optionCalls[0]).toEqual({
        key: 'name',
        opt: { demandOption: true, type: 'string' },
      })
    })

    it('should register an optional boolean option', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = z.object({ verbose: z.boolean().optional() })

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls).toHaveLength(1)
      expect(optionCalls[0]).toEqual({
        key: 'verbose',
        opt: { type: 'boolean' },
      })
    })

    it('should register multiple options from a single schema', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = z.object({
        count: z.number().default(1),
        name: z.string(),
      })

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls).toHaveLength(2)
    })
  })

  describe('with yargs-native options', () => {
    it('should register a required string option', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = {
        name: { description: 'Your name', required: true, type: 'string' as const },
      }

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls).toHaveLength(1)
      expect(optionCalls[0]).toEqual({
        key: 'name',
        opt: {
          alias: undefined,
          choices: undefined,
          default: undefined,
          demandOption: true,
          deprecated: undefined,
          describe: 'Your name',
          group: undefined,
          hidden: false,
          type: 'string',
        },
      })
    })

    it('should register an optional option with default false for required', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = {
        verbose: { description: 'Verbose output', type: 'boolean' as const },
      }

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls).toHaveLength(1)
      expect(optionCalls[0]).toMatchObject({
        key: 'verbose',
        opt: { demandOption: false, type: 'boolean' },
      })
    })

    it('should register an option with alias', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = {
        verbose: { alias: 'v', description: 'Verbose', type: 'boolean' as const },
      }

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls[0]).toMatchObject({
        key: 'verbose',
        opt: { alias: 'v' },
      })
    })

    it('should register an option with choices', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = {
        format: {
          choices: ['json', 'yaml', 'toml'] as const,
          description: 'Output format',
          type: 'string' as const,
        },
      }

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls[0]).toMatchObject({
        key: 'format',
        opt: { choices: ['json', 'yaml', 'toml'] },
      })
    })

    it('should register an option with a default value', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = {
        port: { default: 3000, description: 'Port', type: 'number' as const },
      }

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls[0]).toMatchObject({
        key: 'port',
        opt: { default: 3000 },
      })
    })
  })

  describe('with hidden, deprecated, and group options', () => {
    it('should register a hidden option', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = {
        trace: { description: 'Enable tracing', hidden: true, type: 'boolean' as const },
      }

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls[0]).toMatchObject({
        key: 'trace',
        opt: { hidden: true },
      })
    })

    it('should resolve a hidden function on an option', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = {
        trace: { description: 'Enable tracing', hidden: () => true, type: 'boolean' as const },
      }

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls[0]).toMatchObject({
        key: 'trace',
        opt: { hidden: true },
      })
    })

    it('should register a deprecated option with a message', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = {
        old: { deprecated: 'Use --new instead', description: 'Old flag', type: 'string' as const },
      }

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls[0]).toMatchObject({
        key: 'old',
        opt: { deprecated: 'Use --new instead' },
      })
    })

    it('should resolve a deprecated function on an option', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = {
        old: {
          deprecated: () => 'removed in 2.0',
          description: 'Old flag',
          type: 'string' as const,
        },
      }

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls[0]).toMatchObject({
        key: 'old',
        opt: { deprecated: 'removed in 2.0' },
      })
    })

    it('should register an option with a group', () => {
      const { builder, optionCalls } = createMockBuilder()
      const options = {
        token: {
          description: 'Auth token',
          group: 'Authentication:',
          type: 'string' as const,
        },
      }

      registerCommandArgs({ builder, options, positionals: undefined })

      expect(optionCalls[0]).toMatchObject({
        key: 'token',
        opt: { group: 'Authentication:' },
      })
    })
  })

  describe('with zod positionals', () => {
    it('should register a required string positional', () => {
      const { builder, positionalCalls } = createMockBuilder()
      const positionals = z.object({ file: z.string() })

      registerCommandArgs({ builder, options: undefined, positionals })

      expect(positionalCalls).toHaveLength(1)
      expect(positionalCalls[0]).toEqual({
        key: 'file',
        opt: { demandOption: true, type: 'string' },
      })
    })

    it('should register an optional positional', () => {
      const { builder, positionalCalls } = createMockBuilder()
      const positionals = z.object({ output: z.string().optional() })

      registerCommandArgs({ builder, options: undefined, positionals })

      expect(positionalCalls).toHaveLength(1)
      expect(positionalCalls[0]).toEqual({
        key: 'output',
        opt: { type: 'string' },
      })
    })

    it('should register multiple positionals', () => {
      const { builder, positionalCalls } = createMockBuilder()
      const positionals = z.object({
        dest: z.string().optional(),
        source: z.string(),
      })

      registerCommandArgs({ builder, options: undefined, positionals })

      expect(positionalCalls).toHaveLength(2)
    })
  })

  describe('with yargs-native positionals', () => {
    it('should register a required string positional', () => {
      const { builder, positionalCalls } = createMockBuilder()
      const positionals = {
        file: { description: 'Input file', required: true, type: 'string' as const },
      }

      registerCommandArgs({ builder, options: undefined, positionals })

      expect(positionalCalls).toHaveLength(1)
      expect(positionalCalls[0]).toEqual({
        key: 'file',
        opt: {
          choices: undefined,
          default: undefined,
          demandOption: true,
          deprecated: undefined,
          describe: 'Input file',
          type: 'string',
        },
      })
    })

    it('should resolve positional type to string for array type', () => {
      const { builder, positionalCalls } = createMockBuilder()
      const positionals = {
        items: { description: 'Items', type: 'array' as const },
      }

      registerCommandArgs({ builder, options: undefined, positionals })

      expect(positionalCalls[0]).toMatchObject({
        key: 'items',
        opt: { type: 'string' },
      })
    })
  })

  describe('with both options and positionals', () => {
    it('should register both zod options and zod positionals', () => {
      const { builder, optionCalls, positionalCalls } = createMockBuilder()
      const options = z.object({ verbose: z.boolean().optional() })
      const positionals = z.object({ file: z.string() })

      registerCommandArgs({ builder, options, positionals })

      expect(optionCalls).toHaveLength(1)
      expect(optionCalls[0]).toMatchObject({ key: 'verbose' })
      expect(positionalCalls).toHaveLength(1)
      expect(positionalCalls[0]).toMatchObject({ key: 'file' })
    })

    it('should register both yargs-native options and yargs-native positionals', () => {
      const { builder, optionCalls, positionalCalls } = createMockBuilder()
      const options = {
        verbose: { description: 'Verbose', type: 'boolean' as const },
      }
      const positionals = {
        file: { description: 'File', required: true, type: 'string' as const },
      }

      registerCommandArgs({ builder, options, positionals })

      expect(optionCalls).toHaveLength(1)
      expect(positionalCalls).toHaveLength(1)
    })

    it('should register zod options with yargs-native positionals', () => {
      const { builder, optionCalls, positionalCalls } = createMockBuilder()
      const options = z.object({ debug: z.boolean() })
      const positionals = {
        target: { description: 'Target', required: true, type: 'string' as const },
      }

      registerCommandArgs({ builder, options, positionals })

      expect(optionCalls).toHaveLength(1)
      expect(optionCalls[0]).toMatchObject({ key: 'debug' })
      expect(positionalCalls).toHaveLength(1)
      expect(positionalCalls[0]).toMatchObject({ key: 'target' })
    })

    it('should register positionals before options', () => {
      const calls: readonly string[] = []
      const mutableCalls = calls as string[]
      const builder = {
        option: vi.fn((_key: string) => {
          mutableCalls.push('option')
          return builder
        }),
        positional: vi.fn((_key: string) => {
          mutableCalls.push('positional')
          return builder
        }),
      } as unknown as Argv

      const options = z.object({ verbose: z.boolean() })
      const positionals = z.object({ file: z.string() })

      registerCommandArgs({ builder, options, positionals })

      expect(mutableCalls[0]).toBe('positional')
      expect(mutableCalls[1]).toBe('option')
    })
  })
})
