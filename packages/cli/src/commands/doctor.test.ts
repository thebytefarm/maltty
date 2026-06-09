import type { CommandContext } from 'maltty'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CheckContext, CheckResult, DiagnosticCheck, FixResult } from '../lib/checks.js'

vi.mock(import('@maltty/config/utils'), () => ({
  loadConfig: vi.fn(),
}))

vi.mock(import('@maltty/utils/manifest'), () => ({
  readManifest: vi.fn(),
}))

vi.mock(import('../lib/checks.js'), () => ({
  CHECKS: [] as DiagnosticCheck[],
  createCheckContext: vi.fn(),
  readRawPackageJson: vi.fn(),
}))

vi.mock(import('maltty'), () => ({
  command: vi.fn((def) => def),
}))

vi.mock(import('picocolors'), () => {
  const identity = vi.fn((s: string) => s)
  return {
    default: {
      blue: identity,
      dim: identity,
      green: identity,
      red: identity,
      yellow: identity,
    },
  } as never
})

const { loadConfig } = await import('@maltty/config/utils')
const { readManifest } = await import('@maltty/utils/manifest')
const { CHECKS, createCheckContext, readRawPackageJson } = await import('../lib/checks.js')

const mockedLoadConfig = vi.mocked(loadConfig)
const mockedReadManifest = vi.mocked(readManifest)
const mockedCreateCheckContext = vi.mocked(createCheckContext)
const mockedReadRawPackageJson = vi.mocked(readRawPackageJson)
const mockedChecks = CHECKS as DiagnosticCheck[]

function makeContext(argOverrides: Record<string, unknown> = {}): CommandContext {
  return {
    args: {
      fix: false,
      ...argOverrides,
    },
    config: {},
    fail: vi.fn(),
    format: { json: vi.fn(() => ''), table: vi.fn(() => '') },
    log: {
      error: vi.fn(),
      info: vi.fn(),
      intro: vi.fn(),
      message: vi.fn(),
      newline: vi.fn(),
      note: vi.fn(),
      outro: vi.fn(),
      raw: vi.fn(),
      step: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
    },
    meta: { command: ['doctor'], name: 'maltty', version: '0.0.0' },
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    status: {
      spinner: {
        start: vi.fn(),
        stop: vi.fn(),
        message: vi.fn(),
        cancel: vi.fn(),
        error: vi.fn(),
        clear: vi.fn(),
        isCancelled: false,
      },
    },
    store: { clear: vi.fn(), delete: vi.fn(), get: vi.fn(), has: vi.fn(), set: vi.fn() },
  } as unknown as CommandContext
}

function makeCheckResult(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    hint: null,
    message: 'All good',
    name: 'test-check',
    status: 'pass',
    ...overrides,
  }
}

function makeFixResult(overrides: Partial<FixResult> = {}): FixResult {
  return {
    fixed: true,
    message: 'Fixed successfully',
    name: 'test-check',
    ...overrides,
  }
}

function setupMocks(context: CheckContext): void {
  mockedLoadConfig.mockResolvedValue([null, null] as never)
  mockedReadManifest.mockResolvedValue([null, null] as never)
  mockedReadRawPackageJson.mockResolvedValue([null, null] as never)
  mockedCreateCheckContext.mockReturnValue(context)
}

describe('doctor command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedChecks.splice(0)
  })

  it('should display results for all passing checks', async () => {
    const passResult = makeCheckResult({ message: 'Config valid', name: 'config', status: 'pass' })
    const versionResult = makeCheckResult({ message: '1.0.0', name: 'version', status: 'pass' })

    mockedChecks.push(
      { name: 'config', run: vi.fn().mockResolvedValue(passResult) },
      { name: 'version', run: vi.fn().mockResolvedValue(versionResult) }
    )

    const context: CheckContext = {
      configError: null,
      configResult: null,
      cwd: '/project',
      manifest: null,
      rawPackageJson: null,
    }
    setupMocks(context)

    const ctx = makeContext()
    const mod = await import('./doctor.js')
    await mod.default.handler!(ctx)

    expect(ctx.status.spinner.start).toHaveBeenCalledWith('Running diagnostics...')
    expect(ctx.status.spinner.stop).toHaveBeenCalledWith('Diagnostics complete')
    expect(ctx.log.raw).toHaveBeenCalledWith(expect.stringContaining('config'))
    expect(ctx.log.raw).toHaveBeenCalledWith(expect.stringContaining('version'))
    expect(ctx.fail).not.toHaveBeenCalled()
  })

  it('should call fail when checks have failures', async () => {
    const failResult = makeCheckResult({
      hint: 'Run maltty init',
      message: 'Not found',
      name: 'maltty.config',
      status: 'fail',
    })

    mockedChecks.push({ name: 'maltty.config', run: vi.fn().mockResolvedValue(failResult) })

    const context: CheckContext = {
      configError: null,
      configResult: null,
      cwd: '/project',
      manifest: null,
      rawPackageJson: null,
    }
    setupMocks(context)

    const ctx = makeContext()
    const mod = await import('./doctor.js')
    await mod.default.handler!(ctx)

    expect(ctx.fail).toHaveBeenCalledWith('1 check failed')
  })

  it('should display summary with correct counts', async () => {
    const passResult = makeCheckResult({ name: 'check-a', status: 'pass' })
    const warnResult = makeCheckResult({ name: 'check-b', status: 'warn' })
    const failResult = makeCheckResult({ name: 'check-c', status: 'fail' })

    mockedChecks.push(
      { name: 'check-a', run: vi.fn().mockResolvedValue(passResult) },
      { name: 'check-b', run: vi.fn().mockResolvedValue(warnResult) },
      { name: 'check-c', run: vi.fn().mockResolvedValue(failResult) }
    )

    const context: CheckContext = {
      configError: null,
      configResult: null,
      cwd: '/project',
      manifest: null,
      rawPackageJson: null,
    }
    setupMocks(context)

    const ctx = makeContext()
    const mod = await import('./doctor.js')
    await mod.default.handler!(ctx)

    expect(ctx.log.raw).toHaveBeenCalledWith(
      expect.stringContaining('3 checks, 1 passed, 1 warnings, 1 failed')
    )
  })

  it('should display fix results when --fix is set and fixes succeed', async () => {
    const failResult = makeCheckResult({
      message: 'Missing type module',
      name: 'module type',
      status: 'fail',
    })
    const passAfterFix = makeCheckResult({
      message: 'ESM',
      name: 'module type',
      status: 'pass',
    })
    const fixResult = makeFixResult({
      fixed: true,
      message: 'Added type module',
      name: 'module type',
    })

    const runFn = vi.fn().mockResolvedValueOnce(failResult).mockResolvedValueOnce(passAfterFix)
    const fixFn = vi.fn().mockResolvedValue(fixResult)

    mockedChecks.push({ fix: fixFn, name: 'module type', run: runFn })

    const context: CheckContext = {
      configError: null,
      configResult: null,
      cwd: '/project',
      manifest: null,
      rawPackageJson: null,
    }
    setupMocks(context)

    const ctx = makeContext({ fix: true })
    const mod = await import('./doctor.js')
    await mod.default.handler!(ctx)

    expect(fixFn).toHaveBeenCalled()
    expect(ctx.log.raw).toHaveBeenCalledWith(expect.stringContaining('Added type module'))
    expect(ctx.log.raw).toHaveBeenCalledWith(expect.stringContaining('fix'))
  })

  it('should not apply fixes when --fix is not set', async () => {
    const failResult = makeCheckResult({
      hint: 'Use --fix',
      message: 'Missing',
      name: 'module type',
      status: 'fail',
    })
    const fixFn = vi.fn()

    mockedChecks.push({
      fix: fixFn,
      name: 'module type',
      run: vi.fn().mockResolvedValue(failResult),
    })

    const context: CheckContext = {
      configError: null,
      configResult: null,
      cwd: '/project',
      manifest: null,
      rawPackageJson: null,
    }
    setupMocks(context)

    const ctx = makeContext({ fix: false })
    const mod = await import('./doctor.js')
    await mod.default.handler!(ctx)

    expect(fixFn).not.toHaveBeenCalled()
  })

  it('should pluralize check for single failure', async () => {
    const failResult = makeCheckResult({ name: 'check-a', status: 'fail' })

    mockedChecks.push({ name: 'check-a', run: vi.fn().mockResolvedValue(failResult) })

    const context: CheckContext = {
      configError: null,
      configResult: null,
      cwd: '/project',
      manifest: null,
      rawPackageJson: null,
    }
    setupMocks(context)

    const ctx = makeContext()
    const mod = await import('./doctor.js')
    await mod.default.handler!(ctx)

    expect(ctx.fail).toHaveBeenCalledWith('1 check failed')
  })

  it('should pluralize checks for multiple failures', async () => {
    const failA = makeCheckResult({ name: 'check-a', status: 'fail' })
    const failB = makeCheckResult({ name: 'check-b', status: 'fail' })

    mockedChecks.push(
      { name: 'check-a', run: vi.fn().mockResolvedValue(failA) },
      { name: 'check-b', run: vi.fn().mockResolvedValue(failB) }
    )

    const context: CheckContext = {
      configError: null,
      configResult: null,
      cwd: '/project',
      manifest: null,
      rawPackageJson: null,
    }
    setupMocks(context)

    const ctx = makeContext()
    const mod = await import('./doctor.js')
    await mod.default.handler!(ctx)

    expect(ctx.fail).toHaveBeenCalledWith('2 checks failed')
  })

  it('should include fixed count in summary when fixes applied', async () => {
    const failA = makeCheckResult({ name: 'fix-a', status: 'fail' })
    const failB = makeCheckResult({ name: 'fix-b', status: 'fail' })
    const passA = makeCheckResult({ name: 'fix-a', status: 'pass' })
    const passB = makeCheckResult({ name: 'fix-b', status: 'pass' })

    const runA = vi.fn().mockResolvedValueOnce(failA).mockResolvedValueOnce(passA)
    const runB = vi.fn().mockResolvedValueOnce(failB).mockResolvedValueOnce(passB)

    mockedChecks.push(
      {
        fix: vi.fn().mockResolvedValue(makeFixResult({ fixed: true, name: 'fix-a' })),
        name: 'fix-a',
        run: runA,
      },
      {
        fix: vi.fn().mockResolvedValue(makeFixResult({ fixed: true, name: 'fix-b' })),
        name: 'fix-b',
        run: runB,
      }
    )

    const context: CheckContext = {
      configError: null,
      configResult: null,
      cwd: '/project',
      manifest: null,
      rawPackageJson: null,
    }
    setupMocks(context)

    const ctx = makeContext({ fix: true })
    const mod = await import('./doctor.js')
    await mod.default.handler!(ctx)

    expect(ctx.log.raw).toHaveBeenCalledWith(expect.stringContaining('2 fixed'))
  })
})
