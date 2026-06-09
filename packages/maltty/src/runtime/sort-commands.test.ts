import { describe, expect, it } from 'vitest'

import { command } from '@/command.js'
import type { Command } from '@/types/index.js'

import { sortCommandEntries, validateCommandOrder } from './sort-commands.js'

/**
 * Create a minimal command for testing.
 */
function testCommand(description: string): Command {
  return command({ description })
}

describe(validateCommandOrder, () => {
  it('should return ok when all order names exist', () => {
    const [error] = validateCommandOrder({
      commandNames: ['alpha', 'beta', 'gamma'],
      order: ['beta', 'alpha'],
    })

    expect(error).toBeNull()
  })

  it('should return error for unknown command names', () => {
    const [error] = validateCommandOrder({
      commandNames: ['alpha', 'beta'],
      order: ['alpha', 'missing', 'also-missing'],
    })

    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toContain('"missing"')
    expect(error?.message).toContain('"also-missing"')
  })

  it('should return ok for empty order array', () => {
    const [error] = validateCommandOrder({
      commandNames: ['alpha', 'beta'],
      order: [],
    })

    expect(error).toBeNull()
  })

  it('should return error for duplicate command names', () => {
    const [error] = validateCommandOrder({
      commandNames: ['alpha', 'beta', 'gamma'],
      order: ['alpha', 'beta', 'alpha'],
    })

    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toContain('"alpha"')
    expect(error?.message).toContain('duplicate')
  })

  it('should return ok when order matches all command names exactly', () => {
    const [error] = validateCommandOrder({
      commandNames: ['alpha', 'beta', 'gamma'],
      order: ['gamma', 'beta', 'alpha'],
    })

    expect(error).toBeNull()
  })
})

describe(sortCommandEntries, () => {
  it('should sort alphabetically when no order is provided', () => {
    const entries: readonly (readonly [string, Command])[] = [
      ['gamma', testCommand('Gamma')],
      ['alpha', testCommand('Alpha')],
      ['beta', testCommand('Beta')],
    ]

    const result = sortCommandEntries({ entries })
    const names = result.map(([name]) => name)

    expect(names).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('should sort alphabetically when order is empty', () => {
    const entries: readonly (readonly [string, Command])[] = [
      ['gamma', testCommand('Gamma')],
      ['alpha', testCommand('Alpha')],
      ['beta', testCommand('Beta')],
    ]

    const result = sortCommandEntries({ entries, order: [] })
    const names = result.map(([name]) => name)

    expect(names).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('should place ordered names first, then remaining alphabetically', () => {
    const entries: readonly (readonly [string, Command])[] = [
      ['delta', testCommand('Delta')],
      ['alpha', testCommand('Alpha')],
      ['beta', testCommand('Beta')],
      ['gamma', testCommand('Gamma')],
    ]

    const result = sortCommandEntries({ entries, order: ['gamma', 'alpha'] })
    const names = result.map(([name]) => name)

    expect(names).toEqual(['gamma', 'alpha', 'beta', 'delta'])
  })

  it('should respect exact specified order when all names are ordered', () => {
    const entries: readonly (readonly [string, Command])[] = [
      ['delta', testCommand('Delta')],
      ['alpha', testCommand('Alpha')],
      ['beta', testCommand('Beta')],
    ]

    const result = sortCommandEntries({ entries, order: ['beta', 'delta', 'alpha'] })
    const names = result.map(([name]) => name)

    expect(names).toEqual(['beta', 'delta', 'alpha'])
  })

  it('should skip order names that are not in entries', () => {
    const entries: readonly (readonly [string, Command])[] = [
      ['alpha', testCommand('Alpha')],
      ['beta', testCommand('Beta')],
    ]

    const result = sortCommandEntries({ entries, order: ['missing', 'alpha'] })
    const names = result.map(([name]) => name)

    expect(names).toEqual(['alpha', 'beta'])
  })

  it('should not mutate the original entries array', () => {
    const entries: readonly (readonly [string, Command])[] = [
      ['beta', testCommand('Beta')],
      ['alpha', testCommand('Alpha')],
    ]

    sortCommandEntries({ entries, order: ['alpha'] })

    expect(entries[0][0]).toBe('beta')
    expect(entries[1][0]).toBe('alpha')
  })
})
