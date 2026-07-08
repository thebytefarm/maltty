import { cli } from 'maltty'
import { report } from 'maltty/report'

cli({
  commands: `${import.meta.dirname}/commands`,
  description: 'Diagnostic output demo CLI',
  help: { order: ['lint', 'test', 'check'] },
  middleware: [report()],
  name: 'dx',
  version: '1.0.0',
})
