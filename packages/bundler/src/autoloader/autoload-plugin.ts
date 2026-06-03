import type { Rolldown } from 'tsdown'

import { generateStaticAutoloader } from './generate-autoloader.js'
import { scanCommandsDir } from './scan-commands.js'

const VIRTUAL_MODULE_ID = 'virtual:maltty-static-commands'
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_ID}`

const AUTOLOADER_REGION_START = '//#region src/autoload.ts'
const AUTOLOADER_REGION_END = '//#endregion'

/**
 * Parameters for creating the autoload plugin.
 */
interface CreateAutoloadPluginParams {
  readonly commandsDir: string
  readonly tagModulePath: string
}

/**
 * Create a rolldown plugin that replaces the runtime autoloader with a static version.
 *
 * Uses a three-hook approach to break the circular dependency between maltty's
 * dist and user command files (which `import { command } from '@maltty/core'`):
 *
 * 1. `transform` — detects maltty's pre-bundled dist and replaces the autoloader
 *    region with a dynamic `import()` to a virtual module
 * 2. `resolveId` — resolves the virtual module identifier
 * 3. `load` — scans the commands directory and generates a static autoloader
 *    module with all command imports pre-resolved
 *
 * The dynamic import ensures command files execute after maltty's code is fully
 * initialized, avoiding `ReferenceError` from accessing `TAG` before its
 * declaration.
 *
 * @param params - The commands directory and tag module path.
 * @returns A rolldown plugin for static autoloading.
 */
export function createAutoloadPlugin(params: CreateAutoloadPluginParams): Rolldown.Plugin {
  return {
    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) {
        return null
      }

      const scan = await scanCommandsDir(params.commandsDir)

      return generateStaticAutoloader({
        scan,
        tagModulePath: params.tagModulePath,
      })
    },
    name: 'maltty-static-autoloader',
    resolveId(source) {
      if (source === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_ID
      }

      return null
    },
    transform(code, _id) {
      const regionStart = code.indexOf(AUTOLOADER_REGION_START)
      if (regionStart === -1) {
        return null
      }

      const regionEnd = code.indexOf(AUTOLOADER_REGION_END, regionStart)
      if (regionEnd === -1) {
        return null
      }

      const before = code.slice(0, regionStart)
      const after = code.slice(regionEnd + AUTOLOADER_REGION_END.length)
      const staticRegion = buildStaticRegion()

      return `${before}${staticRegion}${after}`
    },
  }
}

/**
 * Build the replacement autoloader region that delegates to the virtual module.
 *
 * @private
 * @returns The replacement region string with dynamic import.
 */
function buildStaticRegion(): string {
  return [
    '//#region src/autoload.ts (static)',
    'async function autoload() {',
    `  const mod = await import('${VIRTUAL_MODULE_ID}')`,
    '  return mod.autoload()',
    '}',
    '//#endregion',
  ].join('\n')
}
