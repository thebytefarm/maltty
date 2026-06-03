import * as clack from '@clack/prompts'
import { createWritableCapture } from '@maltty/core/test'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLog } from './log.js'

vi.mock(import('@clack/prompts'), () => ({
  log: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  box: vi.fn(),
  stream: {
    info: vi.fn().mockResolvedValue(undefined),
    success: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    step: vi.fn().mockResolvedValue(undefined),
    message: vi.fn().mockResolvedValue(undefined),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createLog()', () => {
  describe('error()', () => {
    it('should call clack.log.error with message', () => {
      const log = createLog()

      log.error('something failed')

      expect(clack.log.error).toHaveBeenCalledWith('something failed', expect.any(Object))
    })
  })

  describe('info()', () => {
    it('should call clack.log.info with message', () => {
      const log = createLog()

      log.info('some info')

      expect(clack.log.info).toHaveBeenCalledWith('some info', expect.any(Object))
    })
  })

  describe('success()', () => {
    it('should call clack.log.success with message', () => {
      const log = createLog()

      log.success('done')

      expect(clack.log.success).toHaveBeenCalledWith('done', expect.any(Object))
    })
  })

  describe('warn()', () => {
    it('should call clack.log.warn with message', () => {
      const log = createLog()

      log.warn('be careful')

      expect(clack.log.warn).toHaveBeenCalledWith('be careful', expect.any(Object))
    })
  })

  describe('step()', () => {
    it('should call clack.log.step with message', () => {
      const log = createLog()

      log.step('running step')

      expect(clack.log.step).toHaveBeenCalledWith('running step', expect.any(Object))
    })
  })

  describe('message()', () => {
    it('should call clack.log.message with message', () => {
      const log = createLog()

      log.message('hello')

      expect(clack.log.message).toHaveBeenCalledWith('hello', expect.any(Object))
    })
  })

  describe('intro()', () => {
    it('should call clack.intro', () => {
      const log = createLog()

      log.intro('welcome')

      expect(clack.intro).toHaveBeenCalledWith('welcome', expect.any(Object))
    })
  })

  describe('outro()', () => {
    it('should call clack.outro', () => {
      const log = createLog()

      log.outro('goodbye')

      expect(clack.outro).toHaveBeenCalledWith('goodbye', expect.any(Object))
    })
  })

  describe('note()', () => {
    it('should call clack.note', () => {
      const log = createLog()

      log.note('details', 'title')

      expect(clack.note).toHaveBeenCalledWith('details', 'title', expect.any(Object))
    })
  })

  describe('box()', () => {
    it('should call clack.box', () => {
      const log = createLog()

      log.box('content', 'heading')

      expect(clack.box).toHaveBeenCalledWith('content', 'heading', expect.any(Object))
    })
  })

  describe('newline()', () => {
    it('should write a newline to the output stream', () => {
      const { output, stream } = createWritableCapture()
      const log = createLog({ output: stream })

      log.newline()

      expect(output()).toBe('\n')
    })
  })

  describe('raw()', () => {
    it('should write text with trailing newline to the output stream', () => {
      const { output, stream } = createWritableCapture()
      const log = createLog({ output: stream })

      log.raw('hello world')

      expect(output()).toBe('hello world\n')
    })
  })

  describe('stream', () => {
    it('should call clack.stream.info with iterable', async () => {
      const log = createLog()
      const iterable = (async function* streamChunks() {
        yield 'chunk'
      })()

      await log.stream.info(iterable)

      expect(clack.stream.info).toHaveBeenCalledWith(iterable)
    })
  })

  describe('defaults', () => {
    it('should pass defaults through to clack calls', () => {
      const { stream } = createWritableCapture()
      const log = createLog({
        output: stream,
        defaults: { guide: true, output: stream },
      })

      log.info('with defaults')

      expect(clack.log.info).toHaveBeenCalledWith(
        'with defaults',
        expect.objectContaining({ withGuide: true })
      )
    })
  })

  describe('boxDefaults', () => {
    it('should merge box defaults with base defaults', () => {
      const { stream } = createWritableCapture()
      const log = createLog({
        output: stream,
        boxDefaults: { padding: 2 },
      })

      log.box('content', 'title')

      expect(clack.box).toHaveBeenCalledWith(
        'content',
        'title',
        expect.objectContaining({ padding: 2 })
      )
    })
  })

  describe('resolveOutput', () => {
    it('should default to process.stderr when no output is provided', () => {
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
      const log = createLog()

      log.newline()

      expect(writeSpy).toHaveBeenCalledWith('\n')
      writeSpy.mockRestore()
    })

    it('should use custom stream when provided', () => {
      const { output, stream } = createWritableCapture()
      const log = createLog({ output: stream })

      log.raw('test')

      expect(output()).toBe('test\n')
    })
  })

  describe('frozen object', () => {
    it('should return a frozen object', () => {
      const log = createLog()

      expect(Object.isFrozen(log)).toBeTruthy()
    })
  })
})
