import { describe, expect, it } from 'vitest'

import { createScreenLog } from './screen-log.js'
import { createOutputStore } from './store.js'

describe(createScreenLog, () => {
  it('should push an info log entry', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.info('hello')

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'log', level: 'info', text: 'hello' })
  })

  it('should push a success log entry', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.success('done')

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'log', level: 'success', text: 'done' })
  })

  it('should push an error log entry', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.error('fail')

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'log', level: 'error', text: 'fail' })
  })

  it('should push a warn log entry', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.warn('careful')

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'log', level: 'warn', text: 'careful' })
  })

  it('should push a step log entry', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.step('installing')

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'log', level: 'step', text: 'installing' })
  })

  it('should push a message log entry with symbol from opts', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.message('note', { symbol: '>' })

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      kind: 'log',
      level: 'message',
      text: 'note',
      symbol: '>',
    })
  })

  it('should push a message log entry with undefined symbol when opts is undefined', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.message('bare')

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'log', level: 'message', text: 'bare' })
    expect(entries[0]).toHaveProperty('symbol', undefined)
  })

  it('should push a newline entry', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.newline()

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'newline' })
  })

  it('should push a raw entry', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.raw('raw text')

    const { entries } = store.getSnapshot()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'raw', text: 'raw text' })
  })

  it('should not push anything for intro', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.intro('title')

    expect(store.getSnapshot().entries).toHaveLength(0)
  })

  it('should not push anything for outro', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.outro('goodbye')

    expect(store.getSnapshot().entries).toHaveLength(0)
  })

  it('should not push anything for note', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.note('a note', 'title')

    expect(store.getSnapshot().entries).toHaveLength(0)
  })

  it('should not push anything for box', () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    log.box('boxed', 'header')

    expect(store.getSnapshot().entries).toHaveLength(0)
  })

  it('should expose a stream property with no-op methods', async () => {
    const store = createOutputStore()
    const log = createScreenLog(store)

    expect(log.stream).toBeDefined()

    const emptyIterable: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        return {
          next: async () => ({ done: true as const, value: undefined }),
        }
      },
    }

    await log.stream.info(emptyIterable)
    await log.stream.success(emptyIterable)
    await log.stream.error(emptyIterable)
    await log.stream.warn(emptyIterable)
    await log.stream.step(emptyIterable)
    await log.stream.message(emptyIterable)

    expect(store.getSnapshot().entries).toHaveLength(0)
  })
})
