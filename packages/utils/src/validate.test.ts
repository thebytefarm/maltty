import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import type { ZodIssue } from './validate.js'
import { validate } from './validate.js'

/**
 * Helper: a simple error factory that wraps formatted details into a plain Error
 * whose message contains the formatted issues.
 */
function defaultFactory({ message }: { readonly message: string }): Error {
  return new Error(`Validation failed: ${message}`)
}

describe('validate() with valid input', () => {
  it('returns [null, data] for a z.object schema', () => {
    const schema = z.object({ age: z.number(), name: z.string() })
    const [error, data] = validate({
      schema,
      params: { age: 30, name: 'Alice' },
      createError: defaultFactory,
    })
    expect(error).toBeNull()
    expect(data).toStrictEqual({ age: 30, name: 'Alice' })
  })

  it('returns [null, data] for a z.string schema', () => {
    const [error, data] = validate({
      schema: z.string(),
      params: 'hello',
      createError: defaultFactory,
    })
    expect(error).toBeNull()
    expect(data).toBe('hello')
  })

  it('returns [null, data] for a z.number schema', () => {
    const [error, data] = validate({ schema: z.number(), params: 42, createError: defaultFactory })
    expect(error).toBeNull()
    expect(data).toBe(42)
  })

  it('returns [null, data] for a z.array schema', () => {
    const [error, data] = validate({
      schema: z.array(z.number()),
      params: [1, 2, 3],
      createError: defaultFactory,
    })
    expect(error).toBeNull()
    expect(data).toStrictEqual([1, 2, 3])
  })

  it('returns [null, data] for a z.boolean schema', () => {
    const [error, data] = validate({
      schema: z.boolean(),
      params: true,
      createError: defaultFactory,
    })
    expect(error).toBeNull()
    expect(data).toBeTruthy()
  })

  it('strips unknown keys when schema uses .strict() is not set (default strip)', () => {
    const schema = z.object({ first: z.number() })
    const [error, data] = validate({
      schema,
      params: { extra: 2, first: 1 },
      createError: defaultFactory,
    })
    expect(error).toBeNull()
    expect(data).toStrictEqual({ first: 1 })
    expect(data).not.toHaveProperty('extra')
  })
})

describe('validate() with schema transforms', () => {
  it('applies a string transform', () => {
    const schema = z.string().transform((str) => str.toUpperCase())
    const [error, data] = validate({ schema, params: 'hello', createError: defaultFactory })
    expect(error).toBeNull()
    expect(data).toBe('HELLO')
  })

  it('applies a number transform', () => {
    const schema = z.number().transform((num) => num * 2)
    const [error, data] = validate({ schema, params: 5, createError: defaultFactory })
    expect(error).toBeNull()
    expect(data).toBe(10)
  })

  it('applies default values', () => {
    const schema = z.object({
      host: z.string().default('localhost'),
      port: z.number().default(3000),
    })
    const [error, data] = validate({ schema, params: {}, createError: defaultFactory })
    expect(error).toBeNull()
    expect(data).toStrictEqual({ host: 'localhost', port: 3000 })
  })

  it('applies coercion via z.coerce', () => {
    const schema = z.coerce.number()
    const [error, data] = validate({ schema, params: '42', createError: defaultFactory })
    expect(error).toBeNull()
    expect(data).toBe(42)
  })
})

describe('validate() with invalid input', () => {
  it('returns [Error, null] for an invalid z.object input', () => {
    const schema = z.object({ name: z.string() })
    const [error, data] = validate({ schema, params: {}, createError: defaultFactory })
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Validation failed')
  })

  it('returns [Error, null] for an invalid z.string input', () => {
    const [error, data] = validate({ schema: z.string(), params: 123, createError: defaultFactory })
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Validation failed')
  })

  it('returns [Error, null] for an invalid z.number input', () => {
    const [error, data] = validate({
      schema: z.number(),
      params: 'abc',
      createError: defaultFactory,
    })
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Validation failed')
  })

  it('returns [Error, null] for an invalid z.array input', () => {
    const [error, data] = validate({
      schema: z.array(z.string()),
      params: 'not-array',
      createError: defaultFactory,
    })
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Validation failed')
  })

  it('returns the exact Error returned by the factory', () => {
    const customError = new Error('custom')
    function factory() {
      return customError
    }
    const [error, data] = validate({ schema: z.string(), params: 123, createError: factory })
    expect(data).toBeNull()
    expect(error).toBe(customError)
  })

  it('returns a TypeError when the factory returns a TypeError', () => {
    function factory({ issues }: { readonly issues: readonly ZodIssue[] }) {
      return new TypeError(`Bad type: ${issues.length} issue(s)`)
    }
    const [error, data] = validate({ schema: z.string(), params: 999, createError: factory })
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(TypeError)
  })
})

describe('validate() default error factory', () => {
  it('returns a formatted Error when no factory is provided', () => {
    const schema = z.object({ name: z.string() })
    const [error, data] = validate({ schema, params: {} })
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('name:')
  })

  it('returns a formatted Error for root-level failures', () => {
    const [error, data] = validate({ schema: z.string(), params: 42 })
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('expected string')
  })
})

describe('factory receives formatted details', () => {
  it('passes formatted issues to the factory function', () => {
    const schema = z.object({ age: z.number(), name: z.string() })
    const captured: { issues: readonly ZodIssue[] } = { issues: [] }

    function factory({ issues }: { readonly issues: readonly ZodIssue[] }): Error {
      captured.issues = issues
      return new Error('test')
    }

    const [error, data] = validate({ schema, params: {}, createError: factory })
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)

    expect(captured.issues).toHaveLength(2)
  })

  it('formatted issues contain dot-joined paths', () => {
    const schema = z.object({ email: z.string().email() })
    const captured: { issues: readonly ZodIssue[] } = { issues: [] }

    function factory({ issues }: { readonly issues: readonly ZodIssue[] }): Error {
      captured.issues = issues
      return new Error('test')
    }

    const [error, data] = validate({ schema, params: { email: 'bad' }, createError: factory })
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)

    expect(captured.issues[0]!.path).toBe('email')
  })

  it('formatted issues have empty path for root-level schema failures', () => {
    const schema = z.string()
    const captured: { issues: readonly ZodIssue[] } = { issues: [] }

    function factory({ issues }: { readonly issues: readonly ZodIssue[] }): Error {
      captured.issues = issues
      return new Error('test')
    }

    const [error, data] = validate({ schema, params: 42, createError: factory })
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)

    expect(captured.issues[0]!.path).toBe('')
  })
})

describe('validate() with various schema types', () => {
  it('validates z.enum', () => {
    const schema = z.enum(['a', 'b', 'c'])
    const [error1, data1] = validate({ schema, params: 'b', createError: defaultFactory })
    expect(error1).toBeNull()
    expect(data1).toBe('b')

    const [error2, data2] = validate({ schema, params: 'd', createError: defaultFactory })
    expect(data2).toBeNull()
    expect(error2).toBeInstanceOf(Error)
  })

  it('validates z.tuple', () => {
    const schema = z.tuple([z.string(), z.number()])
    const [error1, data1] = validate({ schema, params: ['hi', 1], createError: defaultFactory })
    expect(error1).toBeNull()
    expect(data1).toStrictEqual(['hi', 1])

    const [error2, data2] = validate({ schema, params: [1, 'hi'], createError: defaultFactory })
    expect(data2).toBeNull()
    expect(error2).toBeInstanceOf(Error)
  })

  it('validates z.union', () => {
    const schema = z.union([z.string(), z.number()])
    const [error1, data1] = validate({ schema, params: 'hello', createError: defaultFactory })
    expect(error1).toBeNull()
    expect(data1).toBe('hello')

    const [error2, data2] = validate({ schema, params: 42, createError: defaultFactory })
    expect(error2).toBeNull()
    expect(data2).toBe(42)

    const [error3, data3] = validate({ schema, params: true, createError: defaultFactory })
    expect(data3).toBeNull()
    expect(error3).toBeInstanceOf(Error)
  })

  it('validates z.optional', () => {
    const schema = z.object({ bio: z.string().optional(), name: z.string() })
    const [error, data] = validate({
      schema,
      params: { name: 'Alice' },
      createError: defaultFactory,
    })
    expect(error).toBeNull()
    expect(data).toStrictEqual({ name: 'Alice' })
    expect(data!.bio).toBeUndefined()
  })

  it('validates z.record', () => {
    const schema = z.record(z.string(), z.number())
    const [error1, data1] = validate({
      schema,
      params: { left: 1, right: 2 },
      createError: defaultFactory,
    })
    expect(error1).toBeNull()
    expect(data1).toStrictEqual({ left: 1, right: 2 })

    const [error2, data2] = validate({
      schema,
      params: { left: 'not-a-number' },
      createError: defaultFactory,
    })
    expect(data2).toBeNull()
    expect(error2).toBeInstanceOf(Error)
  })

  it('validates nested z.object', () => {
    const schema = z.object({
      user: z.object({
        address: z.object({
          city: z.string(),
        }),
        name: z.string(),
      }),
    })
    const input = { user: { address: { city: 'NYC' }, name: 'Bob' } }
    const [error, data] = validate({ schema, params: input, createError: defaultFactory })
    expect(error).toBeNull()
    expect(data).toStrictEqual(input)
  })
})

describe('validate() error formatting', () => {
  it('formats a single issue with path', () => {
    const schema = z.object({ name: z.string() })
    const [error] = validate({ schema, params: {} })
    expect(error!.message).toContain('name:')
    expect(error!.message).toContain('expected string')
  })

  it('formats a single issue without path', () => {
    const [error] = validate({ schema: z.string(), params: 42 })
    expect(error!.message).toContain('expected string')
  })

  it('joins nested paths with dots', () => {
    const schema = z.object({ user: z.object({ email: z.string().email() }) })
    const [error] = validate({ schema, params: { user: { email: 'bad' } } })
    expect(error!.message).toContain('user.email:')
    expect(error!.message).toMatch(/[Ii]nvalid email/)
  })

  it('joins multiple issues with the default separator', () => {
    const schema = z.object({ age: z.number(), name: z.string() })
    const [error] = validate({ schema, params: {} })
    expect(error!.message).toContain('name:')
    expect(error!.message).toContain('age:')
  })

  it('returns empty message for no issues (edge case)', () => {
    const [error, data] = validate({ schema: z.string(), params: 'valid' })
    expect(error).toBeNull()
    expect(data).toBe('valid')
  })
})
