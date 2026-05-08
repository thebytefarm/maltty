import { execFile, spawn as nodeSpawn } from 'node:child_process'

import { match } from 'ts-pattern'

import type { ResultAsync } from '../fp/result.js'
import { err, ok } from '../fp/result.js'

/*
 * On Windows, npm/pnpm-installed CLIs (e.g. tsx) ship as `.cmd` shim files
 * that Node's child_process can't launch via CreateProcess — only cmd.exe
 * can. shell: true routes through cmd.exe so the shim runs. On POSIX it's
 * unnecessary and changes argument escaping, so it's gated to Windows.
 */
const NEEDS_SHELL = process.platform === 'win32'

/**
 * Output from a successful command execution.
 */
export interface ExecOutput {
  readonly stdout: string
  readonly stderr: string
}

/**
 * Execute a command with arguments and return the result.
 *
 * Wraps `child_process.execFile` into an async Result tuple. On failure,
 * the error includes stderr as a property for diagnostic access.
 *
 * @param params - The command and arguments to execute.
 * @returns A result tuple with stdout/stderr on success or an Error on failure.
 */
export function exec(params: {
  readonly cmd: string
  readonly args?: readonly string[]
  readonly cwd?: string
}): ResultAsync<ExecOutput> {
  const { cmd, args = [], cwd } = params
  return new Promise((resolve) => {
    execFile(cmd, [...args], { cwd, shell: NEEDS_SHELL }, (error, stdout, stderr) => {
      if (error) {
        const enriched = new Error(`${cmd} failed: ${error.message}`, { cause: error })
        Object.defineProperty(enriched, 'stderr', { enumerable: true, value: stderr })
        resolve(err(enriched))
        return
      }

      resolve(ok({ stdout, stderr }))
    })
  })
}

/**
 * Spawn an interactive process with inherited stdio.
 *
 * Returns the exit code of the child process. Stdio is inherited so the
 * child process shares the parent's terminal.
 *
 * @param cmd - The command to spawn.
 * @param args - Arguments to pass to the command.
 * @param cwd - Working directory for the child process.
 * @returns The exit code of the spawned process.
 */
export function spawn(params: {
  readonly cmd: string
  readonly args: readonly string[]
  readonly cwd: string
}): Promise<number> {
  return new Promise((resolve) => {
    const child = nodeSpawn(params.cmd, [...params.args], {
      cwd: params.cwd,
      shell: NEEDS_SHELL,
      stdio: 'inherit',
    })

    child.on('error', () => {
      resolve(1)
    })

    child.on('close', (code) => {
      resolve(code ?? 1)
    })
  })
}

/**
 * Check whether a binary is available on the system PATH.
 *
 * Uses `which` (unix) or `where` (windows) to resolve the binary
 * without executing it.
 *
 * @param cmd - The command name to check.
 * @returns `true` when the command is found on PATH.
 */
export function exists(cmd: string): Promise<boolean> {
  const lookup = match(process.platform)
    .with('win32', () => 'where')
    .otherwise(() => 'which')

  return new Promise((resolve) => {
    execFile(lookup, [cmd], (error) => {
      resolve(error === null)
    })
  })
}
