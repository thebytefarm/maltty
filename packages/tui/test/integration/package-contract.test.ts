import { match } from 'ts-pattern'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import tuiPackageJson from '../../package.json' with { type: 'json' }

const TuiPackageSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  exports: z.record(z.string(), z.record(z.string(), z.string())).optional(),
})

type TuiPackage = z.infer<typeof TuiPackageSchema>
type TuiPackageResult = readonly [z.ZodError, null] | readonly [null, TuiPackage]

const TUI_EXPORTS = [
  '.',
  './alert',
  './autocomplete',
  './confirm',
  './display',
  './error-message',
  './fullscreen',
  './group-multi-select',
  './interaction',
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

const [packageError, tuiPackage] = parseTuiPackage(tuiPackageJson)

describe('@maltty/tui package', () => {
  it('should export every public component and subfeature', () => {
    expect(packageError).toBeNull()
    expect(Object.keys(tuiPackage?.exports ?? {})).toEqual(TUI_EXPORTS)
  })

  it('should have no runtime dependencies beyond its peers', () => {
    expect(packageError).toBeNull()
    expect(tuiPackage?.dependencies).toBeUndefined()
  })
})

/**
 * Validate package metadata without throwing during test-module loading.
 *
 * @private
 * @param value - Package metadata to validate.
 * @returns A Result tuple containing validated metadata or its Zod error.
 */
function parseTuiPackage(value: unknown): TuiPackageResult {
  return match(TuiPackageSchema.safeParse(value))
    .with({ success: true }, ({ data }) => [null, data] as const)
    .with({ success: false }, ({ error }) => [error, null] as const)
    .exhaustive()
}
