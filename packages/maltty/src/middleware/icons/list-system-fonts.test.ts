import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:fs/promises'), () => ({
  lstat: vi.fn(),
  readdir: vi.fn(),
}))

import type { Stats } from 'node:fs'
import { lstat, readdir } from 'node:fs/promises'

import { listSystemFonts } from './list-system-fonts.js'

// ---------------------------------------------------------------------------

function fileStats(): Stats {
  return { isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false } as Stats
}

function dirStats(): Stats {
  return { isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false } as Stats
}

function symlinkStats(): Stats {
  return { isDirectory: () => false, isFile: () => false, isSymbolicLink: () => true } as Stats
}

// ---------------------------------------------------------------------------

describe('listSystemFonts()', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  describe('darwin', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    })

    it('should scan macOS font directories and return font file paths', async () => {
      vi.mocked(readdir).mockImplementation((dir) => {
        if (String(dir) === '/Library/Fonts') {
          return Promise.resolve(['Arial.ttf', 'JetBrainsMonoNerdFont-Regular.ttf'] as never)
        }
        return Promise.reject(new Error('ENOENT'))
      })

      vi.mocked(lstat).mockImplementation((filePath) => {
        const path = String(filePath)
        if (path.endsWith('.ttf')) {
          return Promise.resolve(fileStats()) as never
        }
        return Promise.reject(new Error('ENOENT'))
      })

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toContain('/Library/Fonts/Arial.ttf')
      expect(fonts).toContain('/Library/Fonts/JetBrainsMonoNerdFont-Regular.ttf')
    })

    it('should recurse into subdirectories', async () => {
      vi.mocked(readdir).mockImplementation((dir) => {
        if (String(dir) === '/Library/Fonts') {
          return Promise.resolve(['Supplemental'] as never)
        }
        if (String(dir) === '/Library/Fonts/Supplemental') {
          return Promise.resolve(['Courier.ttf'] as never)
        }
        return Promise.reject(new Error('ENOENT'))
      })

      vi.mocked(lstat).mockImplementation((filePath) => {
        const path = String(filePath)
        if (path === '/Library/Fonts/Supplemental') {
          return Promise.resolve(dirStats()) as never
        }
        if (path.endsWith('.ttf')) {
          return Promise.resolve(fileStats()) as never
        }
        return Promise.reject(new Error('ENOENT'))
      })

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toContain('/Library/Fonts/Supplemental/Courier.ttf')
    })

    it('should filter out non-font files', async () => {
      vi.mocked(readdir).mockImplementation((dir) => {
        if (String(dir) === '/Library/Fonts') {
          return Promise.resolve(['Arial.ttf', 'README.txt', 'config.json'] as never)
        }
        return Promise.reject(new Error('ENOENT'))
      })

      vi.mocked(lstat).mockResolvedValue(fileStats() as never)

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toContain('/Library/Fonts/Arial.ttf')
      expect(fonts).not.toContain('/Library/Fonts/README.txt')
      expect(fonts).not.toContain('/Library/Fonts/config.json')
    })

    it('should skip symlinks to prevent cyclic traversal', async () => {
      vi.mocked(readdir).mockImplementation((dir) => {
        if (String(dir) === '/Library/Fonts') {
          return Promise.resolve(['Arial.ttf', 'cyclic-link'] as never)
        }
        return Promise.reject(new Error('ENOENT'))
      })

      vi.mocked(lstat).mockImplementation((filePath) => {
        const path = String(filePath)
        if (path.endsWith('cyclic-link')) {
          return Promise.resolve(symlinkStats()) as never
        }
        return Promise.resolve(fileStats()) as never
      })

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toContain('/Library/Fonts/Arial.ttf')
      expect(fonts).toHaveLength(1)
    })
  })

  describe('linux', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    })

    it('should scan linux font directories', async () => {
      vi.mocked(readdir).mockImplementation((dir) => {
        if (String(dir) === '/usr/share/fonts') {
          return Promise.resolve(['DejaVuSans.ttf'] as never)
        }
        return Promise.reject(new Error('ENOENT'))
      })

      vi.mocked(lstat).mockResolvedValue(fileStats() as never)

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toContain('/usr/share/fonts/DejaVuSans.ttf')
    })
  })

  describe('unsupported platform', () => {
    it('should return success with empty array for unknown platforms', async () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd', configurable: true })

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toEqual([])
    })
  })

  describe('error handling', () => {
    it('should skip directories that do not exist', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })

      vi.mocked(readdir).mockRejectedValue(new Error('ENOENT'))

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toEqual([])
    })

    it('should gracefully handle lstat Error via safeLstat and return empty results', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })

      vi.mocked(readdir).mockImplementation((dir) => {
        if (String(dir) === '/Library/Fonts') {
          return Promise.resolve(['font.ttf'] as never)
        }
        return Promise.reject(new Error('ENOENT'))
      })

      vi.mocked(lstat).mockRejectedValue(new Error('Unexpected EPERM'))

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toEqual([])
    })

    it('should gracefully handle lstat non-Error rejection via safeLstat and return empty results', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })

      vi.mocked(readdir).mockImplementation((dir) => {
        if (String(dir) === '/Library/Fonts') {
          return Promise.resolve(['font.ttf'] as never)
        }
        return Promise.reject(new Error('ENOENT'))
      })

      vi.mocked(lstat).mockRejectedValue('string error')

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toEqual([])
    })
  })

  describe('win32', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
    })

    it('should scan windows font directories', async () => {
      vi.mocked(readdir).mockImplementation((dir) => {
        if (String(dir).includes('Fonts')) {
          return Promise.resolve(['Arial.ttf'] as never)
        }
        return Promise.reject(new Error('ENOENT'))
      })

      vi.mocked(lstat).mockResolvedValue(fileStats() as never)

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts?.some((f) => f.endsWith('Arial.ttf'))).toBeTruthy()
    })
  })

  describe('file extension filtering', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    })

    it('should include otf, ttc, woff, and woff2 extensions', async () => {
      vi.mocked(readdir).mockImplementation((dir) => {
        if (String(dir) === '/Library/Fonts') {
          return Promise.resolve(['a.otf', 'b.ttc', 'c.woff', 'd.woff2'] as never)
        }
        return Promise.reject(new Error('ENOENT'))
      })

      vi.mocked(lstat).mockResolvedValue(fileStats() as never)

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toHaveLength(4)
    })

    it('should exclude files without an extension', async () => {
      vi.mocked(readdir).mockImplementation((dir) => {
        if (String(dir) === '/Library/Fonts') {
          return Promise.resolve(['LICENSE', 'font.ttf'] as never)
        }
        return Promise.reject(new Error('ENOENT'))
      })

      vi.mocked(lstat).mockResolvedValue(fileStats() as never)

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toEqual(['/Library/Fonts/font.ttf'])
    })
  })
})
