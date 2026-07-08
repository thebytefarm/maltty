import type { CliOptions } from '../types/index.js'

/**
 * Override process.argv for CLI testing.
 */
export function setArgv(...args: readonly string[]): void {
  process.argv = ['node', 'test', ...args]
}

/**
 * Run the CLI and wait for async completion.
 */
export async function runTestCli(options: CliOptions): Promise<void> {
  const { cli } = await import('../cli.js')
  await cli(options)
}
