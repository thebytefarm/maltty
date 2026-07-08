import { stories } from 'maltty/stories'
import { z } from 'zod'

import type { SelectMenuProps } from './SelectMenu'
import { SelectMenu } from './SelectMenu'

const schema = z.object({
  label: z.string().describe('Heading displayed above the menu'),
  options: z.array(z.string()).describe('Selectable items'),
  accentColor: z.string().describe('Ink color for highlights and selection'),
})

export default stories<SelectMenuProps>({
  title: 'SelectMenu',
  component: SelectMenu,
  schema,
  defaults: {
    accentColor: 'cyan',
  },
  stories: {
    Environments: {
      description: 'Choose a deployment environment',
      props: {
        label: 'Deploy to:',
        options: ['development', 'staging', 'production'],
      },
    },
    Regions: {
      description: 'Pick an AWS region',
      props: {
        label: 'Region:',
        options: ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-1'],
        accentColor: 'yellow',
      },
    },
    LogLevels: {
      description: 'Set the log verbosity',
      props: {
        label: 'Log level:',
        options: ['trace', 'debug', 'info', 'warn', 'error'],
        accentColor: 'green',
      },
    },
  },
})
