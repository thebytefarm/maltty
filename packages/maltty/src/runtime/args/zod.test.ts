import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  isZodSchema,
  resolvePositionalType,
  zodSchemaToPositionalMeta,
  zodSchemaToYargsOptions,
  zodSchemaToYargsPositionals,
} from './zod.js'

describe('isZodSchema()', () => {
  it('should return true for a zod object schema', () => {
    const schema = z.object({ name: z.string() })
    expect(isZodSchema(schema)).toBeTruthy()
  })

  it('should return false for null', () => {
    expect(isZodSchema(null)).toBeFalsy()
  })

  it('should return false for undefined', () => {
    expect(isZodSchema(undefined)).toBeFalsy()
  })

  it('should return false for a plain object', () => {
    expect(isZodSchema({ name: { type: 'string' } })).toBeFalsy()
  })

  it('should return false for a non-object zod schema', () => {
    const schema = z.string()
    expect(isZodSchema(schema)).toBeFalsy()
  })

  it('should return false for a primitive value', () => {
    expect(isZodSchema(42)).toBeFalsy()
  })

  it('should return false for an empty string', () => {
    expect(isZodSchema('')).toBeFalsy()
  })

  it('should return true for an empty zod object schema', () => {
    const schema = z.object({})
    expect(isZodSchema(schema)).toBeTruthy()
  })
})

describe('zodSchemaToYargsOptions()', () => {
  it('should convert a required string field', () => {
    const schema = z.object({ name: z.string() })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      name: { demandOption: true, type: 'string' },
    })
  })

  it('should convert a required number field', () => {
    const schema = z.object({ count: z.number() })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      count: { demandOption: true, type: 'number' },
    })
  })

  it('should convert a required boolean field', () => {
    const schema = z.object({ verbose: z.boolean() })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      verbose: { demandOption: true, type: 'boolean' },
    })
  })

  it('should convert an optional string field without demandOption', () => {
    const schema = z.object({ name: z.string().optional() })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      name: { type: 'string' },
    })
  })

  it('should convert a field with a default value', () => {
    const schema = z.object({ greeting: z.string().default('hello') })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      greeting: { default: 'hello', type: 'string' },
    })
  })

  it('should include the description when present', () => {
    const schema = z.object({ name: z.string().describe('Your name') })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      name: { demandOption: true, describe: 'Your name', type: 'string' },
    })
  })

  it('should convert an array field to array type', () => {
    const schema = z.object({ files: z.array(z.string()) })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      files: { demandOption: true, type: 'array' },
    })
  })

  it('should convert an optional array field', () => {
    const schema = z.object({ tags: z.array(z.string()).optional() })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      tags: { type: 'array' },
    })
  })

  it('should convert multiple fields in a single schema', () => {
    const schema = z.object({
      count: z.number().default(1),
      name: z.string(),
      verbose: z.boolean().optional(),
    })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      count: { default: 1, type: 'number' },
      name: { demandOption: true, type: 'string' },
      verbose: { type: 'boolean' },
    })
  })

  it('should return an empty record for an empty schema', () => {
    const schema = z.object({})
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({})
  })

  it('should handle an optional field with a default value', () => {
    const schema = z.object({ level: z.number().optional().default(5) })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      level: { default: 5, type: 'number' },
    })
  })

  it('should extract choices for a required enum field', () => {
    const schema = z.object({ color: z.enum(['red', 'green', 'blue']) })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      color: { choices: ['red', 'green', 'blue'], demandOption: true, type: 'string' },
    })
  })

  it('should extract choices for an optional enum field', () => {
    const schema = z.object({ color: z.enum(['red', 'green', 'blue']).optional() })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      color: { choices: ['red', 'green', 'blue'], type: 'string' },
    })
  })

  it('should extract choices for an enum field with a default', () => {
    const schema = z.object({ color: z.enum(['red', 'green', 'blue']).default('red') })
    const result = zodSchemaToYargsOptions(schema)

    expect(result).toEqual({
      color: { choices: ['red', 'green', 'blue'], default: 'red', type: 'string' },
    })
  })
})

describe('zodSchemaToYargsPositionals()', () => {
  it('should convert a required string positional', () => {
    const schema = z.object({ file: z.string() })
    const result = zodSchemaToYargsPositionals(schema)

    expect(result).toEqual({
      file: { demandOption: true, type: 'string' },
    })
  })

  it('should convert a required number positional', () => {
    const schema = z.object({ port: z.number() })
    const result = zodSchemaToYargsPositionals(schema)

    expect(result).toEqual({
      port: { demandOption: true, type: 'number' },
    })
  })

  it('should convert a required boolean positional', () => {
    const schema = z.object({ flag: z.boolean() })
    const result = zodSchemaToYargsPositionals(schema)

    expect(result).toEqual({
      flag: { demandOption: true, type: 'boolean' },
    })
  })

  it('should convert an optional positional without demandOption', () => {
    const schema = z.object({ file: z.string().optional() })
    const result = zodSchemaToYargsPositionals(schema)

    expect(result).toEqual({
      file: { type: 'string' },
    })
  })

  it('should convert a positional with a default value', () => {
    const schema = z.object({ output: z.string().default('dist') })
    const result = zodSchemaToYargsPositionals(schema)

    expect(result).toEqual({
      output: { default: 'dist', type: 'string' },
    })
  })

  it('should fall back to string for array positional types', () => {
    const schema = z.object({ items: z.array(z.string()) })
    const result = zodSchemaToYargsPositionals(schema)

    expect(result).toEqual({
      items: { demandOption: true, type: 'string' },
    })
  })

  it('should extract choices for enum positional types', () => {
    const schema = z.object({ env: z.enum(['dev', 'prod']) })
    const result = zodSchemaToYargsPositionals(schema)

    expect(result).toEqual({
      env: { choices: ['dev', 'prod'], demandOption: true, type: 'string' },
    })
  })

  it('should include description when present', () => {
    const schema = z.object({ file: z.string().describe('Input file path') })
    const result = zodSchemaToYargsPositionals(schema)

    expect(result).toEqual({
      file: { demandOption: true, describe: 'Input file path', type: 'string' },
    })
  })

  it('should convert multiple positionals preserving order', () => {
    const schema = z.object({
      dest: z.string().optional(),
      source: z.string(),
    })
    const result = zodSchemaToYargsPositionals(schema)

    expect(result).toEqual({
      dest: { type: 'string' },
      source: { demandOption: true, type: 'string' },
    })
  })
})

describe('zodSchemaToPositionalMeta()', () => {
  it('should extract metadata for a required field', () => {
    const schema = z.object({ file: z.string() })
    const result = zodSchemaToPositionalMeta(schema)

    expect(result).toEqual([{ isOptional: false, name: 'file' }])
  })

  it('should extract metadata for an optional field', () => {
    const schema = z.object({ output: z.string().optional() })
    const result = zodSchemaToPositionalMeta(schema)

    expect(result).toEqual([{ isOptional: true, name: 'output' }])
  })

  it('should extract metadata for a field with a default', () => {
    const schema = z.object({ format: z.string().default('json') })
    const result = zodSchemaToPositionalMeta(schema)

    expect(result).toEqual([{ isOptional: true, name: 'format' }])
  })

  it('should preserve field order from the schema', () => {
    const schema = z.object({
      dest: z.string().optional(),
      source: z.string(),
    })
    const result = zodSchemaToPositionalMeta(schema)

    expect(result).toEqual([
      { isOptional: true, name: 'dest' },
      { isOptional: false, name: 'source' },
    ])
  })

  it('should return an empty array for an empty schema', () => {
    const schema = z.object({})
    const result = zodSchemaToPositionalMeta(schema)

    expect(result).toEqual([])
  })

  it('should handle multiple fields with mixed optionality', () => {
    const schema = z.object({
      command: z.string(),
      flags: z.string().optional(),
      target: z.string().default('all'),
    })
    const result = zodSchemaToPositionalMeta(schema)

    expect(result).toEqual([
      { isOptional: false, name: 'command' },
      { isOptional: true, name: 'flags' },
      { isOptional: true, name: 'target' },
    ])
  })
})

describe('resolvePositionalType()', () => {
  it('should return number for number type', () => {
    expect(resolvePositionalType('number')).toBe('number')
  })

  it('should return boolean for boolean type', () => {
    expect(resolvePositionalType('boolean')).toBe('boolean')
  })

  it('should return string for string type', () => {
    expect(resolvePositionalType('string')).toBe('string')
  })

  it('should fall back to string for array type', () => {
    expect(resolvePositionalType('array')).toBe('string')
  })

  it('should fall back to string for undefined', () => {
    expect(resolvePositionalType(undefined)).toBe('string')
  })

  it('should fall back to string for unknown type names', () => {
    expect(resolvePositionalType('object')).toBe('string')
  })
})
