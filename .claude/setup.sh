#!/usr/bin/env bash
set -eo pipefail

PROJ="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
log() { printf '[gsd-setup] %s\n' "$*" >&2; }

if [ -x "$PROJ/.claude/bin/gsd-sdk" ]; then
  ln -sf "$PROJ/.claude/bin/gsd-sdk" /usr/local/bin/gsd-sdk 2>/dev/null || \
    sudo ln -sf "$PROJ/.claude/bin/gsd-sdk" /usr/local/bin/gsd-sdk 2>/dev/null || \
    log "warning: could not symlink gsd-sdk"
fi

if ! command -v gh >/dev/null 2>&1 && command -v apt-get >/dev/null 2>&1; then
  log "installing gh"
  (apt-get update -qq && apt-get install -y -qq gh) >/dev/null 2>&1 || \
    (sudo apt-get update -qq && sudo apt-get install -y -qq gh) >/dev/null 2>&1 || \
    log "warning: gh install failed"
fi

if [ -f "$PROJ/.claude/get-shit-done/bin/gsd-tools.cjs" ]; then
  node "$PROJ/.claude/get-shit-done/bin/gsd-tools.cjs" --help >/dev/null 2>&1 || \
    log "warning: gsd-tools.cjs self-test failed"
fi

log "GSD harness ready"
