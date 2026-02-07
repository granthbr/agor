#!/usr/bin/env bash
# Sync local agor source to remote dev host via rsync
# Usage: ./sync-to-remote.sh [--dry-run]

REMOTE_HOST="172.31.231.133"
REMOTE_USER="agents"
REMOTE_DIR="~/agor"
LOCAL_DIR="/Users/brandongrantham/projects/agor/"

rsync -avz --delete \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='.claude/' \
  --exclude='.turbo/' \
  --exclude='.pnpm-store/' \
  --exclude='.agor/' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.*.local' \
  --exclude='.env.postgres' \
  --exclude='dist/' \
  --exclude='build/' \
  --exclude='coverage/' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  --exclude='apps/agor-desktop/out/' \
  --exclude='settings.local.json' \
  "$@" \
  "$LOCAL_DIR" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
