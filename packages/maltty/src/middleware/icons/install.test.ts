import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('./list-system-fonts.js'), () => ({
  listSystemFonts: vi.fn(async () => [null, []]),
}))

vi.mock(import('node:child_process'), () => ({
  exec: vi.fn((_cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
    const callback = cb ?? _opts
    if (typeof callback === 'function') {
      callback(null, { stderr: '', stdout: '' })
    }
  }),
}))

vi.mock(import('node:fs/promises'), () => ({
  mkdir: vi.fn(async () => undefined),
  rm: vi.fn(async () => undefined),
}))

import { exec } from 'node:child_process'

import { installNerdFont } from './install.js'
import { listSystemFonts } from './list-system-fonts.js'

function createMockCtx() {
  return {
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
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    status: {
      spinner: {
        message: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      },
    },
  }
}

describe('installNerdFont()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('font validation', () => {
    it('should return error for font names with shell metacharacters', async () => {
      const ctx = createMockCtx()

      const [error] = await installNerdFont({ ctx, font: 'Font;rm -rf /' })

      expect(error).toMatchObject({ type: 'install_failed' })
      expect(error?.message).toContain('Invalid font name')
    })

    it('should return error for font names with backticks', async () => {
      const ctx = createMockCtx()

      const [error] = await installNerdFont({ ctx, font: 'Font`whoami`' })

      expect(error).toMatchObject({ type: 'install_failed' })
      expect(error?.message).toContain('Invalid font name')
    })

    it('should return error for font names with spaces', async () => {
      const ctx = createMockCtx()

      const [error] = await installNerdFont({ ctx, font: 'Fira Code' })

      expect(error).toMatchObject({ type: 'install_failed' })
      expect(error?.message).toContain('Invalid font name')
    })

    it('should accept valid alphanumeric font names', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(false)

      const [error, value] = await installNerdFont({ ctx, font: 'JetBrainsMono' })

      expect(error).toBeNull()
      expect(value).toBeFalsy()
    })

    it('should accept font names with hyphens', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(false)

      const [error, value] = await installNerdFont({ ctx, font: 'Go-Mono' })

      expect(error).toBeNull()
      expect(value).toBeFalsy()
    })
  })

  describe('with font option (confirmation flow)', () => {
    it('should prompt for confirmation when font is provided', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(false)

      await installNerdFont({ ctx, font: 'Hack' })

      expect(ctx.prompts.confirm).toHaveBeenCalledOnce()
      expect(ctx.prompts.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Hack') })
      )
    })

    it('should return ok(false) when user declines confirmation', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(false)

      const [error, value] = await installNerdFont({ ctx, font: 'Hack' })

      expect(error).toBeNull()
      expect(value).toBeFalsy()
    })

    it('should call installFontWithSpinner when user confirms', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(true)

      await installNerdFont({ ctx, font: 'Hack' })

      expect(ctx.status.spinner.start).toHaveBeenCalledWith(
        expect.stringContaining('Installing Hack Nerd Font')
      )
    })
  })

  describe('without font option (selection flow)', () => {
    it('should detect matching fonts and show selection prompt', async () => {
      const ctx = createMockCtx()
      vi.mocked(listSystemFonts).mockResolvedValue([null, ['JetBrains Mono', 'Arial']])
      vi.mocked(ctx.prompts.select).mockResolvedValue(undefined)

      await installNerdFont({ ctx })

      expect(ctx.status.spinner.start).toHaveBeenCalledWith('Detecting installed fonts...')
      expect(ctx.prompts.select).toHaveBeenCalledOnce()
    })

    it('should return ok(false) when user cancels font selection', async () => {
      const ctx = createMockCtx()
      vi.mocked(listSystemFonts).mockResolvedValue([null, []])
      vi.mocked(ctx.prompts.select).mockResolvedValue(undefined)

      const [error, value] = await installNerdFont({ ctx })

      expect(error).toBeNull()
      expect(value).toBeFalsy()
    })

    it('should return ok(false) when font selection returns a symbol', async () => {
      const ctx = createMockCtx()
      vi.mocked(listSystemFonts).mockResolvedValue([null, []])
      vi.mocked(ctx.prompts.select).mockResolvedValue(Symbol.for('cancel'))

      const [error, value] = await installNerdFont({ ctx })

      expect(error).toBeNull()
      expect(value).toBeFalsy()
    })

    it('should return ok(false) when action selection returns a symbol', async () => {
      const ctx = createMockCtx()
      vi.mocked(listSystemFonts).mockResolvedValue([null, []])
      vi.mocked(ctx.prompts.select)
        .mockResolvedValueOnce('JetBrainsMono')
        .mockResolvedValueOnce(Symbol.for('cancel'))

      const [error, value] = await installNerdFont({ ctx })

      expect(error).toBeNull()
      expect(value).toBeFalsy()
    })

    it('should return ok(false) when user cancels action selection', async () => {
      const ctx = createMockCtx()
      vi.mocked(listSystemFonts).mockResolvedValue([null, []])
      vi.mocked(ctx.prompts.select)
        .mockResolvedValueOnce('JetBrainsMono')
        .mockResolvedValueOnce(undefined)

      const [error, value] = await installNerdFont({ ctx })

      expect(error).toBeNull()
      expect(value).toBeFalsy()
    })

    it('should return error when selected font name fails validation', async () => {
      const ctx = createMockCtx()
      vi.mocked(listSystemFonts).mockResolvedValue([null, []])
      vi.mocked(ctx.prompts.select).mockResolvedValueOnce('Invalid Font Name With Spaces')

      const [error] = await installNerdFont({ ctx })

      expect(error).toMatchObject({ type: 'install_failed' })
      expect(error?.message).toContain('Invalid font name')
    })

    it('should return empty array from detectMatchingFonts when listSystemFonts fails', async () => {
      const ctx = createMockCtx()
      vi.mocked(listSystemFonts).mockResolvedValue([new Error('listing failed'), null])
      vi.mocked(ctx.prompts.select).mockResolvedValue(undefined)

      const [error, value] = await installNerdFont({ ctx })

      expect(error).toBeNull()
      expect(value).toBeFalsy()
      // Spinner should still run
      expect(ctx.status.spinner.start).toHaveBeenCalledWith('Detecting installed fonts...')
    })
  })

  describe('selection flow with auto install', () => {
    it('should show spinner and attempt installation when auto is selected', async () => {
      const ctx = createMockCtx()
      vi.mocked(listSystemFonts).mockResolvedValue([null, []])
      vi.mocked(ctx.prompts.select)
        .mockResolvedValueOnce('JetBrainsMono')
        .mockResolvedValueOnce('auto')

      await installNerdFont({ ctx })

      expect(ctx.status.spinner.start).toHaveBeenCalledWith(
        expect.stringContaining('Installing JetBrainsMono Nerd Font')
      )
    })
  })

  describe('selection flow with show commands', () => {
    it('should display install commands when commands is selected', async () => {
      const ctx = createMockCtx()
      vi.mocked(listSystemFonts).mockResolvedValue([null, []])
      vi.mocked(ctx.prompts.select)
        .mockResolvedValueOnce('JetBrainsMono')
        .mockResolvedValueOnce('commands')

      const [error, value] = await installNerdFont({ ctx })

      expect(error).toBeNull()
      expect(value).toBeFalsy()
      expect(ctx.log.info).toHaveBeenCalled()
    })
  })

  describe('selection flow with show commands on windows', () => {
    const originalPlatform = process.platform

    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
    })

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    })

    it('should display download URL for unsupported platforms', async () => {
      const ctx = createMockCtx()
      vi.mocked(listSystemFonts).mockResolvedValue([null, []])
      vi.mocked(ctx.prompts.select)
        .mockResolvedValueOnce('JetBrainsMono')
        .mockResolvedValueOnce('commands')

      const [error, value] = await installNerdFont({ ctx })

      expect(error).toBeNull()
      expect(value).toBeFalsy()
      expect(ctx.log.info).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/ryanoasis/nerd-fonts')
      )
    })
  })

  describe('selection flow with show commands on linux', () => {
    const originalPlatform = process.platform

    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    })

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    })

    it('should display linux install commands with fc-cache', async () => {
      const ctx = createMockCtx()
      vi.mocked(listSystemFonts).mockResolvedValue([null, []])
      vi.mocked(ctx.prompts.select)
        .mockResolvedValueOnce('JetBrainsMono')
        .mockResolvedValueOnce('commands')

      const [error, value] = await installNerdFont({ ctx })

      expect(error).toBeNull()
      expect(value).toBeFalsy()
      expect(ctx.log.info).toHaveBeenCalledWith(expect.stringContaining('fc-cache'))
    })
  })

  describe('platform-specific installation (darwin)', () => {
    const originalPlatform = process.platform

    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    })

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    })

    it('should install via brew when brew is available', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(true)

      const [error, value] = await installNerdFont({ ctx, font: 'Hack' })

      expect(error).toBeNull()
      expect(value).toBeTruthy()
      expect(ctx.status.spinner.stop).toHaveBeenCalledWith(
        expect.stringContaining('installed successfully')
      )
    })

    it('should fall back to download when brew is unavailable', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(true)
      vi.mocked(exec).mockImplementation(
        (cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
          const callback = cb ?? _opts
          if (typeof callback === 'function') {
            if (typeof cmd === 'string' && cmd.includes('command -v brew')) {
              callback(new Error('not found'), null, null)
            } else {
              callback(null, { stderr: '', stdout: '' })
            }
          }
          return undefined as never
        }
      )

      const [error, value] = await installNerdFont({ ctx, font: 'Hack' })

      expect(error).toBeNull()
      expect(value).toBeTruthy()
      expect(ctx.status.spinner.message).toHaveBeenCalledWith(
        expect.stringContaining('Downloading Hack Nerd Font')
      )
    })

    it('should return error when brew install fails', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(true)
      vi.mocked(exec).mockImplementation(
        (cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
          const callback = cb ?? _opts
          if (typeof callback === 'function') {
            if (typeof cmd === 'string' && cmd.includes('brew install')) {
              callback(new Error('brew failed'), null, null)
            } else {
              callback(null, { stderr: '', stdout: '' })
            }
          }
          return undefined as never
        }
      )

      const [error] = await installNerdFont({ ctx, font: 'Hack' })

      expect(error).toMatchObject({ type: 'install_failed' })
      expect(error?.message).toContain('Homebrew installation failed')
    })
  })

  describe('platform-specific installation (linux)', () => {
    const originalPlatform = process.platform

    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    })

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    })

    it('should install via download on linux', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(true)

      const [error, value] = await installNerdFont({ ctx, font: 'Hack' })

      expect(error).toBeNull()
      expect(value).toBeTruthy()
      expect(ctx.status.spinner.message).toHaveBeenCalledWith(
        expect.stringContaining('Downloading Hack Nerd Font')
      )
    })

    it('should return error when download fails', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(true)
      vi.mocked(exec).mockImplementation(
        (cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
          const callback = cb ?? _opts
          if (typeof callback === 'function') {
            if (typeof cmd === 'string' && cmd.includes('curl')) {
              callback(new Error('download failed'), null, null)
            } else {
              callback(null, { stderr: '', stdout: '' })
            }
          }
          return undefined as never
        }
      )

      const [error] = await installNerdFont({ ctx, font: 'Hack' })

      expect(error).toMatchObject({ type: 'install_failed' })
      expect(error?.message).toContain('Failed to download')
    })
  })

  describe('unsupported platform', () => {
    const originalPlatform = process.platform

    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
    })

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    })

    it('should return error for unsupported platforms', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(true)

      const [error] = await installNerdFont({ ctx, font: 'Hack' })

      expect(error).toMatchObject({ type: 'install_failed' })
      expect(error?.message).toContain('Unsupported platform')
    })
  })
})
