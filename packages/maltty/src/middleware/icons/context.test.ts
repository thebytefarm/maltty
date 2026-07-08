import { describe, expect, it, vi } from 'vitest'

vi.mock(import('./install.js'), () => ({
  installNerdFont: vi.fn(async () => [null, false] as const),
}))

import { createIconsContext } from './context.js'
import type { IconsCtx } from './context.js'
import { createDefaultIcons } from './definitions.js'
import { installNerdFont } from './install.js'

function createMockCtx(): IconsCtx {
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
    status: { spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() } },
  }
}

describe(createIconsContext, () => {
  it('should return a frozen object', () => {
    const ctx = createMockCtx()
    const icons = createDefaultIcons()
    const result = createIconsContext({ ctx, icons, isInstalled: false })
    expect(Object.isFrozen(result)).toBeTruthy()
  })

  describe('get()', () => {
    it('should return emoji when not installed', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, icons, isInstalled: false })
      expect(result.get('success')).toBe('\u{2705}')
    })

    it('should return nerd font glyph when installed', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, icons, isInstalled: true })
      expect(result.get('success')).toBe('\uF05D')
    })

    it('should return empty string for unknown icon names', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, icons, isInstalled: false })
      expect(result.get('nonexistent')).toBe('')
    })
  })

  describe('has()', () => {
    it('should return true for known icons', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, icons, isInstalled: false })
      expect(result.has('branch')).toBeTruthy()
    })

    it('should return false for unknown icons', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, icons, isInstalled: false })
      expect(result.has('nonexistent')).toBeFalsy()
    })
  })

  describe('installed()', () => {
    it('should return true when nerd fonts are installed', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, icons, isInstalled: true })
      expect(result.installed()).toBeTruthy()
    })

    it('should return false when nerd fonts are not installed', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, icons, isInstalled: false })
      expect(result.installed()).toBeFalsy()
    })

    it('should return false when forceSetup is true regardless of install state', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, forceSetup: true, icons, isInstalled: true })
      expect(result.installed()).toBeFalsy()
    })
  })

  describe('category()', () => {
    it('should return resolved icons for a category', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, icons, isInstalled: false })
      const statusIcons = result.category('status')
      expect(statusIcons).toHaveProperty('success')
      expect(statusIcons).toHaveProperty('error')
    })

    it('should return emoji variants when not installed', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, icons, isInstalled: false })
      const statusIcons = result.category('status')
      expect(statusIcons['success']).toBe('\u{2705}')
    })

    it('should return nerd font variants when installed', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, icons, isInstalled: true })
      const statusIcons = result.category('status')
      expect(statusIcons['success']).toBe('\uF05D')
    })

    it('should return a frozen record', () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const result = createIconsContext({ ctx, icons, isInstalled: false })
      const statusIcons = result.category('status')
      expect(Object.isFrozen(statusIcons)).toBeTruthy()
    })
  })

  describe('setup()', () => {
    it('should call installNerdFont', async () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      vi.mocked(installNerdFont).mockResolvedValue([null, true] as const)
      const result = createIconsContext({ ctx, icons, isInstalled: false })

      await result.setup()

      expect(installNerdFont).toHaveBeenCalledOnce()
    })

    it('should update installed status on successful setup', async () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      vi.mocked(installNerdFont).mockResolvedValue([null, true] as const)
      const result = createIconsContext({ ctx, icons, isInstalled: false })

      expect(result.installed()).toBeFalsy()
      await result.setup()
      expect(result.installed()).toBeTruthy()
    })

    it('should propagate errors from installNerdFont', async () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const mockError = { message: 'test error', type: 'install_failed' as const }
      vi.mocked(installNerdFont).mockResolvedValue([mockError, null] as const)
      const result = createIconsContext({ ctx, icons, isInstalled: false })

      const [error] = await result.setup()

      expect(error).toMatchObject({ type: 'install_failed' })
    })

    it('should not update installed status on error', async () => {
      const ctx = createMockCtx()
      const icons = createDefaultIcons()
      const mockError = { message: 'test error', type: 'install_failed' as const }
      vi.mocked(installNerdFont).mockResolvedValue([mockError, null] as const)
      const result = createIconsContext({ ctx, icons, isInstalled: false })

      await result.setup()

      expect(result.installed()).toBeFalsy()
    })
  })
})
