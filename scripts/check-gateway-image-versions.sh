#!/usr/bin/env bash
# Compares a Docker image's resolved dependency versions against the
# checked-out package-lock.json. Fails when any of the checked packages
# differ, which is the signal that the image was built from a tree the
# lockfile does not describe (see packages/gateway/Dockerfile and
# apps/dashboard/Dockerfile).
#
# Usage: scripts/check-gateway-image-versions.sh <image-tag> [workdir] [package...]
#   workdir  defaults to /app/packages/gateway
#   package  defaults to the gateway's fastify trio; pass explicit names
#            (e.g. "next") to check a different image, such as the dashboard.
set -euo pipefail

IMAGE="${1:?usage: check-gateway-image-versions.sh <image-tag> [workdir] [package...]}"
WORKDIR="${2:-/app/packages/gateway}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCKFILE="${REPO_ROOT}/package-lock.json"

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
const names = process.argv.slice(2);
const out = {};
for (const name of names) {
  const candidates = Object.keys(pkgs).filter((k) => k.endsWith("node_modules/" + name));
  if (candidates.length === 0) {
    out[name] = null;
    continue;
  }
  // Prefer the flattest (shortest) path: that is the version npm actually
  // resolves at runtime for a hoisted dependency.
  candidates.sort((a, b) => a.split("/").length - b.split("/").length);
  out[name] = pkgs[candidates[0]].version || null;
}
process.stdout.write(JSON.stringify(out));
' "$LOCKFILE" "${PACKAGES[@]}")"

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
  if [ "$lock_v" != "$img_v" ]; then
    echo "MISMATCH for ${pkg}: lockfile=${lock_v} image=${img_v}" >&2
    MISMATCH=1
  fi
done

if [ "$MISMATCH" -ne 0 ]; then
  echo "FAIL: image ${IMAGE} does not match package-lock.json" >&2
  exit 1
fi

echo "OK: image ${IMAGE} matches package-lock.json for ${PACKAGES[*]}"
