#!/usr/bin/env bash
# Setup GitHub Actions self-hosted runner on the Agor remote host
#
# Run this as the `agent` user on 192.168.100.133
#
# Prerequisites:
#   - Generate a fresh registration token (expires in ~1 hour):
#     gh api repos/granthbr/agor/actions/runners/registration-token -X POST --jq '.token'
#   - Node v20.20.0 via nvm, pnpm 9.15.1 already installed
#
# After running this script, configure the GitHub Environment:
#   Repo Settings → Environments → New → "agor-remote"
#   Add deployment branch rules: main, feat/prompt-architect

set -euo pipefail

RUNNER_VERSION="2.322.0"
RUNNER_DIR="$HOME/actions-runner"
REPO_URL="https://github.com/granthbr/agor"
RUNNER_NAME="agor-remote"
NODE_BIN="$HOME/.nvm/versions/node/v20.20.0/bin"

# --- Token ---
if [ -z "${RUNNER_TOKEN:-}" ]; then
  echo "ERROR: Set RUNNER_TOKEN before running this script."
  echo "  export RUNNER_TOKEN=\$(gh api repos/granthbr/agor/actions/runners/registration-token -X POST --jq '.token')"
  exit 1
fi

# --- 1. Download and extract runner ---
echo "==> Installing runner to $RUNNER_DIR"
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

if [ ! -f run.sh ]; then
  curl -o actions-runner-linux-x64.tar.gz -L \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  tar xzf actions-runner-linux-x64.tar.gz
  rm -f actions-runner-linux-x64.tar.gz
  echo "    Runner extracted."
else
  echo "    Runner already installed, skipping download."
fi

# --- 2. Configure ---
echo "==> Configuring runner"
./config.sh --url "$REPO_URL" \
  --token "$RUNNER_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels self-hosted,linux,x64 \
  --work _work \
  --unattended

# --- 3. Create systemd user service ---
echo "==> Creating systemd user service"
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/github-actions-runner.service << EOF
[Unit]
Description=GitHub Actions Runner
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$RUNNER_DIR
ExecStart=$RUNNER_DIR/run.sh
Restart=always
RestartSec=5
Environment=PATH=$NODE_BIN:/usr/local/bin:/usr/bin:/bin
Environment=DOTNET_BUNDLE_EXTRACT_BASE_DIR=$HOME/.cache/dotnet_bundle_extract

[Install]
WantedBy=default.target
EOF

# --- 4. Enable and start ---
echo "==> Starting runner service"
systemctl --user daemon-reload
systemctl --user enable github-actions-runner
systemctl --user start github-actions-runner

# --- 5. Verify ---
echo ""
echo "==> Runner status:"
systemctl --user status github-actions-runner --no-pager

echo ""
echo "Done. Verify the runner appears as 'Idle' at:"
echo "  $REPO_URL/settings/actions/runners"
echo ""
echo "Then create the GitHub Environment:"
echo "  Repo Settings → Environments → New → 'agor-remote'"
echo "  Deployment branches: main, feat/prompt-architect"
