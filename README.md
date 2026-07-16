<p align="center">
  <img src="https://raw.githubusercontent.com/wasintoh/toh-framework/main/docs/assets/toh-framework-banner.png" alt="Toh Framework 2.0" width="760" />
</p>

<h3 align="center">"Type Once, Have it all!" — AI-Orchestration Driven Development</h3>

<p align="center">Approve once. Walk away. Come back to a finished, verified app.</p>

[![npm version](https://img.shields.io/npm/v/toh-framework.svg?style=flat-square)](https://www.npmjs.com/package/toh-framework)
[![npm downloads](https://img.shields.io/npm/dt/toh-framework.svg?style=flat-square)](https://www.npmjs.com/package/toh-framework)
[![License](https://img.shields.io/npm/l/toh-framework.svg?style=flat-square)](https://github.com/wasintoh/toh-framework/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/wasintoh/toh-framework?style=flat-square)](https://github.com/wasintoh/toh-framework)

🌐 **Official Website:** [tohframework.dev](https://tohframework.dev)

> 📖 **[🇹🇭 Thai Documentation](docs/README-TH.md)**

## 🤖 Supported IDEs

| IDE | Status | Notes |
|-----|--------|-------|
| 🧠 **Claude Code** | ✅ Full Support | Native Sub-Agents, Slash commands |
| 📝 **Cursor** | ✅ Full Support | @ file references |
| 🌌 **Google Antigravity** | ✅ Full Support | Gemini integration |
| 💎 **Gemini CLI** | ✅ Full Support | Context files auto-loaded |
| 🤖 **Codex CLI** | ✅ Supported | OpenAI agents |

## 💡 Why Toh?

**Toh** = **T**ype **O**nce, **H**ave it all!

We believe **Solo Developers** and **Solopreneurs** should be able to build SaaS systems single-handedly without being an expert in every field.

Toh Framework enables you to:
- 💬 **Command in natural language** - No complex prompts needed
- 🤖 **AI handles everything** - Breaks down tasks, calls agents, executes until done
- 👀 **See results instantly** - No waiting, no answering questions
- 🚀 **Production-ready** - Not just a prototype

## 🆕 What's New in v2.0.0

> **The "never babysit your AI again" release.** One approval in. One finished app out.

| Feature | What it means for you |
|---------|----------------------|
| 🚀 **One-Go Build** | Approve once, get a whole finished app — `/toh-plan` writes the plan to a file, you say **"Go"**, and it builds to the end. Zero babysitting. |
| 🔁 **TOH LOOP** | Type & Forget — builds, tests, and fixes itself task by task, and **never asks "continue?"** between phases. |
| 🛡️ **Stop Hook** | Refuses to quit until every task is **verified DONE** — real command output is the only proof it accepts (Claude Code). |
| 🎨 **Design Identity** | No one can tell AI made it — every project gets its own root `DESIGN.md` (colors, fonts, navigation, one signature element) plus a versioned **AVOID-LIST** that kills the "AI look". |
| ⏯️ **Auto-Resume** | Quit anytime — `/clear`, close the terminal, even switch IDEs — it continues **exactly where it left off** from `.toh/plan.md`. |

### Also in 2.0.0

- 🧠 **`/toh` v5** — intent-based orchestrator: reads what you *mean*, surveys its runtime, routes to the right agents with the right models, verifies before reporting
- 🔬 **`/toh-fix` evidence-first** — reproduces and proves the root cause before touching a single line (no fix without proof)
- ⚡ **Modern stack** — Next.js 16 / React 19 / Tailwind CSS 4 templates, build-verified
- 💚 **`/toh-line` + `/toh-mobile`** — convert to LINE MINI App, or ship PWA / Capacitor mobile in one command
- 🤖 **Single-source agents** — one definition per agent, transformed per IDE at install, with model tiers (opus / sonnet / haiku) matched to each role
- 🎛️ **Runtime capability survey** — `.toh/capabilities.json` + per-IDE command variants: Claude Code gets hard enforcement (Stop hook, `/goal`, `/loop`), other IDEs run the same loop as instructions with checkbox-resume

### 📜 Previous Versions

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

**Recent highlights:**

| Version | Date | Key Feature |
|---------|------|-------------|
| v2.0.0 | 2026-07-16 | One-Go Build, TOH LOOP, Design Identity, Auto-Resume |
| v1.8.0 | 2026-01-11 | 7-File Memory System, Agent Announcements |
| v1.7.1 | 2026-01-11 | Gemini CLI Native Commands (TOML) |
| v1.7.0 | 2025-12-26 | Security Engineer, `/toh-protect` command |
| v1.6.0 | 2025-12-18 | Claude Code Sub-Agents, Multi-Agent Orchestration |
| v1.5.0 | 2025-12-05 | Google Antigravity/Gemini Support |

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **One-Go Build** | `/toh-plan` → approve once → whole app built autonomously |
| **TOH LOOP** | Builds, tests, and fixes itself until every task is verified DONE |
| **`/toh` Smart Command** | Type anything, AI picks the right agents and models |
| **Design Identity** | Per-project `DESIGN.md` + versioned AVOID-LIST — no "AI look" |
| **Auto-Resume** | `.toh/plan.md` survives `/clear`, restarts, and IDE switches |
| **Sub-Agents** | 8 specialized agents with model tiers per role |
| **Auto Memory** | Context persists across sessions and IDEs |

---

## 📦 Installation

```bash
# Interactive install (choose IDEs and language)
npx toh-framework install

# Quick install (Claude Code + Cursor, English)
npx toh-framework install --quick

# Specific IDE only
npx toh-framework install --ide claude
npx toh-framework install --ide cursor
npx toh-framework install --ide gemini
npx toh-framework install --ide codex

# Multiple IDEs
npx toh-framework install --ide "claude,cursor,gemini,codex"
```

## 🔄 Update to Latest Version

```bash
# Method 1: Use npx (recommended - always gets latest)
npx toh-framework@latest install

# Method 2: If installed globally
npm update -g toh-framework
toh install
```

> 💡 **Tip:** Reinstalling updates skills, agents, and commands without deleting your existing memory!

---

## 🚀 Quick Start

### Claude Code

```bash
# Open project with Claude Code
claude .

# Show all commands
/toh-help

# Smart command - AI picks the right agent
/toh create a landing page with pricing section

# Create complete project
/toh-vibe coffee shop management system

# Add UI
/toh-ui Add a dashboard with sales charts

# Add Logic
/toh-dev Add form validation and API calls

# Improve Design
/toh-design Make it look professional

# Test system
/toh-test

# Security audit
/toh-protect

# Deploy
/toh-ship
```

### Cursor

```bash
# Call Toh agent
@toh Create a meeting room booking system

# Or use specific command
@toh:ui Create a calendar page for room booking
```

### Gemini CLI / Antigravity

```bash
# Start Gemini CLI
gemini

# Use commands
/toh-vibe Inventory management system
```

---

## 📋 Available Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `/toh` | - | 🧠 **Smart Command** - Type anything, AI picks agent |
| `/toh-plan` | `/toh-p` | 📋 **Plan** - Writes `.toh/plan.md`, approve once, builds to the end |
| `/toh-vibe` | `/toh-v` | 🎨 **Create Project** - Complete app in one command |
| `/toh-ui` | `/toh-u` | 🖼️ **Create UI** - Pages, Components, Layouts |
| `/toh-dev` | `/toh-d` | ⚙️ **Add Logic** - TypeScript, Zustand, Forms |
| `/toh-design` | `/toh-ds` | ✨ **Polish Design** - Professional, not AI-looking |
| `/toh-test` | `/toh-t` | 🧪 **Test** - Auto test & fix until pass |
| `/toh-protect` | `/toh-pt` | 🔐 **Security Audit** - Full security check `[NEW]` |
| `/toh-connect` | `/toh-c` | 🔌 **Connect Backend** - Supabase, Auth, RLS |
| `/toh-line` | `/toh-l` | 💚 **LINE MINI App** (convert) |
| `/toh-mobile` | `/toh-m` | 📱 **Mobile App** - PWA / Capacitor |
| `/toh-fix` | `/toh-f` | 🔧 **Fix Bugs** - Systematic debugging |
| `/toh-ship` | `/toh-s` | 🚀 **Deploy** - Vercel, Production ready |
| `/toh-help` | `/toh-h` | ❓ **Help** - Show all commands |

---

## 🏗️ Tech Stack (Fixed)

No decisions needed - optimized stack ready to go:

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Backend | Supabase |
| Testing | Playwright |
| Language | TypeScript (strict) |

---

## 🧠 Philosophy (AODD)

**AI-Orchestration Driven Development:**

1. **Natural Language → Tasks** - Just describe what you want
2. **Orchestrator → Agents** - System calls the right specialists
3. **No Process Management** - You just receive results
4. **Test → Fix → Loop** - Auto-fix until everything passes

```
User: "Create a coffee shop management system"

Orchestrator:
├── 📐 plan-orchestrator → Analyze & plan
├── 🎨 ui-builder → Create all UI
├── ⚙️ dev-builder → Add logic
├── ✨ design-reviewer → Polish design
├── 🧪 test-runner → Test & fix
├── 🔐 security-check → Audit code [NEW]
└── ✅ Deliver working system!
```

### 🔁 Plan → Vibe Workflow

The plan is a **file**, never chat state:

- `/toh-plan` writes `.toh/plan.md` → you approve **once** ("Go") → the whole plan is built autonomously, verified checkpoint by checkpoint.
- `/toh-vibe` resumes any unfinished plan: it reads `.toh/plan.md` first and continues from the first unchecked task — in any session, any IDE.

Note: autonomous-loop *enforcement* (the Stop hook, `/goal`, `/loop`) is Claude Code-only — other IDEs follow the same loop as instructions, with checkbox-resume in `.toh/plan.md` as the recovery mechanism.

**Unattended builds** — kick off a full build headless (Claude Code):

```bash
claude -p "/toh-vibe coffee shop management system" --permission-mode acceptEdits
```

---

## 📖 Examples

### Create E-commerce
```
/toh-vibe Online store with products, cart, and checkout
```

### Create Dashboard
```
/toh-vibe Analytics dashboard with charts and date filters
```

### Create SaaS
```
/toh-vibe Project management tool with teams and tasks
```

---

## 🎯 Target Users

- **Solo Developers** - Build SaaS single-handedly
- **Solopreneurs** - Create MVP to test market
- **Startup Founders** - Prototype for investors
- **Freelancers** - Deliver client work faster
- **Students** - Learn modern web development

---

## 📊 Framework Stats

- 🤖 **8 Sub-Agents** - Specialized for different tasks
- 🎯 **14 Commands** - From planning to deployment
- 📚 **23 Skills** - Comprehensive AI capabilities `[NEW: Orchestration Protocol]`
- 🎨 **Design Identity** - Per-project DESIGN.md design identity + versioned AVOID-LIST
- 📦 **15 Component Templates** - Ready-to-use premium components
- 🌐 **5 IDEs** - Claude Code, Cursor, Antigravity, Gemini, Codex

---

## 📚 Documentation & Guides

| Guide | Where |
|-------|-------|
| 🇹🇭 Thai documentation | [docs/README-TH.md](docs/README-TH.md) |
| Full version history | [CHANGELOG.md](CHANGELOG.md) |
| All commands + cheatsheet | run `/toh-help` in your IDE |
| Per-project guide (auto-generated) | `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` / `.cursor/rules` in your project after install |
| The plan artifact | `.toh/plan.md` — your app's live checklist (open it anytime to see progress) |
| Design contract | `DESIGN.md` at your project root — generated per project, edit it to steer the look |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 👨‍💻 Author

**Wasin Treesinthuros** (Innovation Vantage)

- 🌐 Website: [tohframework.dev](https://tohframework.dev)
- GitHub: [@wasintoh](https://github.com/wasintoh)
- Email: dr.wasin@gmail.com

---

<p align="center">
  Made with ❤️ for Solo Developers everywhere.
</p>

<p align="center">
  <strong>"Type Once, Have it all!"</strong>
</p>
