#!/usr/bin/env bash
set -eo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJ="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJ"

log() { printf '[cc-web-bootstrap] %s\n' "$*" >&2; }

write_env() {
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    env_dir="$(dirname "$CLAUDE_ENV_FILE")"
    if [ -d "$env_dir" ] && [ -w "$env_dir" ]; then
      cat >> "$CLAUDE_ENV_FILE"
      return
    fi
  fi
  cat >/dev/null
}

emit_env() {
  local key="$1"
  local value="$2"
  export "$key=$value"
  printf 'export %s=%q\n' "$key" "$value" | write_env
}

write_dotenv_stubs() {
  if [ -f "$PROJ/.env" ]; then
    return
  fi

  cat > "$PROJ/.env" <<'ENV'
NODE_ENV=development
NODE_OPTIONS=--max-old-space-size=12288
MS365_MCP_FULL_COVERAGE=1
MS365_MCP_USE_SNAPSHOT=1
MS365_MCP_ACCEPT_BETA_CHURN=1
MS365_MCP_INTEGRATION=1
MS365_MCP_SKIP_CI_FLAKY=1
MS365_MCP_TENANT_ID=common
MS365_MCP_CLIENT_ID=cloud-session-stub-client-id
MS365_MCP_CLIENT_SECRET=cloud-session-stub-client-secret
MS365_MCP_DATABASE_URL=postgres://stub:stub@localhost:5432/stub
MS365_MCP_REDIS_URL=redis://localhost:6379
MS365_MCP_KEK=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=
ENV
}

export_env_stubs() {
  emit_env NODE_ENV development
  emit_env NODE_OPTIONS --max-old-space-size=12288
  emit_env MS365_MCP_FULL_COVERAGE 1
  emit_env MS365_MCP_USE_SNAPSHOT 1
  emit_env MS365_MCP_ACCEPT_BETA_CHURN 1
  emit_env MS365_MCP_INTEGRATION 1
  emit_env MS365_MCP_SKIP_CI_FLAKY 1
  emit_env MS365_MCP_TENANT_ID common
  emit_env MS365_MCP_CLIENT_ID cloud-session-stub-client-id
  emit_env MS365_MCP_CLIENT_SECRET cloud-session-stub-client-secret
  emit_env MS365_MCP_DATABASE_URL postgres://stub:stub@localhost:5432/stub
  emit_env MS365_MCP_REDIS_URL redis://localhost:6379
  emit_env MS365_MCP_KEK MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=
  write_dotenv_stubs
}

run_privileged() {
  if [ "$(id -u)" = "0" ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    return 1
  fi
}

apt_install() {
  if ! command -v apt-get >/dev/null 2>&1; then
    log "apt-get unavailable; skipping package install: $*"
    return 1
  fi

  run_privileged apt-get update -qq >/dev/null 2>&1 || true
  DEBIAN_FRONTEND=noninteractive run_privileged apt-get install -y -qq "$@" >/dev/null 2>&1
}

start_service() {
  local name="$1"
  run_privileged service "$name" start >/dev/null 2>&1 || \
    run_privileged systemctl start "$name" >/dev/null 2>&1 || true
}

psql_postgres() {
  if command -v sudo >/dev/null 2>&1; then
    sudo -u postgres psql "$@"
  elif command -v runuser >/dev/null 2>&1; then
    runuser -u postgres -- psql "$@"
  else
    psql "$@"
  fi
}

provision_services() {
  log "provisioning Postgres, pgvector, and Redis"
  apt_install postgresql postgresql-contrib redis-server || \
    log "warning: base service package install failed"
  apt_install postgresql-16-pgvector || \
    apt_install postgresql-pgvector || \
    log "warning: pgvector package unavailable; CREATE EXTENSION vector may fail"

  start_service postgresql
  start_service redis-server

  if command -v psql >/dev/null 2>&1; then
    psql_postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='stub'" 2>/dev/null | grep -q 1 || \
      psql_postgres -c "CREATE USER stub WITH PASSWORD 'stub' SUPERUSER;" >/dev/null 2>&1 || true
    psql_postgres -tc "SELECT 1 FROM pg_database WHERE datname='stub'" 2>/dev/null | grep -q 1 || \
      psql_postgres -c "CREATE DATABASE stub OWNER stub;" >/dev/null 2>&1 || true
    psql_postgres -d stub -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" >/dev/null 2>&1 || true
    psql_postgres -d stub -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null 2>&1 || true
  else
    log "warning: psql unavailable after install"
  fi
}

if [ -f package-lock.json ]; then
  log "npm ci"
  npm ci
elif [ -f package.json ]; then
  log "npm install --no-audit --no-fund"
  npm install --no-audit --no-fund
fi

export_env_stubs
provision_services

if [ -x "$PROJ/.claude/setup.sh" ]; then
  "$PROJ/.claude/setup.sh"
fi

log "bootstrap complete"
