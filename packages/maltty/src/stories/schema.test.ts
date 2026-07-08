import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { resolveControlKind, schemaToFieldDescriptors } from './schema.js'

describe('schemaToFieldDescriptors()', () => {
  it('should map z.string() to a text control', () => {
    const schema = z.object({ name: z.string() })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field).toMatchObject({ name: 'name', control: 'text', zodTypeName: 'string' })
  })

  it('should map z.number() to a number control', () => {
    const schema = z.object({ count: z.number() })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field).toMatchObject({ name: 'count', control: 'number', zodTypeName: 'number' })
  })

  it('should map z.boolean() to a boolean control', () => {
    const schema = z.object({ enabled: z.boolean() })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field).toMatchObject({ name: 'enabled', control: 'boolean', zodTypeName: 'boolean' })
  })

  it('should map z.enum() to a select control with options', () => {
    const schema = z.object({ color: z.enum(['red', 'green', 'blue']) })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field).toMatchObject({ name: 'color', control: 'select', zodTypeName: 'enum' })
    expect(field.options).toEqual(['red', 'green', 'blue'])
  })

  it('should map z.literal() to a readonly control', () => {
    const schema = z.object({ kind: z.literal('x') })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field).toMatchObject({ name: 'kind', control: 'readonly', zodTypeName: 'literal' })
  })

  it('should map z.object() to a json control', () => {
    const schema = z.object({ meta: z.object({ nested: z.string() }) })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field).toMatchObject({ name: 'meta', control: 'json', zodTypeName: 'object' })
  })

  it('should map z.array(z.string()) to a json control', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field).toMatchObject({ name: 'tags', control: 'json', zodTypeName: 'array' })
  })

  it('should map z.array(z.enum()) to a multiselect control with options', () => {
    const schema = z.object({ roles: z.array(z.enum(['admin', 'user'])) })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field).toMatchObject({ name: 'roles', control: 'multiselect', zodTypeName: 'array' })
    expect(field.options).toEqual(['admin', 'user'])
  })

  it('should mark optional fields with isOptional true', () => {
    const schema = z.object({ label: z.string().optional() })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field.isOptional).toBeTruthy()
  })

  it('should mark required fields with isOptional false', () => {
    const schema = z.object({ label: z.string() })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field.isOptional).toBeFalsy()
  })

  it('should extract default values', () => {
    const schema = z.object({ greeting: z.string().default('hello') })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field.defaultValue).toBe('hello')
    expect(field.isOptional).toBeTruthy()
  })

  it('should preserve descriptions from z.describe()', () => {
    const schema = z.object({ name: z.string().describe('The user name') })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field.description).toBe('The user name')
  })

  it('should set description to undefined when not provided', () => {
    const schema = z.object({ name: z.string() })
    const [field] = schemaToFieldDescriptors(schema)

    expect(field.description).toBeUndefined()
  })

  it('should return frozen descriptors', () => {
    const schema = z.object({ name: z.string() })
    const [field] = schemaToFieldDescriptors(schema)

    expect(Object.isFrozen(field)).toBeTruthy()
  })

  it('should return an empty array for an empty schema', () => {
    const schema = z.object({})
    const result = schemaToFieldDescriptors(schema)

    expect(result).toEqual([])
  })

  it('should handle multiple fields preserving order', () => {
    const schema = z.object({
      alpha: z.string(),
      beta: z.number(),
      gamma: z.boolean(),
    })
    const result = schemaToFieldDescriptors(schema)

    expect(result.map((f) => f.name)).toEqual(['alpha', 'beta', 'gamma'])
  })
})

describe('resolveControlKind()', () => {
  it('should return text for string type', () => {
    expect(resolveControlKind({ typeName: 'string', def: {} })).toBe('text')
  })

  it('should return number for number type', () => {
    expect(resolveControlKind({ typeName: 'number', def: {} })).toBe('number')
  })

  it('should return boolean for boolean type', () => {
    expect(resolveControlKind({ typeName: 'boolean', def: {} })).toBe('boolean')
  })

  it('should return select for enum type', () => {
    expect(resolveControlKind({ typeName: 'enum', def: {} })).toBe('select')
  })

  it('should return readonly for literal type', () => {
    expect(resolveControlKind({ typeName: 'literal', def: {} })).toBe('readonly')
  })

  it('should return json for object type', () => {
    expect(resolveControlKind({ typeName: 'object', def: {} })).toBe('json')
  })

  it('should return json for unknown types', () => {
    expect(resolveControlKind({ typeName: 'map', def: {} })).toBe('json')
  })
})
