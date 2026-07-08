#!/usr/bin/env bash
#
# One-time initial release — run ONCE to bootstrap the packages onto npm so
# trusted publishing can be configured. Does the whole thing by hand, the same
# way CI (.github/workflows/release.yml) will for every release after this:
#
#   version (1.0.0-rc.0) -> commit -> build -> npm publish (--tag rc)
#   -> push tags -> GitHub release per package -> npm latest/rc dist-tags
#   -> mark the `maltty` GitHub release as Latest
#
# Prereqs:
#   - npm auth:  npm whoami        (login or ~/.npmrc token)
#   - gh auth:   gh auth status
#   - the @maltty org/scope exists on npm
#   - you are on the branch you want to release from, changesets present
#
# After this succeeds: configure npm trusted publishing on each (now-existing)
# package, add the NPM_TOKEN repo secret, and CI owns every release from here.

set -euo pipefail

command -v gh >/dev/null || { echo "gh CLI required"; exit 1; }
npm whoami >/dev/null 2>&1 || { echo "Not logged into npm — run 'npm login'"; exit 1; }

echo "==> Versioning (consumes changesets, bumps to 1.0.0-rc.0)"
pnpm changeset version

echo "==> Committing + pushing the version bump"
git add -A
git commit -m "release: version packages"
git push

echo "==> Building"
pnpm build

echo "==> Publishing to npm (pre mode publishes under --tag rc)"
pnpm changeset publish

echo "==> Pushing git tags"
git push --tags

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "==> Creating GitHub releases + dist-tags on ${REPO}"

for pkgjson in packages/*/package.json; do
  is_private="$(node -p "require('./${pkgjson}').private === true")"
  [ "${is_private}" = "true" ] && continue

  name="$(node -p "require('./${pkgjson}').name")"
  version="$(node -p "require('./${pkgjson}').version")"
  tag="${name}@${version}"
  echo "  -> ${tag}"

  gh release create "${tag}" --title "${tag}" --notes "\`${tag}\`" --prerelease --repo "${REPO}" \
    || echo "     (release already exists, leaving it)"

  npm dist-tag add "${tag}" latest
  npm dist-tag add "${tag}" rc

  if [ "${name}" = "maltty" ]; then
    gh release edit "${tag}" --prerelease=false --latest=true --repo "${REPO}"
  fi
done

echo "==> Done. All packages published at 1.0.0-rc.0 with GitHub releases."
echo "    Next: set up npm trusted publishing on each package + add NPM_TOKEN,"
echo "    then CI handles rc.1, rc.2, ..."
