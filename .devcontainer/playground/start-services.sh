#!/bin/bash
set -e

echo "🎮 Starting Agor Playground..."
echo ""

# Check if this is first run
if [ ! -d ~/.agor ]; then
  echo "📦 First run - initializing Agor..."
  echo ""
  echo "⚠️  SANDBOX MODE: Temporary playground instance"
  echo "   - Data is ephemeral (lost on rebuild)"
  echo "   - Try Agor without setup!"
  echo ""

  # Run agor init with --force (anonymous mode, no prompts)
  agor init --force

  # Create default admin user
  echo "👤 Creating admin user..."
  agor user create-admin

  echo ""
  echo "✅ Initialization complete!"
  echo ""
  echo "📝 Login credentials:"
  echo "   Email:    admin@agor.live"
  echo "   Password: admin"
  echo ""
fi

# Start daemon (detached, runs in background)
echo "🔧 Starting daemon on :3030..."
agor daemon start

echo ""
echo "🚀 Agor is running!"
echo ""
echo "   Daemon: http://localhost:3030"
echo ""
echo "   (Codespaces auto-forwards this port)"
echo ""
echo "📝 View logs:"
echo "   agor daemon logs"
echo ""

# Keep script alive (required for postStartCommand)
sleep infinity
