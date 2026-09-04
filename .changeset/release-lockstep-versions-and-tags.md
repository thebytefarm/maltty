---
'maltty': patch
---

Release all packages as one lockstep group on a single dist-tag.

`maltty` has a non-prerelease `0.0.0` on the registry, so changesets resolved
its release tag to `preState.tag` (`rc`) while the prerelease-only `@maltty/*`
packages resolved to `latest`. Every release therefore split the group across
two dist-tags, leaving `npm install maltty` pinned to an older RC than the
scoped packages it depends on.

Publishing now passes `--tag latest` explicitly, and `fixed` keeps all five
packages on one version, so a release moves the whole group together.
