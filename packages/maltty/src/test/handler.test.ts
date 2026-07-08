import { describe, expect, it } from 'vitest'

import { command } from '@/command.js'

import { runHandler } from './handler.js'

describe('run handler utility', () => {
  it('should execute command handler with test context', async () => {
    const cmd = command({
      handler(ctx) {
        ctx.log.raw(`name=${ctx.args.name}`)
      },
    })

    const { stdout } = await runHandler({ cmd, overrides: { args: { name: 'Alice' } } })
    expect(stdout()).toBe('name=Alice\n')
  })

  it('should capture ctx.fail errors', async () => {
    const cmd = command({
      handler(ctx) {
        ctx.fail('something went wrong', { code: 'BROKEN', exitCode: 2 })
      },
    })

    const { error } = await runHandler({ cmd })
    expect(error).toBeDefined()
    expect(error?.message).toBe('something went wrong')
  })

  it('should return undefined error on success', async () => {
    const cmd = command({
      handler() {},
    })

    const { error } = await runHandler({ cmd })
    expect(error).toBeUndefined()
  })

  it('should handle commands without a handler', async () => {
    const cmd = command({})

    const { error } = await runHandler({ cmd })
    expect(error).toBeUndefined()
  })

  it('should capture async handler errors', async () => {
    const cmd = command({
      async handler(ctx) {
        ctx.fail('async failure')
      },
    })

    const { error } = await runHandler({ cmd })
    expect(error).toBeDefined()
    expect(error?.message).toBe('async failure')
  })
})
