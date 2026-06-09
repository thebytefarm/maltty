import { cli } from 'maltty'
import type { DisplayConfig } from 'maltty'
import { config } from 'maltty/config'
import type { ConfigType } from 'maltty/config'
import { http } from 'maltty/http'
import type { HttpClient } from 'maltty/http'
import { z } from 'zod'

import telemetry from './middleware/telemetry.js'
import timing from './middleware/timing.js'

const configSchema = z.object({
  apiUrl: z.string().url(),
  defaultEnvironment: z.string().default('staging'),
  org: z.string().min(1),
})

declare module 'maltty' {
  interface CommandContext {
    readonly api: HttpClient
  }
}

declare module 'maltty/config' {
  interface ConfigRegistry extends ConfigType<typeof configSchema> {}
}

const display: DisplayConfig = {
  guide: false,
  aliases: {
    j: 'down',
    k: 'up',
  },
  messages: {
    cancel: 'Operation cancelled.',
    error: 'Something went wrong!',
  },
  spinner: {
    indicator: 'timer',
    cancelMessage: 'Cancelled',
    errorMessage: 'Failed',
  },
  progress: {
    style: 'heavy',
    size: 30,
  },
  box: {
    rounded: true,
    contentAlign: 'left',
    titleAlign: 'center',
    contentPadding: 1,
    formatBorder: (text: string) => `\x1b[36m${text}\x1b[39m`,
  },
}

cli({
  commands: `${import.meta.dirname}/commands`,
  description: 'Acme platform CLI',
  display,
  help: {
    header: 'acme - the Acme platform CLI',
    order: ['deploy', 'status', 'ping', 'whoami'],
  },
  middleware: [
    config({ schema: configSchema, eager: true }),
    http({
      baseUrl: 'https://api.acme.dev',
      headers: async (ctx) => {
        const result = await ctx.config.load()
        if (!result) {
          return {}
        }
        return {
          'X-Environment': String(result.config.defaultEnvironment),
          'X-Org': String(result.config.org),
        }
      },
      namespace: 'api',
    }),
    timing,
    telemetry,
  ],
  name: 'acme',
  version: '2.0.0',
})
