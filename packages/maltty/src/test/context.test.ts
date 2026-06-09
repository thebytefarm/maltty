import { describe, expect, it } from 'vitest'

import { createTestContext, mockLog, mockPrompts, mockStatus } from './context.js'

describe('test context factory', () => {
  it('should return a context with default args', () => {
    const { ctx } = createTestContext()
    expect(ctx.args).toEqual({})
  })

  it('should return a context with default meta', () => {
    const { ctx } = createTestContext()
    expect(ctx.meta).toMatchObject({ command: ['test'], name: 'test-app', version: '0.0.0' })
  })

  it('should capture log output via stdout', () => {
    const { ctx, stdout } = createTestContext()
    ctx.log.raw('hello world')
    expect(stdout()).toBe('hello world\n')
  })

  it('should accept args overrides', () => {
    const { ctx } = createTestContext({ args: { name: 'Alice' } })
    expect(ctx.args.name).toBe('Alice')
  })

  it('should accept meta overrides', () => {
    const { ctx } = createTestContext({
      meta: { command: ['deploy'], name: 'my-cli', version: '2.0.0' },
    })
    expect(ctx.meta).toMatchObject({ command: ['deploy'], name: 'my-cli', version: '2.0.0' })
  })

  it('should accept custom log', () => {
    const log = mockLog()
    const { ctx } = createTestContext({ log })
    expect(ctx.log).toBe(log)
  })

  it('should accept custom prompts', () => {
    const prompts = mockPrompts({ confirm: [true] })
    const { ctx } = createTestContext({ prompts })
    expect(ctx.prompts).toBe(prompts)
  })

  it('should accept custom status', () => {
    const status = mockStatus()
    const { ctx } = createTestContext({ status })
    expect(ctx.status).toBe(status)
  })

  it('should provide status with stub methods by default', () => {
    const { ctx } = createTestContext()
    expect(() => ctx.status.spinner.start('loading...')).not.toThrow()
    expect(() => ctx.status.spinner.stop('done')).not.toThrow()
  })
})

describe('mockPrompts factory', () => {
  it('should return confirm responses in order', async () => {
    const prompts = mockPrompts({ confirm: [true, false, true] })
    expect(await prompts.confirm({ message: '1' })).toBeTruthy()
    expect(await prompts.confirm({ message: '2' })).toBeFalsy()
    expect(await prompts.confirm({ message: '3' })).toBeTruthy()
  })

  it('should return text responses in order', async () => {
    const prompts = mockPrompts({ text: ['hello', 'world'] })
    expect(await prompts.text({ message: '1' })).toBe('hello')
    expect(await prompts.text({ message: '2' })).toBe('world')
  })

  it('should return select responses in order', async () => {
    const prompts = mockPrompts({ select: ['a', 'b'] })
    expect(await prompts.select({ message: '1', options: [] })).toBe('a')
    expect(await prompts.select({ message: '2', options: [] })).toBe('b')
  })

  it('should return multiselect responses in order', async () => {
    const prompts = mockPrompts({ multiselect: [['a', 'b'], ['c']] })
    expect(await prompts.multiselect({ message: '1', options: [] })).toEqual(['a', 'b'])
    expect(await prompts.multiselect({ message: '2', options: [] })).toEqual(['c'])
  })

  it('should return password responses in order', async () => {
    const prompts = mockPrompts({ password: ['secret'] })
    expect(await prompts.password({ message: '1' })).toBe('secret')
  })

  it('should throw when confirm queue is exhausted', async () => {
    const prompts = mockPrompts({ confirm: [] })
    await expect(prompts.confirm({ message: 'ok?' })).rejects.toThrow(
      'mockPrompts: confirm response queue exhausted'
    )
  })

  it('should throw when text queue is exhausted', async () => {
    const prompts = mockPrompts({ text: [] })
    await expect(prompts.text({ message: 'name?' })).rejects.toThrow(
      'mockPrompts: text response queue exhausted'
    )
  })
})
