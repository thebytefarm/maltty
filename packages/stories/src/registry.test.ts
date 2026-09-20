import { describe, expect, it, vi } from 'vitest'

import { createMockStory } from './__test__/mock-story.js'
import { createStoryRegistry } from './registry.js'

describe('story registry', () => {
  it('should return an empty snapshot initially', () => {
    const registry = createStoryRegistry()
    expect(registry.getAll().size).toBe(0)
  })

  it('should store and retrieve entries via set/get', () => {
    const registry = createStoryRegistry()
    const entry = createMockStory('button')

    registry.set('button', entry)

    expect(registry.get('button')).toBe(entry)
  })

  it('should remove entries and return true', () => {
    const registry = createStoryRegistry()
    const entry = createMockStory('card')

    registry.set('card', entry)
    const removed = registry.remove('card')

    expect(removed).toBeTruthy()
    expect(registry.get('card')).toBeUndefined()
  })

  it('should return false when removing a non-existent entry', () => {
    const registry = createStoryRegistry()
    const removed = registry.remove('missing')

    expect(removed).toBeFalsy()
  })

  it('should clear all entries', () => {
    const registry = createStoryRegistry()

    registry.set('a', createMockStory('a'))
    registry.set('b', createMockStory('b'))
    registry.clear()

    expect(registry.getAll().size).toBe(0)
  })

  it('should notify subscribers on set', () => {
    const registry = createStoryRegistry()
    const listener = vi.fn()

    registry.subscribe(listener)
    registry.set('button', createMockStory('button'))

    expect(listener).toHaveBeenCalledOnce()
  })

  it('should notify subscribers on remove', () => {
    const registry = createStoryRegistry()
    const listener = vi.fn()

    registry.set('button', createMockStory('button'))
    registry.subscribe(listener)
    registry.remove('button')

    expect(listener).toHaveBeenCalledOnce()
  })

  it('should notify subscribers on clear', () => {
    const registry = createStoryRegistry()
    const listener = vi.fn()

    registry.set('button', createMockStory('button'))
    registry.subscribe(listener)
    registry.clear()

    expect(listener).toHaveBeenCalledOnce()
  })

  it('should not notify after unsubscribe', () => {
    const registry = createStoryRegistry()
    const listener = vi.fn()

    const unsubscribe = registry.subscribe(listener)
    unsubscribe()
    registry.set('button', createMockStory('button'))

    expect(listener).not.toHaveBeenCalled()
  })

  it('should return a new snapshot reference after mutation', () => {
    const registry = createStoryRegistry()
    const before = registry.getSnapshot()

    registry.set('button', createMockStory('button'))
    const after = registry.getSnapshot()

    expect(before).not.toBe(after)
  })

  it('should return a stable snapshot reference without mutation', () => {
    const registry = createStoryRegistry()

    registry.set('button', createMockStory('button'))
    const first = registry.getSnapshot()
    const second = registry.getSnapshot()

    expect(first).toBe(second)
  })

  it('should reflect entries in getAll after mutations', () => {
    const registry = createStoryRegistry()
    const entry = createMockStory('dialog')

    registry.set('dialog', entry)
    const all = registry.getAll()

    expect(all.size).toBe(1)
    expect(all.get('dialog')).toBe(entry)
  })
})
