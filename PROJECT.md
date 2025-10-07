# Agor Project

> **Next-gen agent orchestration platform** - Manage unlimited AI coding agents in hyper-context-aware session trees.

**See [context/](context/) for complete architecture, data models, and design documentation.**

---

## What Is Agor?

**Agor is an agent orchestrator** - the platform layer that sits above all agentic coding tools (Claude Code, Cursor, Codex, Gemini), providing unified session management, visual session trees, and automatic knowledge capture.

**Core Insight:** Context engineering isn't about prompt templates—it's about managing sessions, tasks, and concepts as first-class composable primitives stored in a session tree.

**See:** [context/concepts/core.md](context/concepts/core.md) for vision and primitives.

---

## Current Status

### ✅ Completed (Phases 1-2)

**UI Prototype** (`apps/agor-ui/`)

- Complete React + Ant Design component library with Storybook
- SessionCard with drag handles and task preview
- SessionDrawer with ConversationView (Ant Design X Bubble)
- SessionCanvas with React Flow for tree visualization
- Board organization and session tree visualization
- Real messages API integration with WebSocket subscriptions
- Mock data layer with 18+ realistic sessions

**Backend Infrastructure** (`apps/agor-daemon/`, `packages/core/`)

- FeathersJS REST + WebSocket daemon on :3030
- Drizzle ORM + LibSQL with hybrid materialization strategy
- Repository pattern: Sessions, Tasks, Messages, Repos, Boards
- UUIDv7 IDs with short ID resolution
- Git operations: clone, worktree management

**CLI** (`apps/agor-cli/`)

- `agor init` - Database initialization
- `agor repo add/list/rm` - Repository management
- `agor repo worktree add/list` - Worktree operations
- `agor session list` - Table view with filters
- `agor session load-claude <id>` - Import Claude Code sessions

**Data Architecture**

- Messages = immutable event log (append-only)
- Tasks = mutable state containers (extracted from user messages)
- Bulk insert endpoints (`/messages/bulk`, `/tasks/bulk`)
- Message → Task extraction pipeline (batched at 100 items)

**See:** [CLAUDE.md](CLAUDE.md) for complete implementation details.

---

## What's Next

### 🚧 Phase 3: Session Lifecycle & Agent Integration

**Session Management**

- [ ] `agor session show <id>` - Detailed view with genealogy tree visualization
- [ ] `agor session create` - Interactive session creation with agent selection
- [ ] Fork/spawn operations with genealogy tracking
- [ ] Session state transitions (idle → running → completed)
- [ ] `agor session clear` - Delete all sessions/tasks/messages (with confirmation)

**Agent Integration**

- [ ] Agent adapter framework (abstract interface for Claude Code, Cursor, Codex, Gemini)
- [ ] Claude Code native integration (launch agent with Agor context)
- [ ] Session → Agent context passing (concepts, parent tasks, git state)
- [ ] Real-time task state updates (running → completed/failed)
- [ ] Bidirectional sync (agent events → Agor database)

**Advanced Features**

- [ ] Concept management (attach/detach knowledge nuggets to sessions)
- [ ] Report generation (auto-generate structured learnings from tasks)
- [ ] Daemon auto-start (spawn daemon if not running)
- [ ] Process management (PID file, graceful shutdown)

### 🚧 Phase 4: UI Integration & Desktop App

**Connect UI to Backend**

- [x] Messages API integration with real-time WebSocket
- [x] ConversationView component with Ant Design X Bubble
- [x] SessionDrawer with live message loading
- [ ] Replace remaining mock data with daemon API calls
- [ ] Session creation flow integrated with daemon
- [ ] Task timeline visualization from messages table
- [ ] Genealogy tree rendering from database

**Desktop Packaging**

- [ ] Electron/Tauri wrapper
- [ ] Bundled daemon (auto-start on app launch)
- [ ] System tray integration
- [ ] Local file system access for worktrees

---

## Roadmap

### V1: Local Desktop App (Target: Q2 2025)

**Goal:** Full-featured local agent orchestrator with GUI + CLI

**Core Capabilities:**

- Multi-agent session management (Claude Code, Cursor, Codex, Gemini)
- Visual session tree canvas with fork/spawn genealogy
- Git worktree integration for isolated parallel sessions
- Concept library for modular context composition
- Automatic report generation from completed tasks
- Local-only (no cloud, SQLite-based)

**Deliverables:**

- Desktop app (Electron or Tauri)
- Standalone CLI binary (`agor`)
- Documentation + tutorials

---

### V2: Agor Cloud (Target: Q4 2025)

**Goal:** Real-time collaborative agent orchestration

**New Capabilities:**

- Cloud-hosted sessions (migrate LibSQL → PostgreSQL)
- Real-time multiplayer (multiple devs, same session tree)
- Shared concept libraries (team knowledge bases)
- Pattern recommendations (learn from successful session workflows)
- Session replay/export for knowledge sharing

**Tagline:** _Real-time strategy multiplayer for AI development_

**See:** [README.md](README.md) for full product vision.

---

## Project Structure

```
agor/
├── apps/
│   ├── agor-daemon/       # FeathersJS backend (REST + WebSocket)
│   ├── agor-cli/          # CLI tool (oclif)
│   └── agor-ui/           # React UI (Storybook-first)
│
├── packages/
│   └── core/              # Shared @agor/core package
│       ├── types/         # TypeScript types
│       ├── db/            # Drizzle ORM + repositories
│       ├── git/           # Git utilities
│       ├── claude/        # Claude Code integration
│       └── api/           # FeathersJS client
│
└── context/               # Architecture documentation
    ├── concepts/          # Core design docs (read first)
    └── explorations/      # Experimental designs
```

**Monorepo:** Turborepo + pnpm workspaces

---

## Quick Start

### Run Daemon

```bash
cd apps/agor-daemon
pnpm dev  # Starts on :3030
```

### Use CLI

```bash
# Initialize database
pnpm agor init

# Import a Claude Code session
pnpm agor session load-claude <session-id>

# List sessions
pnpm agor session list
```

### Develop UI

```bash
cd apps/agor-ui
pnpm storybook  # Component development
pnpm dev        # Full app
```

**See:** [CLAUDE.md](CLAUDE.md) for complete development guide.

---
