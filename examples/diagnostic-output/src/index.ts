import { cli } from '@maltty/core'
import { report } from '@maltty/core/report'

cli({
  commands: `${import.meta.dirname}/commands`,
  description: 'Diagnostic output demo CLI',
  help: { order: ['lint', 'test', 'check'] },
  middleware: [report()],
  name: 'dx',
  version: '1.0.0',
})
