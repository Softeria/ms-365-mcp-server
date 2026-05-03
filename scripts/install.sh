#!/usr/bin/env bash
#
# Enabi M365 MCP installer for macOS and Linux.
# Usage: curl -fsSL https://raw.githubusercontent.com/enabisolutions/mcp-ms365/main/scripts/install.sh | bash
#
# What this does:
#   1. Verifies Node.js 20+ is available (installs via Homebrew on macOS if missing).
#   2. Clones the Enabi fork at the latest release tag.
#   3. Builds the MCP.
#   4. Writes the Enabi Azure app IDs to .env (override via MS365_MCP_CLIENT_ID / MS365_MCP_TENANT_ID).
#   5. Runs the interactive Microsoft sign-in.
#   6. Adds the MCP entry to Claude Desktop config (if installed).
#
# Safe to re-run. Existing installs are upgraded to the latest tag.

set -euo pipefail

REPO_URL="https://github.com/enabisolutions/mcp-ms365.git"
INSTALL_DIR="${ENABI_M365_INSTALL_DIR:-$HOME/.local/share/enabi-m365-mcp}"
BIN_PATH="$INSTALL_DIR/dist/index.js"

bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*" >&2; }

bold "Enabi M365 MCP installer"
echo

# 1. Node check
if ! command -v node >/dev/null 2>&1; then
  red "Node.js is not installed."
  if [[ "$OSTYPE" == "darwin"* ]] && command -v brew >/dev/null 2>&1; then
    echo "Installing via Homebrew..."
    brew install node@20
  else
    red "Install Node.js 20+ from https://nodejs.org/ then re-run this script."
    exit 1
  fi
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  red "Node.js 20+ required (found $(node -v)). Upgrade and re-run."
  exit 1
fi
green "✓ Node.js $(node -v)"

# 2. Clone or update
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Updating existing install at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" fetch --tags --quiet origin
else
  echo "Cloning to $INSTALL_DIR..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --quiet "$REPO_URL" "$INSTALL_DIR"
fi

LATEST_TAG=$(git -C "$INSTALL_DIR" tag --list 'enabi-v*' --sort=-v:refname | head -n1)
if [ -z "$LATEST_TAG" ]; then
  red "No enabi-v* release tags found. Falling back to main."
  git -C "$INSTALL_DIR" checkout --quiet main
else
  echo "Checking out $LATEST_TAG..."
  git -C "$INSTALL_DIR" checkout --quiet "$LATEST_TAG"
fi

# 3. Build
cd "$INSTALL_DIR"
echo "Installing dependencies..."
npm ci --silent
echo "Building..."
npm run build --silent
green "✓ Built successfully"

# 4. Credentials
# IDs for the "Enabi M365 MCP" public-client app registration in the Enabi tenant.
# Not secrets — public client flow, no client_secret. Override via env vars if needed.
DEFAULT_CLIENT_ID="4c1083a7-f488-4962-a6b5-70cfbe9f2fbd"
DEFAULT_TENANT_ID="2802a443-2b7f-4c07-afaa-7aa9e6074d9f"
ENV_FILE="$INSTALL_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
MS365_MCP_CLIENT_ID=${MS365_MCP_CLIENT_ID:-$DEFAULT_CLIENT_ID}
MS365_MCP_TENANT_ID=${MS365_MCP_TENANT_ID:-$DEFAULT_TENANT_ID}
EOF
  chmod 600 "$ENV_FILE"
fi

# 5. Sign in
echo
bold "Microsoft sign-in"
echo "A browser window will open. Sign in with your @enabi.io account."
node --env-file="$ENV_FILE" "$BIN_PATH" --login --auth-browser

# 6. Claude Desktop config
CLAUDE_CONFIG=""
case "$OSTYPE" in
  darwin*) CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json" ;;
  linux*)  CLAUDE_CONFIG="$HOME/.config/Claude/claude_desktop_config.json" ;;
esac

if [ -n "$CLAUDE_CONFIG" ] && [ -f "$CLAUDE_CONFIG" ]; then
  echo
  echo "Adding MCP entry to Claude Desktop config..."
  CLIENT_ID=$(grep MS365_MCP_CLIENT_ID "$ENV_FILE" | cut -d= -f2)
  TENANT_ID=$(grep MS365_MCP_TENANT_ID "$ENV_FILE" | cut -d= -f2)
  node - <<JS
const fs = require('fs');
const path = '$CLAUDE_CONFIG';
const cfg = JSON.parse(fs.readFileSync(path, 'utf8'));
cfg.mcpServers = cfg.mcpServers || {};
cfg.mcpServers['enabi-m365'] = {
  command: 'node',
  args: ['$BIN_PATH'],
  env: {
    MS365_MCP_CLIENT_ID: '$CLIENT_ID',
    MS365_MCP_TENANT_ID: '$TENANT_ID'
  }
};
fs.writeFileSync(path, JSON.stringify(cfg, null, 2));
console.log('  ✓ Added enabi-m365 to Claude Desktop');
JS
else
  echo "Claude Desktop config not found at $CLAUDE_CONFIG — skipping auto-config. See docs/INSTALL.md for manual setup."
fi

# 7. Claude Code (if claude CLI is available)
if command -v claude >/dev/null 2>&1; then
  if ! claude mcp list 2>/dev/null | grep -q '^enabi-m365'; then
    echo "Adding MCP to Claude Code..."
    claude mcp add enabi-m365 --scope user -- node "$BIN_PATH"
  fi
fi

echo
green "✓ Done. Restart Claude Desktop, then ask: 'What is on my calendar today?'"
echo "If anything goes wrong, see $INSTALL_DIR/docs/INSTALL.md or ping #it-support."
