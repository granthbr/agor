# Subsession Orchestration & Agent Delegation

Related: [[agent-interface]], [[models]], [[core]], [[native-cli-feature-gaps]]

**Status:** Ready for Implementation (Phase 2 foundation complete)
**Date:** January 2025
**Last Updated:** January 2025 (post-Phase 2)

---

## TL;DR - The User-Triggered Approach

**Problem:** How do we get agents to spawn Agor-tracked subsessions instead of using native delegation tools?

**Solution:** Give users a **"Run in Subsession"** button that wraps their prompt in meta-instructions forcing the agent to:

1. Prepare a detailed, enhanced version of the user's prompt
2. Execute `agor session subsession {id} --prompt "{prepared_prompt}"`
3. Report the child session ID

**Why it works:**

- ✅ Deterministic (user control, no hoping agent decides to delegate)
- ✅ Simple (no SDK hacks, just prompt wrapping)
- ✅ High compliance (meta-instructions force behavior)
- ✅ Value-add (agent enriches vague prompts into detailed specs)
- ✅ Agent-agnostic (works with Claude, Codex, Gemini - any bash-capable agent)

**Effort:** ~9 hours for MVP (CLI command + daemon spawn method + UI button + canvas edges)

---

## What's Already Built (Phase 2)

**Foundation in place for subsession orchestration:**

✅ **Session Genealogy** - `parent_session_id` exists in data model, genealogy tracking implemented
✅ **Agent SDK Integration** - Claude Agent SDK integrated with CLAUDE.md auto-loading
✅ **Zone UI** - Zones can be created/configured on canvas (spawn functionality not wired yet)
✅ **Canvas Visualization** - React Flow canvas with drag-and-drop, session tree display
✅ **Real-time Updates** - WebSocket broadcasting means multiplayer users see new sessions appear live
✅ **Session Forking** - Provides observability and "try different approaches" capability
✅ **Worktree Isolation** - Each session can have isolated git workspace
✅ **UUIDv7 Short IDs** - `01933f2b` format for readable session references

**What's Missing:**

❌ `agor session subsession` CLI command
❌ Prompt injection for agent-initiated subsessions
❌ Tool call monitoring and compliance tracking
❌ Agent-to-agent subsession delegation

---

## The Challenge

**How do we get agents to spawn Agor-tracked subsessions instead of using their native delegation mechanisms?**

### The Problem

**Native agent delegation:**

```typescript
// Claude Code has a Task tool
Agent: "I'll delegate the database schema to a subsession"
Agent uses Task tool internally
→ Spawns subprocess, completes, returns result
→ Agor has NO visibility into this subprocess
→ Can't fork it, can't view its conversation, can't generate report
```

**What we want:**

```typescript
// Agor-managed subsession
User: "Build auth system with database schema subsession"
Agent: "I'll delegate the schema design"
→ Agent calls `agor session subsession --prompt "Design user table schema"`
→ Agor creates new session with parent_session_id
→ Full observability: view conversation, fork, generate report
→ Can continue prompting child session after completion
```

### Why This Matters

**Observability Benefits:**

- See full conversation in subsession session
- Fork subsession if it goes wrong
- Generate reports for subsessions
- Visual session tree in Agor UI

**Reusability Benefits:**

- Continue prompting child session after parent completes
- Share subsession sessions with team
- Analyze patterns across subsessions

**Native Task Tool Limitations:**

- ❌ No conversation history access
- ❌ Can't fork if subsession makes wrong decision
- ❌ Can't continue prompting after subsession completes
- ❌ No report generation
- ❌ Not visible in Agor session tree

---

## Core Insight: User-Triggered Meta-Prompt Wrapper

**Key idea:** User explicitly triggers "Run in Subsession" mode, which wraps their prompt in meta-instructions forcing the agent to prepare and spawn an Agor subsession.

**Why this works:**

- ✅ **Deterministic** - Not hoping agent decides to delegate
- ✅ **Simple** - No system prompt injection or tool interception needed
- ✅ **Value-add** - Agent optimizes the prompt before spawning subsession
- ✅ **User control** - Explicit button press, clear intent
- ✅ **High compliance** - Meta-instructions force the behavior

---

## The "Run in Subsession" Meta-Prompt

**UI Interaction:**

```
┌─────────────────────────────────────────┐
│ Session: Main Dev Session               │
├─────────────────────────────────────────┤
│ Input:                                  │
│ ┌─────────────────────────────────────┐ │
│ │ Design PostgreSQL schema for auth   │ │
│ │ system                              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Send]  [Run in Subsession 🎯]            │
└─────────────────────────────────────────┘
```

**When user clicks "Run in Subsession", wrap their prompt:**

### The Meta-Prompt Script

```typescript
function wrapForSubsessionExecution(userPrompt: string, sessionId: string): string {
  return `You are being asked to spawn a subsession in the Agor orchestration platform.

TASK BREAKDOWN:
1. Analyze the user's request below
2. Prepare an optimized, detailed prompt for a specialized agent
3. Execute the agor CLI command to spawn the subsession
4. Report back to the user with the subsession session ID

USER'S REQUEST:
"""
${userPrompt}
"""

YOUR INSTRUCTIONS:

Step 1: Analyze the request
- Identify the core task and requirements
- Determine what context the subsession agent will need
- Consider what constraints or format requirements apply

Step 2: Prepare the subsession prompt
Create a comprehensive prompt for the subsession agent that includes:
- Clear objective and success criteria
- All necessary context and requirements
- Expected output format
- Any constraints or guidelines

The prepared prompt should be MORE detailed than the user's original request.
Add technical context, specify formats, and clarify ambiguities.

Step 3: Execute the command
Run this EXACT command format:
\`\`\`bash
agor session subsession ${sessionId} --prompt "YOUR_PREPARED_PROMPT_HERE"
\`\`\`

IMPORTANT NOTES:
- Replace ${sessionId} with the actual session ID: ${sessionId}
- Put your prepared prompt in the --prompt argument
- Use double quotes around the prompt
- Escape any quotes inside the prompt with backslashes
- The command will return a child session ID when the subsession starts

Step 4: Report completion
After running the command, tell the user:
- What subsession you created
- The session ID of the child session
- What to expect from the subsession

EXAMPLE:

User request: "add unit tests"

Your prepared prompt should be like:
"Write comprehensive unit tests for the authentication module. Include:
- Test user registration with valid/invalid inputs
- Test login flow with correct/incorrect credentials
- Test session token generation and validation
- Test password hashing security
- Use Jest as the testing framework
- Aim for >80% code coverage
- Follow existing test patterns in tests/ directory"

Then execute:
\`\`\`bash
agor session subsession ${sessionId} --prompt "Write comprehensive unit tests for the authentication module. Include: test user registration with valid/invalid inputs, test login flow with correct/incorrect credentials, test session token generation and validation, test password hashing security. Use Jest as the testing framework. Aim for >80% code coverage. Follow existing test patterns in tests/ directory."
\`\`\`

Now proceed with the user's request above.`;
}
```

### Optimized Shorter Version (Lower Token Cost)

```typescript
function wrapForSubsessionExecution(userPrompt: string, sessionId: string): string {
  return `SUBSESSION DELEGATION MODE

User wants this done in a subsession:
"""
${userPrompt}
"""

YOUR TASK:
1. Prepare a detailed, comprehensive prompt for a subsession agent (add technical context, specify formats, clarify requirements)
2. Run: \`agor session subsession ${sessionId} --prompt "YOUR_PREPARED_PROMPT"\`
3. Tell user the child session ID that was created

EXAMPLE:
User: "add tests"
Your prepared prompt: "Write Jest unit tests for auth module: registration validation, login flow, token handling, password hashing. Aim for 80%+ coverage. Match existing test patterns."
Command: \`agor session subsession ${sessionId} --prompt "Write Jest unit tests for auth module: registration validation, login flow, token handling, password hashing. Aim for 80%+ coverage. Match existing test patterns."\`

Make your prepared prompt MORE detailed than the user's original request.
Proceed now.`;
}
```

---

## User Experience Flow

### Primary: "Run in Subsession" Button

**User Flow:**

1. User types prompt in SessionDrawer: "Design PostgreSQL schema for auth"
2. User clicks **"Run in Subsession 🎯"** button (instead of "Send")
3. UI wraps prompt with meta-instructions (using function above)
4. Agent receives wrapped prompt, prepares detailed subsession prompt
5. Agent executes: `agor session subsession {session-id} --prompt "..."`
6. Child session appears on canvas with visual connection to parent
7. Agent reports: "Created subsession session `01933f2b` for schema design"
8. User can click into child session to watch it work in real-time

**Visual Feedback:**

- Loading indicator while agent prepares subsession
- Toast notification when child session spawns
- Animated edge connecting parent → child on canvas
- Child session badge shows "Spawned from {parent-id}"

### Secondary: Zone Triggers (Future)

Zone-based subsession spawning (when wired up):

- Drop session onto zone with template
- Zone prompt + user input → wrapped meta-prompt
- Spawns child session positioned in zone

### Implementation Notes

**SessionDrawer Changes:**

```tsx
// Add button next to existing input
<Space>
  <Button onClick={handleSend}>Send</Button>
  <Button type="primary" icon={<RocketOutlined />} onClick={handleRunInSubsession}>
    Run in Subsession
  </Button>
</Space>;

// Handler
const handleRunInSubsession = async () => {
  const wrappedPrompt = wrapForSubsessionExecution(inputValue, session.session_id);
  await sendMessage(wrappedPrompt);
  // Rest is handled by agent + WebSocket updates
};
```

**Canvas Updates:**

- Already supports real-time session additions via WebSocket ✅
- Parent/child edges can use existing React Flow edge system ✅
- Need to query genealogy to draw edges (genealogy data already tracked)

---

## Agent Compatibility

The user-triggered meta-prompt approach is **agent-agnostic** and works with any agent that can:

1. Execute bash commands via tool use
2. Follow clear step-by-step instructions

### Claude Code ✅

- **Works perfectly** - Excellent at following structured prompts
- Has bash tool to run `agor session subsession` command
- Tends to add helpful context when preparing prompts
- Native Task tool won't interfere (meta-prompt is explicit)

### OpenAI/Codex ✅

- **Works well** - Good at following instructions
- Has function calling for bash execution
- No competing subsession mechanism to confuse it
- May need slight prompt tuning for best results

### Gemini ✅ (Pending SDK Integration)

- **Should work** - Supports system instructions and tool use
- Once SDK integrated, meta-prompt approach should transfer directly
- No known conflicts

### Future Agents

Any agent with bash/command execution capability can use this approach:

- No special SDK features required
- No system prompt modification needed
- Just needs to run `agor session subsession` command

---

## Technical Implementation

### Agor CLI: `agor session subsession`

**Command:**

```bash
agor session subsession \
  --prompt "Design PostgreSQL schema for auth" \
  --agent claude-code \
  --concepts database,security \
  --sync  # Wait for completion (default: async)
```

**What it does:**

1. Creates new session with `parent_session_id` set
2. Loads specified concepts into context
3. Executes prompt
4. Returns session_id when complete (if --sync)

**In Agent Context:**

```bash
# Agent runs this via bash tool
agor session subsession --prompt "Design user table schema" --sync

# Output:
# Subsession session created: 01933f2b
# Status: running...
# Status: completed
# Session ID: 01933f2b
# Summary: Created users table with id, email, password_hash...
```

**Agent sees output, can reference in response:**

```
"I've delegated the schema design to a subsession (session 01933f2b).
The subsession created a users table with proper constraints..."
```

---

### Agor Daemon: Subsession Handler

```typescript
// apps/agor-daemon/src/services/subsessions.ts
// Can reuse existing sessions service with spawn method

class SessionsService {
  // Add spawn method for subsession creation
  async spawn(sessionId: SessionID, data: SpawnSubsessionRequest, params: Params) {
    const parentSession = await this.get(sessionId);
    const { prompt, agent, zoneId, sync = false } = data;

    // Create child session with genealogy
    const childSession = await this.create(
      {
        agent: agent || parentSession.agent,
        status: 'running',
        genealogy: {
          parent_session_id: sessionId,
          fork_point_task_id: null, // Not a fork, it's a spawn
        },
        repo_id: parentSession.repo_id, // Inherit repo context
        worktree_id: null, // Child can create its own worktree
      },
      params
    );

    // Position near parent on canvas if zone specified
    if (zoneId) {
      await this.boardObjectsService.create({
        board_id: parentSession.board_id,
        object_type: 'session',
        object_id: childSession.session_id,
        zone_id: zoneId,
      });
    }

    // Execute initial prompt via Agent SDK
    const agentClient = this.agentClients[childSession.agent];
    const execution = agentClient.getSession(childSession.session_id).executeTask(prompt);

    if (sync) {
      // Wait for completion (blocking)
      await execution;
      const updated = await this.get(childSession.session_id);
      return {
        session_id: childSession.session_id,
        status: updated.status,
      };
    } else {
      // Return immediately (async, default)
      // WebSocket will broadcast session updates as it runs
      return {
        session_id: childSession.session_id,
        status: 'running',
      };
    }
  }
}
```

**Integration Points:**

- Reuses existing `sessions` service (no new service needed!)
- Works with existing Agent SDK clients (Claude, Codex, Gemini)
- Leverages WebSocket broadcasting for real-time updates
- Inherits repo context from parent (child can create own worktree if needed)
- Zone positioning handled via existing board_objects service

---

## Observability & Session Tree

### Genealogy Tracking

Every subsession automatically gets genealogy metadata:

```typescript
interface SessionGenealogy {
  parent_session_id: SessionID | null;
  fork_point_task_id: TaskID | null; // null for spawns
  spawn_depth: number; // 0 = root, 1 = child, 2 = grandchild, etc.
}
```

### Visual Session Tree

Canvas displays parent → child relationships:

```
Session Tree:
├─ Main Dev Session (claude-code)
│   ├─ Schema Design (subsession, claude-code)
│   │   └─ Migration Scripts (subsession, claude-code)
│   └─ Unit Tests (subsession, claude-code)
│
└─ API Development (claude-code)
    └─ Integration Tests (subsession, codex)
```

**Canvas Rendering:**

- Solid edges for spawn relationships (parent → child)
- Dashed edges for fork relationships (original → fork)
- Color-coded by agent type
- Badge showing spawn depth

---

## Refining the Meta-Prompt

### Iterating on Instructions

The meta-prompt can be tuned based on agent behavior:

**If agent doesn't add enough detail:**

```typescript
// Emphasize more
"Make your prepared prompt AT LEAST 2x longer than the user's request.
Add specific technical requirements, expected formats, and constraints."
```

**If agent forgets to run the command:**

```typescript
// Add urgency
"CRITICAL: You MUST execute the agor session subsession command.
Do not just explain what you would do - actually run it."
```

**If agent uses wrong format:**

```typescript
// Show exact template
"Use EXACTLY this format (replace PROMPT with your prepared prompt):
agor session subsession ${sessionId} --prompt \"PROMPT\""
```

### Quality Metrics

Track subsession prompt quality over time:

```typescript
interface SubsessionQualityMetrics {
  user_prompt_length: number;
  prepared_prompt_length: number;
  expansion_ratio: number;  // prepared / user
  included_context: boolean;
  specified_format: boolean;
  included_constraints: boolean;
}

// Example good subsession
{
  user_prompt_length: 25,  // "add tests for auth"
  prepared_prompt_length: 180,
  expansion_ratio: 7.2,  // 7x more detailed!
  included_context: true,  // mentioned auth module specifically
  specified_format: true,  // "use Jest", "80% coverage"
  included_constraints: true,  // "follow existing test patterns"
}
```

### A/B Testing Variations

Test different meta-prompt styles:

**Variation A: Verbose with examples**

- Full step-by-step breakdown
- Multiple examples
- ~250 tokens overhead

**Variation B: Concise with template**

- Brief instructions + template
- Single example
- ~100 tokens overhead

**Variation C: Minimal**

- Just the command format
- No examples
- ~50 tokens overhead

**Recommendation:** Start with Variation B (concise), upgrade to A if compliance is low.

---

## Future: Multi-Agent Subsessions

**V2 feature:** Parent and child can be different agents

```bash
# Parent: Claude Code working on API
# Delegates schema to Gemini (better at data modeling)

agor session subsession \
  --prompt "Design database schema..." \
  --agent gemini \
  --concepts database
```

**Cross-agent delegation benefits:**

- Use best tool for each job
- Gemini for schemas, Claude for reasoning, Codex for boilerplate
- Full observability across agent types

---

## Open Questions

### 1. How to handle deeply nested subsessions?

**Scenario:**

```
Session A (user clicks "Run in Subsession")
└─ Subsession B (user opens B, clicks "Run in Subsession" again)
   └─ Subsession C (another level deep)
      └─ Subsession D (getting hard to track)
```

**Concerns:**

- Tree gets very deep (hard to visualize)
- Context drift across levels (each agent loses parent context)
- Which session is "active" becomes unclear

**Options:**

**A: Unlimited depth (trust users)**

- Let users nest as deep as they want
- Show spawn_depth badge on each session
- Provide "collapse/expand" in genealogy view

**B: Depth limit with warning**

- Soft limit at 3 levels (warn but allow)
- Hard limit at 5 levels (block with explanation)
- Suggest forking instead of spawning at limit

**C: Flatten on-demand**

- Allow any depth
- Provide "Merge into parent" button to collapse subsession back

**Recommendation:** Start with Option A (unlimited), add B (warnings) if users report confusion

---

### 2. Async vs. Sync execution?

**Default: Async (non-blocking)**

- Child session starts immediately
- Parent session can continue (user can send more prompts)
- User can switch between parent/child in real-time
- WebSocket broadcasts child status updates

**Optional: Sync flag (blocking)**

```bash
agor session subsession {id} --prompt "..." --sync
```

- Parent session waits for child completion
- Agent gets child result before continuing
- Useful for sequential dependencies

**Recommendation:** Default to async (fits multiplayer model), support --sync for power users

**Implementation note:**

- Async: CLI returns immediately with child session_id
- Sync: CLI polls child status, returns when complete
- Parent agent sees child session_id in both cases

---

### 3. What if agent doesn't follow meta-prompt?

**Scenario:** Agent explains what it would do but doesn't run the command

**Fallback strategies:**

**A: Retry with stronger prompt**

```typescript
if (!responseContains('agor session subsession')) {
  resendWithEmphasis('CRITICAL: You must EXECUTE the command, not explain it');
}
```

**B: Parse intent and auto-spawn**

```typescript
// If agent says "I would create a subsession for..." but doesn't run command
// Extract the intended prompt and spawn on agent's behalf
const intent = extractSubsessionIntent(agentResponse);
if (intent) {
  await spawnSubsession(sessionId, intent.prompt);
}
```

**C: User manual spawn**

```
Agent: "I think we should create a subsession for schema design"
→ UI shows: "Agent suggested a subsession. [Create it manually]" button
```

**Recommendation:** Start with A (retry), add B (auto-spawn) if compliance is consistently low

---

### 4. Should meta-prompt be visible to user?

**Option A: Transparent (show wrapped prompt)**

- User sees full meta-prompt in conversation history
- Pro: Full visibility, clear what happened
- Con: Verbose, clutters conversation

**Option B: Hidden (show original prompt only)**

- User sees their original prompt in history
- Meta-wrapping happens invisibly
- Pro: Clean conversation, focused on user intent
- Con: Less transparent, "magic" behavior

**Option C: Collapsible (show indicator + expand option)**

```
User: "Design schema" [🎯 Run in Subsession]
→ Expandable: "See meta-prompt instructions"
```

**Recommendation:** Option B (hidden) for cleaner UX, with dev mode toggle to show meta-prompts

---

## Success Criteria

**V1 User-Triggered Subsession System is successful if:**

1. ✅ **"Run in Subsession" button works reliably**
   - User clicks button → agent spawns child session
   - Child session appears on canvas within 5 seconds
   - Agent compliance >90% (actually runs the command)

2. ✅ **Agent adds value in prompt preparation**
   - Prepared prompts are 2-5x more detailed than user input
   - Include technical context, formats, constraints
   - Measurable via expansion_ratio metric

3. ✅ **Full observability of subsession sessions**
   - Complete conversation history accessible
   - Can click into child session while it's running
   - WebSocket updates show real-time progress

4. ✅ **Visual genealogy on canvas**
   - Parent → child edges render correctly
   - Spawn depth badges visible
   - Can trace lineage from any session

5. ✅ **Subsessions are forkable and shareable**
   - Child sessions can be forked independently
   - Can continue prompting child after parent completes
   - Reports generated for subsessions same as regular sessions

6. ✅ **User experience is intuitive**
   - Users understand when to use "Run in Subsession" vs "Send"
   - Clear feedback when subsession spawns
   - Easy to navigate parent/child relationships

---

## Implementation Roadmap

### Phase 1: Core Infrastructure ✅ (Mostly Complete)

1. ✅ Session genealogy tracking (parent_session_id exists)
2. ❌ CLI command: `agor session subsession`
3. ❌ Daemon: `POST /sessions/:id/spawn` endpoint
4. ✅ Canvas visualization (React Flow + WebSocket)

**Remaining:** CLI command + daemon spawn method (~6 hours)

### Phase 2: User-Triggered Subsessions 🎯 (Primary Implementation)

1. ❌ Add "Run in Subsession" button to SessionDrawer
2. ❌ Implement meta-prompt wrapping function
3. ❌ Handle wrapped prompt → agent execution
4. ❌ Show child session on canvas with edge to parent
5. ❌ Add toast notifications for subsession spawn

**Estimated effort:** ~4 hours (mostly UI wiring)

**Blocked by:** Phase 1 (CLI + daemon spawn method)

### Phase 3: Genealogy Visualization

1. ❌ Query genealogy data for parent/child relationships
2. ❌ Render edges on canvas (parent → child)
3. ❌ Add spawn depth badges to session cards
4. ❌ Filter/group by genealogy in session list

**Estimated effort:** ~3 hours

### Phase 4: Refinements & Testing

1. ❌ A/B test meta-prompt variations (verbose vs. concise)
2. ❌ Track subsession quality metrics (expansion ratio, etc.)
3. ❌ Add zone-triggered subsessions (wire drop event)
4. ❌ Cross-agent subsessions (--agent flag support)

**Future iterations based on usage data**

---

## Concrete Next Steps (Post-Phase 2)

**User-Triggered Subsession MVP - 4 pieces:**

### 1. CLI Command: `agor session subsession`

```bash
# apps/agor-cli/src/commands/session/subsession.ts
pnpm agor session subsession <parent-session-id> \
  --prompt "Design PostgreSQL schema for auth" \
  --agent claude-code \  # Optional, defaults to parent's agent
  --zone <zone-id> \      # Optional, position in zone
  --sync                  # Optional, wait for completion
```

**Implementation:**

```typescript
export default class SessionSubsession extends Command {
  static args = {
    sessionId: Args.string({ required: true }),
  };
  static flags = {
    prompt: Flags.string({ required: true }),
    agent: Flags.string(),
    zone: Flags.string(),
    sync: Flags.boolean({ default: false }),
  };

  async run() {
    const { args, flags } = await this.parse(SessionSubsession);

    // Call POST /sessions/:id/spawn
    const result = await client.service('sessions').spawn(args.sessionId, {
      prompt: flags.prompt,
      agent: flags.agent,
      zoneId: flags.zone,
      sync: flags.sync,
    });

    this.log(`Subsession session created: ${shortId(result.session_id)}`);
    if (flags.sync) {
      this.log(`Status: ${result.status}`);
    }

    // Clean socket and exit
    await cleanupSocket(client);
  }
}
```

**Estimated effort:** 2 hours (copy from existing session commands)

---

### 2. Daemon: Add `spawn` Custom Method

```typescript
// apps/agor-daemon/src/services/sessions/sessions.class.ts

async spawn(id: SessionID, data: SpawnSubsessionRequest, params: Params) {
  const parent = await this.get(id);

  // Create child session
  const child = await this.create({
    agent: data.agent || parent.agent,
    repo_id: parent.repo_id,
    genealogy: {
      parent_session_id: id,
      fork_point_task_id: null,
    },
    status: 'running',
  }, params);

  // Position on canvas
  if (data.zoneId || parent.board_id) {
    await this.boardObjectsService.create({
      board_id: parent.board_id,
      object_type: 'session',
      object_id: child.session_id,
      zone_id: data.zoneId,
    });
  }

  // Execute initial prompt via Agent SDK
  const agentClient = this.agentClients[child.agent];
  const execution = agentClient.getSession(child.session_id).executeTask(data.prompt);

  if (data.sync) {
    await execution;
    const updated = await this.get(child.session_id);
    return { session_id: child.session_id, status: updated.status };
  }

  return { session_id: child.session_id, status: 'running' };
}
```

**Register method:**

```typescript
// apps/agor-daemon/src/services/sessions/sessions.ts
export default function (app: Application) {
  app.use('/sessions', new SessionsService(options), {
    methods: ['find', 'get', 'create', 'patch', 'remove', 'spawn'], // Add spawn
    events: [],
  });
}
```

**Estimated effort:** 3 hours (wire existing pieces)

---

### 3. UI: Add "Run in Subsession" Button

```typescript
// apps/agor-ui/src/components/SessionDrawer.tsx

// Meta-prompt wrapper utility
function wrapForSubsessionExecution(userPrompt: string, sessionId: string): string {
  return `SUBSESSION DELEGATION MODE

User wants this done in a subsession:
"""
${userPrompt}
"""

YOUR TASK:
1. Prepare a detailed, comprehensive prompt for a subsession agent (add technical context, specify formats, clarify requirements)
2. Run: \`agor session subsession ${sessionId} --prompt "YOUR_PREPARED_PROMPT"\`
3. Tell user the child session ID that was created

EXAMPLE:
User: "add tests"
Your prepared prompt: "Write Jest unit tests for auth module: registration validation, login flow, token handling, password hashing. Aim for 80%+ coverage. Match existing test patterns."
Command: \`agor session subsession ${sessionId} --prompt "Write Jest unit tests for auth module: registration validation, login flow, token handling, password hashing. Aim for 80%+ coverage. Match existing test patterns."\`

Make your prepared prompt MORE detailed than the user's original request.
Proceed now.`;
}

// UI Component
const handleRunInSubsession = async () => {
  const wrappedPrompt = wrapForSubsessionExecution(inputValue, session.session_id);

  // Send wrapped prompt to agent (same as normal send)
  await sendMessage(wrappedPrompt);

  // Clear input
  setInputValue('');

  // Toast notification
  message.info('Subsession delegation prompt sent to agent');
};

// Render
<Space>
  <Button onClick={handleSend}>Send</Button>
  <Button
    type="primary"
    icon={<RocketOutlined />}
    onClick={handleRunInSubsession}
  >
    Run in Subsession
  </Button>
</Space>
```

**Estimated effort:** 2 hours (UI wiring + wrapper function)

---

### 4. Canvas: Show Genealogy Edges

```typescript
// apps/agor-ui/src/components/Board/BoardCanvas.tsx

// Query genealogy relationships
const edges = useMemo(() => {
  return sessions
    .filter(s => s.genealogy?.parent_session_id)
    .map(child => ({
      id: `${child.genealogy.parent_session_id}-${child.session_id}`,
      source: child.genealogy.parent_session_id,
      target: child.session_id,
      type: 'smoothstep',
      animated: child.status === 'running',
      label: 'subsession',
      style: { stroke: '#1890ff' },
    }));
}, [sessions]);

// Pass to ReactFlow
<ReactFlow nodes={nodes} edges={edges} ... />
```

**Estimated effort:** 2 hours (genealogy query + edge rendering)

---

## Total MVP Effort

**~9 hours of focused work**

1. CLI command: 2 hours
2. Daemon spawn method: 3 hours
3. UI button + meta-prompt: 2 hours
4. Canvas genealogy edges: 2 hours

---

## Validation Plan

1. ✅ **Create parent session** via UI
2. ✅ **Type prompt** in SessionDrawer: "Design PostgreSQL auth schema"
3. ✅ **Click "Run in Subsession"** button
4. ✅ **Verify agent receives meta-prompt** (check conversation)
5. ✅ **Verify agent runs command**: `agor session subsession {id} --prompt "..."`
6. ✅ **Verify child session appears** on canvas within 5 seconds
7. ✅ **Verify edge renders** from parent → child
8. ✅ **Click into child session** and verify conversation is accessible
9. ✅ **Verify child is forkable** independently of parent
10. ✅ **Measure expansion ratio**: prepared prompt length / user prompt length >2x

---

## Related Explorations

- [[agent-interface]] - How we interface with agent SDKs
- [[native-cli-feature-gaps]] - Features we might lose via SDK
- [[models]] - Session and Task data models
- [[core]] - The 5 primitives (Session, Task, Spawn)

---

## Key Insights

**The Winning Approach: User-Triggered Meta-Prompts**

Instead of hoping agents organically decide to use subsessions, we give users explicit control with a "Run in Subsession" button that wraps their prompt in meta-instructions.

**Why This Works:**

1. **Deterministic** - User intent is clear, no guessing if agent will delegate
2. **High compliance** - Meta-instructions force the behavior (>90% expected)
3. **Value-add** - Agent enriches user's prompt before spawning subsession
4. **Simple** - No SDK modifications, system prompt injection, or tool interception needed
5. **Agent-agnostic** - Works with any agent that has bash/command execution

**The Value Proposition:**

User types: "add tests"

Agent prepares: "Write Jest unit tests for auth module: registration validation, login flow with correct/incorrect credentials, token generation/validation, password hashing security. Aim for 80%+ coverage. Match existing patterns in tests/ directory."

Then spawns: `agor session subsession {id} --prompt "{prepared_prompt}"`

Result:

- ✅ User gets detailed, contextualized subsession
- ✅ Full conversation history in child session
- ✅ Can fork if approach is wrong
- ✅ Can share subsession with team
- ✅ Visual genealogy tree on canvas

**The Core Innovation:**

Agor-tracked subsessions turn **ad-hoc delegation** into **persistent, observable, forkable sessions** - making every spawned task a first-class artifact in the session tree.
