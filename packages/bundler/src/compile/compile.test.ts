import type { CompileTarget } from '@maltty/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockProcessExec = vi.fn()
const mockProcessExists = vi.fn()
const mockFsExists = vi.fn()
const mockFsList = vi.fn()
const mockFsRemove = vi.fn()

vi.mock(import('@maltty/utils/node'), () => ({
  fs: { exists: mockFsExists, list: mockFsList, remove: mockFsRemove },
  process: { exec: mockProcessExec, exists: mockProcessExists },
}))

const { compile } = await import('./compile.js')

const noopLifecycle = {
  onStart: vi.fn(),
  onFinish: vi.fn(),
  onStepStart: vi.fn(),
  onStepFinish: vi.fn(),
}

/**
 * @private
 */
function makeResolved(overrides?: {
  readonly targets?: readonly string[]
  readonly name?: string
  readonly autoloadDotenv?: boolean
}): Parameters<typeof compile>[0]['resolved'] {
  return {
    entry: '/project/src/index.ts',
    commands: '/project/commands',
    buildOutDir: '/project/dist',
    compileOutDir: '/project/dist',
    build: {
      target: 'node18',
      minify: false,
      sourcemap: true,
      external: [],
      clean: false,
      define: {},
    },
    compile: {
      autoloadDotenv: overrides?.autoloadDotenv ?? false,
      targets: (overrides?.targets ?? []) as readonly CompileTarget[],
      name: overrides?.name ?? 'cli',
    },
    include: [],
    cwd: '/project',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockProcessExists.mockResolvedValue(true)
  mockProcessExec.mockResolvedValue([null, { stdout: '', stderr: '' }])
  mockFsExists.mockResolvedValue(true)
  mockFsList.mockResolvedValue([null, []])
  mockFsRemove.mockResolvedValue([null, undefined])
})

describe('compile operation', () => {
  it('should return ok with binaries for all default targets when none specified', async () => {
    const [error, output] = await compile({
      resolved: makeResolved(),
      lifecycle: noopLifecycle,
    })

    expect(error).toBeNull()
    expect(output).toMatchObject({
      binaries: expect.arrayContaining([
        expect.objectContaining({ target: 'darwin-arm64' }),
        expect.objectContaining({ target: 'darwin-x64' }),
        expect.objectContaining({ target: 'linux-x64' }),
        expect.objectContaining({ target: 'windows-x64' }),
      ]),
    })
  })

  it('should return err when bun is not installed', async () => {
    mockProcessExists.mockResolvedValue(false)

    const [error, output] = await compile({
      resolved: makeResolved(),
      lifecycle: noopLifecycle,
    })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      message: expect.stringContaining('bun is not installed'),
    })
  })

  it('should return err when bundled entry does not exist', async () => {
    mockFsExists.mockResolvedValue(false)

    const [error, output] = await compile({
      resolved: makeResolved(),
      lifecycle: noopLifecycle,
    })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('run build() first') })
  })

  it('should return err when bun build fails', async () => {
    mockProcessExec.mockResolvedValue([new Error('bun build crashed'), null])

    const [error, output] = await compile({
      resolved: makeResolved(),
      lifecycle: noopLifecycle,
    })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('bun build --compile failed') })
  })

  it('should include stderr in error message when verbose is true', async () => {
    const execError = new Error('bun build crashed')
    Object.defineProperty(execError, 'stderr', {
      value: 'error: could not resolve "chokidar"',
      enumerable: true,
    })
    mockProcessExec.mockResolvedValue([execError, null])

    const [error] = await compile({
      resolved: makeResolved({ targets: ['linux-x64'], name: 'my-app' }),
      lifecycle: noopLifecycle,
      verbose: true,
    })

    expect(error).toMatchObject({
      message: expect.stringContaining('could not resolve "chokidar"'),
    })
  })

  it('should not include stderr in error message when verbose is false', async () => {
    const execError = new Error('bun build crashed')
    Object.defineProperty(execError, 'stderr', {
      value: 'error: could not resolve "chokidar"',
      enumerable: true,
    })
    mockProcessExec.mockResolvedValue([execError, null])

    const [error] = await compile({
      resolved: makeResolved({ targets: ['linux-x64'], name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(error).toMatchObject({
      message: expect.not.stringContaining('could not resolve'),
    })
  })

  it('should pass correct --target arg for cross-compilation', async () => {
    await compile({
      resolved: makeResolved({ targets: ['linux-x64'], name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(mockProcessExec).toHaveBeenCalledWith({
      cmd: 'bun',
      args: expect.arrayContaining(['--target', 'bun-linux-x64']),
      cwd: '/project',
    })
  })

  it('should map linux-x64-musl to bun-linux-x64-musl', async () => {
    await compile({
      resolved: makeResolved({ targets: ['linux-x64-musl'], name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(mockProcessExec).toHaveBeenCalledWith({
      cmd: 'bun',
      args: expect.arrayContaining(['--target', 'bun-linux-x64-musl']),
      cwd: '/project',
    })
  })

  it('should append target suffix to binary name for multi-target builds', async () => {
    const [error, output] = await compile({
      resolved: makeResolved({ targets: ['darwin-arm64', 'linux-x64'], name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(error).toBeNull()
    expect(output).toMatchObject({
      binaries: expect.arrayContaining([
        expect.objectContaining({
          path: expect.stringContaining('my-app-darwin-arm64'),
          target: 'darwin-arm64',
        }),
        expect.objectContaining({
          path: expect.stringContaining('my-app-linux-x64'),
          target: 'linux-x64',
        }),
      ]),
    })
  })

  it('should append target suffix for default multi-target build', async () => {
    const [error, output] = await compile({
      resolved: makeResolved(),
      lifecycle: noopLifecycle,
    })

    expect(error).toBeNull()
    expect(output).toMatchObject({
      binaries: expect.arrayContaining([
        expect.objectContaining({ path: expect.stringContaining('cli-darwin-arm64') }),
        expect.objectContaining({ path: expect.stringContaining('cli-linux-x64') }),
      ]),
    })
  })

  it('should include human-readable labels on compiled binaries', async () => {
    const [, output] = await compile({
      resolved: makeResolved({
        targets: ['darwin-arm64', 'linux-x64', 'windows-x64'],
        name: 'my-app',
      }),
      lifecycle: noopLifecycle,
    })

    expect(output).toMatchObject({
      binaries: expect.arrayContaining([
        expect.objectContaining({ label: 'macOS Apple Silicon', target: 'darwin-arm64' }),
        expect.objectContaining({ label: 'Linux x64', target: 'linux-x64' }),
        expect.objectContaining({ label: 'Windows x64', target: 'windows-x64' }),
      ]),
    })
  })

  it('should invoke onStepStart and onStepFinish for each target', async () => {
    const stepStarts: unknown[] = []
    const stepFinishes: unknown[] = []

    await compile({
      resolved: makeResolved({ targets: ['darwin-arm64', 'linux-x64'], name: 'my-app' }),
      lifecycle: {
        onStepStart: (event) => {
          stepStarts.push(event.meta.target)
        },
        onStepFinish: (event) => {
          stepFinishes.push(event.meta.target)
        },
      },
    })

    expect(stepStarts).toContain('darwin-arm64')
    expect(stepStarts).toContain('linux-x64')
    expect(stepFinishes).toContain('darwin-arm64')
    expect(stepFinishes).toContain('linux-x64')
  })

  it('should always pass --no-compile-autoload-bunfig', async () => {
    await compile({
      resolved: makeResolved({ targets: ['linux-x64'], name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(mockProcessExec).toHaveBeenCalledWith({
      cmd: 'bun',
      args: expect.arrayContaining(['--no-compile-autoload-bunfig']),
      cwd: '/project',
    })
  })

  it('should pass --no-compile-autoload-dotenv by default when autoloadDotenv is not configured', async () => {
    await compile({
      resolved: makeResolved({ targets: ['linux-x64'], name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(mockProcessExec).toHaveBeenCalledWith({
      cmd: 'bun',
      args: expect.arrayContaining(['--no-compile-autoload-dotenv']),
      cwd: '/project',
    })
  })

  it('should pass --no-compile-autoload-dotenv when autoloadDotenv is explicitly false', async () => {
    await compile({
      resolved: makeResolved({ targets: ['linux-x64'], name: 'my-app', autoloadDotenv: false }),
      lifecycle: noopLifecycle,
    })

    expect(mockProcessExec).toHaveBeenCalledWith({
      cmd: 'bun',
      args: expect.arrayContaining(['--no-compile-autoload-dotenv']),
      cwd: '/project',
    })
  })

  it('should not pass --no-compile-autoload-dotenv when autoloadDotenv is true', async () => {
    await compile({
      resolved: makeResolved({
        targets: ['linux-x64'],
        name: 'my-app',
        autoloadDotenv: true,
      }),
      lifecycle: noopLifecycle,
    })

    expect(mockProcessExec).toHaveBeenCalledWith({
      cmd: 'bun',
      args: expect.not.arrayContaining(['--no-compile-autoload-dotenv']),
      cwd: '/project',
    })
  })

  it('should invoke bun with --compile and --outfile args', async () => {
    await compile({
      resolved: makeResolved({ name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(mockProcessExec).toHaveBeenCalledWith({
      cmd: 'bun',
      args: expect.arrayContaining(['build', '--compile', '--outfile']),
      cwd: '/project',
    })
  })

  describe('windows binary naming', () => {
    it('should append .exe to single-target windows builds', async () => {
      const [error, output] = await compile({
        resolved: makeResolved({ targets: ['windows-x64'], name: 'my-app' }),
        lifecycle: noopLifecycle,
      })

      expect(error).toBeNull()
      expect(output!.binaries[0]!.path).toMatch(/[/\\]my-app\.exe$/)
    })

    it('should append .exe to multi-target windows builds', async () => {
      const [error, output] = await compile({
        resolved: makeResolved({
          targets: ['windows-x64', 'windows-arm64'],
          name: 'my-app',
        }),
        lifecycle: noopLifecycle,
      })

      expect(error).toBeNull()
      expect(output).toMatchObject({
        binaries: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringMatching(/my-app-windows-x64\.exe$/),
            target: 'windows-x64',
          }),
          expect.objectContaining({
            path: expect.stringMatching(/my-app-windows-arm64\.exe$/),
            target: 'windows-arm64',
          }),
        ]),
      })
    })

    it('should not append .exe to non-windows targets', async () => {
      const [error, output] = await compile({
        resolved: makeResolved({
          targets: ['darwin-arm64', 'linux-x64', 'windows-x64'],
          name: 'my-app',
        }),
        lifecycle: noopLifecycle,
      })

      expect(error).toBeNull()
      const darwinBinary = output!.binaries.find((b) => b.target === 'darwin-arm64')
      const linuxBinary = output!.binaries.find((b) => b.target === 'linux-x64')
      expect(darwinBinary!.path).not.toMatch(/\.exe$/)
      expect(linuxBinary!.path).not.toMatch(/\.exe$/)
    })

    it('should pass --outfile with .exe to bun for windows targets', async () => {
      await compile({
        resolved: makeResolved({ targets: ['windows-x64'], name: 'my-app' }),
        lifecycle: noopLifecycle,
      })

      const execCall = mockProcessExec.mock.calls[0]?.[0] as { args: readonly string[] }
      const outfileIndex = execCall.args.indexOf('--outfile')
      const outfileValue = execCall.args[outfileIndex + 1]
      expect(outfileValue).toMatch(/my-app\.exe$/)
    })
  })
})
