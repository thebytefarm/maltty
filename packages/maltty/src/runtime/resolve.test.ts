import { describe, expect, it } from 'vitest'

import { command } from '@/command.js'
import type { CommandMap } from '@/types/index.js'

import { isCommand } from './register.js'
import { resolveCommandTree } from './resolve.js'

describe('resolveCommandTree()', () => {
  it('should leave a static tree unchanged', async () => {
    const commands: CommandMap = {
      deploy: command({
        commands: { preview: command({ description: 'Preview' }) },
        description: 'Deploy',
      }),
    }

    const [error, resolved] = await resolveCommandTree(commands)

    expect([error, resolved]).toStrictEqual([null, commands])
  })

  it('should await a promised subcommand map', async () => {
    const commands: CommandMap = {
      deploy: command({
        commands: Promise.resolve({ preview: command({ description: 'Preview' }) }),
        description: 'Deploy',
      }),
    }

    const [, resolved] = await resolveCommandTree(commands)

    expect(Object.keys(resolved?.['deploy'].commands as CommandMap)).toStrictEqual(['preview'])
  })

  it('should await a promised map nested inside a promised map', async () => {
    const commands: CommandMap = {
      deploy: command({
        commands: Promise.resolve({
          env: command({
            commands: Promise.resolve({ list: command({ description: 'List' }) }),
            description: 'Env',
          }),
        }),
        description: 'Deploy',
      }),
    }

    const [, resolved] = await resolveCommandTree(commands)
    const deploy = (resolved as CommandMap)['deploy']
    const env = (deploy.commands as CommandMap)['env']

    expect(Object.keys(env.commands as CommandMap)).toStrictEqual(['list'])
  })

  it('should return an error result when a nested map rejects', async () => {
    const commands: CommandMap = {
      deploy: command({
        commands: Promise.reject(new Error('autoload failed')),
        description: 'Deploy',
      }),
    }

    const [error] = await resolveCommandTree(commands)

    expect(error?.message).toBe('autoload failed')
  })

  it('should keep the Command tag on a rebuilt command', async () => {
    const commands: CommandMap = {
      deploy: command({
        commands: Promise.resolve({ preview: command({ description: 'Preview' }) }),
        description: 'Deploy',
      }),
    }

    const [, resolved] = await resolveCommandTree(commands)

    expect(isCommand(resolved?.['deploy'])).toBeTruthy()
  })
})
