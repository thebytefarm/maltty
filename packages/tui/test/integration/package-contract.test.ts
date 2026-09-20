import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

interface TuiPackageJson {
  readonly dependencies?: Record<string, string>
  readonly exports?: Record<string, Record<string, string>>
}

const PACKAGE_PATH = fileURLToPath(new URL('../../package.json', import.meta.url))
const tuiPackage = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8')) as TuiPackageJson

const TUI_EXPORTS = [
  '.',
  './alert',
  './autocomplete',
  './confirm',
  './display',
  './error-message',
  './fullscreen',
  './group-multi-select',
  './keys',
  './layout',
  './multi-select',
  './password-input',
  './path-input',
  './progress-bar',
  './prompts',
  './scroll-area',
  './select',
  './select-key',
  './spinner',
  './status-message',
  './tabs',
  './text-input',
  './theme',
  './use-hotkey',
  './use-size',
] as const

describe('@maltty/tui package', () => {
  it('should export every public component and subfeature', () => {
    expect(Object.keys(tuiPackage.exports ?? {})).toEqual(TUI_EXPORTS)
  })

  it('should have no runtime dependencies beyond its peers', () => {
    expect(tuiPackage.dependencies).toBeUndefined()
  })
})
