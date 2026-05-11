import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { err, ok } from './result.js'
import type { Result } from './result.js'
import { retry } from './retry.js'

describe('retry()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('should return ok on the first attempt without scheduling any timer', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const fn = vi.fn(async (): Promise<Result<string>> => ok('first'))

    const result = await retry({ attempts: 3, baseMs: 500, fn })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(setTimeoutSpy).not.toHaveBeenCalled()
    expect(result).toEqual([null, 'first'])
  })

  it('should return the first ok result and stop calling fn', async () => {
    const fn = vi
      .fn<() => Promise<Result<number>>>()
      .mockResolvedValueOnce(err(new Error('fail-1')))
      .mockResolvedValueOnce(ok(42))
      .mockResolvedValueOnce(ok(99))

    const promise = retry({ attempts: 3, baseMs: 500, fn })

    await vi.advanceTimersByTimeAsync(500)

    const [error, value] = await promise

    expect(error).toBeNull()
    expect(value).toBe(42)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should follow baseMs * 2 ^ (attempt - 1) backoff schedule', async () => {
    const fn = vi
      .fn<() => Promise<Result<string>>>()
      .mockResolvedValueOnce(err(new Error('attempt-1')))
      .mockResolvedValueOnce(err(new Error('attempt-2')))
      .mockResolvedValueOnce(ok('attempt-3'))

    const promise = retry({ attempts: 3, baseMs: 500, fn })

    // Allow the first attempt's microtasks to flush.
    await vi.advanceTimersByTimeAsync(0)
    expect(fn).toHaveBeenCalledTimes(1)

    // Just before the first backoff (500ms) elapses, no second attempt yet.
    await vi.advanceTimersByTimeAsync(499)
    expect(fn).toHaveBeenCalledTimes(1)

    // After the full 500ms, the second attempt fires.
    await vi.advanceTimersByTimeAsync(1)
    expect(fn).toHaveBeenCalledTimes(2)

    // Just before the second backoff (1000ms) elapses, no third attempt yet.
    await vi.advanceTimersByTimeAsync(999)
    expect(fn).toHaveBeenCalledTimes(2)

    // After the full 1000ms, the third attempt fires and succeeds.
    await vi.advanceTimersByTimeAsync(1)
    expect(fn).toHaveBeenCalledTimes(3)

    const [error, value] = await promise
    expect(error).toBeNull()
    expect(value).toBe('attempt-3')
  })

  it('should record exact setTimeout delays of 500ms then 1000ms for attempts=3, baseMs=500', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const fn = vi
      .fn<() => Promise<Result<string>>>()
      .mockResolvedValueOnce(err(new Error('1')))
      .mockResolvedValueOnce(err(new Error('2')))
      .mockResolvedValueOnce(ok('done'))

    const promise = retry({ attempts: 3, baseMs: 500, fn })
    await vi.advanceTimersByTimeAsync(2000)
    await promise

    const delays = setTimeoutSpy.mock.calls.map((call) => call[1])
    expect(delays).toEqual([500, 1000])
  })

  it('should return the last err result after exhausting attempts', async () => {
    const errors = [new Error('first'), new Error('second'), new Error('final')]
    const fn = vi
      .fn<() => Promise<Result<string>>>()
      .mockResolvedValueOnce(err(errors[0]))
      .mockResolvedValueOnce(err(errors[1]))
      .mockResolvedValueOnce(err(errors[2]))

    const promise = retry({ attempts: 3, baseMs: 100, fn })
    await vi.advanceTimersByTimeAsync(1000)
    const [error, value] = await promise

    expect(fn).toHaveBeenCalledTimes(3)
    expect(error).toBe(errors[2])
    expect(value).toBeNull()
  })

  it('should not throw when fn always fails — returns last err instead', async () => {
    const fn = vi.fn(async (): Promise<Result<string>> => err(new Error('always fails')))

    const promise = retry({ attempts: 4, baseMs: 10, fn })
    await vi.advanceTimersByTimeAsync(1000)

    await expect(promise).resolves.toBeDefined()
    const [error] = await promise
    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toBe('always fails')
    expect(fn).toHaveBeenCalledTimes(4)
  })

  it('should make exactly one call when attempts=1 (no retries)', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const fn = vi.fn(async (): Promise<Result<string>> => err(new Error('one and done')))

    const result = await retry({ attempts: 1, baseMs: 500, fn })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(setTimeoutSpy).not.toHaveBeenCalled()
    expect(result[0]?.message).toBe('one and done')
  })

  it('should propagate domain-specific error types through the Result tuple', async () => {
    interface DomainError {
      readonly type: 'network' | 'timeout'
      readonly message: string
    }
    const domainError: DomainError = { message: 'connection refused', type: 'network' }
    const fn = vi
      .fn<() => Promise<Result<number, DomainError>>>()
      .mockResolvedValue([domainError, null] as const)

    const promise = retry<number, DomainError>({ attempts: 2, baseMs: 50, fn })
    await vi.advanceTimersByTimeAsync(100)
    const [error, value] = await promise

    expect(error).toEqual(domainError)
    expect(value).toBeNull()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
