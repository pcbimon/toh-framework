---
command: /toh-help
aliases: ["/toh-h", "/toh-?"]
description: Display all Toh Framework commands and quick usage guide
---

# Toh Framework - Help

When user calls `/toh-help`, display the following:

<help_response>
## 🎯 Toh Framework v2.0.0-beta.1

**"Type anything, AI does it for you"** - AI-Orchestration Driven Development

---

### ✨ Smart Single Command

```
/toh [type anything]
```

**No need to memorize commands** - AI analyzes → picks Agent → executes!

**Examples:**
```
/toh scroll overflow                  → Fix Agent
/toh make it prettier                 → Design Agent
/toh add login page                   → UI + Dev Agent
/toh connect Supabase                 → Connect Agent
/toh create coffee shop chatbot       → Plan → Vibe Agent
```

---

### 🚀 Quick Commands (Power User)

| Command | Shortcut | Description |
|---------|----------|-------------|
| `/toh` | - | 🧠 **Smart Command** - Type anything, AI picks the right Agent |
| `/toh-plan` | `/toh-p` | 📋 **Plan** - Plan large projects |
| `/toh-vibe` | `/toh-v` | 🎨 **Create Project** - UI + Logic + Mock Data in one command |
| `/toh-ui` | `/toh-u` | 🖼️ **Create UI** - Pages, Components, Layouts |
| `/toh-dev` | `/toh-d` | ⚙️ **Add Logic** - TypeScript, Zustand, Forms |
| `/toh-design` | `/toh-ds` | ✨ **Polish Design** - Make it beautiful, not AI-looking |
| `/toh-test` | `/toh-t` | 🧪 **Test** - Auto test & fix |
| `/toh-connect` | `/toh-c` | 🔌 **Connect Backend** - Supabase, Auth, RLS |
| `/toh-line` | `/toh-l` | 💚 **LINE MINI App** (convert) |
| `/toh-mobile` | `/toh-m` | 📱 **Mobile App** - PWA / Capacitor |
| `/toh-fix` | `/toh-f` | 🔧 **Fix Bug** - Evidence-first debug: prove the root cause before touching code |
| `/toh-ship` | `/toh-s` | 🚀 **Deploy** - Vercel, Production ready |
| `/toh-protect` | `/toh-pr` | 🔐 **Security Audit** - Full security check |

---

### 💡 Usage Examples

**Easiest - use /toh:**
```
/toh create expense tracker
/toh add expense chart
/toh bug - button not working
/toh connect database
```

**Power User - use specific commands:**
```
/toh-vibe coffee shop management system
/toh-plan read PRD and build according to spec
/toh-design make it more professional
```

---

### 💾 Memory System (7 Files · Tiered Loading)

```
.toh/memory/
├── Tier 1 · ALWAYS read at start (~800 tokens)
│   ├── active.md       # Current task
│   └── summary.md      # Project summary
├── Tier 2 · read per task type
│   ├── architecture.md # Project structure  (build/code work)
│   ├── components.md   # Component registry  (build/code work)
│   └── changelog.md    # Session changes     (debug work)
├── Tier 3 · read only when referenced
│   ├── decisions.md    # Key decisions
│   └── agents-log.md   # Agent activity
└── archive/            # Historical data
```

**Writes:** always update `active.md`; update `summary.md` when the project
shape changes; update the rest per relevance.

---

### 📝 Response Format

Every response from Toh includes:

1. **✅ What was done** - Files created/modified
2. **🎁 What you got** - Features, URLs
3. **👉 What you need to do** - Next steps (if any)

**No need to ask follow-up questions!**

---

### 🏗️ Tech Stack (Fixed)

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **Forms:** React Hook Form + Zod
- **Backend:** Supabase
- **Language:** TypeScript

---

### 🤖 Sub-Agents (v1.6.0)

| Agent | File | Specialty |
|-------|------|-----------|
| 🎨 UI Builder | `ui-builder.md` | Pages, Components, Layouts |
| ⚙️ Dev Builder | `dev-builder.md` | Logic, State, API |
| 🔌 Backend Connector | `backend-connector.md` | Supabase, Auth, RLS |
| ✨ Design Reviewer | `design-reviewer.md` | Polish, Animation |
| 🧪 Test Runner | `test-runner.md` | Auto test & fix |
| 🧠 Plan Orchestrator | `plan-orchestrator.md` | Analyze, Plan |
| 📱 Platform Adapter | `platform-adapter.md` | LINE, Mobile, Desktop |
| 🔍 Root Cause Debugger | `root-cause-debugger.md` | Investigate & prove bug root cause (read-only) |

**Vibe Mode** = Orchestration Pattern (not an agent)
```
/toh-vibe → plan → ui → dev → design → test → ✅ Working App
```

---

### 📊 Framework Stats

- 🤖 **8 Sub-Agents v2.1** - UI, Dev, Design, Test, Connect, Plan, Platform, root-cause-debugger
- 🎯 **15 Commands** - Including `/toh` smart command & `/toh-protect`
- 📚 **22 Skills** - Including Security Engineer
- 🎨 **13 Design Profiles** - Business-appropriate design
- 📦 **15 Component Templates** - Ready-to-use premium components
- 🌐 **5 IDEs** - Claude Code, Cursor, Gemini, Antigravity, Codex

---

### 🆕 What's New in v1.8.1

- 🌐 **Google Antigravity Workflows** - Full support! Commands appear with `/` in Antigravity
- 🧠 **7-File Memory System** - Added `changelog.md` + `agents-log.md` for better tracking
- 📢 **Agent Announcements** - See which agent is working on what
- ⚡ **Parallel Execution** - Agents can work simultaneously when no dependencies
- 🎯 **Agent Selection Reasoning** - See why AI chose specific agents

---

### 🌐 Supported IDEs

| IDE | Config Location |
|-----|-----------------|
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursor/rules/*.mdc` |
| Gemini CLI | `.gemini/GEMINI.md` |
| Google Antigravity | `.agent/workflows/` |
| Codex CLI | `AGENTS.md` |

---

### 🔗 Links

- **Website:** [tohframework.dev](https://tohframework.dev)
- **npm:** `npm install -g toh-framework`
- **GitHub:** [github.com/wasintoh/toh-framework](https://github.com/wasintoh/toh-framework)

</help_response>
