/**
 * Antigravity Handler — agy CLI + Antigravity IDE (Google)
 *
 * v2.1 (W2): Gemini CLI stopped serving consumer requests on 2026-06-18, and
 * Antigravity (agy) reads NONE of the old .gemini/* output. This handler is
 * the replacement default Google target and writes ONLY workspace-scoped
 * .agents/ paths (plus the legacy .agent/workflows mirror):
 *
 *   .agents/rules/toh-framework.md   Always On rule (identity + /toh-* table,
 *                                    <= 12,000 chars — hard-asserted)
 *   .agents/skills/                  23 framework-skill wrappers + 14 toh-*
 *                                    command skills (shared writer in
 *                                    shared.js — skills auto-become /toh-vibe
 *                                    etc. slash commands; the /toh:vibe colon
 *                                    namespace is dead)
 *   .agents/workflows/               14 /toh-* workflows (primary, 2.x path)
 *   .agent/workflows/                legacy mirror (pre-2.x Antigravity)
 *   .agents/agents/<name>.md         file-based subagents (subagent: true,
 *                                    invoked via invoke_subagent)
 *   .agents/hooks.json               deterministic command-script Stop hook —
 *                                    greps .toh/plan.md for unchecked '- [ ]'
 *                                    tasks and exits 2 to block session end;
 *                                    a draft plan ('Status: draft', any case)
 *                                    never blocks (additive + idempotent via
 *                                    the <TFW-STOP-HOOK> marker)
 *
 * Deliberately NOT written: anything under .gemini/ (that surface lives only
 * in gemini-cli.js behind the explicit --legacy-gemini flag, owner decision D1).
 * .toh/memory output is unchanged from v2.0.
 *
 * VERIFY-LIVE (v2.1, before release — documented unknowns in official docs):
 *   (a) argument passing to skill-derived /toh-* commands,
 *   (b) whether the agy CLI loads .agents/workflows at all (if not: fold
 *       workflows into skills per owner decision D7),
 *   (c) tolerance of extra frontmatter keys (related_skills,
 *       disable-model-invocation, user-invocable, subagent, trigger),
 *   (d) the exact .agents/hooks.json event schema (modeled on the documented
 *       5-event Claude-compatible shape incl. Stop).
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { transformCommand, renderCapabilitiesSection, writeAgentsSkills } from './shared.js';

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
const VERSION = pkg.version;

// Tech-stack pin: read the Next.js major straight from the real template
// (src/templates/nextjs-pro/package.json, e.g. "^16") so the Always-On rule
// can never drift from what the installer actually scaffolds.
const templatePkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/templates/nextjs-pro/package.json'), 'utf-8')
);
const NEXT_MAJOR = (String((templatePkg.dependencies || {}).next || '').match(/\d+/) || [])[0];
if (!NEXT_MAJOR) {
  throw new Error(
    '[toh-framework] Cannot read the Next.js major version from src/templates/nextjs-pro/package.json — packaging bug.'
  );
}

/** Idempotence marker for the Stop hook entry (mirrors claude-code.js). */
const TFW_STOP_HOOK_MARKER = '<TFW-STOP-HOOK>';

/** Always On rule hard budget (Antigravity rule file limit). */
const RULE_CHAR_BUDGET = 12000;

export async function setupAntigravityCLI(targetDir, srcDir, language = 'en') {
  const agentsDir = path.join(targetDir, '.agents');
  await fs.ensureDir(path.join(agentsDir, 'rules'));
  await fs.ensureDir(path.join(agentsDir, 'workflows'));
  await fs.ensureDir(path.join(agentsDir, 'agents'));

  // .toh/memory — unchanged v2.0 output (7 files), standalone-safe
  const memoryDir = path.join(targetDir, '.toh', 'memory');
  await fs.ensureDir(path.join(memoryDir, 'archive'));
  await createMemoryFiles(memoryDir);

  // .agents/skills — the ONE shared writer (W2 consumes the W3 step)
  await writeAgentsSkills(targetDir, srcDir);

  // .agents/workflows (primary) + .agent/workflows (legacy mirror)
  await installWorkflows(targetDir, srcDir);

  // .agents/rules/toh-framework.md — Always On rule
  const rule = language === 'th' ? generateRuleTH() : generateRuleEN();
  if (rule.length > RULE_CHAR_BUDGET) {
    const err = new Error(
      `Antigravity Always On rule is ${rule.length} chars — exceeds the ${RULE_CHAR_BUDGET}-char budget`
    );
    // Hard size budget: an over-budget rule is silently broken output.
    // install.js aborts the whole install (non-zero exit) on fatal errors.
    err.fatal = true;
    throw err;
  }
  await fs.writeFile(path.join(agentsDir, 'rules', 'toh-framework.md'), rule);

  // .agents/agents/*.md — file-based subagents from the canonical agent files
  await createAntigravityAgents(targetDir);

  // .agents/hooks.json — deterministic Stop hook (additive + idempotent)
  await mergeHooksStopHook(agentsDir);

  return '.agents/ (rules, skills, workflows, agents, hooks.json)';
}

/**
 * Copy src/antigravity-workflows into BOTH .agents/workflows (the 2.x default
 * per the official codelab) and .agent/workflows (docs promise backward
 * support — dual-write is safe under every reading of the evidence).
 * Rewrites any stale '.gemini/skills/' reference to '.agents/skills/'
 * (defensive — the source files are already on .agents/ paths in v2.1).
 */
async function installWorkflows(targetDir, srcDir) {
  const workflowsSrc = path.join(srcDir, 'antigravity-workflows');
  if (!(await fs.pathExists(workflowsSrc))) return;

  const destinations = [
    path.join(targetDir, '.agents', 'workflows'),
    path.join(targetDir, '.agent', 'workflows')
  ];

  const files = (await fs.readdir(workflowsSrc)).filter((f) => f.endsWith('.md'));
  for (const dest of destinations) {
    await fs.ensureDir(dest);
    for (const file of files) {
      const raw = await fs.readFile(path.join(workflowsSrc, file), 'utf8');
      let out = transformCommand(raw, 'antigravity');
      out = out.replace(/\.gemini\/skills\//g, '.agents/skills/');
      await fs.writeFile(path.join(dest, file), out);
    }
  }
}

/**
 * Emit file-based subagents into .agents/agents/<name>.md.
 *
 * Native keys kept: name, description (+ subagent: true so agy registers the
 * file as an invoke_subagent target). tools/skills/triggers/model and the
 * Claude-only autonomy keys are dropped — agy has its own model lineup and no
 * per-agent tools allowlist; the canonical body ships unchanged.
 * Reads the target's .toh/agents/ (populated by install.js) and falls back to
 * the package's src/agents/ so the handler also works standalone.
 */
async function createAntigravityAgents(targetDir) {
  let agentsSrcDir = path.join(targetDir, '.toh', 'agents');
  if (!fs.existsSync(agentsSrcDir)) {
    agentsSrcDir = path.join(__dirname, '../../src/agents');
  }
  if (!fs.existsSync(agentsSrcDir)) return;

  const outDir = path.join(targetDir, '.agents', 'agents');
  await fs.ensureDir(outDir);

  const agentFiles = await fs.readdir(agentsSrcDir);
  for (const file of agentFiles) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    const srcPath = path.join(agentsSrcDir, file);
    if (!(await fs.stat(srcPath)).isFile()) continue;

    const raw = await fs.readFile(srcPath, 'utf8');
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

    // No frontmatter -> copy through unchanged (defensive, mirrors cursor.js)
    if (!fmMatch) {
      await fs.writeFile(path.join(outDir, file), raw);
      continue;
    }

    // Per-file guard: one malformed agent must not abort the whole install.
    try {
      const parsed = yaml.load(fmMatch[1]) || {};
      const body = fmMatch[2];

      const nativeFm = { subagent: true };
      if (parsed.name !== undefined) nativeFm.name = parsed.name;
      if (parsed.description !== undefined) nativeFm.description = parsed.description;

      const fmYaml = yaml.dump(nativeFm, { lineWidth: -1, noRefs: true }).trimEnd();
      const outName = `${parsed.name || file.replace(/\.md$/, '')}.md`;
      await fs.writeFile(path.join(outDir, outName), `---\n${fmYaml}\n---\n${body}`);
    } catch {
      await fs.writeFile(path.join(outDir, file), raw);
    }
  }
}

/**
 * Append the deterministic Stop hook to .agents/hooks.json — strictly
 * additive: existing user hooks are never removed or reordered, an
 * unparseable user file is warned about and left untouched, unexpected
 * shapes (root/hooks/Stop not object/object/array) are warned about and
 * left untouched (same contract as claude-code.js mergeSettingsStopHook —
 * never mutate or overwrite an unrecognized structure), and the
 * <TFW-STOP-HOOK> marker makes reinstalls a no-op.
 *
 * The hook is a plain command script (owner decision D2: deterministic
 * command-script Stop hooks belong to tools that support them — this one):
 * exit 2 + stderr reason blocks ending the session while .toh/plan.md still
 * has unchecked '- [ ]' tasks. Blocked tasks are '- [!]' and do not match,
 * a draft plan ('Status: draft', case-insensitive — same exemption as the
 * Claude Code prompt hook) never blocks, and the installer's seed plan.md
 * contains no real '- [ ]' line, so an empty backlog never blocks. POSIX
 * sh + grep — see VERIFY-LIVE note in the file header for the Windows caveat.
 */
async function mergeHooksStopHook(agentsDir) {
  const hooksPath = path.join(agentsDir, 'hooks.json');

  let config = {};
  if (await fs.pathExists(hooksPath)) {
    try {
      config = JSON.parse(await fs.readFile(hooksPath, 'utf8'));
    } catch (err) {
      console.warn(
        `  ⚠️  .agents/hooks.json exists but is not valid JSON (${err.message}) — leaving it untouched; Stop hook NOT installed.`
      );
      return null;
    }
  }
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    console.warn('  ⚠️  .agents/hooks.json has an unexpected shape — leaving it untouched; Stop hook NOT installed.');
    return null;
  }

  // Idempotence: marker anywhere in the existing hooks config = already installed.
  if (JSON.stringify(config.hooks || {}).includes(TFW_STOP_HOOK_MARKER)) {
    return hooksPath;
  }

  const command =
    `if [ -f .toh/plan.md ] && ! grep -qi 'Status: draft' .toh/plan.md && grep -q '^[[:space:]]*- \\[ \\]' .toh/plan.md; then ` +
    `echo '${TFW_STOP_HOOK_MARKER} THE TOH LOOP is not finished: .toh/plan.md still has unchecked "- [ ]" tasks. ` +
    `Resume at the first unchecked task (checkbox-resume) or mark truly stuck tasks "- [!] BLOCKED: <one-line reason>".' >&2; ` +
    `exit 2; fi`;

  if (config.hooks === undefined) config.hooks = {};
  if (config.hooks === null || typeof config.hooks !== 'object' || Array.isArray(config.hooks)) {
    console.warn('  ⚠️  .agents/hooks.json "hooks" is not an object — leaving it untouched; Stop hook NOT installed.');
    return null;
  }
  if (config.hooks.Stop === undefined) config.hooks.Stop = [];
  if (!Array.isArray(config.hooks.Stop)) {
    console.warn('  ⚠️  .agents/hooks.json "hooks.Stop" is not an array — leaving it untouched; Stop hook NOT installed.');
    return null;
  }
  config.hooks.Stop.push({
    hooks: [
      {
        type: 'command',
        command,
        timeout: 30
      }
    ]
  });

  await fs.writeFile(hooksPath, `${JSON.stringify(config, null, 2)}\n`);
  return hooksPath;
}

// ============================================================
// Always On rule (.agents/rules/toh-framework.md)
// ============================================================

const COMMAND_TABLE_EN = `| Command | Description |
|---------|-------------|
| \`/toh [anything]\` | Type anything in plain language — the orchestrator |
| \`/toh-help\` | Show all commands |
| \`/toh-vibe [description]\` | Create new project with UI + Logic + Mock Data |
| \`/toh-plan [description]\` | THE BRAIN — writes .toh/plan.md, one approval, then builds autonomously |
| \`/toh-ui [description]\` | Create UI components and pages |
| \`/toh-dev [description]\` | Add logic, state, and functionality |
| \`/toh-design [description]\` | Improve design to professional level |
| \`/toh-test\` | Run tests and auto-fix issues |
| \`/toh-connect [description]\` | Connect to Supabase backend |
| \`/toh-fix [description]\` | Debug and fix issues |
| \`/toh-ship\` | Deploy to production |
| \`/toh-line [description]\` | Convert to LINE MINI App |
| \`/toh-mobile [description]\` | Mobile app - PWA / Capacitor |
| \`/toh-protect\` | Security audit |`;

const RUNTIME_IDENTITY_EN =
  'Runtime Identity: you are running in Google Antigravity — the agy CLI or the Antigravity IDE (NOT Gemini CLI; never read or write `.gemini/`). ' +
  'When a story clearly maps to one specialist in `.agents/agents/` (ui-builder, dev-builder, backend-connector, test-runner, root-cause-debugger, design-reviewer, platform-adapter, plan-orchestrator), delegate it via `invoke_subagent`. ' +
  'Whether delegated or done yourself, execute THE TOH LOOP one task at a time: implement -> run the story\'s checkpoint -> quote the actual output -> fix if red (max 5 tries, 3 consecutive failures = mark [!] BLOCKED and move on) -> tick the checkbox -> next story WITHOUT asking. ' +
  'Interrupted runs resume at the first unchecked box in `.toh/plan.md`. Close every stage with the engineer-harness announce contract (Status/Result/Evidence/exactly 3 next actions). ' +
  'A Stop hook in `.agents/hooks.json` blocks ending the session while `.toh/plan.md` still has unchecked `- [ ]` tasks.';

function generateRuleEN() {
  return `---
trigger: always_on
---

# Toh Framework — Antigravity Integration (agy CLI + IDE)

> **"Type Once, Have it all!"** - AI-Orchestration Driven Development
>
> **Version:** ${VERSION}

## Identity

You are the **Toh Framework Agent** - an AI that helps Solo Developers build SaaS systems by themselves.

${renderCapabilitiesSection('antigravity')}

${RUNTIME_IDENTITY_EN}

## Available Commands (\`/toh-*\` — hyphen, not colon)

Every command below exists both as a workflow in \`.agents/workflows/\` and as a skill in \`.agents/skills/\` — same behavior either way:

${COMMAND_TABLE_EN}

## Quick Start

\`\`\`
/toh-vibe coffee shop management system with POS, inventory, and sales reports
\`\`\`

## Core Philosophy (AODD)

1. **Natural Language → Tasks** - Users speak naturally, AI breaks into tasks
2. **Orchestrator → Agents** - Automatically invoke relevant agents
3. **Users Don't Touch Process** - No questions, no waiting, just deliver
4. **Test → Fix → Loop** - Test, fix, repeat until passing

## Tech Stack (Fixed)

| Category | Technology |
|----------|------------|
| Framework | Next.js ${NEXT_MAJOR} (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Backend | Supabase |
| Testing | Playwright |
| Language | TypeScript (strict) |

## Memory System (7 files — Tiered Loading)

Memory files at \`.toh/memory/\`. Read only what the task needs:
- **Tier 1 (ALWAYS read, ~800 tokens):** \`active.md\` (current task) + \`summary.md\` (project overview)
- **Tier 2 (per task type):** \`architecture.md\` + \`components.md\` for build/code work; \`changelog.md\` for debug work
- **Tier 3 (only when referenced):** \`decisions.md\` (past decisions) + \`agents-log.md\` (agent activity)

### Memory Protocol (Tiered)

**Before Work:**
1. Read Tier 1: \`active.md\` + \`summary.md\` (always)
2. Read Tier 2 for this task type (build/code → \`architecture.md\` + \`components.md\`; debug → \`changelog.md\`)
3. Read Tier 3 (\`decisions.md\`, \`agents-log.md\`) ONLY when referenced
4. Acknowledge: "Memory loaded!"

**After Work (write per relevance):**
1. Update \`active.md\` - ALWAYS
2. Update \`summary.md\` when the project shape changes; \`architecture.md\`/\`components.md\` when structure changes
3. Record in \`changelog.md\` + \`agents-log.md\`; update \`decisions.md\` if a real decision was made
4. Confirm: "Memory saved!"

## Skills

Skills are natively discovered from \`.agents/skills/\`; each framework skill there is a generated pointer to the full skill in \`.toh/skills/\` — always follow the \`.toh/skills/\` copy it points at:
- \`vibe-orchestrator\` - Master workflow
- \`orchestration-protocol\` - Runtime survey + THE TOH LOOP (plan-driven autonomous build) — used by /toh-plan and /toh-vibe
- \`design-craft\` - Principle-based design (system + business fit)
- \`premium-experience\` - Multi-page, animations
- \`ui-first-builder\` - UI creation patterns
- And more...

Read relevant skills before executing commands!

## Behavior Rules

1. **Don't ask basic questions** - Make decisions yourself
2. **Use the fixed tech stack** - Never change it
3. **UI First** - Create working UI before backend
4. **Production Ready** - Not a prototype
5. **Respond in user's language** - Match what they use
`;
}

function generateRuleTH() {
  return `---
trigger: always_on
---

# Toh Framework — Antigravity Integration (agy CLI + IDE)

> **"Type Once, Have it all!"** - AI-Orchestration Driven Development
>
> **Version:** ${VERSION}

## Identity

คุณคือ **Toh Framework Agent** - AI ที่ช่วย Solo Developers สร้างระบบ SaaS ด้วยตัวเอง

${renderCapabilitiesSection('antigravity')}

${RUNTIME_IDENTITY_EN}

## คำสั่งที่ใช้ได้ (\`/toh-*\` — ขีดกลาง ไม่ใช่ colon)

ทุกคำสั่งด้านล่างมีทั้งแบบ workflow ใน \`.agents/workflows/\` และแบบ skill ใน \`.agents/skills/\` — พฤติกรรมเหมือนกันทั้งคู่:

| คำสั่ง | คำอธิบาย |
|--------|----------|
| \`/toh [อะไรก็ได้]\` | พิมพ์อะไรก็ได้เป็นภาษาคน — orchestrator หลัก |
| \`/toh-help\` | แสดงคำสั่งทั้งหมด |
| \`/toh-vibe [รายละเอียด]\` | สร้างโปรเจคใหม่พร้อม UI + Logic + Mock Data |
| \`/toh-plan [รายละเอียด]\` | THE BRAIN — เขียน .toh/plan.md อนุมัติครั้งเดียว แล้วสร้างต่อเองอัตโนมัติ |
| \`/toh-ui [รายละเอียด]\` | สร้าง UI components และ pages |
| \`/toh-dev [รายละเอียด]\` | เพิ่ม logic, state, และ functionality |
| \`/toh-design [รายละเอียด]\` | ปรับปรุง design ให้ professional |
| \`/toh-test\` | รัน tests และ auto-fix |
| \`/toh-connect [รายละเอียด]\` | เชื่อมต่อ Supabase backend |
| \`/toh-fix [รายละเอียด]\` | Debug และแก้ไขปัญหา |
| \`/toh-ship\` | Deploy ขึ้น production |
| \`/toh-line [รายละเอียด]\` | Convert to LINE MINI App |
| \`/toh-mobile [รายละเอียด]\` | Mobile app - PWA / Capacitor |
| \`/toh-protect\` | Security audit |

## เริ่มต้นใช้งาน

\`\`\`
/toh-vibe ระบบจัดการร้านกาแฟ พร้อม POS, inventory, และรายงานยอดขาย
\`\`\`

## Core Philosophy (AODD)

1. **ภาษามนุษย์ → Tasks** - User พูดธรรมชาติ, AI แยกเป็น tasks
2. **Orchestrator → Agents** - เรียก agents ที่เกี่ยวข้องอัตโนมัติ
3. **User ไม่ต้องจัดการ process** - ไม่ถาม, ไม่รอ, ทำให้เสร็จ
4. **Test → Fix → Loop** - ทดสอบ, แก้, วนจนผ่าน

## Tech Stack (ห้ามเปลี่ยน!)

| หมวด | เทคโนโลยี |
|------|-----------|
| Framework | Next.js ${NEXT_MAJOR} (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Backend | Supabase |
| Testing | Playwright |
| Language | TypeScript (strict) |

## Memory System (7 ไฟล์ — Tiered Loading)

ไฟล์ Memory อยู่ที่ \`.toh/memory/\` อ่านเฉพาะที่งานต้องใช้:
- **Tier 1 (อ่านทุกครั้ง, ~800 tokens):** \`active.md\` (งานปัจจุบัน) + \`summary.md\` (ภาพรวมโปรเจค)
- **Tier 2 (ตามประเภทงาน):** \`architecture.md\` + \`components.md\` สำหรับงาน build/code; \`changelog.md\` สำหรับงาน debug
- **Tier 3 (อ่านเมื่อถูกอ้างถึงเท่านั้น):** \`decisions.md\` (การตัดสินใจเดิม) + \`agents-log.md\` (กิจกรรมของ agent)

### Memory Protocol (Tiered)

**ก่อนทำงาน:**
1. อ่าน Tier 1: \`active.md\` + \`summary.md\` (ทุกครั้ง)
2. อ่าน Tier 2 ตามประเภทงาน (build/code → \`architecture.md\` + \`components.md\`; debug → \`changelog.md\`)
3. อ่าน Tier 3 (\`decisions.md\`, \`agents-log.md\`) เฉพาะเมื่อถูกอ้างถึง
4. รายงาน: "Memory loaded!"

**หลังทำงาน (เขียนตามความเกี่ยวข้อง):**
1. อัพเดท \`active.md\` - ทุกครั้ง
2. อัพเดท \`summary.md\` เมื่อรูปร่างโปรเจคเปลี่ยน; \`architecture.md\`/\`components.md\` เมื่อโครงสร้างเปลี่ยน
3. บันทึกใน \`changelog.md\` + \`agents-log.md\`; อัพเดท \`decisions.md\` เมื่อมีการตัดสินใจจริง
4. ยืนยัน: "Memory saved!"

## Skills

Skills ถูกค้นพบอัตโนมัติจาก \`.agents/skills/\` โดยแต่ละ framework skill เป็น pointer ชี้ไปที่สกิลตัวเต็มใน \`.toh/skills/\` — ให้อ่านและทำตามไฟล์ \`.toh/skills/\` ที่มันชี้ไปเสมอ:
- \`vibe-orchestrator\` - Master workflow
- \`orchestration-protocol\` - Runtime survey + THE TOH LOOP (สร้างตามแผนอัตโนมัติ) — ใช้กับ /toh-plan และ /toh-vibe
- \`design-craft\` - Principle-based design (system + business fit)
- \`premium-experience\` - Multi-page, animations
- \`ui-first-builder\` - สร้าง UI
- และอื่นๆ...

อ่าน skills ที่เกี่ยวข้องก่อนทำงาน!

## กฎที่ต้องทำตาม

1. **ไม่ต้องถามคำถามพื้นฐาน** - ตัดสินใจเอง
2. **ใช้ Tech Stack ที่กำหนด** - ห้ามเปลี่ยน
3. **UI First** - สร้าง UI ก่อน backend
4. **Production Ready** - ไม่ใช่ prototype
5. **ตอบในภาษาที่ user ใช้** - ถ้า user พิมพ์ไทย ตอบเป็นไทย
`;
}

// ============================================================
// .toh/memory templates — byte-parity with the other handlers' inline copies
// (memory format changes touch every inline code site; see CLAUDE.md)
// ============================================================

/**
 * Create memory template files for the Memory System (v1.7.0)
 * Now includes architecture.md and components.md for Code Architecture Tracking
 */
async function createMemoryFiles(memoryDir) {
  const timestamp = new Date().toISOString().split('T')[0];

  // active.md
  const activeContent = `# 🔥 Active Task

## Current Focus
[Waiting for user command]

## In Progress
- (none)

## Just Completed
- (none)

## Next Steps
- Waiting for user command

## Blockers / Issues
- (none)

---
*Last updated: ${timestamp}*
`;

  // summary.md
  const summaryContent = `# 📋 Project Summary

## Project Overview
- Name: [Project Name]
- Type: [Type]
- Tech Stack: Next.js ${NEXT_MAJOR}, Tailwind, shadcn/ui, Zustand, Supabase

## Completed Features
- (none)

## Current State
Project just initialized - ready for commands

## Key Files
- (will update when files are created)

## Important Notes
- Using Toh Framework v${VERSION}
- Memory System is active

---
*Last updated: ${timestamp}*
`;

  // decisions.md
  const decisionsContent = `# 🧠 Key Decisions

## Architecture Decisions
| Date | Decision | Reason |
|------|----------|--------|
| ${timestamp} | Use Toh Framework | AI-Orchestration Driven Development |

## Design Decisions
| Date | Decision | Reason |
|------|----------|--------|

## Business Logic
| Date | Decision | Reason |
|------|----------|--------|

## Rejected Ideas
| Date | Idea | Why Rejected |
|------|------|--------------|

---
*Last updated: ${timestamp}*
`;

  // architecture.md (v1.7.0 - Code Architecture Tracking)
  const architectureContent = `# 🏗️ Project Architecture

> Semantic overview of project structure for AI context loading
> **Update:** After any structural changes (new pages, routes, modules, services)

---

## 📁 Entry Points

| Type | Path | Purpose |
|------|------|---------|
| Main | \`app/page.tsx\` | Landing/Home page |
| Layout | \`app/layout.tsx\` | Root layout with providers |
| API | \`app/api/\` | API routes (if any) |

---

## 🗂️ Core Modules

### \`/app\` - Pages & Routes

| Route | File | Description | Key Functions |
|-------|------|-------------|---------------|
| \`/\` | \`app/page.tsx\` | Landing page | - |

### \`/components\` - UI Components

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| \`ui/\` | shadcn/ui components | button, card, input, etc. |
| \`layout/\` | Layout components | Navbar, Sidebar, Footer |
| \`features/\` | Feature-specific | Per feature components |

### \`/lib\` - Utilities & Services

| File | Purpose | Key Functions |
|------|---------|---------------|
| \`lib/utils.ts\` | Utility functions | cn(), formatDate() |

---

## 🔄 Data Flow Pattern

User Action → Component → Zustand Store → API/Lib → Database (Supabase)

---

## 🔌 External Services

| Service | Purpose | Config Location |
|---------|---------|-----------------|
| Supabase | Backend (Auth, DB) | \`lib/supabase/\` |

---

## 📝 Notes

- Using Toh Framework v${VERSION}
- Architecture tracking enabled

---
*Last updated: ${timestamp}*
`;

  // components.md (v1.7.0 - Component Registry)
  const componentsContent = `# 📦 Component Registry

> Quick reference for all project components, hooks, and utilities
> **Update:** After creating/modifying any component, hook, or utility

---

## 📄 Pages

| Route | File | Description | Key Dependencies |
|-------|------|-------------|------------------|
| \`/\` | \`app/page.tsx\` | Landing page | - |

---

## 🧩 Components

### Layout Components

| Component | Location | Key Props | Used By |
|-----------|----------|-----------|---------|
| (none yet) | - | - | - |

### Feature Components

| Component | Location | Key Props | Used By |
|-----------|----------|-----------|---------|
| (none yet) | - | - | - |

---

## 🪝 Custom Hooks

| Hook | Location | Purpose | Returns |
|------|----------|---------|---------|
| (none yet) | - | - | - |

---

## 🏪 Zustand Stores

| Store | Location | State Shape | Key Actions |
|-------|----------|-------------|-------------|
| (none yet) | - | - | - |

---

## 🛠️ Utility Functions

| Function | Location | Purpose | Params |
|----------|----------|---------|--------|
| cn | \`lib/utils.ts\` | Merge Tailwind classes | \`...inputs\` |

---

## 📊 Component Statistics

| Category | Count |
|----------|-------|
| Pages | 1 |
| Components | 0 |
| Hooks | 0 |
| Stores | 0 |

---
*Last updated: ${timestamp}*
`;

  // changelog.md (v1.8.0 - Session Changelog)
  const changelogContent = `# 📝 Session Changelog

## [Current Session] - ${timestamp}

### Changes Made
| Agent | Action | File/Component |
|-------|--------|----------------|
| - | - | - |

### Next Session TODO
- [ ] Continue from: [last task]

---
*Auto-updated by agents after each task*
`;

  // agents-log.md (v1.8.0 - Agent Activity Log)
  const agentsLogContent = `# 🤖 Agents Activity Log

## Recent Activity
| Time | Agent | Task | Status | Files |
|------|-------|------|--------|-------|
| - | - | - | - | - |

## Agent Statistics
- Total Tasks: 0
- Success Rate: 100%

---
*Auto-updated by agents during execution*
`;

  // Write all 7 memory files (v1.8.0)
  await fs.writeFile(path.join(memoryDir, 'active.md'), activeContent);
  await fs.writeFile(path.join(memoryDir, 'summary.md'), summaryContent);
  await fs.writeFile(path.join(memoryDir, 'decisions.md'), decisionsContent);
  await fs.writeFile(path.join(memoryDir, 'architecture.md'), architectureContent);
  await fs.writeFile(path.join(memoryDir, 'components.md'), componentsContent);
  await fs.writeFile(path.join(memoryDir, 'changelog.md'), changelogContent);
  await fs.writeFile(path.join(memoryDir, 'agents-log.md'), agentsLogContent);
}
