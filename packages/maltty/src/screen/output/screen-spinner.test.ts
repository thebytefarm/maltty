import { describe, expect, it } from 'vitest'

import { createScreenSpinner } from './screen-spinner.js'
import { createOutputStore } from './store.js'

describe('createScreenSpinner()', () => {
  it('should set spinner to spinning with default message on start()', () => {
    const store = createOutputStore()
    const spinner = createScreenSpinner(store)

    spinner.start()

    expect(store.getSnapshot().spinner).toEqual({ status: 'spinning', message: 'Loading...' })
  })

  it('should set spinner to spinning with custom message on start()', () => {
    const store = createOutputStore()
    const spinner = createScreenSpinner(store)

    spinner.start('Deploying...')

    expect(store.getSnapshot().spinner).toEqual({ status: 'spinning', message: 'Deploying...' })
  })

  it('should set spinner to stopped on stop()', () => {
    const store = createOutputStore()
    const spinner = createScreenSpinner(store)

    spinner.start()
    spinner.stop()

    expect(store.getSnapshot().spinner).toEqual({ status: 'stopped', message: '' })
  })

  it('should update message text while staying spinning on message()', () => {
    const store = createOutputStore()
    const spinner = createScreenSpinner(store)

    spinner.start()
    spinner.message('Processing step 2...')

    expect(store.getSnapshot().spinner).toEqual({
      status: 'spinning',
      message: 'Processing step 2...',
    })
  })

  it('should set spinner to cancelled on cancel()', () => {
    const store = createOutputStore()
    const spinner = createScreenSpinner(store)

    spinner.start()
    spinner.cancel()

    expect(store.getSnapshot().spinner).toEqual({ status: 'cancelled', message: '' })
  })

  it('should set spinner to error on error()', () => {
    const store = createOutputStore()
    const spinner = createScreenSpinner(store)

    spinner.start()
    spinner.error()

    expect(store.getSnapshot().spinner).toEqual({ status: 'error', message: '' })
  })

  it('should reset to idle on clear()', () => {
    const store = createOutputStore()
    const spinner = createScreenSpinner(store)

    spinner.start()
    spinner.clear()

    expect(store.getSnapshot().spinner).toEqual({ status: 'idle' })
  })

  it('should return true from isCancelled only when cancelled', () => {
    const store = createOutputStore()
    const spinner = createScreenSpinner(store)

    expect(spinner.isCancelled).toBeFalsy()

    spinner.start()
    expect(spinner.isCancelled).toBeFalsy()

    spinner.cancel()
    expect(spinner.isCancelled).toBeTruthy()

    spinner.clear()
    expect(spinner.isCancelled).toBeFalsy()
  })
})
