import { describe, expect, it } from 'vitest'

import { createProtectionRegistry } from './protection.js'

describe('createProtectionRegistry()', () => {
  it('should return false for an entry that was not added', () => {
    const registry = createProtectionRegistry()

    expect(registry.has('global', 'auth.json')).toBeFalsy()
  })

  it('should return true after adding an entry', () => {
    const registry = createProtectionRegistry()

    registry.add({ filename: 'auth.json', location: 'global' })

    expect(registry.has('global', 'auth.json')).toBeTruthy()
  })

  it('should distinguish between locations for the same filename', () => {
    const registry = createProtectionRegistry()

    registry.add({ filename: 'auth.json', location: 'global' })

    expect(registry.has('global', 'auth.json')).toBeTruthy()
    expect(registry.has('local', 'auth.json')).toBeFalsy()
  })

  it('should distinguish between filenames for the same location', () => {
    const registry = createProtectionRegistry()

    registry.add({ filename: 'auth.json', location: 'global' })

    expect(registry.has('global', 'auth.json')).toBeTruthy()
    expect(registry.has('global', 'config.json')).toBeFalsy()
  })

  it('should handle multiple entries', () => {
    const registry = createProtectionRegistry()

    registry.add({ filename: 'auth.json', location: 'global' })
    registry.add({ filename: 'secrets.json', location: 'local' })

    expect(registry.has('global', 'auth.json')).toBeTruthy()
    expect(registry.has('local', 'secrets.json')).toBeTruthy()
    expect(registry.has('global', 'secrets.json')).toBeFalsy()
    expect(registry.has('local', 'auth.json')).toBeFalsy()
  })

  it('should be idempotent when adding the same entry twice', () => {
    const registry = createProtectionRegistry()

    registry.add({ filename: 'auth.json', location: 'global' })
    registry.add({ filename: 'auth.json', location: 'global' })

    expect(registry.has('global', 'auth.json')).toBeTruthy()
  })
})
