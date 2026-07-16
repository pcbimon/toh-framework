# 🧠 /toh-plan - The Brain Command v2.1

> Command for planning + conversing with User + orchestrating Agents
> The smartest among all Commands

---

## 📋 Command Info

| Property | Value |
|----------|-------|
| Command | `/toh-plan` |
| Shortcut | `/toh-p` |
| Agent | `plan-orchestrator` |
| Role | THE BRAIN - Assistant + Planner + Orchestrator |

---

## 🎯 Purpose

`/toh-plan` is **THE BRAIN** of Toh Framework:

1. **Assistant** - Can converse with User, answer questions, adjust plans
2. **Planner** - Analyze, plan, divide into phases
3. **Orchestrator** - Call Agents to work in parallel
4. **Reporter** - Report progress in detail

---

## 🔄 Workflow

```
┌─────────────────────────────────────────────────────────┐
│  User: /toh-plan [request or PRD]                       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  MODE 1: PLANNING                                       │
│  ├── Read Memory                                        │
│  ├── Analyze request/PRD                                │
│  ├── Create plan (Phases → Tasks → Agents)              │
│  └── Show plan + wait for feedback                      │
└─────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   "Adjust plan"      "Go!"        "Questions"
         │               │               │
         └───────►       ▼       ◄───────┘
              ┌──────────────────┐
              │  MODE 2: EXEC    │
              └──────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  EXECUTE PHASE BY PHASE                                 │
│                                                         │
│  Phase N:                                               │
│  ├── 1. 🎨 UI Agent (always first - UI First!)          │
│  │       └── "Ready to view at localhost:3000/xxx"      │
│  │                                                      │
│  ├── 2. ⚙️ Dev + 🗄️ Backend Agent (parallel)            │
│  │                                                      │
│  ├── 3. ✨ Design Agent (if needed)                     │
│  │                                                      │
│  └── 4. Report results + ask "Continue to next Phase?"  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  COMPLETE                                               │
│  ├── Summary of everything                              │
│  ├── Recommend next steps                               │
│  └── Save Memory                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 💬 Usage Examples

### Example 1: From PRD
```
User: /toh-plan read this PRD and build it [PRD content]

AI:
┌─────────────────────────────────────────────────────────┐
│  I've read the PRD                                      │
│                                                         │
│  Summary: EasyChat is a Multi-channel chat platform     │
│  - Supports LINE, Facebook, Instagram                   │
│  - Has Dashboard for admin                              │
│  - Has Inbox combining all channels                     │
│                                                         │
│  📋 Plan:                                               │
│                                                         │
│  Phase 1: Foundation (approx 5 minutes)                 │
│  | Agent | Task |                                       │
│  |-------|------|                                       │
│  | 🎨 UI | Landing, Auth pages |                        │
│  | ⚙️ Dev | Auth store, types |                         │
│  | 🗄️ Backend | User schema |                           │
│                                                         │
│  Phase 2: Core Features (approx 10 minutes)             │
│  | Agent | Task |                                       │
│  |-------|------|                                       │
│  | 🎨 UI | Dashboard, Inbox |                           │
│  | ⚙️ Dev | Channel store, chat logic |                 │
│                                                         │
│  ... (more phases)                                      │
│                                                         │
│  ⏱️ Total estimate: 30 minutes                          │
│                                                         │
│  ---                                                    │
│  👉 Type "Go" to start                                  │
│     Or let me know if you want to adjust the plan       │
└─────────────────────────────────────────────────────────┘
```

### Example 2: Add Feature
```
User: /toh-plan add notification system

AI:
┌─────────────────────────────────────────────────────────┐
│  🎯 Development Plan: Notification System               │
│                                                         │
│  📊 Analysis:                                           │
│  - Need notification store                              │
│  - Need notification dropdown                           │
│  - Need Supabase realtime connection                    │
│                                                         │
│  📋 Plan:                                               │
│                                                         │
│  Phase 1: UI (approx 3 minutes)                         │
│  | 🎨 UI | Notification bell + dropdown |               │
│  | 🎨 UI | Notification list component |                │
│                                                         │
│  Phase 2: Logic (approx 5 minutes)                      │
│  | ⚙️ Dev | Notification store |                        │
│  | 🗄️ Backend | Notification table + realtime |         │
│                                                         │
│  ⏱️ Total estimate: 8 minutes                           │
│                                                         │
│  ---                                                    │
│  👉 Ready to go?                                        │
└─────────────────────────────────────────────────────────┘
```

### Example 3: Adjust Plan
```
User: /toh-plan create todo app

AI: [shows plan...]

User: add share todo feature too

AI:
┌─────────────────────────────────────────────────────────┐
│  Got it, adding Share feature                           │
│                                                         │
│  📋 Updated Plan:                                       │
│                                                         │
│  Phase 1: Basic Todo (approx 5 minutes)                 │
│  [... same as before ...]                               │
│                                                         │
│  Phase 2: Share Feature (approx 5 minutes) ← NEW!       │
│  | 🎨 UI | Share modal, shared view |                   │
│  | ⚙️ Dev | Share logic, permissions |                  │
│  | 🗄️ Backend | Sharing table |                         │
│                                                         │
│  ⏱️ Total estimate: 10 minutes                          │
│                                                         │
│  ---                                                    │
│  👉 Does this look good?                                │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Execute Flow

When User types "Go":

```
AI:
┌─────────────────────────────────────────────────────────┐
│  🚀 Starting Phase 1: Foundation!                       │
│                                                         │
│  | Agent | Task | Status |                              │
│  |-------|------|--------|                              │
│  | 🎨 UI | Landing Page | 🔄 In progress... |           │
│  | 🎨 UI | Login Page | ⏳ Waiting |                    │
│  | ⚙️ Dev | Auth Store | ⏳ Waiting for UI |            │
│                                                         │
│  ---                                                    │
│  Working...                                             │
└─────────────────────────────────────────────────────────┘

(shortly after...)

AI:
┌─────────────────────────────────────────────────────────┐
│  ✅ Phase 1 Complete!                                   │
│                                                         │
│  ### What was created:                                  │
│  - Landing Page → http://localhost:3000                 │
│  - Login Page → http://localhost:3000/login             │
│  - Register Page → http://localhost:3000/register       │
│  - Auth Store → stores/auth.ts                          │
│                                                         │
│  ### Files:                                             │
│  - app/page.tsx                                         │
│  - app/(auth)/login/page.tsx                            │
│  - app/(auth)/register/page.tsx                         │
│  - stores/auth.ts                                       │
│  - types/user.ts                                        │
│                                                         │
│  ---                                                    │
│  Continue to Phase 2?                                   │
│  Or check the UI first?                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Trigger Phrases

### Start Plan Mode
- `/toh-plan [description]`
- `/toh-p [description]`
- "plan..."

### Confirm Execute
- "Go"
- "Let's go"
- "Start"
- "Do it"

### Adjust Plan
- "add xxx too"
- "remove xxx"
- "adjust this..."

### Control During Execute
- "Continue" / "Next" → Do next Phase
- "Stop" / "Pause" → Pause for now
- "Looks good" → Continue

---

## 🤖 Agent Delegation

| Agent | Icon | When to use |
|-------|------|-------------|
| UI Builder | 🎨 | Create pages, components, mock data |
| Dev Builder | ⚙️ | stores, types, validation, API |
| Backend Connector | 🗄️ | Supabase schema, RLS |
| Design Reviewer | ✨ | animations, typography, polish |
| Test Runner | 🧪 | test cases, bug fixes |
| Platform Adapter | 📱 | LINE, Mobile, Desktop |

---

## 📊 Enhanced Planning Output Format (MUST SHOW!)

When presenting a plan, use this structured format:

```markdown
## 📋 Development Plan: [Feature/Project Name]

### 🎯 Analysis Summary

**Request:** [User's request]
**Business Type:** [SaaS / E-commerce / etc.]
**Complexity:** [Low / Medium / High]
**Estimated Time:** [X minutes]

### 📊 Phase Breakdown

| Phase | Agents | Type | Dependencies | Est. Time |
|-------|--------|------|--------------|-----------|
| 1 | 🎨 UI | Sequential | None | 3 min |
| 2 | ⚙️ Dev + 🔌 Backend | PARALLEL | Phase 1 | 5 min |
| 3 | ✨ Design + 🧪 Test | PARALLEL | Phase 2 | 2 min |

### 🤖 Agent Assignments

**Phase 1: Foundation**
| Agent | Task | Output |
|-------|------|--------|
| 🎨 UI Builder | Create Dashboard + Forms | `/app/page.tsx`, `/app/[feature]/` |

**Phase 2: Logic & Data**
| Agent | Task | Output |
|-------|------|--------|
| ⚙️ Dev Builder | State management + Types | `/stores/`, `/types/` |
| 🔌 Backend | Database schema | Supabase tables |

**Phase 3: Polish & Verify**
| Agent | Task | Output |
|-------|------|--------|
| ✨ Design | Animation + UX polish | Updated components |
| 🧪 Test | Build verification | Zero errors |

### 🔄 Execution Flow

```text
[🎨 UI] ──▶ [⚙️ Dev + 🔌 Backend] ──▶ [✨ Design + 🧪 Test]
 Phase 1         PARALLEL               PARALLEL
```

### ⏱️ Total: 3 phases, 5 agents, ~10 minutes

---
👉 Type "Go" to start, or adjust the plan
```

---

## 🎨 UI First Priority

**Very Important!** In every Phase:

```
1. 🎨 UI Agent always goes first!
   └── User can see the screen immediately

2. ⚙️ Dev + 🗄️ Backend (parallel)
   └── Can work simultaneously

3. ✨ Design (if needed)
   └── Polish at the end
```

---

## 🔄 Memory Integration (Tiered Loading)

```text
🚨 Read smart, not all 7 blindly — the 7 files still exist, load them by tier.

BEFORE Planning:
├── Tier 1 · ALWAYS at start (~800 tokens)
│   ├── .toh/memory/active.md   (current task)
│   └── .toh/memory/summary.md  (project overview)
├── Tier 2 · read per task type
│   ├── .toh/memory/architecture.md (structure — build/code work)
│   ├── .toh/memory/components.md   (existing components — build/code work)
│   └── .toh/memory/changelog.md    (recent changes — debug work)
└── Tier 3 · read ONLY when referenced
    ├── .toh/memory/decisions.md    (past decisions)
    └── .toh/memory/agents-log.md   (agent activity)

AFTER Each Phase (Save relevant files):
├── Update active.md (ALWAYS — completed work)
├── Update changelog.md (changes made)
├── Update agents-log.md (if agents delegated)
└── Confirm: "✅ Memory saved"

AFTER Complete (Save per relevance):
├── Update active.md (ALWAYS — next steps)
├── Update summary.md (if project shape changed — features created)
├── Update architecture.md (new structure)
├── Update components.md (new components)
├── Update changelog.md (full session log)
├── Update decisions.md (new decisions)
└── Update agents-log.md (final agent summary)

⚠️ Never finish without saving active.md!
```

---

## ⚠️ Important Rules

1. **Always show plan first** - Don't work without showing plan
2. **Wait for confirm** - Don't execute without permission
3. **UI First** - Every Phase must do UI first
4. **Stop at every Phase** - Ask User before doing next Phase
5. **Report in detail** - Show files, URLs created
6. **Professional language** - Use appropriate tone
