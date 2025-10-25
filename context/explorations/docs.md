# Documentation Analysis & Launch Readiness

**Date:** 2025-10-25
**Status:** Pre-launch documentation audit
**Location:** `apps/agor-docs/`

This document analyzes the current state of Agor's documentation and identifies gaps for launch readiness.

---

## ✅ What Exists (Strong Foundation)

### Core Documentation

**Home page** (`pages/index.mdx`)

- Great overview with value proposition
- 5 high-quality screenshots (board, conversation, session creation, settings, zone triggers)
- Clear differentiation points (orchestration layer, multiplayer canvas, zone triggers, worktree management)
- Links to GitHub repo and discussions

**Concepts** (`pages/guide/concepts.mdx`)

- Excellent deep dive into core primitives
- Worktrees: isolation, best practices (1 worktree = 1 issue = 1 PR)
- Boards: spatial organization, multiplayer collaboration
- Zones: templated triggers with Handlebars examples
- Sessions: fork vs spawn with genealogy trees
- Environments: runtime instances with port management

**FAQ** (`pages/faq.mdx`)

- Outstanding detail on session trees and genealogy
- Clear fork vs spawn comparison table
- Spatial layout cognitive psychology explanation
- Zone triggers with real-world examples
- Handlebars template documentation
- Best practices section

**Architecture** (`pages/guide/architecture.mdx`)

- System architecture with mermaid diagrams
- Technology stack breakdown
- Real-time multiplayer WebSocket flow
- Core services table (12 services documented)
- Data architecture hybrid schema strategy
- Authentication strategies

**SDK Comparison** (`pages/guide/sdk-comparison.mdx`)

- Comprehensive feature matrix for Claude/Codex/Gemini
- 10 feature categories with detailed breakdowns
- Streaming, permissions, MCP integration, git awareness
- "Choosing an Agent" decision guide
- Future improvements roadmap

**Docker Guide** (`pages/guide/docker.mdx`)

- Quick start with docker compose
- Running multiple instances in parallel
- Port naming conventions
- Project name flag usage
- Cleanup instructions

**Development Guide** (`pages/guide/development.mdx`)

- Basic project structure
- Tech stack overview
- Links to CLAUDE.md for detailed guidelines
- **NOTE:** Very minimal, could be expanded

**Getting Started** (`pages/guide/getting-started.mdx`)

- Basic installation steps
- Login credentials
- **NOTE:** Just installation, not a real walkthrough

### API/CLI Reference

**REST API** (`pages/api-reference/rest.mdx`)

- All FeathersJS services documented
- Sessions, Tasks, Messages, Repositories, Boards, Users, MCP Servers
- Request/response examples
- Query parameters documented

**WebSocket Events** (`pages/api-reference/websockets.mdx`)

- Basic event documentation
- Real-time update patterns

**CLI Commands** (`pages/cli/*.mdx`)

- Full command pages: session, repo, board, user, config
- Examples and usage patterns

### Assets & Branding

**Screenshots** (`public/screenshots/`)

- `board.png` - Multiplayer canvas with zones
- `conversation_full_page.png` - Task-centric conversation UI
- `create_session_modal.png` - Session creation with agent selection
- `settings_modal.png` - MCP server and worktree management
- `zone_trigger_modal.png` - Zone trigger configuration

**Branding**

- Logo and favicon (proper teal #2e9a92 theme)
- Nextra theme configured
- BETA badge in header

---

## 🔴 Critical Gaps for Launch

### 1. Quick Start Tutorial

**Current state:** "Getting Started" is just installation commands
**What's needed:** Step-by-step first session walkthrough

Should include:

- Creating your first worktree from UI
- Starting your first AI session
- Executing your first prompt with streaming
- Understanding the board layout
- Adding a zone and triggering it
- Viewing conversation history
- **Goal:** 5-minute "aha moment" for new users

**Priority:** CRITICAL - This is the first-run experience

---

### 2. Installation Guide (Separate from Quick Start)

**Current state:** Scattered across multiple docs
**What's needed:** Comprehensive installation reference

Should cover:

- **Local development setup**
  - Prerequisites (Node, pnpm, git)
  - Clone and install (`pnpm install`)
  - Database initialization
  - Running daemon + UI in dev mode
- **Docker Compose deployment** (expand current guide)
  - Single instance
  - Multiple instances (already covered)
  - Volume management
  - Environment variables
- **GitHub Codespaces** (mentioned but not documented)
  - One-click launch
  - Port forwarding
  - Persistent workspace setup
- **System requirements**
  - OS compatibility (macOS, Linux, Windows/WSL)
  - Memory/CPU recommendations
  - Disk space for repos/worktrees
- **Port configuration**
  - Default ports (3030, 5173)
  - Customizing via environment variables
  - Config file (`~/.agor/config.yaml`)

**Priority:** CRITICAL - Users need to get it running

---

### 3. Troubleshooting Guide

**Current state:** None (some issues documented in CLAUDE.md but not user-facing)
**What's needed:** Common issues and solutions

Essential entries:

- **Daemon not starting**
  - Port already in use
  - Permission errors
  - Database initialization failures
- **Port conflicts**
  - Finding processes on ports (lsof)
  - Killing stuck processes
  - Changing default ports
- **Database errors**
  - Corrupted database recovery
  - Migration failures
  - Backup/restore
- **Agent API key configuration**
  - Where to set API keys (env vars, config file)
  - Testing API connectivity
  - Rate limits and quota errors
- **WebSocket connection failures**
  - CORS issues
  - Firewall blocking WebSocket
  - Connection timeout errors
- **tsx/watch mode issues** (from CLAUDE.md)
  - Cache clearing (`rm -rf node_modules/.tsx`)
  - Changes not picked up
  - Core package rebuild needed
- **Git worktree errors**
  - Worktree creation failures
  - Branch conflicts
  - Detached HEAD state
- **UI not connecting to daemon**
  - VITE_DAEMON_URL misconfiguration
  - Network issues
  - Health check failures

**Priority:** CRITICAL - First thing users need when stuck

---

### 4. Worktree Management Guide

**Current state:** Concepts explained in FAQ/Concepts, but no practical how-to
**What's needed:** Hands-on worktree management guide

Should cover:

- **Creating worktrees**
  - Via UI: Repository → "New Worktree" button
  - Via CLI: `agor worktree create`
  - Choosing branch strategy (new branch vs existing)
  - Naming conventions
- **Linking worktrees to issues/PRs**
  - Setting issue URL
  - Setting PR URL
  - Custom context JSON for metadata
- **Managing multiple worktrees**
  - Viewing all worktrees in repo
  - Switching between worktrees
  - Parallel development scenarios
- **Environment instances per worktree**
  - Starting/stopping environments
  - Port management (unique per worktree)
  - Health monitoring
  - Accessing running apps
- **Cleaning up old worktrees**
  - Deleting via UI
  - Deleting via CLI
  - Git worktree pruning
  - Disk space management
- **Best practices**
  - 1 worktree = 1 issue = 1 PR
  - Feature branch naming
  - When to create new worktree vs reuse
  - Merging strategy

**Priority:** CRITICAL - Worktrees are core to Agor's value prop

---

### 5. Use Cases / Real-World Examples

**Current state:** Conceptual explanations but no concrete workflows
**What's needed:** End-to-end scenario walkthroughs

Suggested scenarios:

1. **Building a feature end-to-end**
   - Create worktree for feature/auth-system
   - Link to GitHub issue #123
   - Start Claude session
   - Iterate on implementation
   - Fork session for test generation
   - Create PR from worktree
   - Clean up

2. **Code review workflow with zones**
   - Set up "Ready for Review" zone
   - Configure zone trigger template (reads PR URL, asks for review)
   - Complete feature implementation
   - Drag worktree to zone
   - Session auto-prompts for review
   - Generate review summary

3. **Multi-agent parallel development**
   - Start main session with Claude for architecture
   - Spawn Codex session for test generation
   - Spawn Gemini session for documentation
   - All working on same worktree, different files
   - Coordinate via board visibility

4. **Forking for test generation**
   - Implement feature in main session
   - Fork session at completion
   - Forked session has full context
   - Prompt: "Write comprehensive unit tests"
   - Tests generated without interrupting main work

5. **Team collaboration scenario**
   - Developer 1 creates worktree for feature
   - Developer 2 sees worktree on shared board
   - Developer 2 creates session in same worktree
   - Real-time cursor tracking
   - Both agents working in parallel (different files)

**Priority:** CRITICAL - Shows "why Agor?" with concrete value

---

### 6. Video/GIF Demos

**Current state:** Static screenshots only
**What's needed:** Motion shows the magic

Recommended recordings (15-30 seconds each):

- **Creating a session and executing a prompt**
  - "New Session" button → agent selection → prompt input → streaming response
- **Dragging a worktree into a zone**
  - Worktree card on board → drag to zone → trigger modal → session execution
- **Real-time cursor collaboration**
  - Two browser windows side-by-side → cursor movements synced → facepile updates
- **Forking a session**
  - Session tree visualization → fork button → new branch appears → independent conversations
- **Board organization**
  - Create zones → drag worktrees to organize → spatial layout demo
- **Environment management**
  - Start environment → health check → click app URL → running app opens

**Tools:** Screen2Gif, Kap, or CloudApp for quick recordings
**Priority:** CRITICAL - Visual proof of multiplayer/spatial value

---

## 🟡 Important Gaps (Should Have for Launch)

### 7. MCP Integration Guide

**Current state:** Mentioned in architecture/SDK comparison, not standalone guide
**What's needed:** Practical MCP setup guide

Should cover:

- **What is MCP?** (brief intro)
- **Adding MCP servers in UI**
  - Settings modal → MCP Servers tab
  - Add server button → name, command, args, env
  - Testing server connection
- **Configuring MCP servers per session**
  - Session settings → select MCP servers
  - Available tools from MCP server
  - Tool execution flow
- **Example MCP server configs**
  - Filesystem: `npx -y @modelcontextprotocol/server-filesystem`
  - Brave Search: `npx -y @modelcontextprotocol/server-brave-search`
  - Custom servers: defining your own
- **Troubleshooting MCP**
  - Server won't start
  - Tools not appearing
  - Permission errors
  - Capability queries

**Priority:** IMPORTANT - MCP is a key differentiator for Claude

---

### 8. Environment Configuration Guide

**Current state:** Mentioned in concepts, no practical guide
**What's needed:** How to configure repo environments

Should cover:

- **Setting up environment configs per repo**
  - Repo settings in UI → Environment tab
  - Defining up_command, down_command, health_check
  - App URL template
- **Port template syntax**
  - Handlebars helpers: `{{add 9000 worktree.unique_id}}`
  - Why unique ports per worktree
  - Port range recommendations
- **Health check configuration**
  - HTTP endpoint polling
  - Timeout settings
  - Retry logic
- **Start/stop commands for different stacks**
  - Node: `pnpm dev` with custom port
  - Python: `./manage.py runserver 0.0.0.0:{{port}}`
  - Docker: `docker compose up` with project name
  - Ruby: `rails server -p {{port}}`
- **Environment variables**
  - Passing to up_command
  - Per-worktree env vars
  - Secrets management

**Priority:** IMPORTANT - Environments are a core feature

---

### 9. Permission System Guide

**Current state:** Mentioned in SDK comparison, not detailed
**What's needed:** Understanding permission modes

Should cover:

- **Permission modes**
  - `ask` - Prompt for each tool use
  - `auto` - Auto-approve pre-configured tools
  - `allow-all` - No prompts (dangerous)
- **Configuring permissions per agent**
  - Session settings → Permission mode
  - Per-tool permissions (Claude only)
  - Default settings
- **Permission differences between agents**
  - Claude: Rich permission widgets with previews
  - Codex: Basic approve/deny
  - Gemini: Function calling approval
- **Security best practices**
  - When to use `ask` vs `auto`
  - Reviewing tool use history
  - Revoking permissions

**Priority:** IMPORTANT - Security implications

---

### 10. Authentication & Multi-User Setup

**Current state:** Mentioned in architecture, no user guide
**What's needed:** Multi-user configuration guide

Should cover:

- **Anonymous vs authenticated mode**
  - Local dev: anonymous (default)
  - Team use: authenticated
  - Security considerations
- **Creating user accounts**
  - Via UI: Settings → Users → Add User
  - Via CLI: `agor user create`
  - Email/password requirements
- **JWT tokens**
  - Token lifetime
  - Refresh flow
  - Token storage (localStorage)
- **Team collaboration workflow**
  - Shared daemon instance
  - User-specific sessions
  - Board permissions (future)
- **User management**
  - Listing users
  - Updating profiles
  - Avatar emoji selection
  - Deleting accounts

**Priority:** IMPORTANT - Required for teams

---

### 11. Migration Guide

**Current state:** `session load-claude` command exists but not documented
**What's needed:** Migration pathways from existing tools

Should cover:

- **From vanilla Claude Code CLI to Agor**
  - Why migrate? (multiplayer, worktrees, zones)
  - Using `agor session load-claude <session-id>`
  - Transcript parsing and import
  - Bulk import multiple sessions
  - Continuing imported sessions
- **From Cursor/other tools**
  - No direct import (no JSONL format)
  - Recreating project setup manually
  - Agent-agnostic approach
- **Best practices**
  - When to import old sessions
  - Starting fresh vs importing
  - Cleaning up legacy setups

**Priority:** IMPORTANT - Reduces barrier to adoption

---

## 🟢 Nice to Have (Post-Launch)

### 12. Changelog

- Version history with release notes
- Breaking changes
- Migration guides between versions

### 13. Detailed Roadmap

- Beyond homepage summary
- Feature voting/upvoting
- Timeline estimates
- Contribution opportunities

### 14. Community Links

- Discord server (if created)
- GitHub Discussions (already linked)
- Twitter/social media
- Community showcases

### 15. Comparison Page

- vs vanilla Claude Code CLI
- vs Cursor
- vs Replit Agent
- vs Codeium
- Feature matrix

### 16. Advanced Workflows

- Complex multi-agent orchestration patterns
- Zone composition (chaining triggers)
- Custom context templates
- Report generation automation

### 17. Keyboard Shortcuts Reference

- Board navigation
- Session shortcuts
- Global hotkeys
- Vim-style navigation (if implemented)

### 18. Database Backup/Restore Guide

- Backing up `~/.agor/agor.db`
- Automated backup strategies
- Disaster recovery
- Migration to PostgreSQL (future)

### 19. Production Deployment Guide

- Beyond Docker dev setup
- Reverse proxy (nginx)
- SSL/TLS configuration
- Cloud deployment (AWS, GCP, Azure)
- Scaling considerations
- Monitoring and logging

### 20. Performance & Scaling Tips

- Database optimization
- Message pagination
- Worktree cleanup automation
- Disk space management
- Memory tuning

---

## 📊 Navigation Structure Analysis

### Current Navigation (`pages/_meta.ts`)

```typescript
{
  index: 'Home',
  guide: 'Guide',
  cli: 'CLI Reference',
  'api-reference': 'API Reference',
  faq: 'FAQ',
}
```

### Guide Subnav (`pages/guide/_meta.ts`)

```typescript
{
  'getting-started': 'Getting Started',
  concepts: 'Concepts',
  architecture: 'Architecture',
  docker: 'Docker Guide',
  development: 'Development Guide',
  // NOTE: sdk-comparison exists but NOT in nav!
}
```

### Issues

- `sdk-comparison.mdx` exists but not in navigation metadata
- No "Troubleshooting" in nav
- No "Tutorials" or "Examples" section
- Guides are flat, could be grouped

### Suggested Structure

```typescript
// pages/_meta.ts
{
  index: 'Home',
  'quick-start': 'Quick Start',  // NEW
  guide: 'Guide',
  tutorials: 'Tutorials',         // NEW
  cli: 'CLI Reference',
  'api-reference': 'API Reference',
  faq: 'FAQ',
  troubleshooting: 'Troubleshooting',  // NEW
}

// pages/guide/_meta.ts
{
  installation: 'Installation',  // NEW (expand from getting-started)
  concepts: 'Concepts',
  architecture: 'Architecture',
  'worktree-management': 'Worktree Management',  // NEW
  'mcp-integration': 'MCP Integration',          // NEW
  'environment-setup': 'Environment Setup',      // NEW
  'sdk-comparison': 'SDK Comparison',  // EXISTS, add to nav
  permissions: 'Permissions',          // NEW
  authentication: 'Authentication',     // NEW
  docker: 'Docker Guide',
  development: 'Development',
  migration: 'Migration',               // NEW
}

// pages/tutorials/_meta.ts  (NEW SECTION)
{
  'first-session': 'Your First Session',
  'zone-workflow': 'Zone-Based Workflow',
  'team-collaboration': 'Team Collaboration',
  'fork-and-spawn': 'Fork & Spawn Patterns',
  'multi-agent': 'Multi-Agent Orchestration',
}
```

---

## 🎯 Launch Readiness Recommendation

### MVP Launch Checklist

**Must Have (Critical):**

1. ✅ Quick Start Tutorial (5-min walkthrough)
2. ✅ Installation Guide (all deployment methods)
3. ✅ Troubleshooting Guide (top 10 issues)
4. ✅ Worktree Management Guide (practical how-to)
5. ✅ Use Cases / Examples (3-5 scenarios)
6. ✅ Video/GIF Demos (6 key interactions)

**Should Have (Important):** 7. ✅ MCP Integration Guide 8. ✅ Environment Configuration Guide 9. ✅ Permission System Guide

**Total:** 9 new docs + nav restructure

### Current Strengths

- Excellent conceptual documentation (FAQ, Concepts, SDK Comparison)
- Strong technical docs (Architecture, API Reference)
- Good visual assets (screenshots)
- Solid foundation for expansion

### Biggest Gaps

1. **Practical "how to" guides** - Users need step-by-step instructions
2. **Troubleshooting** - First thing users need when stuck
3. **Visual demos (video/GIFs)** - Motion shows multiplayer/spatial magic
4. **Installation variations** - Docker/local/Codespaces paths unclear

### Estimated Effort

- **Critical (items 1-6):** ~2-3 days for one person
  - Quick Start: 4 hours
  - Installation: 3 hours
  - Troubleshooting: 4 hours
  - Worktree Management: 3 hours
  - Use Cases: 4 hours (writing)
  - Videos: 4 hours (recording + editing)

- **Important (items 7-9):** ~1 day
  - MCP Guide: 3 hours
  - Environment Guide: 3 hours
  - Permissions Guide: 2 hours

**Total:** 3-4 days for launch-ready docs

---

## Next Steps

### Immediate Actions

1. Add `sdk-comparison` to guide nav (5 min)
2. Create Quick Start Tutorial (highest ROI for new users)
3. Create Troubleshooting Guide (reduces support burden)
4. Record 2-3 key GIF demos (board interaction, zone triggers, real-time cursors)

### Phase 2 (Post-Launch)

- Expand based on user feedback
- Add community contributions
- Video tutorials (longer form)
- Advanced workflow guides

### Documentation Infrastructure

- Consider adding Algolia DocSearch
- Add "Edit this page" links (already configured in theme)
- Version docs for future releases
- Analytics to see popular pages

---

## Conclusion

**Current documentation:** Strong conceptual foundation, weak on practical guidance

**For successful launch:** Focus on the "how" not just the "what"

- Quick Start gets users to first success
- Troubleshooting reduces frustration
- Use Cases show value proposition
- Videos prove the multiplayer/spatial magic

**Recommendation:** Prioritize items 1-6, then launch. Add items 7-9 in first week post-launch based on user questions.
