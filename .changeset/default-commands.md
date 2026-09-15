---
'maltty': minor
'@maltty/cli': minor
---

Add default commands — a command can now run when no subcommand is given, so `mygrep --filter x` works alongside `mygrep search --filter x`.

- `command({ default: true })` registers the command as the CLI's default. Both invocation forms stay available and `ctx.meta.command` reports the command's own name, not the `$0` sigil.
- An `index` file at the root of the commands directory is now autoloaded as the default command. Previously it was silently discarded. Mirrors how an `index` file inside a subdirectory becomes that group's parent command.
- Works inside subcommand groups too — a default subcommand makes the bare group invocation dispatch to it instead of erroring with "You must specify a subcommand."
- Declaring two default commands at the same level is now a startup error rather than a silent dispatch surprise.
- Exports `DEFAULT_COMMAND_NAME` (the `$0` sigil) for use as an explicit `name`.
- `maltty commands` annotates the default command in its tree output.
