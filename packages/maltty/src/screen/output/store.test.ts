import { describe, expect, it, vi } from 'vitest'

import { createOutputStore } from './store.js'

describe('createOutputStore()', () => {
  it('should return an initial idle snapshot with empty entries', () => {
    const store = createOutputStore()
    const snapshot = store.getSnapshot()

    expect(snapshot.entries).toEqual([])
    expect(snapshot.spinner).toEqual({ status: 'idle' })
  })

  it('should add entries with auto-incrementing IDs via push()', () => {
    const store = createOutputStore()

    store.push({ kind: 'log', level: 'info', text: 'first' })
    store.push({ kind: 'log', level: 'warn', text: 'second' })

    const snapshot = store.getSnapshot()

    expect(snapshot.entries).toEqual([
      { kind: 'log', level: 'info', text: 'first', id: 0 },
      { kind: 'log', level: 'warn', text: 'second', id: 1 },
    ])
  })

  it('should notify subscribers when push() is called', () => {
    const store = createOutputStore()
    const callback = vi.fn()

    store.subscribe(callback)
    store.push({ kind: 'newline' })

    expect(callback).toHaveBeenCalledOnce()
  })

  it('should return an unsubscribe function that stops notifications', () => {
    const store = createOutputStore()
    const callback = vi.fn()

    const unsubscribe = store.subscribe(callback)
    unsubscribe()
    store.push({ kind: 'newline' })

    expect(callback).not.toHaveBeenCalled()
  })

  it('should update spinner state and notify subscribers via setSpinner()', () => {
    const store = createOutputStore()
    const callback = vi.fn()

    store.subscribe(callback)
    store.setSpinner({ status: 'spinning', message: 'Working...' })

    const snapshot = store.getSnapshot()

    expect(snapshot.spinner).toEqual({ status: 'spinning', message: 'Working...' })
    expect(callback).toHaveBeenCalledOnce()
  })

  it('should increment IDs correctly across multiple pushes', () => {
    const store = createOutputStore()

    store.push({ kind: 'raw', text: 'a' })
    store.push({ kind: 'raw', text: 'b' })
    store.push({ kind: 'raw', text: 'c' })

    const ids = store.getSnapshot().entries.map((entry) => entry.id)

    expect(ids).toEqual([0, 1, 2])
  })

  it('should return a frozen snapshot', () => {
    const store = createOutputStore()

    store.push({ kind: 'newline' })

    const snapshot = store.getSnapshot()

    expect(Object.isFrozen(snapshot)).toBeTruthy()
    expect(Object.isFrozen(snapshot.entries)).toBeTruthy()
  })
})
