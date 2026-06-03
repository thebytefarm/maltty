import { execFile } from 'node:child_process'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const CLI_BIN = join(import.meta.dirname, '..', 'bin', 'maltty.js')

const EXPECTED_COMMANDS = ['add', 'build', 'commands', 'dev', 'doctor', 'init', 'run', 'stories']

/**
 * Run the CLI binary with the given args and return stdout.
 *
 * @param args - CLI arguments.
 * @returns A promise resolving to the stdout string.
 */
function runCli(args: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('node', [CLI_BIN, ...args], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`CLI exited with code ${String(error.code)}: ${stderr}`))
        return
      }
      resolve(stdout)
    })
  })
}

describe('maltty CLI integration', () => {
  it('should display all commands in --help output', async () => {
    const output = await runCli(['--help'])

    EXPECTED_COMMANDS.map((cmd) =>
      expect(output, `missing command: ${cmd}`).toContain(`maltty ${cmd}`)
    )
  })
})
