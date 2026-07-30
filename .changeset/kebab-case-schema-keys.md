---
'maltty': patch
---

Fix kebab-case Zod schema keys silently resolving to `undefined`. Previously the args parser stripped every argv key containing `-`, so an option defined as `'dry-run'` in a schema was dropped and `ctx.args['dry-run']` always fell back to its `.default()`. The parser now preserves both the kebab-case and camelCase variants yargs emits, so `ctx.args['dry-run']` and `ctx.args.dryRun` both resolve to the parsed value.
