import { cli } from 'maltty'

import { readCLIManifest } from './manifest.js'

const [manifestError, manifest] = await readCLIManifest(import.meta.dirname)
if (manifestError) {
  console.error(manifestError.message)
  process.exit(1)
}

await cli({
  commands: `${import.meta.dirname}/commands`,
  description: manifest.description,
  help: { header: `maltty v${manifest.version}` },
  name: 'maltty',
  version: manifest.version,
})
