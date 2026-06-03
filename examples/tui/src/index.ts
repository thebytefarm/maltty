import { cli } from '@maltty/core'
import { report } from '@maltty/core/report'

cli({
  description: 'TUI demo — handler and screen modes with fullscreen support',
  help: { header: 'tui - fullscreen TUI demo' },
  middleware: [report()],
  name: 'tui',
  version: '1.0.0',
})
