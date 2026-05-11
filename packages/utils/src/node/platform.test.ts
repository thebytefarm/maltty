import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockReadFileSync = vi.hoisted(() => vi.fn())

vi.mock(import('node:fs'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    readFileSync: mockReadFileSync,
  }
})

const {
  ARCH_MAP,
  PLATFORM_MAP,
  binExt,
  binName,
  getPlatformDir,
  getPlatformTriple,
  isLinux,
  isMacOS,
  isWindows,
} = await import('./platform.js')

interface ProcessMock {
  readonly platform: string
  readonly arch: string
}

function setProcess(values: ProcessMock): void {
  Object.defineProperty(process, 'platform', { configurable: true, value: values.platform })
  Object.defineProperty(process, 'arch', { configurable: true, value: values.arch })
}

const originalPlatform = process.platform
const originalArch = process.arch

afterEach(() => {
  Object.defineProperty(process, 'platform', { configurable: true, value: originalPlatform })
  Object.defineProperty(process, 'arch', { configurable: true, value: originalArch })
  vi.clearAllMocks()
})

describe('PLATFORM_MAP', () => {
  it('should map win32 to windows', () => {
    expect(PLATFORM_MAP.win32).toBe('windows')
  })

  it('should map cygwin to windows', () => {
    expect(PLATFORM_MAP.cygwin).toBe('windows')
  })

  it('should map darwin to darwin', () => {
    expect(PLATFORM_MAP.darwin).toBe('darwin')
  })

  it('should map linux to linux', () => {
    expect(PLATFORM_MAP.linux).toBe('linux')
  })
})

describe('ARCH_MAP', () => {
  it('should map x64 to x64', () => {
    expect(ARCH_MAP.x64).toBe('x64')
  })

  it('should map arm64 to arm64', () => {
    expect(ARCH_MAP.arm64).toBe('arm64')
  })
})

describe('platform triple', () => {
  beforeEach(() => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
  })

  it('should return darwin-arm64 on Apple Silicon macOS', () => {
    setProcess({ arch: 'arm64', platform: 'darwin' })
    expect(getPlatformTriple()).toBe('darwin-arm64')
  })

  it('should return darwin-x64 on Intel macOS', () => {
    setProcess({ arch: 'x64', platform: 'darwin' })
    expect(getPlatformTriple()).toBe('darwin-x64')
  })

  it('should return linux-arm64 on ARM Linux', () => {
    setProcess({ arch: 'arm64', platform: 'linux' })
    expect(getPlatformTriple()).toBe('linux-arm64')
  })

  it('should return linux-x64 on glibc Linux when /etc/os-release is unreadable', () => {
    setProcess({ arch: 'x64', platform: 'linux' })
    expect(getPlatformTriple()).toBe('linux-x64')
  })

  it('should return linux-x64 on glibc Linux when /etc/os-release lacks ID=alpine', () => {
    mockReadFileSync.mockReturnValueOnce('ID=ubuntu\nVERSION_ID="22.04"\n')
    setProcess({ arch: 'x64', platform: 'linux' })
    expect(getPlatformTriple()).toBe('linux-x64')
  })

  it('should return linux-x64-musl on Alpine Linux', () => {
    mockReadFileSync.mockReturnValueOnce('NAME="Alpine Linux"\nID=alpine\nVERSION_ID=3.19\n')
    setProcess({ arch: 'x64', platform: 'linux' })
    expect(getPlatformTriple()).toBe('linux-x64-musl')
  })

  it('should return windows-arm64 on ARM Windows', () => {
    setProcess({ arch: 'arm64', platform: 'win32' })
    expect(getPlatformTriple()).toBe('windows-arm64')
  })

  it('should return windows-x64 on Intel Windows', () => {
    setProcess({ arch: 'x64', platform: 'win32' })
    expect(getPlatformTriple()).toBe('windows-x64')
  })

  it('should treat cygwin as windows', () => {
    setProcess({ arch: 'x64', platform: 'cygwin' })
    expect(getPlatformTriple()).toBe('windows-x64')
  })

  it('should fall back to linux-x64 on unknown platforms', () => {
    setProcess({ arch: 'mips', platform: 'aix' })
    expect(getPlatformTriple()).toBe('linux-x64')
  })
})

describe('platform directory', () => {
  beforeEach(() => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
  })

  it('should join the platforms directory using path.join (POSIX)', () => {
    setProcess({ arch: 'arm64', platform: 'darwin' })
    expect(getPlatformDir('/usr/local/bin/my-cli')).toBe('/usr/local/bin/platforms/darwin-arm64')
  })

  it('should resolve relative to the binary parent directory', () => {
    setProcess({ arch: 'x64', platform: 'linux' })
    expect(getPlatformDir('/opt/tool/bin/run')).toBe('/opt/tool/bin/platforms/linux-x64')
  })
})

describe('binary name suffix', () => {
  it('should leave the name unchanged on POSIX', () => {
    setProcess({ arch: 'arm64', platform: 'darwin' })
    expect(binName('rg')).toBe('rg')
  })

  it('should append .exe on Windows', () => {
    setProcess({ arch: 'x64', platform: 'win32' })
    expect(binName('rg')).toBe('rg.exe')
  })

  it('should append .exe on cygwin', () => {
    setProcess({ arch: 'x64', platform: 'cygwin' })
    expect(binName('rg')).toBe('rg.exe')
  })
})

describe('binary extension', () => {
  it('should return empty string on POSIX', () => {
    setProcess({ arch: 'x64', platform: 'linux' })
    expect(binExt()).toBe('')
  })

  it('should return .exe on Windows', () => {
    setProcess({ arch: 'x64', platform: 'win32' })
    expect(binExt()).toBe('.exe')
  })
})

describe('platform predicates', () => {
  it('should report Windows correctly', () => {
    setProcess({ arch: 'x64', platform: 'win32' })
    expect(isWindows()).toBeTruthy()
    expect(isMacOS()).toBeFalsy()
    expect(isLinux()).toBeFalsy()
  })

  it('should report macOS correctly', () => {
    setProcess({ arch: 'arm64', platform: 'darwin' })
    expect(isMacOS()).toBeTruthy()
    expect(isWindows()).toBeFalsy()
    expect(isLinux()).toBeFalsy()
  })

  it('should report Linux correctly', () => {
    setProcess({ arch: 'x64', platform: 'linux' })
    expect(isLinux()).toBeTruthy()
    expect(isWindows()).toBeFalsy()
    expect(isMacOS()).toBeFalsy()
  })

  it('should treat cygwin as Windows', () => {
    setProcess({ arch: 'x64', platform: 'cygwin' })
    expect(isWindows()).toBeTruthy()
  })
})
