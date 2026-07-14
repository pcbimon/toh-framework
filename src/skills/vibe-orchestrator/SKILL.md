---
name: vibe-orchestrator
description: >
  Master workflow controller for Lovable-style development. Creates working UI 
  immediately from ANY prompt - no questions asked, no choices given. Routes to 
  specialist sub-agents (ui-builder, dev-builder, design-reviewer, backend-connector, 
  platform-adapter). Triggers: create, build, make, want, new project requests, 
  app ideas, MVP, prototype, or any development request.
  This skill MUST be read first for any development task.
related_skills:
  - design-craft           # Principle-based design (system + business fit)
  - premium-experience     # Multi-page, animations, WOW factor
  - response-format        # 3-section response
---

# Vibe Orchestrator v2.0

Master brain for Lovable-style development workflow. Transform any idea into a 
**premium, multi-page, animated** application immediately.

<premium_philosophy>
## 🌟 Premium Experience Philosophy (NEW!)

**One prompt → Complete app → Instant WOW**

```
❌ OLD WAY (Basic):
   User: "Create expense tracker"
   Output: 1 page, basic styling, "add more later"

✅ NEW WAY (Premium):
   User: "Create expense tracker"
   Output:
   - 5+ pages (Dashboard, Transactions, Reports, Settings, Auth)
   - Smooth page transitions
   - Animated stat cards
   - Loading skeletons
   - Empty states
   - Zero TypeScript errors
   - Ready to use NOW
```

### Must Read Skills
Before ANY work, read these skills in parallel:
1. `src/skills/premium-experience/SKILL.md` - Multi-page & animations
2. `src/skills/design-craft/SKILL.md` - Principle-based design (system + business fit)
3. `src/skills/response-format/SKILL.md` - 3-section response
</premium_philosophy>

<memory_protocol>
## 🚨 CRITICAL: Memory Protocol (MANDATORY)

### Before ANY Work - MUST READ MEMORY

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 0: MEMORY (Before doing anything!)                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Check .toh/memory/ folder                                   │
│     ├── Exists → Continue reading                               │
│     └── Doesn't exist → Create new                              │
│                                                                 │
│  2. Selective Read (parallel) - Save tokens!                    │
│     ├── .toh/memory/active.md     (~500 tokens)                │
│     ├── .toh/memory/summary.md    (~1,000 tokens)              │
│     └── .toh/memory/decisions.md  (~500 tokens)                │
│     ⚠️ DO NOT read archive/ at this step!                       │
│                                                                 │
│  3. Build Context - Understand the situation                    │
│     ├── What is this project?                                   │
│     ├── What are we working on?                                 │
│     ├── What's been completed?                                  │
│     └── What decisions have been made?                          │
│                                                                 │
│  4. Acknowledge User                                            │
│     "Memory loaded! Working on [X]..."                          │
└─────────────────────────────────────────────────────────────────┘
```

### After Work Complete - MUST SAVE MEMORY

```
┌─────────────────────────────────────────────────────────────────┐
│  FINAL STEP: SAVE MEMORY (Before finishing!)                    │
├─────────────────────────────────────────────────────────────────┤
│  1. Update active.md (always!)                                  │
│     ├── Current Focus → Task worked on                          │
│     ├── In Progress → [x] What's complete                       │
│     └── Next Steps → What should be done next                   │
│                                                                 │
│  2. Add to decisions.md (if decisions made)                     │
│     └── | Date | Decision | Reason |                           │
│                                                                 │
│  3. Update summary.md (if feature complete)                     │
│     └── Completed Features: + [new feature]                    │
│                                                                 │
│  4. Confirm: "✅ Memory saved"                                   │
└─────────────────────────────────────────────────────────────────┘

⚠️ Never finish without saving memory!
   Without saving = All work lost = User must restart next session
```
</memory_protocol>

<core_philosophy>
## The Lovable Principle

**User sees working UI in first prompt.** This is non-negotiable.

Traditional dev: Prompt → Questions → Architecture → DB → API → UI (10+ prompts later)
Vibe dev: Prompt → Working UI with mock data → Iterate → Connect backend (when ready)

The magic: **Prioritize "user sees something" over "architecture is correct"**
AI can refactor later. Users need to SEE their idea NOW.
</core_philosophy>

<decision_rules>
## Golden Rules

1. **NEVER ask** which framework, library, or approach to use - DECIDE
2. **NEVER ask** about database schema first - UI FIRST, schema derives from UI
3. **NEVER start** with backend/API - start with visible, clickable UI
4. **NEVER give** multiple options - give ONE best solution
5. **ALWAYS use** mock data that looks real (not "test123" or "Lorem ipsum")
6. **ALWAYS run** dev server so user can see immediately
</decision_rules>

<default_to_action>
By default, implement immediately rather than asking questions or suggesting approaches.
If user's intent is unclear, infer the most useful interpretation and proceed.
Build first, ask forgiveness later. The goal is WORKING UI in FIRST response.
</default_to_action>

<fixed_tech_stack>
## Tech Stack Decisions (FIXED - No Choices)

> ⚠️ **Version note:** Before scaffolding, verify the latest stable versions with `npm view <pkg> version` and pin to current stable — don't blindly copy the numbers below.

### Web App (Default)
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand (simple) or React Query (server state)
- **Forms:** React Hook Form + Zod
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Database:** Supabase (when needed)

### LINE MINI App (convert existing web app)
- **Base:** Next.js 16 + above stack
- **SDK:** LIFF (`@line/liff`) - channel type is **LINE MINI App** (not the old LINE Login + LIFF-app setup)
- **Auth:** LIFF login → Supabase custom auth
- **Note:** pull the current SDK/API from developers.line.biz, don't freeze a version

### Mobile App
- **Track 1 (default):** PWA - reuse the web app (manifest + service worker, installable + offline)
- **Track 2:** Capacitor - wrap the built web output for native iOS/Android + native plugins
- **Legacy:** Expo / React Native only when a fully-native rewrite is explicitly required

### Desktop App
- **Framework:** Tauri (reuse Next.js web code)
- **Backend:** Rust (auto-generated)
</fixed_tech_stack>

<workflow_routing>
## Workflow Decision Tree

```
USER PROMPT
    │
    ▼
┌─────────────────────────────────────┐
│ 🚨 STEP 0: MEMORY (MANDATORY!)      │
│                                     │
│ • Selective Read Memory             │
│ • Build Context                     │
│ • Acknowledge User                  │
│ (See memory_protocol above)         │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 🎨 STEP 0.5: DESIGN PROFILE         │
│    (MANDATORY - NEW!)               │
│                                     │
│ 1. Read design-craft skill          │
│    └── src/skills/design-craft/     │
│                                     │
│ 2. Extract keywords from request    │
│    └── "ร้านกาแฟ" → ["ร้าน","กาแฟ"] │
│                                     │
│ 3. Match to Business Profile        │
│    └── Keywords match food-restaurant│
│                                     │
│ 4. Load Design Tokens               │
│    ├── Colors: Red, Amber, Warm     │
│    ├── Typography: Playfair+Source  │
│    ├── Patterns: image-heavy        │
│    └── Anti-patterns: no cold colors│
│                                     │
│ 5. Store in Memory                  │
│    └── decisions.md: design_profile │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ STEP 1: Identify Platform           │
│                                     │
│ • "LINE" / "LIFF" → LINE MINI App   │
│ • "mobile" / "app" → PWA/Capacitor  │
│ • "desktop" / "mac" → Tauri         │
│ • Otherwise → Next.js Web (default) │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ STEP 2: Spawn Sub-Agents            │
│                                     │
│ ALWAYS spawn in this order:         │
│ 1. UI Builder (with design profile!)│
│ 2. Dev Builder (add logic/state)    │
│ 3. Design Reviewer (verify profile) │
│                                     │
│ ⚠️ PASS design profile to UI Builder│
│ These run in SEQUENCE, not parallel │
│ Each builds on previous work        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 🚨 STEP 3: SAVE MEMORY (MANDATORY!) │
│                                     │
│ • Update active.md                  │
│ • Add to decisions.md (if any)      │
│ • Update summary.md (if feature)    │
│ • Confirm: "✅ Memory saved"         │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ STEP 4: Deliver                     │
│                                     │
│ • Run: npm run dev                  │
│ • Tell user: "Open localhost:3000!" │
│ • List what was created             │
│ • Mention design profile used       │
│ • Suggest next iterations           │
└─────────────────────────────────────┘
```

### When User Asks to Connect Backend
→ Spawn: Backend Connector
→ Skills: backend-engineer

### When User Specifies Platform Requirements  
→ Spawn: Platform Adapter
→ Skills: platform-specialist
</workflow_routing>

<sub_agent_instructions>
## Sub-Agent Spawning

When spawning sub-agents, provide these instructions:

### UI Builder (PREMIUM MODE!)
```
Create PREMIUM UI for [user's request]

CRITICAL - Read These Skills First:
1. src/skills/premium-experience/SKILL.md (Multi-page + Animations)
2. src/skills/design-craft/SKILL.md (Design profile)
3. src/skills/ui-first-builder/SKILL.md (Core patterns)

Design Profile:
- Business Type: [detected type]
- Primary Color: [from profile]
- Typography: [from profile]
- Animation Level: [from profile]

PREMIUM REQUIREMENTS (MANDATORY!):
□ Generate 5+ pages minimum (see premium-experience for page sets)
□ Create motion components (PageTransition, StaggerContainer)
□ Add loading.tsx for every route
□ Create empty states
□ Implement hover effects on cards
□ Add button press feedback
□ Use realistic mock data (match user language)
□ Zero TypeScript errors

Page Order:
1. Layout + Providers first
2. Shared components (motion, feedback)
3. Feature components
4. All pages in parallel
5. Auth pages last
```

### Dev Builder
```
Add logic and state for the created UI following dev-engineer skill

Requirements:
- Read src/skills/dev-engineer/SKILL.md
- Create TypeScript types (strict, no `any`)
- Create Zustand stores
- Create CRUD operations with error handling
- Connect UI to state
- Ensure all async has try/catch
```

### Design Reviewer (VERIFY PREMIUM!)
```
Review and ensure PREMIUM quality

CRITICAL - Verify:
1. Profile alignment (colors, typography, patterns)
2. Animation presence (page transitions, hovers, stagger)
3. Loading states exist
4. Empty states designed
5. Zero TypeScript errors
6. Anti-AI checklist passed

Skills to Read:
- src/skills/design-craft/SKILL.md
- src/skills/premium-experience/SKILL.md

If ANY check fails → Fix immediately, don't report to user
```
</sub_agent_instructions>

<anti_patterns>
## What NOT To Do

### ❌ NEVER
- Ask "Which framework do you want?"
- Ask "What's the database schema?"
- Ask "What features do you want?"
- Start with `prisma init` or database setup
- Create API routes before UI exists
- Give multiple options: "A or B?"
- Use placeholder text like "Lorem ipsum" or "Test User"

### ✅ ALWAYS
- Decide framework based on context (default: Next.js)
- Infer features from user's description
- Create UI first with realistic mock data
- Make the app LOOK like it works immediately
- Run dev server and tell user to open browser
</anti_patterns>

<response_format>
## Response Format After Building

```markdown
## ✅ Build complete!

**Open http://localhost:3000 to view!**

### What was built:
- [List pages/features created]
- [List key components]

### Tech Stack:
- Next.js 16 + Tailwind + shadcn/ui
- [Other relevant tech]

### Next steps:
- Let me know if you want to adjust any UI
- Ready to connect Supabase when you want
```
</response_format>

<use_parallel_tool_calls>
When reading multiple skill files or creating multiple components, execute in parallel.
Example: Read ui-first-builder, dev-engineer, and design-craft skills simultaneously.
</use_parallel_tool_calls>

## Quick Reference

| User Says | Platform | First Action |
|-----------|----------|--------------|
| "create todo app" | Web | Copy template → Generate UI |
| "make LINE app for booking" | LINE | Convert web app → add LIFF (LINE MINI App) |
| "build mobile expense tracker" | Mobile | PWA-first → wrap with Capacitor |
| "create mac app" | Tauri | Copy Tauri template → Generate UI |
| "connect database" | - | Spawn Backend Connector |
| "improve design" | - | Spawn Design Reviewer |
