# SessionCard Latest Task Display

**Status:** Design Complete, Ready for Implementation
**Created:** 2025-01-19
**Owner:** Max

## Overview

Redesign SessionCard to show the most recent task with its latest message preview, optimized for managing multiple AI sessions in parallel.

## Motivation

**Current State:**

- SessionCard shows last 5 tasks (descriptions only, no messages)
- Users manage 4-5 AI sessions simultaneously
- Need to quickly identify which sessions need attention
- Current design doesn't show "what's happening now"

**User Scenarios:**

1. **The Parallel Session Manager** (primary use case)
   - Managing 4-5 AI sessions at once
   - **Need:** "Which sessions need my attention right now?"
   - **Behavior:** Quick glance at board → identify stuck/completed → dive in

2. **The Observer**
   - Monitoring team/session activity
   - **Need:** "What's everyone working on?"
   - **Behavior:** Passive watching, occasional interaction

3. **The Context Switcher**
   - Working on one session, checking others
   - **Need:** "Did that other session finish?"
   - **Behavior:** Quick peek, then back to main work

## Design Decisions

### Information Hierarchy

```
Critical:  Session status (done/working/stuck)
High:      Latest activity (message preview)
Medium:    Session metadata (repo, branch)
Low:       Historical tasks (only when expanded)
```

### Display Configuration

**Key Constants (easy to change):**

```typescript
VISIBLE_TASK_COUNT = 3; // Show 3 most recent tasks
MESSAGE_PREVIEW_LENGTH = 150; // Truncate to 150 chars
```

**Rationale for 3 tasks:**

- Short-term memory = 3-4 items
- Enough context without overwhelming
- Leaves room for other cards on screen
- Compare: 5 tasks × 3 lines = 15 lines vs 3 tasks × 3 lines = 9 lines

**Rationale for message preview:**

- "Half-life is short" - latest messages have highest value
- Shows current state/progress
- User can dive into SessionDrawer for full history

### Collapsed State (Default)

```
┌─────────────────────────────────────┐
│ 🤖 Claude Code          ● Running   │
│ Fix authentication bug               │
│                                      │
│ 📍 main @ a1b2c3d                   │
│ 📂 agor:fix-auth                     │
│                                      │
│ Latest: "I've identified the issue  │ ← NEW
│ in auth.ts:42. The JWT validation…" │
│ ⏱️  2 minutes ago                    │
│                                      │
│ 💬 24 messages  •  3 tasks           │
│                                      │
│ [Expand ▼]                           │
└─────────────────────────────────────┘
```

**Information density:** ~6 lines per card × 5 sessions = 30 lines (scannable)

### Expanded State (Optional)

```
┌─────────────────────────────────────┐
│ Tasks (showing latest 3 of 5) [▼]   │
│ ┌─────────────────────────────────┐ │
│ │ ✓ Update JWT validation logic   │ │
│ │   "Fixed the token expiry…"     │ │
│ │   ⏱️ 5 min ago • 8 messages      │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ⏳ Update documentation          │ │ ← Current task
│ │   "I'm updating the README…"    │ │
│ │   ⏱️ Just now • 10 messages      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Technical Approach

### Architecture: Hybrid Materialized Fields

**Problem:** Normalized data requires complex client-side joins

- Tasks in `useAgorData` (global state)
- Messages fetched per-session in `useMessages` (local state)
- Need to join in React: `messages.filter(m => m.task_id === task.task_id)`

**Solution:** Materialize commonly-needed fields in tasks table

### FeathersJS Real-Time Architecture Learnings

**How FeathersJS works:**

1. **Initial Load:** REST call fetches data
2. **WebSocket Subscriptions:** Listen to service events (created, patched, removed)
3. **Broadcast:** Server broadcasts events to ALL connected clients
4. **Client-Side Sync:** React state updates when events arrive

**Current Data Flow:**

```
useAgorData:
  - Fetches ALL tasks (500 limit) on app load
  - Groups by session_id in React
  - Real-time sync via WebSocket

useMessages (SessionDrawer only):
  - Fetches messages per-session on-demand
  - Real-time sync for open session only
```

**This is like Redux/Firebase:**

- Client maintains local cache of server data
- Server pushes updates via WebSocket
- Client filters/derives views from cached data

### Database Schema Changes

Add materialized fields to `tasks.data`:

```typescript
tasks: {
  task_id: string;
  session_id: string;
  status: string;
  created_at: timestamp;

  data: {
    description: string;
    full_prompt: string;
    message_range: { ... };

    // NEW: Materialized message preview
    latest_message_preview?: string;      // First 200 chars
    latest_message_timestamp?: string;
    latest_message_role?: 'user' | 'assistant';

    // Existing
    tool_use_count: number;
    // ... rest
  }
}
```

**Why materialize?**

- ✅ Fast reads (no joins for SessionCard)
- ✅ Simple real-time (only listen to task events)
- ✅ Small payloads (only preview, not full message)
- ✅ Messages table still intact (for SessionDrawer)

**Trade-offs:**

- Data duplication (preview stored in both task and message)
- Slightly more complex backend (maintaining materialized fields)
- Worth it for performance and simplicity

### Backend Updates

**Messages Service** (`apps/agor-daemon/src/services/messages.ts`):

```typescript
async create(message: Message) {
  const created = await this.messagesRepo.create(message);

  // Update parent task's latest_message fields
  if (message.role === 'assistant') {  // Only track assistant responses
    await this.tasksService.patch(message.task_id, {
      latest_message_preview: message.content.substring(0, 200),
      latest_message_timestamp: message.timestamp,
      latest_message_role: message.role,
    });
  }

  return created;
}
```

**Real-time behavior:**

```
1. New message arrives → messagesService.create()
2. Backend patches parent task with latest_message_*
3. tasksService.on('patched') fires
4. SessionCard re-renders
5. Only "Latest:" line updates (minimal reflow)
```

### Frontend Updates

**SessionCard Component** (`apps/agor-ui/src/components/SessionCard/SessionCard.tsx`):

```typescript
/**
 * SessionCard Display Configuration
 * Adjust these constants to change information density
 */
const VISIBLE_TASK_COUNT = 3; // How many recent tasks to show
const MESSAGE_PREVIEW_LENGTH = 150; // Characters to show from latest message

// Change from .slice(-5) to:
const visibleTasks = tasks.slice(-VISIBLE_TASK_COUNT);
```

**TaskListItem Component** (`apps/agor-ui/src/components/TaskListItem/TaskListItem.tsx`):

Add below task description:

```typescript
{task.latest_message_preview && (
  <Text type="secondary">
    {truncate(task.latest_message_preview, MESSAGE_PREVIEW_LENGTH)}
  </Text>
)}
<Text type="secondary" style={{ fontSize: 11 }}>
  {formatTimestamp(task.latest_message_timestamp)} • {task.message_range?.end_index - task.message_range?.start_index + 1} messages
</Text>
```

## Implementation Tasks

### Phase 1: Backend (Database + Services)

- [ ] Update `packages/core/src/db/schema.ts` - Add latest*message*\* fields to tasks.data type
- [ ] Update `packages/core/src/db/repositories/tasks.ts` - Add defaults for new fields
- [ ] Update `apps/agor-daemon/src/services/messages.ts` - Add hook to patch task on message create
- [ ] Test: Create message → verify task.latest_message_preview updates

### Phase 2: Frontend (Components)

- [ ] Add configuration constants to SessionCard.tsx (VISIBLE_TASK_COUNT, MESSAGE_PREVIEW_LENGTH)
- [ ] Update SessionCard.tsx visibleTasks logic (.slice(-VISIBLE_TASK_COUNT))
- [ ] Update TaskListItem.tsx to display latest_message_preview
- [ ] Add timestamp formatting helper
- [ ] Test: Verify cards show message previews correctly

### Phase 3: Real-Time Testing

- [ ] Test: New message arrives → SessionCard updates
- [ ] Test: Change VISIBLE_TASK_COUNT → verify display updates
- [ ] Test: Multiple sessions updating simultaneously
- [ ] Test: Graceful degradation (old tasks without latest_message_preview)

## Migration Strategy

**Backwards Compatibility:**

- New fields are optional (`latest_message_preview?`)
- Existing tasks render fine (just show description)
- Frontend checks for field existence before displaying
- No database migration needed (JSON blob is flexible)

**Rollout:**

1. Deploy backend changes (tasks get new fields going forward)
2. Deploy frontend changes (gracefully handles missing fields)
3. Old tasks without previews still work (show description only)

## Design Alternatives Considered

### Option 1: Normalized (Current - Complex)

- Fetch tasks + messages separately
- Client-side join in React
- **Rejected:** Too complex for simple preview need

### Option 2: Denormalized (Embed All Messages)

- Store messages array inside task record
- **Rejected:** Large payloads, expensive writes, race conditions

### Option 3: Smart Populate (Backend Joins)

- Add `?$populate=messages` query param
- Backend joins on-the-fly
- **Rejected:** Still need to handle 2 subscriptions (tasks + messages)

### Option 4: Hybrid Materialized (Chosen)

- Materialize only latest preview
- Keep normalized structure for full history
- **Selected:** Best balance of performance and simplicity

## Future Enhancements

**View Mode Toggle:**

```
Board Controls: ○ Compact  ● Detailed  ○ Stream
```

- Compact: Latest message only (default)
- Detailed: Always show 3 tasks expanded
- Stream: Live message feed (auto-scroll)

**Smart Truncation:**

- Truncate at sentence boundaries
- Show "..." indicator
- Hover for full preview

**Visual Indicators:**

- Pulse animation when latest message updates
- Different colors for user vs assistant messages
- Highlight sessions awaiting user response

## References

- FeathersJS docs: https://feathersjs.com/api/client.html
- React Flow (board canvas): https://reactflow.dev/
- Related: `context/concepts/architecture.md` (data model)
- Related: `context/concepts/frontend-guidelines.md` (UI patterns)
