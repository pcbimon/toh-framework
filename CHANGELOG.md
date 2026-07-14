# Changelog

All notable changes to Toh Framework will be documented in this file.

## [2.0.0-beta.1] - 2026-07-14

### 🎯 Intent-Based Orchestration & Evidence-First Debugging

A ground-up rewrite of the flagship commands around real intent and real proof - cutting the status theater and treating debugging as an investigation.

#### Changed

- **`/toh` rewritten intent-based** - now runs on a single **Intent → Route → Verify → Report** axis. Understands what the user actually wants, acts immediately on small work (≤3 tasks, no plan shown), shows a short plan only for bigger work, delegates independent pieces by agent description, verifies with a real build, and reports in human language. No mapping tables, no confidence %, no status theater.
- **`/toh-vibe` rewritten intent-based** - same Intent → Route → Verify → Report axis scoped to greenfield. "Type Once, Have it all!" - one line in, a multi-page running app out. Design personality is delegated to the design agent from business context; no hardcoded palettes or purple-blue gradient.
- **`/toh-fix` rebuilt evidence-first** - replaced the old "Common Fixes" cookbook with **Common Root Causes**. New protocol **REPRODUCE → EVIDENCE → DIAGNOSE → FIX → PROVE**: no code change until the root cause is proven, differential diagnosis over easy guesses, and proof by re-running the failing path before reporting.
- **`debug-protocol` skill synced** - targeted logging at the point of failure, `git bisect` for regressions, and differential diagnosis.

#### Added

- **`root-cause-debugger` agent (8th agent)** - an investigate-only specialist (Read/Grep/Glob/Bash, no writes) that finds and *proves* a bug's root cause before any code is touched, then reports where to fix it. `/toh` and `/toh-fix` delegate to it when a cause is unknown or a fix keeps failing.
- **Antigravity `/toh` workflow** - Antigravity now has a native `/toh` orchestrator workflow (it previously only had the sub-commands).

#### Technical Details

- Agent count updated **7 → 8** across README.md, docs/README-TH.md, `src/commands/toh-help.md`, and `src/agents/README.md`.
- Synced the rewritten intent/evidence-first content into the **Antigravity workflows** (`toh.md`, `toh-fix.md`, `toh-vibe.md`) and the **Gemini CLI commands** (`fix.toml`, `vibe.toml`).
- Version bumped to **2.0.0-beta.1**.

---

## [1.8.1] - 2026-01-11

### 🌐 Google Antigravity Workflows Support

Full support for Google Antigravity IDE slash commands.

#### Added

- **13 Workflow Files** in `src/antigravity-workflows/`:
  - `toh-help.md`, `toh-vibe.md`, `toh-plan.md`
  - `toh-ui.md`, `toh-dev.md`, `toh-design.md`
  - `toh-test.md`, `toh-connect.md`, `toh-fix.md`
  - `toh-ship.md`, `toh-line.md`, `toh-mobile.md`, `toh-protect.md`

- **Automatic Installation** - Workflows copied to `.agent/workflows/` on install

#### Changed

- `gemini-cli.js` - Now creates both `.gemini/commands/` (TOML) and `.agent/workflows/` (Markdown)
- `install.js` - Updated messages to show both Gemini CLI and Antigravity commands
- Install now shows separate sections for Gemini CLI (Terminal) and Google Antigravity (IDE)

#### Technical Details

| Platform | Config Location | Format | Command Syntax |
|----------|-----------------|--------|----------------|
| Gemini CLI | `.gemini/commands/` | TOML | `/toh:vibe` |
| Antigravity | `.agent/workflows/` | Markdown + YAML | `/toh-vibe` |

---

## [1.8.0] - 2026-01-11

### 🧠 Enhanced Memory & Agent Orchestration

#### Added - 7-File Memory System

Upgraded from 5 files to 7 files for comprehensive project tracking:

| File | Purpose | Token Budget |
|------|---------|--------------|
| `active.md` | Current task | ~500 |
| `summary.md` | Project overview | ~1,000 |
| `decisions.md` | Key decisions | ~500 |
| `changelog.md` | Session changes (NEW!) | ~300 |
| `agents-log.md` | Agent activity (NEW!) | ~300 |
| `architecture.md` | Project structure | ~500 |
| `components.md` | Component registry | ~500 |

**Benefits:**
- Session changes tracked in `changelog.md`
- Agent activity logged in `agents-log.md`
- Better debugging and continuity across sessions

#### Added - Agent Announcement Protocol

All 7 agents now announce themselves when starting/completing work:

```
[🎨 UI Builder] Starting: Create Dashboard Page
[🎨 UI Builder] ✅ Complete: Dashboard with 3 components
```

#### Added - Ultrathink Principles

All agents enhanced with Ultrathink principles:
1. **Question Assumptions** - Is this the right approach?
2. **Obsess Over Details** - Read code thoroughly before changes
3. **Iterate Relentlessly** - Build, verify, fix, improve
4. **Simplify Ruthlessly** - Minimum changes for maximum impact

#### Added - Parallel Execution Awareness

Agents now declare compatibility for parallel execution:

```markdown
This agent CAN run in parallel with:
- 🎨 UI Builder
- ⚙️ Dev Builder

This agent MUST wait for:
- 📋 Plan Orchestrator
```

#### Added - Agent Selection Reasoning Display (toh.md)

Before executing, `/toh` now shows:
- **Capability Detection** - What skills are needed
- **Agent Selection** - Which agents were chosen and why
- **Execution Strategy** - Parallel vs sequential decisions

#### Added - Execution Plan Display (toh-vibe.md)

Before starting work, `/toh-vibe` now displays:
- **Agent Workflow** - Visual phase diagram
- **Pages to Create** - Table with routes and components
- **Progress Updates** - Real-time agent status during execution

#### Added - Enhanced Planning Output (toh-plan.md)

`/toh-plan` now shows structured output:
- **Phase Breakdown** - Table with agents, types, dependencies
- **Agent Assignments** - Tasks and expected outputs per agent
- **Execution Flow** - Visual parallel/sequential diagram

#### Changed - All Agent Files (14 files)

Both root and subagent versions updated to v2.1:
- `ui-builder.md` - Added announcements, ultrathink, 7-file memory
- `dev-builder.md` - Added announcements, ultrathink, 7-file memory
- `design-reviewer.md` - Added announcements, ultrathink, 7-file memory
- `backend-connector.md` - Added announcements, ultrathink, 7-file memory
- `test-runner.md` - Added announcements, ultrathink, 7-file memory
- `platform-adapter.md` - Added announcements, ultrathink, 7-file memory
- `plan-orchestrator.md` - Added announcements, ultrathink, 7-file memory

#### Changed - Command Files (3 files)

- `toh.md` v4.1 - Agent selection reasoning, 7-file memory
- `toh-vibe.md` v4.1 - Execution plan display, progress updates
- `toh-plan.md` v2.1 - Enhanced planning output format

#### Changed - Installer Updates

- `install.js` - Now creates all 7 memory files on install
- All IDE handlers sync 7-file memory system

#### Changed - Language Normalization

- All agent definitions now 100% English
- All command definitions now 100% English
- User-facing examples remain Thai for target audience

#### Stats Update

- **Memory Files:** 5 → 7 (added changelog.md, agents-log.md)
- **Agent Version:** v2.0 → v2.1
- **Command Version:** v4.0 → v4.1

---

## [1.7.1] - 2026-01-11

### 🚀 Gemini CLI Native Commands Support

#### Added - Native Slash Commands for Gemini CLI

Gemini CLI / Google Antigravity now supports **native slash commands** instead of file mentions!

**Before (v1.7.0):**
```
@.toh/commands/toh-vibe.md restaurant management
```

**After (v1.7.1):**
```
/toh:vibe restaurant management
```

#### Added - 14 TOML Command Files

Native Gemini CLI commands in proper TOML format:

| Command | Description |
|---------|-------------|
| `/toh` | Show all commands |
| `/toh:help` | Show all commands with examples |
| `/toh:vibe` | Create new project with UI + Logic + Mock Data |
| `/toh:plan` | Analyze and plan project |
| `/toh:ui` | Create UI components and pages |
| `/toh:dev` | Add logic, state, and functionality |
| `/toh:design` | Improve design to professional level |
| `/toh:test` | Run tests and auto-fix issues |
| `/toh:connect` | Connect to Supabase backend |
| `/toh:fix` | Debug and fix issues |
| `/toh:ship` | Deploy to production |
| `/toh:line` | LINE Mini App integration |
| `/toh:mobile` | Expo / React Native app |
| `/toh:protect` | Security audit |

**Files Location:** `src/gemini-commands/`

#### Added - Skills Auto-Discovery

Skills are now copied to `.gemini/skills/` for automatic discovery by Gemini CLI:
- No more relying on `contextFiles` in settings.json
- Skills auto-loaded when referenced in commands
- Uses `@{.gemini/skills/...}` syntax in TOML prompts

#### Changed - gemini-cli.js Handler

Major update to installer handler:
- **Copy TOML commands** to `.gemini/commands/`
- **Copy skills** to `.gemini/skills/`
- **Simplified GEMINI.md** (commands are now native)
- **Simplified settings.json** (skills auto-discovered)

#### Changed - Command Naming Convention

| Claude Code | Gemini CLI | Note |
|-------------|------------|------|
| `/toh-vibe` | `/toh:vibe` | Gemini uses colon for namespaced commands |
| `/toh-plan` | `/toh:plan` | Each IDE has its own format |
| `/toh-ui` | `/toh:ui` | No cross-IDE conflict |

#### No Impact on Other IDEs

Each IDE maintains its own isolated configuration:
- **Claude Code:** `.claude/commands/*.md` → `/toh-vibe` (unchanged)
- **Gemini CLI:** `.gemini/commands/*.toml` → `/toh:vibe` (new!)
- **Cursor:** `.cursor/rules/*.mdc` → `@toh` (unchanged)
- **Codex:** `AGENTS.md` (unchanged)

#### Stats Update

- **TOML Commands:** 0 → 14 (NEW!)
- **Gemini Skills Location:** `.toh/` → `.gemini/skills/`
- **Native Command Support:** Gemini CLI now has proper slash commands

---

## [1.7.0] - 2025-12-26

### 🏗️ Code Architecture Tracking & 🔐 Security Engineer System

#### Added - Code Architecture Tracking (Phase 1)

Two new memory files for instant codebase understanding:

- **`architecture.md`** - Project structure overview
  - Entry Points (pages, routes, API)
  - Core Modules organization
  - Data Flow patterns
  - External Services integration

- **`components.md`** - Component registry
  - Pages inventory
  - Components with props summary
  - Custom hooks registry
  - Zustand stores tracking
  - Utility functions

**Benefits:**
- AI no longer needs to scan codebase every session
- Token budget: ~3,000 tokens (was ~2,000)
- Memory now has 5 files instead of 3

#### Added - Security Engineer System (Phase 2)

New security-first approach for AI-generated code:

- **`security-engineer/SKILL.md`** - Security skill with:
  - Level 1: Quick checks (secrets, dangerous code, auth)
  - Level 2: Full audit (injection, auth flaws, AI risks, config)

- **`/toh-protect`** command - Full security audit
  - Aliases: `/toh-p`, `/toh-security`, `/toh-audit`
  - Scans for vulnerabilities before deployment
  - Generates detailed report with fixes
  - Supports auto-fix for common issues

- **`/toh-dev`** & **`/toh-test`** - Quick security checks
  - Pre-coding security scan
  - Post-implementation verification
  - Blocks on critical issues

#### Changed - Memory System v2.0

- **5 memory files** instead of 3 (added architecture.md, components.md)
- **Token budget** increased to ~3,000 tokens
- **All 14 agents** updated with new Memory Protocol
- **All 4 IDE handlers** create all 5 memory files on install

#### Updated - Commands

- `/toh-dev` - Added pre and post security checks
- `/toh-test` - Added quick security check before testing
- Memory read/save now includes architecture.md and components.md

#### Stats Update

- **Commands:** 14 → 15 (added `/toh-protect`)
- **Skills:** 23 → 24 (added `security-engineer`)
- **Memory Files:** 3 → 5 (added architecture, components)

---

## [1.6.1] - 2025-12-18

### 📝 Documentation & Command Description Update

#### Changed - README Complete Rewrite
- **README.md** - Complete rewrite for v1.6.0 features (English)
- **docs/README-TH.md** - Complete rewrite for v1.6.0 features (Thai)
- Focused on Sub-Agents, Multi-Agent Orchestration, and Vibe Mode
- Cleaner structure with better examples

#### Fixed - Command Descriptions
- All commands now have **single-line descriptions** in YAML frontmatter
- Claude Code can now display descriptions in slash command picker
- Standardized format across all 14 command files

#### Changed - toh-help.md
- Converted to **English only** for consistency
- Updated to v1.6.0 feature set
- Added Sub-Agents table

---

## [1.6.0] - 2025-12-18

### 🤖 Claude Code Sub-Agents & Multi-Agent Orchestration

#### Added - Claude Code Native Sub-Agents

- **7 Sub-Agents** in Claude Code native format (YAML frontmatter with `tools`, `model`)
- **Dual Architecture** - Original format for Cursor/Gemini, Subagent format for Claude Code
- **Sub-Agent Files:**
  - `ui-builder.md` - Create pages, components, layouts
  - `dev-builder.md` - Add logic, state, API integration
  - `backend-connector.md` - Supabase, Auth, Database
  - `design-reviewer.md` - Polish design, eliminate AI red flags
  - `test-runner.md` - Auto test & fix loop
  - `plan-orchestrator.md` - Analyze, plan, coordinate
  - `platform-adapter.md` - LINE, Mobile, Desktop adaptation

#### Added - `/toh` v4.0 Multi-Agent Orchestration

- **Workflow Planning** - Shows agent assignments before execution
- **Parallel Execution** - Run independent agents simultaneously
- **Quality Gates** - Verify between agent handoffs
- **Full Visibility** - User sees which agent does what

#### Added - Vibe Mode Orchestration

- **Vibe Mode** is now an orchestration pattern (not an agent)
- Coordinates 5 sub-agents: plan → ui → dev → design → test
- CLAUDE.md is the Core Orchestrator
- `/toh-vibe` triggers full project creation workflow

#### Changed - Installer Updates

- Claude Code: copies `subagents/` to `.claude/agents/` (native format)
- Other IDEs: copies `agents/` to `.toh/agents/` (original format)
- CLAUDE.md template includes Vibe Mode workflow documentation

#### Updated - Documentation

- `src/agents/README.md` - Dual Architecture explanation
- `src/commands/toh.md` - v4.0 Multi-Agent spec
- `src/commands/toh-vibe.md` - Sub-Agent Orchestration workflow

---

## [1.5.2] - 2025-12-10

### Fixed

- Install finish message now shows "What's New:" instead of "New in v1.5.0:" to avoid version confusion
- Version display consistency across all files

---

## [1.5.1] - 2025-12-05

### Fixed

- Install finish message now respects language selection (EN/TH)
- AI now responds in the same language the user types (not forced EN or TH)

### Documentation

- Updated README-TH.md with v1.5.0 features and Supported IDEs table
- Added "Update to Latest Version" section in both README.md and README-TH.md

---

## [1.5.0] - 2025-12-05

### 🌌 Google Antigravity - Full Support!

#### Added - Full Google Antigravity/Gemini Support

- **Context Files Auto-Loading** - Skills and agents loaded via `settings.json`
- **GEMINI.md Configuration** - Complete rules and command recognition
- **Skills Loading Checkpoint** - AI must report loaded skills
- **Memory Protocol Enforcement** - Mandatory load/save

#### Changed - Dual Folder Architecture

| IDE | Folder | Reason |
|-----|--------|--------|
| Claude Code | `.claude/` | Required for slash commands to work |
| Cursor | `.toh/` | Uses @ file references |
| Gemini/Antigravity | `.toh/` | Uses contextFiles in settings.json |
| Codex | `.toh/` | Uses path references |

- Claude Code now uses `.claude/` folder (copies from `.toh/` on install)
- All other IDEs use `.toh/` as central resources
- Resources are synced on every `toh install`

#### Added - Memory Protocol Enforcement

```
BEFORE Work:
1. Read .claude/memory/ (or .toh/memory/)
2. Load active.md, summary.md, decisions.md
3. Report "Memory loaded!"

AFTER Work:
1. Update memory files
2. Confirm "Memory saved ✅"
```

- **Mandatory** - AI cannot skip memory operations
- **English Only** - Memory files always in English for consistency
- **Cross-IDE** - Same memory format works across all IDEs

#### Added - Skills Loading Checkpoint

AI must now report skills at the START of every response:

```markdown
📚 **Skills Loaded:**
- skill-name-1 ✅ (what was learned)
- skill-name-2 ✅ (what was learned)

🤖 **Agent:** agent-name

💾 **Memory:** Loaded ✅
```

This ensures AI actually reads skills before working.

#### Changed - Memory Templates to English

- `active.md` - Now English only
- `summary.md` - Now English only  
- `decisions.md` - Now English only
- `MEMORY-SYSTEM.md` - Full English documentation

#### Fixed

- Claude Code slash commands not showing (required `.claude/` folder)
- Memory not being created/saved by AI
- Skills not being read before execution

---

## [1.4.0] - 2025-12-04

### ✨ Smart Single Command & Premium Experience

#### Added - `/toh` Smart Command v3.0 (MAJOR!)

```
/toh [พิมพ์อะไรก็ได้]
```

- **Natural Language Routing** - AI วิเคราะห์ request → เลือก Agent ที่เหมาะสม
- **No Memorization Required** - ไม่ต้องจำ commands อีกต่อไป
- **Intelligent Routing** - Fix bugs → Fix Agent, Design → Design Agent, etc.
- **Complexity Detection** - Auto-route complex tasks to Plan Agent
- **Premium by Default** - New projects get 5+ pages with animations

#### Added - Premium Experience Skill (NEW!)

- **Multi-Page Generation** - 5+ pages per project (Home, Dashboard, Feature, Settings, Auth)
- **Animation System** - PageTransition, StaggerContainer, FadeIn, CountUp
- **Component Templates** - 15 ready-to-use premium components
- **Zero TypeScript Errors** - Build verification before delivery
- **WOW Factor** - Instant professional-looking results

#### Added - Design Mastery Extended

- **13 Business Profiles** - SaaS, E-commerce, Food, Healthcare, Finance, Education, Travel, Real-estate, Gaming, Social-media, AI-Chatbot, Creative, Enterprise
- **Auto Profile Detection** - AI detects business type from request keywords
- **Design Tokens** - Colors, typography, patterns per profile
- **Trend Registry** - 2024-2025 design trends with suitability matrix

#### Added - 4 New Skills

| Skill | Description |
|-------|-------------|
| **premium-experience** | Multi-page apps with animations and WOW factor |
| **prompt-optimizer** | สำหรับ AI SaaS - สร้าง system prompts ที่ดี |
| **design-mastery** | Smart design ตาม business type (13 profiles) |
| **response-format** | Response Excellence - ตอบครบ ไม่ต้องถามซ้ำ |

#### Added - Component Templates (15 files)

```
src/templates/components/
├── motion/        (4 files) - PageTransition, StaggerContainer, FadeIn, CountUp
├── feedback/      (3 files) - LoadingSpinner, Skeleton, EmptyState
├── interactive/   (2 files) - AnimatedCard, AnimatedButton
└── layout/        (3 files) - Navbar, Sidebar, Footer

src/templates/pages/
├── landing-page.tsx
├── dashboard-page.tsx
└── auth-pages.tsx
```

#### Added - Response Excellence Format

ทุก response จะมี 3 ส่วน:
1. **✅ สิ่งที่ทำให้** - ไฟล์ที่สร้าง/แก้ไข
2. **🎁 สิ่งที่คุณได้** - Features, URLs, benefits
3. **👉 สิ่งที่คุณต้องทำ** - ขั้นตอนถัดไป (ชัดเจน!)

#### Updated - Agents Enhanced

- **ui-builder.md** - Premium Mode with multi-page generation
- **design-reviewer.md** - Premium quality verification checklist
- **vibe-orchestrator** - Premium Experience integration

#### Stats Update

- **Commands:** 13 → 14 (added `/toh` v3.0)
- **Skills:** 18 → 23 (+5 new skills)
- **Design Profiles:** 8 → 13 (+5 profiles)
- **Component Templates:** 0 → 15 (NEW!)
- **Page Templates:** 0 → 3 (NEW!)

---

## [1.3.0] - 2025-12-03

### 🧠 AI Intelligence Upgrade

#### Added - 8 New Skills

| Skill | Description |
|-------|-------------|
| **business-context** | AI understands business types, auto-includes standard features |
| **smart-suggestions** | AI suggests 2-3 next steps after every task |
| **error-handling** | Auto-fix errors silently, user never sees raw errors |
| **progress-tracking** | Visual progress bars and checklists |
| **session-recovery** | Continue where you left off, even across IDEs |
| **preview-mode** | See changes before applying |
| **version-control** | Easy undo/rollback without knowing git |
| **integrations** | One-click setup for Stripe, PromptPay, Email, Analytics |
| **debug-protocol** | Systematic debugging with 3-5-Rewrite Rule |

#### Updated - All Agents Enhanced

- **plan-orchestrator.md** - Full skills integration, business context awareness
- **ui-builder.md** - Preview mode, progress tracking, error handling
- **dev-builder.md** - Error handling, smart suggestions
- **test-runner.md** - Auto-fix loop, progress tracking
- **backend-connector.md** - Integrations skill, version control
- **design-reviewer.md** - Preview mode, smart suggestions

#### Updated - Command Recognition

- Added "Command Without Description" behavior for all IDE handlers
- AI now asks "What would you like me to help with?" instead of executing blindly
- Applied to Claude Code, Gemini CLI, Cursor, Codex CLI

#### Stats Update

- **Skills:** 14 → 17 (+7 new skills but some combined)
- **Total files:** 45+ markdown files

---

## [1.2.2] - 2025-12-02

### 📚 Documentation Update

#### Updated
- **`/toh-help` command** - Now shows v1.2.2 with all latest features
- **Added `/toh-plan`** to help command (was missing!)
- **Framework Stats** - Updated to 8 agents, 13 commands, 14 skills
- **Memory System section** - Added to help output
- **What's New section** - Added to help output
- **README.md** - Version updated to v1.2.2
- **README-TH.md** - Version updated to v1.2.2
- **All docs synced** - npm, git, and docs now all match

---

## [1.2.0] - 2025-12-01

### 🧠 Memory Enforcement Update

#### Added

**Selective Read Protocol (Token-Optimized)**
- Smart memory loading: ~2,000 tokens per session
- Always read 3 core files (active, summary, decisions)
- Archive folder only loaded on-demand
- Prevents context overload while maintaining full project awareness

**Mandatory Memory Save**
- All commands now enforce memory save before completion
- Confirmation required: "✅ บันทึก memory แล้วครับ"
- No command can finish without saving memory

#### Changed

**All Commands Updated**
- Added STEP 0: READ MEMORY (MANDATORY!) 
- Added final STEP: SAVE MEMORY (MANDATORY!)
- Commands affected: toh-ui, toh-dev, toh-connect, toh-design, toh-vibe, toh-plan, toh-fix, toh-test, toh-ship, toh-line, toh-mobile

**All Agents Updated**
- Added "🚨 Selective Read Protocol" section
- Added mandatory save with confirmation
- Agents affected: ui-builder, dev-builder, backend-connector, design-reviewer, test-runner, platform-adapter, plan-orchestrator

**Core Memory Files**
- Updated MEMORY-INSTRUCTIONS.md with 4 Critical Rules
- Updated memory-system/SKILL.md with token budget table
- Updated vibe-orchestrator/SKILL.md with memory as STEP 0 and STEP 3

---

## [1.1.0] - 2025-11-30

### 🧠 The Brain Update

#### Added

**Plan Orchestrator (`/toh-plan`)**
- New command that acts as "The Brain" of the framework
- Analyzes complex requests and creates execution plans
- Delegates work to specialized agents (ui, dev, design, test, etc.)
- Shows plan before execution, waits for user approval

**Auto Memory System**
- Automatic context persistence across sessions
- Zero-config - works out of the box
- IDE-agnostic and model-agnostic
- Files stored in `.toh/memory/`:
  - `active.md` - Current task (~500 tokens)
  - `summary.md` - Project summary (~1,000 tokens)
  - `decisions.md` - Key decisions (~500 tokens)
  - `archive/` - Historical data (on-demand)

**Enhanced Dev Agent**
- API Doc Reader superpower - reads docs from URLs
- Better integration with external APIs

#### Changed
- All agents now have Memory Integration
- Installer creates memory folder automatically
- Updated all IDE handlers with v1.1.0 features

---

## [1.0.0] - 2025-11-29

### 🎉 Initial Release

#### Features
- **Core Orchestrator** - AI-Orchestration Driven Development (AODD)
- **7 Specialized Agents** - ui-builder, dev-builder, design-reviewer, test-runner, backend-connector, platform-adapter
- **12 Commands** - /toh-vibe, /toh-ui, /toh-dev, /toh-design, /toh-test, /toh-connect, /toh-line, /toh-mobile, /toh-fix, /toh-ship, /toh-help
- **Multi-IDE Support** - Claude Code, Cursor, Gemini CLI, Codex CLI
- **Bilingual** - English and Thai support

#### Tech Stack
- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- Zustand for state management
- React Hook Form + Zod
- Supabase backend
- TypeScript (strict)

---

## Roadmap

### v1.3.0 (Planned)
- Template system for common project types
- Enhanced test automation
- Performance improvements

### v2.0.0 (Future)
- Visual workflow builder
- Team collaboration features
- Custom agent builder
