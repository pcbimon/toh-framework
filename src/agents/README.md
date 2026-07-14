# /toh- Agents v4.0

Expert agents that power the `/toh-` command suite. Each agent is **self-sufficient**, **self-correcting**, and **expert-level**.

## 🏗️ Dual Architecture (v4.0)

Toh Framework supports **two agent formats** for different IDEs:

```
src/agents/
├── *.md              ← Original format (for Cursor, Gemini, Codex)
└── subagents/
    └── *.md          ← Claude Code native format
```

### Format Comparison

| Feature | Original (`.toh/agents/`) | Subagent (`.claude/agents/`) |
|---------|---------------------------|------------------------------|
| **For IDE** | Cursor, Gemini CLI, Codex | Claude Code |
| **YAML** | `type`, `skills`, `triggers` | `tools`, `model` |
| **Invocation** | `@.toh/agents/` reference | Native Task delegation |
| **Content** | Same expert content | Same expert content |

### Original Format (for Cursor, Gemini, Codex)
```yaml
name: ui-builder
type: sub-agent
description: >
  Expert UI builder...
skills:
  - ui-first-builder
  - design-craft
triggers:
  - /toh-ui command
```

### Claude Code Format (for Claude Code)
```yaml
name: ui-builder
description: |
  Expert UI builder that creates production-ready UIs...
  Delegate when: creating pages, components, layouts...
tools:
  - Read
  - Write
  - Edit
  - Bash
model: sonnet
```

---

## Agent Overview

| Agent | Lines | Expertise | Triggered By |
|-------|-------|-----------|--------------|
| **ui-builder** | 525 | UI/Components/Mock Data | `/toh-vibe`, `/toh-ui` |
| **dev-builder** | 712 | Logic/State/TypeScript/Forms | `/toh-dev` |
| **design-reviewer** | 577 | Design Polish/Anti-patterns | `/toh-design` |
| **backend-connector** | 550 | Supabase/Auth/RLS | `/toh-connect` |
| **test-runner** | 362 | Testing/Auto-fix Loop | `/toh-test`, `/toh-fix` |
| **plan-orchestrator** | 636 | Analysis/Planning/Coordination | `/toh-plan`, `/toh-ship` |
| **platform-adapter** | 603 | LINE/Expo/Tauri | `/toh-line`, `/toh-mobile` |
| **root-cause-debugger** | 94 | Root-Cause Investigation (Read-only) | `/toh-fix` (investigate) |

**Total: 8 Agents, ~4,059 lines**

## 📦 Installation Paths

When installed, agents are copied to:

| IDE | Agent Location | Format Used |
|-----|----------------|-------------|
| Claude Code | `.claude/agents/*.md` | Claude native (from `subagents/`) |
| Cursor | `.toh/agents/*.md` | Original (from root) |
| Gemini CLI | `.toh/agents/*.md` | Original (from root) |
| Codex CLI | `.toh/agents/*.md` | Original (from root) |

### Claude Code Installation
```
.claude/agents/
├── ui-builder.md         ← Claude native format
├── dev-builder.md
├── backend-connector.md
├── design-reviewer.md
├── test-runner.md
├── plan-orchestrator.md
├── platform-adapter.md
└── root-cause-debugger.md
```

### Other IDEs Installation
```
.toh/agents/
├── ui-builder.md         ← Original format
├── dev-builder.md
├── backend-connector.md
├── design-reviewer.md
├── test-runner.md
├── plan-orchestrator.md
├── platform-adapter.md
├── root-cause-debugger.md
└── subagents/            ← Also available
```

---

## Agent Philosophy

ทุก agent ออกแบบตามหลัก:

### 1. Self-Sufficient (พึ่งตนเองได้)
```
ไม่ต้องพึ่ง agent อื่น
ไม่ต้องรอ input เพิ่ม
ไม่ต้องถามคำถามที่ไม่จำเป็น
```

### 2. Self-Correcting (แก้ไขตัวเองได้)
```
ตรวจสอบงานตัวเองก่อนส่งมอบ
พบปัญหา → แก้ไขทันที
ไม่รอให้ user บอก
```

### 3. Expert-Level (ระดับผู้เชี่ยวชาญ)
```
ตัดสินใจถูกต้อง
ใช้ best practices
ไม่มี amateur mistakes
```

---

## Claude 4.x Techniques Used

ทุก agent ใช้เทคนิคจาก `prompt-optimizer`:

```xml
<!-- ลงมือทำทันที ไม่ถามก่อน -->
<default_to_action>
By default, implement immediately rather than asking questions.
</default_to_action>

<!-- อ่านหลายไฟล์พร้อมกัน -->
<use_parallel_tool_calls>
Read multiple files in parallel for efficiency.
</use_parallel_tool_calls>

<!-- ตรวจสอบก่อนตอบ -->
<investigate_before_answering>
Never speculate - read actual code before making changes.
</investigate_before_answering>
```

---

## Workflow Diagram

```
USER: /toh-vibe expense tracker
           │
           ▼
┌──────────────────────┐
│   vibe-orchestrator  │  (Skill ที่ route งาน)
│   (Master Brain)     │
└──────────────────────┘
           │
           ├──────────────────┬──────────────────┐
           ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   ui-builder     │  │   dev-builder    │  │  design-reviewer │
│   (สร้าง UI)      │  │   (เพิ่ม Logic)  │  │   (Polish)       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
           │                  │                  │
           └──────────────────┴──────────────────┘
                              │
                              ▼
                    ✅ Working App at localhost:3000
```

---

## Agent Details

### 🎨 ui-builder
สร้าง UI ทันทีจาก description ไม่ต้องรอ backend

**Specialties:**
- Next.js 16 pages
- shadcn/ui components
- Thai mock data
- Responsive design
- Loading/Empty states

**Self-Check:**
- TypeScript clean
- Mobile-first responsive
- No "Lorem ipsum"

---

### ⚙️ dev-builder
เพิ่ม logic ให้ UI ทำงานได้จริง

**Specialties:**
- TypeScript types
- Zustand stores
- React Hook Form + Zod
- Mock CRUD operations
- Custom hooks

**Self-Check:**
- No `any` type
- Full CRUD working
- Thai error messages

---

### ✨ design-reviewer
ตรวจสอบและปรับ design ให้ไม่ดูเหมือน "AI generated"

**Specialties:**
- AI red flags detection
- Color harmony
- Typography hierarchy
- Spacing consistency
- Subtle animations

**Self-Check:**
- No AI tells
- Professional look
- Consistent design language

---

### 🔌 backend-connector
เชื่อม app กับ Supabase อย่างปลอดภัย

**Specialties:**
- Schema generation from types
- RLS policies
- Auth integration
- Real-time subscriptions
- Migration patterns

**Self-Check:**
- RLS enabled all tables
- No hardcoded credentials
- Proper error handling

---

### 📱 platform-adapter
Adapt web app สำหรับ LINE, Mobile, Desktop

**Specialties:**
- LINE LIFF integration
- Expo React Native porting
- Tauri desktop packaging
- Platform-specific UI
- Native feature access

**Self-Check:**
- Platform features work
- Feels native
- Core features intact

---

## Usage

Agents ถูกเรียกใช้ผ่าน `/toh-` commands หรือ โดย vibe-orchestrator skill

```bash
# Direct command → triggers specific agent
/toh-ui → ui-builder
/toh-dev → dev-builder
/toh-design → design-reviewer
/toh-connect → backend-connector
/toh-line → platform-adapter (LINE mode)
/toh-mobile → platform-adapter (Expo mode)

# Compound command → orchestrates multiple agents
/toh-vibe → ui-builder + dev-builder + design-reviewer
```

---

## Total Lines

| Agent | Lines |
|-------|-------|
| ui-builder | 525 |
| dev-builder | 712 |
| design-reviewer | 577 |
| backend-connector | 550 |
| test-runner | 362 |
| plan-orchestrator | 636 |
| platform-adapter | 603 |
| root-cause-debugger | 94 |
| **Total** | **4,059** |

Combined with Skills (~2,720 lines) and Commands (~966 lines):
**Grand Total: ~7,745 lines** of expert-level documentation
