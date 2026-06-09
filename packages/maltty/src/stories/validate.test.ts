import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { validateProps } from './validate.js'

describe('validateProps()', () => {
  it('should return an empty array for valid props', () => {
    const schema = z.object({ name: z.string(), age: z.number() })
    const result = validateProps({ schema, props: { name: 'Alice', age: 30 } })

    expect(result).toEqual([])
  })

  it('should return per-field errors for invalid props', () => {
    const schema = z.object({ name: z.string() })
    const result = validateProps({ schema, props: { name: 42 } })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ field: 'name' })
    expect(result[0].message).toBeTruthy()
  })

  it('should return errors for multiple invalid fields', () => {
    const schema = z.object({ name: z.string(), age: z.number() })
    const result = validateProps({ schema, props: { name: 42, age: 'old' } })

    expect(result.length).toBeGreaterThanOrEqual(2)

    const fields = result.map((e) => e.field)
    expect(fields).toContain('name')
    expect(fields).toContain('age')
  })

  it('should return errors for missing required fields', () => {
    const schema = z.object({ name: z.string() })
    const result = validateProps({ schema, props: {} })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ field: 'name' })
  })

  it('should pass when optional fields are omitted', () => {
    const schema = z.object({ name: z.string(), bio: z.string().optional() })
    const result = validateProps({ schema, props: { name: 'Alice' } })

    expect(result).toEqual([])
  })

  it('should return frozen error objects', () => {
    const schema = z.object({ name: z.string() })
    const result = validateProps({ schema, props: { name: 42 } })

    expect(Object.isFrozen(result[0])).toBeTruthy()
  })
})
