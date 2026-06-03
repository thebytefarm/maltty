import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('./generate-autoloader.js'))
vi.mock(import('./scan-commands.js'))

const { generateStaticAutoloader } = await import('./generate-autoloader.js')
const { scanCommandsDir } = await import('./scan-commands.js')
const { createAutoloadPlugin } = await import('./autoload-plugin.js')

const mockGenerateStaticAutoloader = vi.mocked(generateStaticAutoloader)
const mockScanCommandsDir = vi.mocked(scanCommandsDir)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createAutoloadPlugin', () => {
  describe('transform hook', () => {
    it('should return null for non-maltty dist files', () => {
      const plugin = createAutoloadPlugin({
        commandsDir: '/project/commands',
        tagModulePath: '/project/tag.js',
      })

      const result = plugin.transform('some code', '/other/package/dist/index.js')

      expect(result).toBeNull()
    })

    it('should return null when no region start marker found', () => {
      const plugin = createAutoloadPlugin({
        commandsDir: '/project/commands',
        tagModulePath: '/project/tag.js',
      })

      const code = 'const x = 1\n//#endregion\n'
      const result = plugin.transform(code, '/node_modules/maltty/dist/index.js')

      expect(result).toBeNull()
    })

    it('should return null when no region end marker found', () => {
      const plugin = createAutoloadPlugin({
        commandsDir: '/project/commands',
        tagModulePath: '/project/tag.js',
      })

      const code = 'const x = 1\n//#region src/autoload.ts\nsome content'
      const result = plugin.transform(code, '/node_modules/maltty/dist/index.js')

      expect(result).toBeNull()
    })

    it('should replace region with static import when markers found in maltty dist', () => {
      const plugin = createAutoloadPlugin({
        commandsDir: '/project/commands',
        tagModulePath: '/project/tag.js',
      })

      const code = [
        'const before = 1',
        '//#region src/autoload.ts',
        'async function autoload() { return {} }',
        '//#endregion',
        'const after = 2',
      ].join('\n')

      const result = plugin.transform(code, '/node_modules/maltty/dist/index.js')

      expect(result).toContain('const before = 1')
      expect(result).toContain('const after = 2')
      expect(result).toContain('//#region src/autoload.ts (static)')
      expect(result).toContain("await import('virtual:maltty-static-commands')")
      expect(result).toContain('return mod.autoload()')
      expect(result).not.toContain('async function autoload() { return {} }')
    })
  })

  describe('resolveId hook', () => {
    it('should resolve virtual module ID to prefixed ID', () => {
      const plugin = createAutoloadPlugin({
        commandsDir: '/project/commands',
        tagModulePath: '/project/tag.js',
      })

      const result = plugin.resolveId('virtual:maltty-static-commands')

      expect(result).toBe('\0virtual:maltty-static-commands')
    })

    it('should return null for non-virtual module IDs', () => {
      const plugin = createAutoloadPlugin({
        commandsDir: '/project/commands',
        tagModulePath: '/project/tag.js',
      })

      const result = plugin.resolveId('./some-module.js')

      expect(result).toBeNull()
    })
  })

  describe('load hook', () => {
    it('should return null for non-virtual module IDs', async () => {
      const plugin = createAutoloadPlugin({
        commandsDir: '/project/commands',
        tagModulePath: '/project/tag.js',
      })

      const result = await plugin.load('./some-module.js')

      expect(result).toBeNull()
    })

    it('should call scanCommandsDir and generateStaticAutoloader for virtual module', async () => {
      const scanResult = { dirs: [], files: [] }
      mockScanCommandsDir.mockResolvedValueOnce(scanResult)
      mockGenerateStaticAutoloader.mockReturnValueOnce('generated code')

      const plugin = createAutoloadPlugin({
        commandsDir: '/project/commands',
        tagModulePath: '/project/tag.js',
      })

      const result = await plugin.load('\0virtual:maltty-static-commands')

      expect(result).toBe('generated code')
      expect(mockScanCommandsDir).toHaveBeenCalledOnce()
      expect(mockGenerateStaticAutoloader).toHaveBeenCalledOnce()
    })

    it('should pass commandsDir and tagModulePath to generators', async () => {
      const scanResult = { dirs: [], files: [] }
      mockScanCommandsDir.mockResolvedValueOnce(scanResult)
      mockGenerateStaticAutoloader.mockReturnValueOnce('generated code')

      const plugin = createAutoloadPlugin({
        commandsDir: '/project/commands',
        tagModulePath: '/project/tag.js',
      })

      await plugin.load('\0virtual:maltty-static-commands')

      expect(mockScanCommandsDir).toHaveBeenCalledWith('/project/commands')
      expect(mockGenerateStaticAutoloader).toHaveBeenCalledWith({
        scan: scanResult,
        tagModulePath: '/project/tag.js',
      })
    })
  })
})
