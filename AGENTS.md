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
  worktree_rbac: false      # Enable RBAC (default: false)
  unix_user_mode: simple    # Unix isolation mode (default: simple)
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
  worktree_rbac: boolean                    # default: false

  # Unix mode: simple | insulated | strict
  unix_user_mode: string                    # default: simple

  # Executor user (insulated mode)
  executor_unix_user: string                # optional

  # Session tokens
  session_token_expiration_ms: number       # default: 86400000 (24h)
  session_token_max_uses: number            # default: 1, -1 = unlimited

  # Password sync (strict mode)
  sync_unix_passwords: boolean              # default: true
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

## Prompt Architect Feature

AI-powered prompt generation and library system. Generates well-structured prompts for zones, sessions, and scheduler configurations.

### Architecture

```
packages/core/src/
├── types/prompt-template.ts       # All types (PromptTemplate, versions, ratings, preprocessors, architect I/O)
├── prompts/architect.ts           # System prompts + buildArchitectMessages helpers
└── db/
    ├── schema.sqlite.ts           # 4 tables: prompt_templates, prompt_template_versions, prompt_ratings, template_preprocessors
    ├── schema.postgres.ts         # Mirror of above for Postgres
    ├── schema.ts                  # Re-exports
    └── repositories/
        ├── prompt-templates.ts    # CRUD + versioning + usage tracking
        ├── prompt-ratings.ts      # CRUD + avg calculation
        └── template-preprocessors.ts  # Junction table: template ↔ preprocessor relationships

apps/agor-daemon/src/services/
├── prompt-architect.ts            # AI generation (clarify/generate — dual backend: API key or Agent SDK OAuth)
├── prompt-templates.ts            # CRUD + auto-versioning + quality scoring
├── prompt-ratings.ts              # CRUD + auto avg_rating recalculation
└── template-preprocessors.ts      # Junction CRUD: find/create(bulk set)/remove

apps/agor-ui/src/
├── components/
│   ├── PromptArchitect/           # Modal (Describe→Clarify→Review) + trigger button
│   ├── PromptLibrary/             # Drawer panel, TemplateCard, search, version history, PreprocessorPicker
│   └── PromptRating/              # Inline rating widget for sessions
└── utils/
    └── composeTemplate.ts         # Client-side composition of main template + preprocessor fragments
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/prompt-architect` | POST | `{ action: 'clarify'\|'generate', description, target }` |
| `/prompt-templates` | CRUD | Templates with auto-versioning on patch |
| `/prompt-ratings` | CRUD | Ratings (recalculates template avg_rating) |
| `/template-preprocessors` | find/create/remove | Junction: `{ template_id, preprocessor_ids[] }` |

### UI Integration Points

- **ZoneConfigModal** — "Architect" button next to Trigger Template (target: zone); PreprocessorPicker below trigger template; `preprocessor_ids` saved in ZoneTrigger
- **NewSessionModal** — "Architect" button + "Library" button in Initial Prompt label (target: session); Library drawer opens with `defaultCategory="session"` pre-filter; PreprocessorPicker below initial prompt composes at session creation
- **AppHeader** — Library book icon button → opens PromptLibraryPanel drawer
- **App.tsx** — `libraryPanelOpen` state manages the drawer; `pendingPromptInsert` state wires "Use" action to SessionPanel input
- **SessionPanel** — Consumes `pendingPromptInsert` via useEffect to populate prompt input; "Reset Conversation" button (ReloadOutlined) clears `sdk_session_id` to recover from stale SDK sessions
- **PromptArchitectModal** — Review step has editable title (Input), preview/edit toggle for template, saves `description` from Describe step; PreprocessorPicker in Review step for non-preprocessor templates; composes on "Use This Prompt"; saves preprocessor associations after template save
- **PromptLibraryPanel** — Accepts `defaultCategory` prop for pre-filtered category views; `onUseTemplate` callback inserts into active session or copies to clipboard
- **TemplatesTable** (Settings) — When editing a preprocessor template: shows Preprocessor Type dropdown, Compatible Categories multi-select, Insertion Mode radio

### Pre-Process Prompts (Composable Fragments)

Preprocessors are templates with `category='preprocessor'` — reusable building blocks that compose with other templates at use time.

**Categories:** `session | zone | scheduler | generic | preprocessor`

**Preprocessor Types:** `github_issue | plan | environment | scheduling | reference | custom`

**PreprocessorMetadata** (stored in template `metadata` JSON):
- `preprocessor_type` — sub-type classification
- `compatible_categories` — which template categories this preprocessor works with (empty = all)
- `insertion_mode` — `'before'` (default) or `'after'` the main template

**Composition:** `composeTemplate(mainTemplate, preprocessors[])` joins fragments with `\n\n---\n\n` separators, respecting insertion_mode ordering.

**PreprocessorPicker component:** Collapsible checklist with type badges, description snippets, up/down reordering buttons, filtered by `compatible_categories` when `targetCategory` prop is provided.

### Quality Scoring

Templates sorted by: `score = (avg_rating × 0.6) + (log2(usage_count + 1) × 0.3) + (recency × 0.1)`

Sort options: Best (default), Most Used, Newest, Top Rated

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

## Remote Dev Instance (172.31.231.133)

**Host:** `agent@172.31.231.133` (Nebula prod network — dev IP `192.168.100.133` is separate)
**Repo:** `~/agor` on branch `feat/prompt-architect`
**Stack:** `docker compose up` (base compose, SQLite mode, NOT postgres profile)
**Database:** SQLite at `/home/agor/.agor/agor.db` (~44MB, persisted in `agor-home` Docker volume)
**Ports:** 3030 (daemon), 5173 (UI)

### Sync Script

Push local source changes to the remote host:
```bash
cd /Users/brandongrantham/projects/agor
./sync-to-remote.sh            # rsync changed files
./sync-to-remote.sh --dry-run  # preview only
```
After syncing, the container's watch modes (tsup, tsx, Vite) auto-reload. For dependency changes (`pnpm-lock.yaml`), rebuild the image:
```bash
ssh agent@172.31.231.133 "cd ~/agor && docker compose up --build -d"
```

### Migrating SQLite → PostgreSQL

Current state is SQLite. To switch to PostgreSQL without losing data:

1. **Dump SQLite** (inside running container):
   ```bash
   ssh agent@172.31.231.133 "cd ~/agor && docker compose exec agor-dev sqlite3 /home/agor/.agor/agor.db .dump > /tmp/agor-sqlite-dump.sql"
   ```
2. **Start with postgres profile**:
   ```bash
   ssh agent@172.31.231.133 "cd ~/agor && docker compose --profile postgres up -d"
   ```
3. **Import data** — Convert SQLite dump to PostgreSQL-compatible SQL and load into the postgres container. Schema differences (e.g., `INTEGER` vs `SERIAL`, `TEXT` vs `VARCHAR`) will need manual adjustment. Drizzle migrations create the schema automatically, so only `INSERT` statements need importing.

**Note:** The `agor-home` Docker volume retains the SQLite DB even after switching. Reverting to SQLite is non-destructive.

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

### Stale SDK Session ID

If the executor exits with `"No conversation found with session ID: ..."`, the Claude-side conversation no longer exists. Click the **Reset Conversation** button (reload icon) in the SessionPanel header — this sets `sdk_session_id` to null so the next prompt starts a fresh AI conversation. Message history in Agor is preserved.

### Permission Button Not Working

The Approve/Deny buttons on permission requests require `sessionId` to be truthy. If the executor crashed before the permission was resolved, the `taskId` prop may be null — the handler falls back to `message.task_id`. If the session itself is stale (executor exited), reset the conversation first, then re-send the prompt.

### Permission Request Timeout

The executor waits **5 minutes** (300,000ms) for a permission decision before auto-denying and stopping execution. If the Approve button appears unresponsive, the request likely timed out — the card transitions from "pending" (yellow border, interactive buttons) to "denied" (no buttons). Reset the conversation and re-send the prompt. The timeout is configured in:
- `packages/core/src/permissions/permission-service.ts`
- `packages/executor/src/permissions/permission-service.ts`

---

## UI UX Improvements (Feb 2026)

### Tooltips
- **WorktreeCard** — All 4 action buttons (Drag, Terminal, Edit, Delete) use Ant Design `<Tooltip>` instead of native HTML `title` attributes
- **ThemeSwitcher** — Dropdown trigger button wrapped in `<Tooltip title="Theme">`

### Icon Swaps
- **Fit View** (`SessionCanvas.tsx`) — `ZoomInOutlined` → `FullscreenOutlined` (expand arrows instead of magnifying glass)
- **Spawn Subsession** (`SessionPanel.tsx`) — `BranchesOutlined` → `SubnodeOutlined` (avoids confusion with git branch icon used on worktree cards)

### Ant Design v6 Deprecation Fixes
- **AppHeader** — `<Divider type="vertical">` replaced with styled `<div>` separators (2 instances)
- **PromptArchitectModal** — `destroyOnClose` → `destroyOnHidden`

### Quick Reference Panel
- **New component:** `QuickReference/QuickReference.tsx` — Collapsible floating legend in bottom-right of canvas
- Renders inside `<ReactFlow>` as sibling to `<MiniMap>`, positioned absolutely
- 5 sections: Canvas, Worktree, Session, Prompt Architect, Header
- Prompt Architect section explains: Architect (AI generation), Library (browse templates), Rate (post-session rating)
- Collapse state persisted in `localStorage` (`agor-quick-reference-collapsed`)
- Themed via `theme.useToken()`, semi-transparent with `backdropFilter: blur(8px)`
