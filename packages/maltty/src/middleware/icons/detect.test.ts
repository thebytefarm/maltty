import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('./list-system-fonts.js'), () => ({
  listSystemFonts: vi.fn(async () => [null, []]),
}))

import { detectNerdFonts } from './detect.js'
import { listSystemFonts } from './list-system-fonts.js'

describe('detectNerdFonts()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should detect when a Nerd Font is installed', async () => {
    vi.mocked(listSystemFonts).mockResolvedValue([
      null,
      ['Arial', 'JetBrainsMono Nerd Font', 'Helvetica'],
    ])

    const result = await detectNerdFonts()

    expect(result).toBeTruthy()
  })

  it('should return false when no Nerd Fonts are installed', async () => {
    vi.mocked(listSystemFonts).mockResolvedValue([null, ['Arial', 'Helvetica', 'Courier New']])

    const result = await detectNerdFonts()

    expect(result).toBeFalsy()
  })

  it('should match case-insensitively', async () => {
    vi.mocked(listSystemFonts).mockResolvedValue([null, ['FiraCode NERD Font Mono']])

    const result = await detectNerdFonts()

    expect(result).toBeTruthy()
  })

  it('should return false when no fonts are available', async () => {
    vi.mocked(listSystemFonts).mockResolvedValue([null, []])

    const result = await detectNerdFonts()

    expect(result).toBeFalsy()
  })

  it('should return false when font listing fails', async () => {
    vi.mocked(listSystemFonts).mockResolvedValue([new Error('command failed'), null])

    const result = await detectNerdFonts()

    expect(result).toBeFalsy()
  })
})
