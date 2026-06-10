# .ciderpress

This directory is managed by ciderpress. It contains the
materialized documentation site — synced content, build artifacts, and static assets.

| Directory   | Description                                    |
| ----------- | ---------------------------------------------- |
| `content/`  | Synced markdown pages and generated config     |
| `public/`   | Static assets (logos, icons, banners)           |
| `dist/`     | Build output                                   |
| `cache/`    | Build cache                                    |

## Commands

```bash
ciderpress sync    # Sync docs into content/
ciderpress dev     # Start dev server
ciderpress build   # Build static site
```

> **Do not edit files in `content/`** — they are regenerated on every sync.
> Edit the source markdown in your workspace packages instead.
