# Docker Development Guide

**TL;DR:** Run `docker compose up` in any worktree. Use `PORT` env var to avoid conflicts.

```bash
# Worktree 1
cd ~/code/agor-main
docker compose up  # UI on port 5173

# Worktree 2
cd ~/code/agor-feature
PORT=5174 docker compose up  # UI on port 5174
```

## Quick Start

### Single Instance

```bash
# Start Agor in dev mode
docker compose up

# Access UI: http://localhost:5173
# Daemon runs internally (not exposed to host)
```

### Custom Port

```bash
# Run on different port
PORT=5174 docker compose up

# Access UI: http://localhost:5174
```

### Multiple Instances (Different Worktrees)

**Recommended workflow:** Use `-p` flag to create isolated instances

```bash
# Worktree 1 (main branch)
cd ~/code/agor-main
docker compose -p agor-main up                  # UI: http://localhost:5173

# Worktree 2 (feature branch)
cd ~/code/agor-feature-x
PORT=5174 docker compose -p agor-feature-x up   # UI: http://localhost:5174

# Worktree 3 (another feature)
cd ~/code/agor-feature-y
PORT=5175 docker compose -p agor-feature-y up   # UI: http://localhost:5175
```

**The `-p` (project name) flag is important because:**

- Creates unique database volume per project: `agor-main_agor-data`, `agor-feature-x_agor-data`, etc.
- Without it, all instances would share the same database (conflicts!)

**Each worktree gets:**

- Its own source code (mounted from that worktree)
- Its own database volume (isolated data)
- Its own UI port (no conflicts)

## Architecture

### Single Container Design

The dev setup runs both daemon and UI in a single container using `concurrently`:

```
┌─────────────────────────────────┐
│  agor-dev container             │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Daemon (port 3030)      │   │
│  │ - FeathersJS API        │   │
│  │ - WebSocket server      │   │
│  │ - Auto-reload with tsx  │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ UI (port 5173)          │   │
│  │ - Vite dev server       │   │
│  │ - HMR enabled           │   │
│  │ - Auto-reload on change │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

### Port Configuration

**Ports:**

- **Daemon:** Runs on port `3030` inside container (not exposed to host)
- **UI:** Runs on port `$PORT` (default `5173`), exposed to host

**Why daemon isn't exposed:**

- Only the UI needs to be accessed from your browser
- Daemon is accessed by the UI via `http://localhost:3030` (inside container)
- To inspect daemon: Use `docker exec` or `docker compose logs`

Example for 3 worktrees:

| Worktree  | UI Port | Access                |
| --------- | ------- | --------------------- |
| main      | `5173`  | http://localhost:5173 |
| feature-x | `5174`  | http://localhost:5174 |
| feature-y | `5175`  | http://localhost:5175 |

## Volume Mounts

### Source Code (Hot-Reload)

```yaml
volumes:
  - ./apps:/app/apps # Daemon & UI & CLI source
  - ./packages:/app/packages # Core packages
  - ./context:/app/context # Documentation
```

**Changes to these files trigger auto-reload!**

### Data Persistence

```yaml
volumes:
  - agor-data:/root/.agor # Database, config, repos
```

Each instance gets its own named volume:

- `agor-data` (instance 1)
- `agor-data-2` (instance 2)
- `agor-data-3` (instance 3)

**To inspect data:**

```bash
# List volumes
docker volume ls | grep agor

# Inspect volume
docker volume inspect agor_agor-data

# Access volume (while container is running)
docker exec -it agor-dev sh
ls -la /root/.agor
```

### Node Modules (Optimization)

```yaml
volumes:
  - /app/node_modules # Exclude from mount
```

This prevents host `node_modules` from overwriting container's installed dependencies.

## Common Commands

```bash
# Start in foreground (see logs)
docker compose up

# Start in background
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Rebuild after dependency changes
docker compose build && docker compose up

# Enter running container
docker exec -it agor-dev sh

# Full cleanup (removes database!)
docker compose down -v
```

## Environment Variables

### Available Variables

| Variable   | Default       | Description                          |
| ---------- | ------------- | ------------------------------------ |
| `PORT`     | `5173`        | UI port (exposed to host)            |
| `NODE_ENV` | `development` | Node environment (set automatically) |

### Setting Variables

```bash
# Command line
PORT=8080 docker compose up

# Or use .env file
echo "PORT=8080" > .env
docker compose up
```

## Troubleshooting

**Port already in use:**

```bash
# Use different port
PORT=5174 docker compose up
```

**Check daemon logs:**

```bash
# View all logs
docker compose logs -f

# Filter daemon logs
docker compose logs -f | grep daemon
```

**Access daemon directly (for debugging):**

```bash
# Enter container
docker exec -it $(docker ps -q -f name=agor) sh

# Inside container, test daemon
curl http://localhost:3030/health
```

**Changes not reflecting:**

```bash
# Rebuild and restart
docker compose build && docker compose up
```

**Dependencies out of date:**

```bash
# Rebuild after pulling new code
docker compose build
```

## Notes

- This Dockerfile is for **development only**
- Source code changes trigger auto-reload
- Each instance gets its own database volume
- Only rebuild when dependencies change (package.json updates)
