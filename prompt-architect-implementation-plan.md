# Prompt Architect — Claude CLI Implementation Plan

## How to Use This Document

This is a step-by-step execution plan for building the Prompt Architect feature on your forked Agor branch using Claude CLI. Each phase is broken into discrete tasks. Feed each task to Claude Code as a self-contained prompt.

**Environment**: Local Docker Compose dev setup (Agor's recommended approach)
**Target**: Your forked branch, single admin user
**Goal**: Validate → demo → pitch upstream to preset-io/agor

---

## Prerequisites

### 1. Fork & Clone

```bash
# Fork preset-io/agor on GitHub, then:
git clone https://github.com/<your-org>/agor.git
cd agor
git checkout -b feat/prompt-architect
```

### 2. Start Dev Environment

```bash
docker compose up
# UI: http://localhost:5173 → Login: admin@agor.live / admin
# Daemon: http://localhost:3030
```

### 3. Verify Working State

```bash
# In another terminal, verify everything works:
docker compose exec agor-dev curl http://localhost:3030/health
# Open http://localhost:5173 and create a test session
```

### 4. Set Up Claude Code

```bash
# Ensure Claude CLI is configured and has access to the repo
# Claude Code should be pointed at the agor/ root directory
```

---

## Phase 0: Minimal Viable Architect (~1-2 days)

**Goal**: A "Generate with Claude" button in the zone config modal that produces a ready-to-paste zone template. No persistence, no library, no versioning. Just: describe → generate → paste.

This phase validates the core concept with the absolute minimum code change.

---

### Task 0.1: Read the Codebase Context

**Claude CLI prompt:**

```
Read and understand the following files before making any changes:

1. AGENTS.md — development patterns and project structure
2. CLAUDE.md — coding conventions
3. packages/core/src/types/ — all TypeScript types, especially Session, Board, Zone
4. context/concepts/ — core design docs (read all .md files in this directory)
5. apps/agor-ui/src/ — understand the React component structure
6. apps/agor-daemon/src/ — understand the FeathersJS service structure

After reading, summarize:
- Where is the Zone configuration modal component?
- Where are zone templates rendered/executed?
- What Handlebars/Mustache template engine is used and where?
- What is the existing pattern for adding a new FeathersJS service?
- What is the existing pattern for adding a new React modal component?

Do NOT make any changes yet.
```

---

### Task 0.2: Create the Architect System Prompt

**Claude CLI prompt:**

```
Create a new file: packages/core/src/prompts/architect.ts

This file exports a constant ARCHITECT_SYSTEM_PROMPT — the system prompt
that will power the Prompt Architect meta-prompting feature.

Requirements:
1. Follow the existing TypeScript patterns in packages/core/src/
2. Export as a named constant (not default export)
3. The system prompt should define the AI's role as an "Agor Prompt Architect"
4. Include the COMPLETE list of available Agor Handlebars template variables,
   grouped by entity with descriptions of WHEN each is useful:

   Worktree variables:
   - {{ worktree.name }} — the worktree identifier
   - {{ worktree.path }} — absolute filesystem path to the code
   - {{ worktree.branch }} — current git branch name
   - {{ worktree.issue_url }} — linked GitHub issue URL (if set)
   - {{ worktree.pull_request_url }} — linked PR URL (if set)

   Board variables:
   - {{ board.name }} — the board this zone belongs to
   - {{ board.description }} — board description

   Session variables:
   - {{ session.title }} — the session title
   - {{ session.description }} — session description

   Environment variables:
   - {{ environment.url }} — the running environment URL
   - {{ environment.status }} — environment health status

   Repo variables:
   - {{ repo.name }} — repository name
   - {{ repo.default_branch }} — default branch (usually main)

   Helpers:
   - {{ add <number> worktree.unique_id }} — arithmetic for port allocation

5. Include SE prompt engineering best practices as instructions:
   - Always include explicit scope/constraints
   - Always specify output format
   - Always include success criteria
   - Never use vague instructions
   - Use the appropriate template variables for the target type

6. Include a list of anti-patterns to avoid:
   - Vague instructions ("do a good job", "be thorough")
   - Missing output format specifications
   - No scope boundaries
   - Assuming context the agent won't have
   - Filler words ("please", "kindly")
   - Dumping ALL variables when only some are relevant

7. Include output format instructions:
   - For target='zone': generate Handlebars template with appropriate variables
   - For target='session': generate a static prompt (no template variables)
   - For target='scheduler': generate template with scheduling context
   - Always structure output as: IDENTITY → CONTEXT → TASK → CONSTRAINTS → OUTPUT FORMAT

8. Also export a helper function:
   export function buildArchitectMessages(
     userDescription: string,
     target: 'zone' | 'session' | 'scheduler'
   ): Array<{ role: string; content: string }>

   This builds the messages array for the Claude API call.

Follow Agor's code standards: TypeScript strict mode, no any types.
```

---

### Task 0.3: Create the Backend Service

**Claude CLI prompt:**

```
Create a new FeathersJS service for the Prompt Architect.

Follow the EXACT patterns used by existing services in apps/agor-daemon/src/services/.
Look at an existing service (like sessions or tasks) for the file structure and patterns.

Create these files:

1. apps/agor-daemon/src/services/prompt-architect/prompt-architect.service.ts
   - A FeathersJS custom service (not a database-backed service)
   - Exposes a single method: create()
   - Input: { description: string, target: 'zone' | 'session' | 'scheduler' }
   - Logic:
     a. Import ARCHITECT_SYSTEM_PROMPT and buildArchitectMessages from @agor/core
     b. Use the Anthropic SDK (already a dependency in the project) to call Claude
     c. Use model 'claude-sonnet-4-5-20250929'
     d. Send the system prompt + user messages
     e. Parse the response and return: { title: string, template: string, variables_used: string[] }
   - For the API key: check how the existing Claude integration gets its key
     (likely from environment variables or the user's session config).
     Use the same pattern.

2. apps/agor-daemon/src/services/prompt-architect/prompt-architect.hooks.ts
   - Authentication hook: require authenticated user
   - Follow existing hook patterns

3. Register the service in the app configuration
   - Find where other services are registered and add this one
   - Path: /prompt-architect

IMPORTANT:
- Do NOT install new npm packages unless absolutely necessary
- Reuse the existing Anthropic SDK dependency
- Follow the repository pattern with branded types
- Use the existing error handling patterns
```

---

### Task 0.4: Add the UI Button to Zone Config

**Claude CLI prompt:**

```
Find the Zone configuration modal/editor component in the React UI.
It's likely in apps/agor-ui/src/components/ — search for files related to
"zone", "ZoneConfig", "ZoneEditor", or "ZoneTrigger".

Also look at the screenshots referenced in the docs: "zone_trigger_config"
and "zone_trigger_modal" to understand what the current UI looks like.

Once you find the component:

1. Add a button labeled "✨ Architect" (or "Build with Architect")
   positioned near the zone prompt template textarea.
   Use Ant Design components consistent with the rest of the UI.

2. When clicked, open a small modal (Ant Design Modal) with:
   - A text input: "Describe what this zone should do"
   - A disabled select showing "Zone Template" (pre-selected, since we're
     coming from the zone config)
   - A "Generate" button
   - A loading state while the API call runs

3. On "Generate" click:
   - Call the /prompt-architect service with:
     { description: userInput, target: 'zone' }
   - Use the existing Feathers client pattern for API calls
     (look at how other components call services)
   - On success: populate the zone's prompt template textarea with
     the returned template
   - Close the modal

4. Error handling:
   - Show an Ant Design notification on failure
   - Handle network errors gracefully

Follow the existing component patterns:
- Use the same import style
- Use the same state management approach (React hooks, context, etc.)
- Use the same styling approach (CSS modules, styled-components,
  Ant Design tokens — whatever the project uses)

Do NOT create a separate route or page. This is a modal triggered from
within the existing zone configuration UI.
```

---

### Task 0.5: Test End-to-End

**Claude CLI prompt:**

```
Verify the Phase 0 implementation works end-to-end:

1. Check that the daemon starts without errors:
   - Look at the docker compose logs for the daemon container
   - Verify the /prompt-architect service is registered
   - Check: curl http://localhost:3030/prompt-architect (should return
     method not allowed or similar, confirming the route exists)

2. Check that the UI compiles without errors:
   - Look at the Vite dev server output
   - Verify no TypeScript errors in the new components

3. Check the integration:
   - The "Architect" button should be visible in the zone config modal
   - Clicking it should open the generation modal
   - Submitting a description should call the backend
   - The generated template should populate the zone prompt field

4. Fix any issues found.

5. Run the project's code quality checks:
   - pnpm typecheck
   - pnpm lint
   - Ensure no regressions

Do this all from within the Docker container:
  docker compose exec agor-dev pnpm typecheck
  docker compose exec agor-dev pnpm lint
```

---

### Task 0.6: Commit Phase 0

**Claude CLI prompt:**

```
Prepare a clean commit for Phase 0.

1. Review all changed files and ensure they follow Agor's code standards
2. Remove any debug logging or TODO comments that shouldn't be committed
3. Ensure all new files have appropriate imports and exports

Commit inside the container (to avoid Husky binary issues):
  docker compose exec agor-dev git add .
  docker compose exec agor-dev git commit -m "feat: add Prompt Architect - Phase 0

  Add a 'Build with Architect' button to the zone configuration modal
  that generates well-structured zone templates from plain-English
  descriptions using Claude.

  New files:
  - packages/core/src/prompts/architect.ts (system prompt + helpers)
  - apps/agor-daemon/src/services/prompt-architect/ (generation service)
  - Zone config modal integration (Architect button + modal)

  This is Phase 0 of the Prompt Architect feature — single-shot generation
  with no persistence. Future phases add clarification, versioning,
  a prompt library, and ratings."
```

---

## Phase 1: Clarification Flow + Session Integration (~2-3 days)

**Goal**: Add the interactive clarification step (classify → ask 2-3 questions → generate) and extend beyond zones to the session creation modal.

---

### Task 1.1: Add Two-Step Generation (Clarify → Generate)

**Claude CLI prompt:**

```
Refactor the prompt-architect service to support a two-step flow:

Step 1 — Clarify:
  POST /prompt-architect { action: 'clarify', description: string, target: string }
  Returns: { questions: Array<{ question: string, options?: string[], priority: string }> }

Step 2 — Generate:
  POST /prompt-architect { action: 'generate', description: string, target: string, clarifications: Record<string, string> }
  Returns: { title: string, template: string, variables_used: string[] }

Implementation:
1. Update prompt-architect.service.ts to handle the 'action' field
2. For 'clarify': call Claude with a prompt that asks it to generate
   2-3 targeted clarifying questions based on the task description.
   The response should be JSON with the questions array.
3. For 'generate': call Claude with the original description PLUS
   the user's answers to the clarifying questions.
4. Keep backward compatibility: if no 'action' is provided,
   default to single-shot 'generate' (Phase 0 behavior)

Update the UI modal (from Phase 0) to support the two-step flow:
1. User types description → clicks "Next"
2. Modal shows 2-3 clarifying questions with input fields or option buttons
3. User answers → clicks "Generate"
4. Template appears in preview

Use Ant Design Steps component to show progress: Describe → Clarify → Review
```

---

### Task 1.2: Add to Session Creation Modal

**Claude CLI prompt:**

```
Find the session creation modal component (the dialog that opens when you
click "Create Session" or similar in the UI).

Add a "Build Prompt" tab or section:
1. Find the component — likely has fields for session title, agent type
   (Claude/Codex/Gemini), worktree selection, and prompt text
2. Add an "✨ Architect" button near the prompt textarea
   (same pattern as the zone config integration from Phase 0)
3. When clicked, open the same PromptArchitect modal but with
   target='session' pre-selected
4. On completion, populate the session's prompt field with the
   generated (static, no Handlebars variables) prompt

Follow the exact same patterns used in the zone config integration.
Reuse the modal component — just pass target='session' instead of 'zone'.
```

---

### Task 1.3: Extract Reusable PromptArchitectModal Component

**Claude CLI prompt:**

```
The Architect modal is now used in two places (zone config, session creation)
and will be used in more. Extract it into a standalone reusable component.

Create: apps/agor-ui/src/components/PromptArchitect/PromptArchitectModal.tsx

Props:
  - target: 'zone' | 'session' | 'scheduler'
  - onComplete: (result: { title: string, template: string }) => void
  - open: boolean
  - onClose: () => void

The component handles the full flow internally:
  1. Intake (description input)
  2. Clarification (questions from Claude)
  3. Preview (generated template with syntax highlighting)
  4. "Use this" button calls onComplete with the result

Also create:
  - PromptArchitectButton.tsx — the trigger button (✨ Architect)
    that manages modal open/close state

Update the zone config and session creation integrations to use these
shared components instead of duplicated code.

Move related files into apps/agor-ui/src/components/PromptArchitect/
```

---

### Task 1.4: Test & Commit Phase 1

**Claude CLI prompt:**

```
Test Phase 1:
1. Zone config: Architect button → clarify → generate → paste (still works)
2. Session creation: Architect button → clarify → generate → paste (new)
3. Run pnpm typecheck and pnpm lint inside the container
4. Fix any issues

Commit:
  docker compose exec agor-dev git add .
  docker compose exec agor-dev git commit -m "feat: Prompt Architect Phase 1 - clarification flow + session integration

  - Add two-step generation: clarify (2-3 questions) then generate
  - Extend Architect to session creation modal
  - Extract reusable PromptArchitectModal component
  - Ant Design Steps component shows Describe → Clarify → Review flow"
```

---

## Phase 2: Persistence + Version History + Library (~3-4 days)

**Goal**: Templates are saved to the database with full version history. A Prompt Library sidebar panel lets you browse, search, fork, and reuse templates.

---

### Task 2.1: Database Schema

**Claude CLI prompt:**

```
Create the Drizzle ORM schema for prompt templates.

Look at existing schemas in packages/core/src/db/schema/ to understand
the patterns (branded types, ULID generation, column conventions).

Create: packages/core/src/db/schema/prompt-templates.ts

Three tables:

1. prompt_templates
   - id: text primary key (ULID pattern matching existing tables)
   - board_id: text, nullable, references boards
   - created_by: text, references users
   - title: text, not null
   - description: text, nullable
   - category: text, not null ('session' | 'zone' | 'scheduler' | 'generic')
   - template: text, not null
   - variables: text, nullable (JSON string)
   - metadata: text, nullable (JSON string — generation context)
   - version: integer, not null, default 1
   - parent_id: text, nullable (self-reference for forks)
   - is_latest: integer, not null, default 1
   - usage_count: integer, default 0
   - avg_rating: real, default 0
   - created_at: text, not null
   - updated_at: text, not null

2. prompt_template_versions
   - id: text primary key
   - template_id: text, not null, references prompt_templates
   - version: integer, not null
   - template: text, not null
   - variables: text, nullable
   - change_note: text, nullable
   - created_by: text, references users
   - created_at: text, not null

3. prompt_ratings
   - id: text primary key
   - template_id: text, not null, references prompt_templates
   - session_id: text, nullable, references sessions
   - rated_by: text, references users
   - rating: integer, not null (1-5)
   - feedback: text, nullable
   - created_at: text, not null

Export the schemas and add them to the main schema index file.

Also create the corresponding TypeScript types in:
  packages/core/src/types/prompt-template.ts

Follow the branded type pattern used for SessionId, BoardId, etc.

Create a Drizzle migration file following the existing migration patterns.
```

---

### Task 2.2: CRUD Service for Templates

**Claude CLI prompt:**

```
Create a FeathersJS service for prompt template CRUD.

Follow the exact patterns of existing database-backed services
(look at sessions, boards, or tasks services for the pattern).

Create: apps/agor-daemon/src/services/prompt-templates/

Files:
1. prompt-templates.service.ts
   - Standard FeathersJS CRUD (find, get, create, patch, remove)
   - On create: set version=1, is_latest=1, generate ULID
   - On patch: auto-version (see below)
   - find supports: filter by category, board_id, search by title

2. prompt-templates.hooks.ts
   - before create: validate input, set timestamps, set created_by from auth
   - before patch: auto-versioning logic:
     a. Read current state
     b. Insert current state into prompt_template_versions
     c. Increment version number
     d. Update the main record
   - after create/patch: update timestamps

3. Register at path: /prompt-templates

Also create: apps/agor-daemon/src/services/prompt-ratings/
   - Simple CRUD service for ratings
   - On create: recalculate avg_rating on the parent template
   - Path: /prompt-ratings
```

---

### Task 2.3: Update Architect Service to Save Templates

**Claude CLI prompt:**

```
Update the prompt-architect service to optionally save generated templates.

When the 'generate' action completes, add a 'save' field to the response:
  { title, template, variables_used, template_id?: string }

If the user chose to save (a flag in the request), the service:
1. Creates a new prompt_template record
2. Returns the template_id in the response

Also update the PromptArchitectModal UI:
- After generation, show a "Save to Library" button alongside "Use Now"
- "Save to Library" prompts for an optional title override and description
- Calls POST /prompt-templates to persist
- Shows a success notification with the saved template name
- "Use Now" works as before (paste into field, no persistence)
```

---

### Task 2.4: Build the Prompt Library Panel

**Claude CLI prompt:**

```
Create the Prompt Library sidebar panel.

Look at the existing comments panel or any other sidebar panel in the UI
to understand the pattern for sidebar/drawer components.

Create: apps/agor-ui/src/components/PromptLibrary/

Files:
1. PromptLibraryPanel.tsx
   - Ant Design Drawer component, anchored to the right side
   - Triggered by a new "📚 Library" button in the board toolbar
   - Content:
     a. Search input (filters by title/description)
     b. Category tabs: All | Zone | Session | Scheduler
     c. List of TemplateCard components
     d. "Create New" button (opens PromptArchitectModal)

2. TemplateCard.tsx
   - Compact card showing: title, category badge, description preview
   - Stats row: avg rating (stars), usage count, version number
   - Action buttons: [Use] [Fork] [View History]
   - "Use" pastes the template (behavior depends on context —
     if opened from zone config, pastes into zone; otherwise copies to clipboard)
   - "Fork" creates a copy with parent_id set, opens in PromptArchitectModal for editing
   - "View History" expands to show version timeline

3. VersionHistory.tsx
   - Expandable section within TemplateCard
   - Shows version timeline: v3 (current) → v2 → v1
   - Each version shows: change note, date, "Restore" and "Diff" buttons
   - "Restore" patches the template back to that version's content
   - "Diff" is stretch goal — skip for now, just show the version list

4. TemplateSearch.tsx
   - Search input + category filter
   - Calls GET /prompt-templates with query params
   - Debounced search

Data loading:
- Use the existing Feathers client pattern for data fetching
- Load templates for the current board (filter by board_id)
- Also show "global" templates (board_id = null) in a separate section
```

---

### Task 2.5: Test & Commit Phase 2

**Claude CLI prompt:**

```
Test Phase 2:
1. Generate a template via Architect → Save to Library → verify it appears
2. Open Prompt Library → search → find the saved template
3. Use a template from the library (paste into zone config)
4. Fork a template → verify parent_id is set
5. Edit a template → verify version history is created
6. Check database directly:
   docker compose exec agor-dev sqlite3 ~/.agor/agor.db \
     "SELECT id, title, version, category FROM prompt_templates"

Run code quality:
   docker compose exec agor-dev pnpm typecheck
   docker compose exec agor-dev pnpm lint

Commit:
   docker compose exec agor-dev git add .
   docker compose exec agor-dev git commit -m "feat: Prompt Architect Phase 2 - persistence, versioning, library

   - Database schema: prompt_templates, prompt_template_versions, prompt_ratings
   - CRUD services with auto-versioning on edit
   - Prompt Library sidebar panel with search, categories, fork/use actions
   - Version history timeline per template
   - Save to Library flow from Architect modal"
```

---

## Phase 3: Ratings + Quality Loop + Upstream Prep (~2-3 days)

**Goal**: Add the rating system, polish the UX, and prepare the upstream feature request.

---

### Task 3.1: Template Metadata Line (Approach B Rating)

**Claude CLI prompt:**

```
Update the prompt-architect service so that every generated template
includes a metadata footer line.

When a template is generated AND saved to the library, append this
line to the end of the template:

---
[Prompt Architect v{version} | "{title}" | template_id: {id}]

This line serves two purposes:
1. Traceability — anyone reading the prompt knows it was generated and which version
2. Future rating hook — the template_id can be used to link session outcomes back

Also update the session creation flow:
- When a session is created using a template from the library,
  store the template_id in the session's metadata JSON field
  (session.metadata = { ...existing, prompt_template_id: "..." })
- This links sessions to the templates that generated their prompts
- Increment the template's usage_count

Do NOT add a separate template_id column to the sessions table —
use the existing metadata JSON field to minimize schema changes.
```

---

### Task 3.2: Rating Widget

**Claude CLI prompt:**

```
Add a rating widget to the session conversation UI.

Find the session/conversation view component. When a session has
a prompt_template_id in its metadata:

1. Show a small, non-intrusive banner at the top of the conversation
   (or in a collapsible section):

   "Built with Prompt Architect: {template_title} v{version}"
   ★★★★★  [Rate this prompt]

2. Clicking the stars or "Rate this prompt" opens a small popover:
   - 5-star rating (Ant Design Rate component)
   - Optional textarea: "What would you improve?"
   - "Submit" button

3. On submit:
   - POST /prompt-ratings with { template_id, session_id, rating, feedback }
   - Show success notification
   - Hide the rating prompt (don't ask again for this session)

4. The rating should update the template's avg_rating in the
   prompt_templates table (the ratings service hook handles this)

Keep it lightweight — this should feel like a Slack emoji reaction,
not a survey form.
```

---

### Task 3.3: Quality Sorting in Library

**Claude CLI prompt:**

```
Update the Prompt Library panel to sort templates by quality score.

Sorting algorithm:
  score = (avg_rating * 0.6) + (log2(usage_count + 1) * 0.3) + (recency * 0.1)

Where recency = 1.0 for templates updated today, decaying to 0.0
for templates not updated in 30+ days.

Implementation:
1. Add a computed 'score' to the GET /prompt-templates response
   (calculate in the service or hooks, not in the database query)
2. Default sort: by score descending
3. Add sort options to the Library panel header:
   - "Best" (score — default)
   - "Most Used" (usage_count)
   - "Newest" (created_at)
   - "Highest Rated" (avg_rating)

Use Ant Design Segmented component for the sort toggle.
```

---

### Task 3.4: Polish & Edge Cases

**Claude CLI prompt:**

```
Review the entire Prompt Architect feature and fix polish issues:

1. Empty states:
   - Library panel with no templates: show a friendly message +
     "Create your first template" CTA
   - Architect modal when API key is not configured: show a helpful error

2. Loading states:
   - Skeleton loading in Library panel while templates load
   - Spinner on Architect "Generate" button during API call
   - Disable the "Generate" button while loading

3. Error handling:
   - Claude API timeout: retry once, then show user-friendly error
   - Invalid template variables: warn (don't block) in the preview
   - Network errors: Ant Design notification with retry option

4. Accessibility:
   - All buttons have aria-labels
   - Modal focus management is correct
   - Keyboard navigation works in the Library panel

5. Mobile responsiveness:
   - Agor has mobile-friendly prompting — ensure the Architect modal
     and Library panel work on mobile viewport sizes

Run full code quality:
   docker compose exec agor-dev pnpm typecheck
   docker compose exec agor-dev pnpm lint
```

---

### Task 3.5: Final Commit + Tag

**Claude CLI prompt:**

```
Prepare the final Phase 3 commit and create a release tag.

1. Review all files changed across all phases
2. Ensure consistent code style throughout
3. Remove any leftover debug code, console.logs, or TODO comments
4. Verify the feature works end-to-end:
   a. Open zone config → Architect → describe → clarify → generate → save
   b. Open Prompt Library → find template → use it
   c. Create a session with the template → rate it after
   d. Check version history works
   e. Fork a template and verify lineage

Commit:
   docker compose exec agor-dev git add .
   docker compose exec agor-dev git commit -m "feat: Prompt Architect Phase 3 - ratings, quality sorting, polish

   - Rating widget in session UI (5-star + optional feedback)
   - Template metadata footer for traceability
   - Quality-based sorting in Prompt Library (score = rating + usage + recency)
   - Polish: empty states, loading, error handling, mobile support"

Tag:
   docker compose exec agor-dev git tag -a v0.1.0-prompt-architect \
     -m "Prompt Architect feature complete (Phases 0-3)"

Push:
   git push origin feat/prompt-architect
   git push origin v0.1.0-prompt-architect
```

---

## Phase 4: Upstream Feature Request (When Ready)

### Prepare the Pitch

After using the feature for a while and collecting some data:

1. **Record a demo video** (2-3 minutes):
   - Show the full workflow: describe → clarify → generate → save → use → rate
   - Show the Prompt Library with multiple templates and ratings
   - Show version history on a template

2. **Collect metrics** from your usage:
   - Number of templates generated
   - Average rating
   - Usage counts
   - Time saved (estimate)

3. **Open a GitHub issue** on `preset-io/agor`:

```markdown
Title: feat: Prompt Architect — interactive prompt builder for zones, sessions, and scheduler

## Summary
A guided prompt construction tool that generates well-engineered zone templates,
session prompts, and scheduler templates from plain-English descriptions.

## Problem
Zone templates and session prompts require dual expertise in prompt engineering
and Agor's template variable system. Quality varies across team members.
No feedback loop exists for which prompts work well.

## Solution
An "Architect" button in the zone config, session creation, and scheduler UIs
that: (1) takes a plain-English description, (2) asks targeted clarifying questions,
(3) generates a structured prompt with appropriate Agor variables, (4) saves to a
versioned Prompt Library for reuse, and (5) collects quality ratings after sessions.

## Implementation
We've built this on a fork and have been using it for [X weeks].
- [X] templates generated, avg rating [X]/5
- Demo video: [link]
- Branch: [link to your fork's branch]

## Alignment with Promptimize
This complements the existing Promptimize toolkit — Prompt Architect builds
prompts, Promptimize evaluates them. Together they create a full prompt
engineering lifecycle for Agor.

## PR ready when you are
Happy to clean up the branch and submit a PR if there's interest.
```

4. **Engage in the discussion** before submitting a PR

---

## Notes on Docker Compose Development

### Working Inside the Container

Most commands should be run inside the container to avoid binary mismatches:

```bash
# Open a shell in the dev container
docker compose exec agor-dev bash

# Or prefix commands
docker compose exec agor-dev pnpm typecheck
docker compose exec agor-dev pnpm lint
```

### Hot Reload

The Docker setup mounts your local files as volumes. When you edit files
(via Claude Code or your editor), changes are picked up automatically:
- **UI**: Vite HMR refreshes the browser instantly
- **Daemon**: tsx watch restarts the daemon on changes

### Database Inspection

```bash
# SQLite (default)
docker compose exec agor-dev sqlite3 ~/.agor/agor.db ".tables"
docker compose exec agor-dev sqlite3 ~/.agor/agor.db \
  "SELECT id, title, version FROM prompt_templates"

# Check ratings
docker compose exec agor-dev sqlite3 ~/.agor/agor.db \
  "SELECT pt.title, pr.rating, pr.feedback
   FROM prompt_ratings pr
   JOIN prompt_templates pt ON pr.template_id = pt.id"
```

### If Things Break

```bash
# Restart everything
docker compose down && docker compose up

# Just restart daemon (faster)
docker compose restart agor-dev

# Check logs
docker compose logs -f agor-dev

# Kill stuck processes
docker compose exec agor-dev lsof -ti:3030 | xargs kill -9
```

---

## Deployment Discussion (Deferred)

The question of Docker Compose vs. other deployment options for your team's
"live" Agor instance is separate from this feature work. The short version:

**Docker Compose is fine for small teams** (2-5 people, single machine).
The Agor team explicitly recommends it, and it's their tested path.

**When it starts feeling clumsy**, the typical pain points are:
- No zero-downtime deploys (docker compose up rebuilds everything)
- No automatic restarts on crash
- No resource limits per user
- Shared machine = single point of failure

**The middle ground** (before Kubernetes) would be something like:
- Docker Compose with `restart: unless-stopped` and healthchecks
- A reverse proxy (Caddy or nginx) for HTTPS + auth
- PostgreSQL mode for better concurrency
- Regular database backups

But tackle that after Prompt Architect is validated. One thing at a time.
