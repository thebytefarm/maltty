/**
 * The yargs sigil that marks a command as the default command.
 *
 * A command registered under this name (or carrying it as an alias) runs when
 * the CLI is invoked without a matching subcommand — `mygrep --filter x`
 * instead of `mygrep search --filter x`.
 */
export const DEFAULT_COMMAND_NAME = '$0'
