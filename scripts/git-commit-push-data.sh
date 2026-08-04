#!/usr/bin/env bash
# Commit data/ changes against the latest remote tip, then push with retries.
# Rebases (hard-syncs) onto origin BEFORE committing so concurrent fetches
# that only share catalog JSON can be merged mechanically.
#
# Usage: scripts/git-commit-push-data.sh "commit message" [path ...]
set -euo pipefail

MSG="${1:?commit message required}"
shift
if [ "$#" -gt 0 ]; then
  PATHS=("$@")
else
  PATHS=(data/)
fi

BRANCH="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP="$(mktemp -d)"
trap 'rm -rf "$SNAP"' EXIT

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git add -- "${PATHS[@]}"
if git diff --staged --quiet; then
  echo "No changes to commit"
  exit 0
fi

git diff --cached --name-only --diff-filter=ACMR >"$SNAP/changed.txt"
git diff --cached --name-only --diff-filter=D >"$SNAP/deleted.txt"

mkdir -p "$SNAP/files"
while IFS= read -r f; do
  [ -z "$f" ] && continue
  mkdir -p "$SNAP/files/$(dirname "$f")"
  cp -a "$f" "$SNAP/files/$f"
done <"$SNAP/changed.txt"

# HEAD catalog baselines (pre-job) so intentional deletes survive merge.
if git cat-file -e "HEAD:data/index.json" 2>/dev/null; then
  git show HEAD:data/index.json >"$SNAP/index-head.json"
fi
if git cat-file -e "HEAD:data/ticker-names.json" 2>/dev/null; then
  git show HEAD:data/ticker-names.json >"$SNAP/names-head.json"
fi

# Drop the temporary index; the retry loop hard-resets onto origin and
# re-applies files from $SNAP before each commit.
git reset HEAD -- "${PATHS[@]}" >/dev/null 2>&1 || true

for i in 1 2 3; do
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"

  while IFS= read -r f; do
    [ -z "$f" ] && continue
    case "$f" in
      data/index.json|data/ticker-names.json) continue ;;
    esac
    mkdir -p "$(dirname "$f")"
    cp -a "$SNAP/files/$f" "$f"
  done <"$SNAP/changed.txt"

  while IFS= read -r f; do
    [ -z "$f" ] && continue
    rm -f "$f"
  done <"$SNAP/deleted.txt"

  if grep -qx 'data/index.json' "$SNAP/changed.txt" 2>/dev/null; then
    BASELINE_ARGS=()
    if [ -f "$SNAP/index-head.json" ]; then
      BASELINE_ARGS=(--baseline "$SNAP/index-head.json")
    fi
    if [ ! -f data/index.json ]; then
      printf '%s\n' '{"schemaVersion":1,"updatedAt":"","entries":[]}' >data/index.json
    fi
    node "$ROOT/scripts/merge-data-catalog.mjs" index \
      --base data/index.json \
      --overlay "$SNAP/files/data/index.json" \
      "${BASELINE_ARGS[@]}" \
      --out data/index.json
  fi

  if grep -qx 'data/ticker-names.json' "$SNAP/changed.txt" 2>/dev/null; then
    BASELINE_ARGS=()
    if [ -f "$SNAP/names-head.json" ]; then
      BASELINE_ARGS=(--baseline "$SNAP/names-head.json")
    fi
    if [ ! -f data/ticker-names.json ]; then
      printf '%s\n' '{"schemaVersion":1,"updatedAt":"","names":{}}' >data/ticker-names.json
    fi
    node "$ROOT/scripts/merge-data-catalog.mjs" names \
      --base data/ticker-names.json \
      --overlay "$SNAP/files/data/ticker-names.json" \
      "${BASELINE_ARGS[@]}" \
      --out data/ticker-names.json
  fi

  git add -- "${PATHS[@]}"
  if git diff --staged --quiet; then
    echo "No changes to commit after sync"
    exit 0
  fi

  git commit -m "$MSG"
  if git push origin "HEAD:$BRANCH"; then
    exit 0
  fi

  echo "Push rejected (attempt $i), retrying..."
  # Drop the local commit so the next hard-reset starts clean.
  git reset --hard "origin/$BRANCH" || true
  sleep $((i * 5))
done

echo "Failed to push after retries"
exit 1
