import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'

const mockSpinner = {
  start: vi.fn(),
  stop: vi.fn(),
  message: vi.fn(),
  cancel: vi.fn(),
  error: vi.fn(),
  clear: vi.fn(),
  get isCancelled() {
    return false
  },
}

const mockProgress = {
  start: vi.fn(),
  advance: vi.fn(),
  stop: vi.fn(),
  message: vi.fn(),
  cancel: vi.fn(),
  error: vi.fn(),
  clear: vi.fn(),
  get isCancelled() {
    return false
  },
}

const mockGroupHandle = {
  message: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}

const mockTaskLog = {
  message: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  group: vi.fn(() => mockGroupHandle),
}

vi.mock(import('@clack/prompts'), () => ({
  spinner: vi.fn(() => mockSpinner),
  progress: vi.fn(() => mockProgress),
  tasks: vi.fn().mockResolvedValue(undefined),
  taskLog: vi.fn(() => mockTaskLog),
}))

import * as clack from '@clack/prompts'

import { createContextStatus } from './status.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createContextStatus()', () => {
  it('should return a frozen object', () => {
    const status = createContextStatus()
    expect(Object.isFrozen(status)).toBeTruthy()
  })

  it('should have spinner, progress, tasks, and taskLog', () => {
    const status = createContextStatus()
    expect(status.spinner).toBeDefined()
    expect(status.progress).toBeDefined()
    expect(status.tasks).toBeDefined()
    expect(status.taskLog).toBeDefined()
  })

  describe('spinner', () => {
    it('should delegate start to clack spinner', () => {
      const status = createContextStatus()
      status.spinner.start('Loading...')
      expect(mockSpinner.start).toHaveBeenCalledWith('Loading...')
    })

    it('should delegate stop to clack spinner', () => {
      const status = createContextStatus()
      status.spinner.stop('Done')
      expect(mockSpinner.stop).toHaveBeenCalledWith('Done')
    })

    it('should delegate message to clack spinner', () => {
      const status = createContextStatus()
      status.spinner.message('Working...')
      expect(mockSpinner.message).toHaveBeenCalledWith('Working...')
    })
  })

  describe('progress()', () => {
    it('should create a ProgressBar from clack.progress', () => {
      const status = createContextStatus()
      const bar = status.progress({ max: 100 })
      expect(clack.progress).toHaveBeenCalled()
      bar.start('Starting')
      expect(mockProgress.start).toHaveBeenCalledWith('Starting')
    })

    it('should delegate advance to clack progress', () => {
      const status = createContextStatus()
      const bar = status.progress()
      bar.advance(10, 'Step 10')
      expect(mockProgress.advance).toHaveBeenCalledWith(10, 'Step 10')
    })

    it('should delegate stop to clack progress', () => {
      const status = createContextStatus()
      const bar = status.progress()
      bar.stop('Complete')
      expect(mockProgress.stop).toHaveBeenCalledWith('Complete')
    })
  })

  describe('tasks()', () => {
    it('should delegate to clack.tasks', async () => {
      const status = createContextStatus()
      const taskList = [{ title: 'Build', task: async () => 'done' }]
      await status.tasks(taskList)
      expect(clack.tasks).toHaveBeenCalled()
    })
  })

  describe('taskLog()', () => {
    it('should return a handle with message, success, error, and group', () => {
      const status = createContextStatus()
      const handle = status.taskLog({ title: 'Deploy' })
      expect(handle.message).toBeDefined()
      expect(handle.success).toBeDefined()
      expect(handle.error).toBeDefined()
      expect(handle.group).toBeDefined()
    })

    it('should delegate message to clack taskLog', () => {
      const status = createContextStatus()
      const handle = status.taskLog({ title: 'Deploy' })
      handle.message('line 1')
      expect(mockTaskLog.message).toHaveBeenCalledWith('line 1', undefined)
    })

    it('should delegate success to clack taskLog', () => {
      const status = createContextStatus()
      const handle = status.taskLog({ title: 'Deploy' })
      handle.success('All good')
      expect(mockTaskLog.success).toHaveBeenCalledWith('All good', undefined)
    })

    it('should delegate error to clack taskLog', () => {
      const status = createContextStatus()
      const handle = status.taskLog({ title: 'Deploy' })
      handle.error('Failed')
      expect(mockTaskLog.error).toHaveBeenCalledWith('Failed', undefined)
    })

    describe('group()', () => {
      it('should return a group handle with message, success, and error', () => {
        const status = createContextStatus()
        const handle = status.taskLog({ title: 'Deploy' })
        const group = handle.group('sub-task')
        expect(group.message).toBeDefined()
        expect(group.success).toBeDefined()
        expect(group.error).toBeDefined()
      })

      it('should delegate group message to clack taskLog group', () => {
        const status = createContextStatus()
        const handle = status.taskLog({ title: 'Deploy' })
        const group = handle.group('sub-task')
        group.message('group line')
        expect(mockGroupHandle.message).toHaveBeenCalledWith('group line', undefined)
      })

      it('should delegate group success to clack taskLog group', () => {
        const status = createContextStatus()
        const handle = status.taskLog({ title: 'Deploy' })
        const group = handle.group('sub-task')
        group.success('group done')
        expect(mockGroupHandle.success).toHaveBeenCalledWith('group done')
      })

      it('should delegate group error to clack taskLog group', () => {
        const status = createContextStatus()
        const handle = status.taskLog({ title: 'Deploy' })
        const group = handle.group('sub-task')
        group.error('group failed')
        expect(mockGroupHandle.error).toHaveBeenCalledWith('group failed')
      })
    })
  })

  describe('config defaults', () => {
    it('should pass spinnerConfig frames to clack.spinner', () => {
      const frames = ['|', '/', '-', '\\']
      createContextStatus({ spinnerConfig: { frames } })
      expect(clack.spinner).toHaveBeenCalledWith(
        expect.objectContaining({ frames: ['|', '/', '-', '\\'] })
      )
    })

    it('should convert readonly frames to a mutable array', () => {
      const frames = ['a', 'b', 'c'] as const
      createContextStatus({ spinnerConfig: { frames } })
      const [[call]] = (clack.spinner as Mock).mock.calls
      expect(Array.isArray(call.frames)).toBeTruthy()
      expect(call.frames).toEqual(['a', 'b', 'c'])
    })

    it('should pass guide defaults as withGuide to clack calls', () => {
      createContextStatus({ defaults: { guide: true } })
      expect(clack.spinner).toHaveBeenCalledWith(expect.objectContaining({ withGuide: true }))
    })
  })
})
