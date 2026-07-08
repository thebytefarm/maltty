import { cli } from 'maltty'
import { icons } from 'maltty/icons'

cli({
  description: 'Icons middleware demo CLI',
  help: { header: 'icon-demo - explore Nerd Font and emoji icons' },
  middleware: [icons({ forceSetup: true })],
  name: 'icon-demo',
  version: '1.0.0',
})
