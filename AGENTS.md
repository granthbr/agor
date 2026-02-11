# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Agor** — Multiplayer canvas for orchestrating Claude Code, Codex, and Gemini sessions. Manage git worktrees, track AI conversations, visualize work on spatial boards, and collaborate in real-time.

---

## Build & Development Commands

```bash
# Development (user manages these processes - DO NOT start them)
cd apps/agor-daemon && pnpm dev    # Daemon + watches @agor/core
cd apps/agor-ui && pnpm dev        # UI dev server (:5173)

# Monorepo commands (from root)
pnpm build                         # Build all packages
pnpm typecheck                     # TypeScript check all packages
pnpm lint                          # Biome lint check
pnpm lint:fix                      # Auto-fix lint issues
pnpm test                          # Run all tests

# Run tests in specific packages
cd packages/core && pnpm test              # Core tests
cd packages/core && pnpm test:watch        # Watch mode
cd apps/agor-daemon && pnpm test           # Daemon tests
cd apps/agor-ui && pnpm test:run           # UI tests

# Run a single test file
cd packages/core && pnpm vitest run src/db/repositories/sessions.test.ts

# CLI commands (requires daemon running)
pnpm -w agor session list
pnpm -w agor repo list
pnpm -w agor worktree list

# Database
cd packages/core && pnpm db:generate       # Generate migrations (SQLite + Postgres)
cd packages/core && pnpm db:studio         # Open Drizzle Studio
sqlite3 ~/.agor/agor.db                    # Direct DB access
```

**Agent behavior:** User runs watch mode. DO NOT run builds or start background processes unless explicitly asked.

---

## Architecture Overview

```
agor/
├── apps/
│   ├── agor-daemon/         # FeathersJS backend (REST + WebSocket on :3030)
│   ├── agor-cli/            # CLI tool (oclif-based)
│   └── agor-ui/             # React UI (Ant Design + React Flow)
├── packages/
│   └── core/                # Shared @agor/core package
│       ├── types/           # TypeScript types (Session, Task, Worktree, etc.)
│       ├── db/              # Drizzle ORM + repositories + schema
│       ├── git/             # Git utils (simple-git only)
│       └── api/             # FeathersJS client utilities
└── context/                 # Architecture documentation (READ BEFORE CODING)
```

### Core Primitives

1. **Session** - Agent conversation container with genealogy (fork/spawn)
2. **Task** - User prompts as first-class work units
3. **Worktree** - Git worktrees with isolated environments (**PRIMARY UNIT ON BOARDS**)
4. **Report** - Markdown summaries after task completion
5. **Concept** - Modular context files

### Key Data Flow

- **Clients** (CLI, UI) → **FeathersJS Client** → **Daemon** (services + hooks) → **Drizzle ORM** → **LibSQL**
- WebSocket events broadcast to all clients on data changes
- MCP endpoint at `/mcp?sessionToken=...` gives agents self-awareness

---

## Critical Rules

### Git Operations
- **ALWAYS** use `simple-git` library (`packages/core/src/git/index.ts`)
- **NEVER** use `execSync`, `spawn`, or bash for git commands
- **NEVER** use `git commit --no-verify` without explicit user permission

### Types
- **ALWAYS** import from `packages/core/src/types/` (never redefine)
- Sessions, Tasks, Worktrees, Messages, Repos, Boards, Users are canonical

### Architecture
- Boards display **Worktrees** as primary cards (NOT Sessions)
- Sessions reference worktrees via required FK
- Read `context/concepts/worktrees.md` before touching boards

---

## Context Documentation

**Read relevant docs before making changes.** Start with `context/README.md` for the full index.

| Task | Read First |
|------|------------|
| UI feature | `context/concepts/design.md`, `frontend-guidelines.md` |
| Backend service | `context/concepts/architecture.md`, `websockets.md` |
| Boards/canvas | `context/concepts/worktrees.md` (CRITICAL), `board-objects.md` |
| Agent/SDK work | `context/concepts/agent-integration.md`, `permissions.md` |
| Database changes | `context/guides/creating-database-migrations.md` |
| MCP integration | `context/concepts/mcp-integration.md`, `agor-mcp-server.md` |

---

## Adding a New Feature

1. Read relevant `context/` docs
2. Update types in `packages/core/src/types/`
3. Add repository in `packages/core/src/db/repositories/`
4. Create service in `apps/agor-daemon/src/services/`
5. Register in `apps/agor-daemon/src/index.ts`
6. Add CLI command in `apps/agor-cli/src/commands/` (if needed)
7. Add UI component in `apps/agor-ui/src/components/` (if needed)

---

## Feature Flags

### Worktree RBAC and Unix Isolation

**Default: Disabled** - Open access mode for backward compatibility

Agor supports progressive security modes controlled by two config flags:

```yaml
# ~/.agor/config.yaml
execution:
  worktree_rbac: false # Enable RBAC (default: false)
  unix_user_mode: simple # Unix isolation mode (default: simple)
```

---

#### Mode 1: Open Access (Default)

```yaml
execution:
  worktree_rbac: false
  unix_user_mode: simple
```

**Behavior:**

- ✅ All authenticated users can access all worktrees
- ✅ No permission enforcement
- ✅ All operations run as daemon user
- ✅ No Unix groups or filesystem permissions

**Use cases:** Personal instances, trusted teams, dev/testing

---

#### Mode 2: RBAC Only (Soft Isolation)

```yaml
execution:
  worktree_rbac: true
  unix_user_mode: simple
```

**Behavior:**

- ✅ App-layer permission checks (view/prompt/all)
- ✅ Worktree owners service active
- ✅ UI shows permission management
- ❌ No Unix groups (all runs as daemon user)

**Use cases:** Organization without OS complexity, testing RBAC

---

#### Mode 3: RBAC + Worktree Groups (Insulated)

```yaml
execution:
  worktree_rbac: true
  unix_user_mode: insulated
  executor_unix_user: agor_executor
```

**Behavior:**

- ✅ Full app-layer RBAC
- ✅ Unix groups per worktree (`agor_wt_*`)
- ✅ Filesystem permissions enforced
- ✅ Executors run as dedicated user
- ❌ No per-user isolation

**Requires:** Sudoers config, executor Unix user

**Use cases:** Shared dev servers, filesystem protection

---

#### Mode 4: Full Isolation (Strict)

```yaml
execution:
  worktree_rbac: true
  unix_user_mode: strict
```

**Behavior:**

- ✅ All insulated mode features
- ✅ Each user MUST have `unix_username`
- ✅ Sessions run as session creator's Unix user
- ✅ Per-user credential isolation
- ✅ Full audit trail

**Requires:** Sudoers config, Unix user per Agor user

**Use cases:** Production, compliance, enterprise

---

### Configuration Options

```yaml
execution:
  # RBAC toggle
  worktree_rbac: boolean # default: false

  # Unix mode: simple | insulated | strict
  unix_user_mode: string # default: simple

  # Executor user (insulated mode)
  executor_unix_user: string # optional

  # Session tokens
  session_token_expiration_ms: number # default: 86400000 (24h)
  session_token_max_uses: number # default: 1, -1 = unlimited

  # Password sync (strict mode)
  sync_unix_passwords: boolean # default: true
```

---

### Implementation Notes

**Database Schema:**

- `worktree_owners` table and `others_can` column exist regardless of mode
- Schema migrations run on all instances
- Safe to toggle flags at runtime

**Service Registration:**

- Worktree owners API (`/worktrees/:id/owners`) registered only when `worktree_rbac: true`
- Returns 404 when RBAC disabled

**Unix Integration:**

- Groups created only in `insulated` or `strict` modes
- Toggling off does NOT clean up existing groups
- Filesystem permissions persist after disabling

**UI Behavior:**

- Owners & Permissions section shown only when `worktree_rbac: true`
- Gracefully degrades when disabled

**Sudoers Setup:**

- Required for `insulated` and `strict` modes
- Reference file: `docker/sudoers/agor-daemon.sudoers`
- Comprehensive documentation and security scoping included

---

### Related Documentation

**Setup & Security:**

- `apps/agor-docs/pages/guide/multiplayer-unix-isolation.mdx` - Complete setup guide
- `context/guides/rbac-and-unix-isolation.md` - Architecture and design philosophy
- `docker/sudoers/agor-daemon.sudoers` - Production-ready sudoers configuration

**Implementation:**

- `packages/core/src/config/types.ts` - Configuration types
- `packages/core/src/unix/user-manager.ts` - Unix user utilities
- `apps/agor-daemon/src/index.ts` - Mode detection and service registration

---

## Extended Thinking Mode

Auto-detects keywords in prompts:
- `think` → 4K tokens
- `think hard` → 10K tokens
- `ultrathink` → 32K tokens

Implementation: `packages/core/src/tools/claude/thinking-detector.ts`

---

## Key File Paths

- `packages/core/src/types/` - Canonical type definitions
- `packages/core/src/db/schema.ts` - Database schema
- `apps/agor-daemon/src/services/` - FeathersJS services
- `~/.agor/config.yaml` - User configuration
- `~/.agor/agor.db` - SQLite database

---

## Troubleshooting

```bash
# Daemon hanging
lsof -ti:3030 | xargs kill -9

# tsx watch issues
cd apps/agor-daemon && rm -rf node_modules/.tsx

# Core changes not picked up (shouldn't happen with watch mode)
cd packages/core && pnpm build
```
