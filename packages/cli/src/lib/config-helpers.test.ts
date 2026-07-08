import { describe, expect, it } from 'vitest'

import { extractConfig } from './config-helpers.js'

describe(extractConfig, () => {
  it('should return the config from a non-null result', () => {
    const result = { config: { entry: './src/main.ts' }, configFile: '/project/maltty.config.ts' }

    const config = extractConfig(result as never)

    expect(config).toStrictEqual({ entry: './src/main.ts' })
  })

  it('should return an empty object when result is null', () => {
    const config = extractConfig(null)

    expect(config).toStrictEqual({})
  })
})
