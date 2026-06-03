import { cli } from '@maltty/core'
import { auth, createAuthHeaders } from '@maltty/core/auth'
import type { HttpClient } from '@maltty/core/http'
import { http } from '@maltty/core/http'

declare module '@maltty/core' {
  interface CommandContext {
    readonly api: HttpClient
  }
}

cli({
  commands: `${import.meta.dirname}/commands`,
  description: 'Demo CLI for the faux authenticated service',
  help: {
    header: 'demo - authenticated service CLI',
    order: ['login', 'logout', 'me', 'repos', 'create-repo'],
  },
  middleware: [
    auth({
      strategies: [
        auth.oauth({
          authUrl: 'http://localhost:3001/authorize',
          clientId: 'demo-client',
          port: 0,
          timeout: 60_000,
          tokenUrl: 'http://localhost:3001/token',
        }),
        auth.token({ message: 'Enter your API token (see README for valid tokens):' }),
      ],
    }),
    http({
      baseUrl: 'http://localhost:3001',
      headers: createAuthHeaders(),
      namespace: 'api',
    }),
  ],
  name: 'demo',
  version: '1.0.0',
})
