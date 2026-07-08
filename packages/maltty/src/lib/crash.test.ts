import { writeFileSync } from 'node:fs'

import * as clack from '@clack/prompts'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createContextError } from '@/context/error.js'

import { exitOnError, registerCrashHandlers } from './crash.js'

vi.mock(import('@clack/prompts'), () => ({
  log: {
    error: vi.fn(),
    message: vi.fn(),
  },
}))

vi.mock(import('node:fs'), () => ({
  writeFileSync: vi.fn(),
}))

const exitSpy = vi.spyOn(process, 'exit').mockReturnValue(undefined as never)

beforeEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  exitSpy.mockRestore()
})

describe('exitOnError()', () => {
  it('should log message and exit with error exitCode for ContextError', () => {
    const error = createContextError('user error', { exitCode: 42 })

    exitOnError(error)

    expect(clack.log.error).toHaveBeenCalledWith('user error')
    expect(exitSpy).toHaveBeenCalledWith(42)
  })

  it('should log message, write crash log, and exit with default code for regular Error', () => {
    const error = new Error('unexpected failure')

    exitOnError(error)

    expect(clack.log.error).toHaveBeenCalledWith('unexpected failure')
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('maltty-crash-'),
      expect.stringContaining('unexpected failure'),
      'utf8'
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('should wrap non-Error values in an Error, write crash log, and exit', () => {
    exitOnError('string error')

    expect(clack.log.error).toHaveBeenCalledWith('string error')
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('maltty-crash-'),
      expect.stringContaining('string error'),
      'utf8'
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('should still exit cleanly when crash log write fails', () => {
    vi.mocked(writeFileSync).mockImplementation(() => {
      // eslint-disable-next-line no-throw-literal -- simulating fs failure
      throw new Error('disk full')
    })

    const error = new Error('boom')

    exitOnError(error)

    expect(clack.log.error).toHaveBeenCalledWith('boom')
    expect(clack.log.message).not.toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('should include cause line in crash log when Error has a cause', () => {
    const error = new Error('outer', { cause: 'root cause' })

    exitOnError(error)

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('maltty-crash-'),
      expect.stringContaining('Cause: root cause'),
      'utf8'
    )
  })

  it('should omit cause line in crash log when Error has no cause', () => {
    const error = new Error('no cause here')

    exitOnError(error)

    const crashLogContent = vi.mocked(writeFileSync).mock.calls[0]?.[1] as string

    expect(crashLogContent).not.toContain('Cause:')
  })
})

describe('registerCrashHandlers()', () => {
  it('should register process handlers for uncaughtException and unhandledRejection', () => {
    const onSpy = vi.spyOn(process, 'on')

    registerCrashHandlers('test-cli')

    expect(onSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function))
    expect(onSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function))

    onSpy.mockRestore()
  })
})
