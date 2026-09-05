#!/usr/bin/env bash
# Compares a Docker image's resolved dependency versions against the
# checked-out package-lock.json. Fails when any of the checked packages
# differ, which is the signal that the image was built from a tree the
# lockfile does not describe (see packages/gateway/Dockerfile and
# apps/dashboard/Dockerfile). Also fails (with a distinct message) when a
# checked package cannot be found in the lockfile at all, or is missing
# from the image while the lockfile pins it; either case means the
# comparison itself is not trustworthy, not that the two sides agree.
#
# Usage: scripts/check-image-versions.sh <image-tag> [workdir] [package...]
#   workdir  the in-image path to resolve `require()` from; when omitted,
#            it is read from the image's own config
#            (`docker image inspect --format '{{.Config.WorkingDir}}'`).
#   package  defaults to the gateway's fastify trio; pass explicit names
#            (e.g. "next") to check a different image, such as the dashboard.
set -euo pipefail

IMAGE="${1:?usage: check-image-versions.sh <image-tag> [workdir] [package...]}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCKFILE="${REPO_ROOT}/package-lock.json"

if [ "$#" -ge 2 ] && [ -n "${2}" ]; then
  WORKDIR="$2"
else
  WORKDIR="$(docker image inspect --format '{{.Config.WorkingDir}}' "$IMAGE")"
  if [ -z "$WORKDIR" ]; then
    echo "ERROR: could not derive a WorkingDir from image ${IMAGE}; pass one explicitly" >&2
    exit 1
  fi
fi

# Both Dockerfiles set the app root to /app before switching to a
# workspace-specific WORKDIR (e.g. /app/packages/gateway). Stripping that
# prefix gives the workspace's path relative to the repo root
# (e.g. packages/gateway), which is what the lockfile keys its
# per-workspace `node_modules` entries under.
APP_ROOT="/app"
case "$WORKDIR" in
  "${APP_ROOT}/"*) WORKSPACE="${WORKDIR#"${APP_ROOT}"/}" ;;
  *) WORKSPACE="" ;;
esac

if [ "$#" -gt 2 ]; then
  PACKAGES=("${@:3}")
else
  PACKAGES=(
    "fastify"
    "fast-json-stringify"
    "@fastify/fast-json-stringify-compiler"
  )
fi

LOCK_VERSIONS_JSON="$(node -e '
const fs = require("fs");
const lock = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const pkgs = lock.packages || {};
const workspace = process.argv[2];
const names = process.argv.slice(3);
const out = {};
for (const name of names) {
  // Mirror node'"'"'s resolution order from the workspace directory: its own
  // node_modules first, then the hoisted root node_modules. This is a
  // two-level walk (workspaces here are one directory deep), not a
  // "shortest path wins" heuristic; a shorter path is not necessarily the
  // one node actually resolves for a given workspace.
  const candidates = [];
  if (workspace) candidates.push(`${workspace}/node_modules/${name}`);
  candidates.push(`node_modules/${name}`);
  let version = null;
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(pkgs, key)) {
      version = pkgs[key].version || null;
      break;
    }
  }
  out[name] = version;
}
process.stdout.write(JSON.stringify(out));
' "$LOCKFILE" "$WORKSPACE" "${PACKAGES[@]}")"

IMAGE_VERSIONS_JSON="$(docker run --rm --workdir "$WORKDIR" "$IMAGE" node -e '
const names = process.argv.slice(1);
const out = {};
for (const name of names) {
  try {
    out[name] = require(name + "/package.json").version;
  } catch (e) {
    out[name] = null;
  }
}
process.stdout.write(JSON.stringify(out));
' "${PACKAGES[@]}")"

echo "lockfile versions: ${LOCK_VERSIONS_JSON}"
echo "image versions:    ${IMAGE_VERSIONS_JSON}"

MISMATCH=0
for pkg in "${PACKAGES[@]}"; do
  lock_v="$(node -e 'console.log(JSON.parse(process.argv[1])[process.argv[2]])' "$LOCK_VERSIONS_JSON" "$pkg")"
  img_v="$(node -e 'console.log(JSON.parse(process.argv[1])[process.argv[2]])' "$IMAGE_VERSIONS_JSON" "$pkg")"
  if [ "$lock_v" = "null" ]; then
    echo "ERROR for ${pkg}: not found in package-lock.json under ${WORKSPACE:-<root>}/node_modules or node_modules; the check is meaningless for this package" >&2
    MISMATCH=1
  elif [ "$img_v" = "null" ]; then
    echo "MISMATCH for ${pkg}: missing from image (lockfile pins ${lock_v})" >&2
    MISMATCH=1
  elif [ "$lock_v" != "$img_v" ]; then
    echo "MISMATCH for ${pkg}: lockfile=${lock_v} image=${img_v}" >&2
    MISMATCH=1
  fi
done

if [ "$MISMATCH" -ne 0 ]; then
  echo "FAIL: image ${IMAGE} does not match package-lock.json" >&2
  exit 1
fi

echo "OK: image ${IMAGE} matches package-lock.json for ${PACKAGES[*]}"
