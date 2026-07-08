import { TAG, hasTag } from '@maltty/utils/tag'
import { describe, expect, it } from 'vitest'

import { command, isCommandsConfig } from './command.js'

describe('command()', () => {
  it('returns an object tagged as Command', () => {
    const cmd = command({})
    expect(hasTag(cmd, 'Command')).toBeTruthy()
  })

  it('preserves the description', () => {
    const cmd = command({ description: 'Deploy the app' })
    expect(cmd.description).toBe('Deploy the app')
  })

  it('preserves yargs-style options', () => {
    const options = {
      name: { description: 'Name', required: true, type: 'string' as const },
      verbose: { default: false, type: 'boolean' as const },
    }
    const cmd = command({ options })
    expect(cmd.options).toBe(options)
  })

  it('preserves the handler function', () => {
    async function handler(): Promise<void> {}
    const cmd = command({ handler })
    expect(cmd.handler).toBe(handler)
  })

  it('preserves nested commands', () => {
    const sub = command({ description: 'sub' })
    const parent = command({
      commands: { sub },
      description: 'parent',
    })
    expect(parent.commands).toBeDefined()
    expect(hasTag(parent.commands!['sub'], 'Command')).toBeTruthy()
  })

  it('works with no options (empty def)', () => {
    const cmd = command({})
    expect(cmd[TAG]).toBe('Command')
    expect(cmd.description).toBeUndefined()
    expect(cmd.options).toBeUndefined()
    expect(cmd.handler).toBeUndefined()
    expect(cmd.commands).toBeUndefined()
  })

  it('works with all options provided', () => {
    async function handler(): Promise<void> {}
    const sub = command({ description: 'child' })
    const options = { port: { type: 'number' as const } }

    const cmd = command({
      commands: { sub },
      description: 'full command',
      handler,
      options,
    })

    expect(cmd[TAG]).toBe('Command')
    expect(cmd.description).toBe('full command')
    expect(cmd.options).toBe(options)
    expect(cmd.handler).toBe(handler)
    expect(cmd.commands!['sub']).toBe(sub)
  })

  it('normalizes CommandsConfig with path into flat commands field', () => {
    const parent = command({
      commands: {
        path: './sub-commands',
      },
      description: 'parent',
    })

    expect(parent[TAG]).toBe('Command')
    // Path-based CommandsConfig is normalized — commands resolved at cli() level
    expect(parent.commands).toBeUndefined()
  })

  it('preserves help options on the resolved command', () => {
    const sub = command({ description: 'child' })
    const parent = command({
      commands: { sub },
      description: 'parent',
      help: { order: ['sub'] },
    })

    expect(parent[TAG]).toBe('Command')
    expect(parent.commands).toBeDefined()
    expect(hasTag(parent.commands!['sub'], 'Command')).toBeTruthy()
    expect(parent.help).toStrictEqual({ order: ['sub'] })
  })

  it('should preserve a static hidden value', () => {
    const cmd = command({ description: 'secret', hidden: true })
    expect(cmd.hidden).toBeTruthy()
  })

  it('should resolve a hidden function', () => {
    const cmd = command({ description: 'secret', hidden: () => true })
    expect(cmd.hidden).toBeTruthy()
  })

  it('should preserve a static deprecated string', () => {
    const cmd = command({ deprecated: 'Use deploy-v2 instead', description: 'old' })
    expect(cmd.deprecated).toBe('Use deploy-v2 instead')
  })

  it('should resolve a deprecated function', () => {
    const cmd = command({ deprecated: () => 'removed in 2.0', description: 'old' })
    expect(cmd.deprecated).toBe('removed in 2.0')
  })

  it('should resolve a description function', () => {
    const cmd = command({ description: () => 'computed description' })
    expect(cmd.description).toBe('computed description')
  })

  it('should default hidden and deprecated to undefined when omitted', () => {
    const cmd = command({ description: 'normal' })
    expect(cmd.hidden).toBeUndefined()
    expect(cmd.deprecated).toBeUndefined()
  })

  it('normalizes CommandsConfig with path (order lives on help)', () => {
    const cmd = command({
      commands: {
        path: './src/commands',
      },
      description: 'Root',
      help: { order: ['a', 'b'] },
    })

    expect(cmd[TAG]).toBe('Command')
    expect(cmd.help).toStrictEqual({ order: ['a', 'b'] })
    // Path is not stored on the flat Command — it is resolved at the cli() level
    expect(cmd.commands).toBeUndefined()
  })
})

describe('isCommandsConfig()', () => {
  it('returns true for an object with path string', () => {
    expect(isCommandsConfig({ path: './commands' })).toBeTruthy()
  })

  it('returns true for an object with path and commands', () => {
    const sub = command({ description: 'sub' })
    expect(isCommandsConfig({ commands: { sub }, path: './commands' })).toBeTruthy()
  })

  it('returns false for a plain CommandMap (tagged Command values)', () => {
    const sub = command({ description: 'sub' })
    expect(isCommandsConfig({ sub })).toBeFalsy()
  })

  it('returns false for null', () => {
    expect(isCommandsConfig(null)).toBeFalsy()
  })

  it('returns false for a string', () => {
    expect(isCommandsConfig('./commands')).toBeFalsy()
  })

  it('returns false for a Promise', () => {
    expect(isCommandsConfig(Promise.resolve({}))).toBeFalsy()
  })

  it('returns false for an empty object', () => {
    expect(isCommandsConfig({})).toBeFalsy()
  })

  it('returns false when path is not a string', () => {
    expect(isCommandsConfig({ path: 42 })).toBeFalsy()
  })
})
