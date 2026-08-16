/**
 * Codex CLI IDE Handler
 *
 * Native Codex integration (v2.1.0):
 *   .codex/skills/<toh-*>/SKILL.md  -> native Codex skills (the canonical layer,
 *                                      discovered by Codex from the project root)
 *   AGENTS.md (managed block)       -> concise project-level TOH rules +
 *                                      legacy `/toh-*` compatibility note
 *   .toh/                           -> TOH runtime/state (plan, progress, memory,
 *                                      skills, commands) — owned by install.js
 *
 * Codex has no custom slash commands, subagents, or Stop hooks, so the old
 * "simulate /toh-* via a giant AGENTS.md" approach was unreliable. Skills are
 * the supported discovery/invocation mechanism; AGENTS.md now only carries
 * project-level orchestration rules inside a TOH-managed marker block.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { renderCapabilitiesSection } from './shared.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
const VERSION = pkg.version;

const AGENTS_BLOCK_START = '<!-- TOH-FRAMEWORK-START -->';
const AGENTS_BLOCK_END = '<!-- TOH-FRAMEWORK-END -->';
const AGENTS_BLOCK_RE = /[ \t]*<!-- TOH-FRAMEWORK-START -->[\s\S]*?<!-- TOH-FRAMEWORK-END -->[ \t]*\r?\n?/g;

// Generated Codex skills carry this frontmatter marker so we can tell
// TOH-managed skills apart from a user's own skills on reinstall/uninstall.
const SKILL_GENERATOR = 'toh-framework';

// Codex skill names: 1-64 chars, lowercase letters, numbers, hyphens.
const SKILL_NAME_RE = /^[a-z0-9-]{1,64}$/;

// ============================================================
// Command catalog (single source: src/commands/*.md frontmatter)
// ============================================================

/**
 * Read src/commands/*.md and return one entry per TOH command:
 *   { skillName, command, aliases, description, skills, file }
 * Sorted by skillName for deterministic output. Throws an actionable error
 * when the catalog cannot be read (the skills layer depends on it).
 */
export async function readCommandCatalog(srcDir) {
  const commandsDir = path.join(srcDir, 'commands');
  if (!(await fs.pathExists(commandsDir))) {
    throw new Error(`TOH command source not found: ${commandsDir} — is this a complete toh-framework package?`);
  }

  const files = (await fs.readdir(commandsDir))
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort();

  const catalog = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(commandsDir, file), 'utf8');
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!fmMatch) continue; // no frontmatter -> not a command definition

    let parsed;
    try {
      parsed = yaml.load(fmMatch[1]) || {};
    } catch (err) {
      throw new Error(`Invalid YAML frontmatter in src/commands/${file}: ${err.message}`);
    }

    const command = String(parsed.command || '').trim();
    const skillName = command.replace(/^\//, '');
    if (!SKILL_NAME_RE.test(skillName)) continue; // not a slash command -> skip

    catalog.push({
      skillName,
      command,
      aliases: Array.isArray(parsed.aliases) ? parsed.aliases.map(String) : [],
      description: String(parsed.description || '').trim(),
      skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
      file
    });
  }

  if (catalog.length === 0) {
    throw new Error(`No TOH commands found in ${commandsDir} — cannot generate Codex skills.`);
  }
  return catalog;
}

// ============================================================
// Codex skill generation
// ============================================================

/**
 * Build the SKILL.md body for one command. Deterministic: no timestamps.
 * Paths are project-root relative (Codex runs from the project root).
 */
function renderSkillMd(entry) {
  const triggers = [entry.command, ...entry.aliases].map((c) => `\`${c}\``).join(', ');
  // Description rules (Codex): 1-1024 chars, key use case + trigger words
  // front-loaded so implicit matching survives description shortening.
  const description =
    `${entry.description} — TOH Framework workflow (${entry.command}). ` +
    `Trigger words: ${[entry.command, ...entry.aliases].join(', ')}.`.slice(0, 1024);

  const supporting = entry.skills.length
    ? `2. Read every supporting skill BEFORE executing:\n${entry.skills
        .map((s) => `   - \`.toh/skills/${s}/SKILL.md\``)
        .join('\n')}\n3. Execute the workflow in this session, in order.`
    : '2. Execute the workflow in this session, in order.';

  return `---
name: ${entry.skillName}
description: ${yaml.dump(description, { lineWidth: -1, noRefs: true }).trim()}
metadata:
  generator: ${SKILL_GENERATOR}
  version: ${VERSION}
---

# ${entry.command} — ${entry.description}

> Codex-native wrapper for the TOH Framework workflow ${entry.command}.
> Generated by ${SKILL_GENERATOR} — do not edit by hand; re-run
> \`npx toh-framework install --ide codex\` to update.
> All paths below are relative to the project root (the directory holding \`.codex/\`).

## When to use

${entry.description}. Triggers: ${triggers}, or any plain-language request that matches.

## Workflow

1. Read the full workflow definition: \`.toh/commands/${entry.file}\`
${supporting}

If \`.toh/commands/${entry.file}\` is missing (TOH commands component not
installed), follow the supporting skills directly — they carry the same rules.

## Codex constraints

- **No subagents/teams** — where the workflow says "spawn" or "delegate", do
  that work inline, one task at a time, in this session.
- **No Claude Code Stop hook** — self-enforce THE TOH LOOP: do not end the run
  while \`.toh/plan.md\` has unchecked, unblocked tasks.
- **No model routing** — ignore haiku/sonnet/opus tiers mentioned in TOH docs.
- **State** — persist everything under \`.toh/\` (\`plan.md\`, \`progress.md\`,
  \`memory/\`); resume = continue at the first unchecked \`[ ]\` task.

## Legacy command text

If the user typed ${triggers} as text: that is this skill. \`/toh-*\` is
compatibility text interpreted via AGENTS.md, not a native Codex slash command.
`;
}

/**
 * Install .codex/skills/<toh-*>/SKILL.md for every command in the catalog.
 * - writes are idempotent (same input -> same bytes)
 * - stale TOH-managed skills (generator marker, no longer in catalog) are removed
 * - user skills (including user skills named toh-*) are never touched
 * Returns the list of installed skill names.
 */
export async function installCodexSkills(targetDir, srcDir) {
  const catalog = await readCommandCatalog(srcDir);
  const skillsRoot = path.join(targetDir, '.codex', 'skills');
  await fs.ensureDir(skillsRoot);

  const wanted = new Set(catalog.map((c) => c.skillName));

  // Remove stale TOH-managed skills (identified by the generator marker —
  // never by directory name alone, so user skills are safe).
  for (const entry of await fs.readdir(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || wanted.has(entry.name)) continue;
    const skillFile = path.join(skillsRoot, entry.name, 'SKILL.md');
    if (!(await fs.pathExists(skillFile))) continue;
    try {
      const head = (await fs.readFile(skillFile, 'utf8')).slice(0, 4096);
      if (head.includes(`generator: ${SKILL_GENERATOR}`)) {
        await fs.remove(path.join(skillsRoot, entry.name));
      }
    } catch {
      // Unreadable file -> leave it alone; never delete what we can't classify.
    }
  }

  for (const entry of catalog) {
    const dir = path.join(skillsRoot, entry.skillName);
    await fs.ensureDir(dir);
    await fs.writeFile(path.join(dir, 'SKILL.md'), renderSkillMd(entry));
  }

  return catalog.map((c) => c.skillName);
}

// ============================================================
// AGENTS.md (managed block only)
// ============================================================

function renderSkillTable(catalog) {
  const rows = catalog
    .map((c) => `| \`$${c.skillName}\` | ${c.description} |`)
    .join('\n');
  return `| Skill | Use it to |
|-------|-----------|
${rows}`;
}

function generateAgentsMdEN(catalog) {
  return `${AGENTS_BLOCK_START}
# 🎯 Toh Framework

> **"Type Once, Have it all!"** — AI-Orchestration Driven Development

## Identity

You are the **Toh Framework Agent** running in **Codex CLI**, helping solo developers build SaaS systems by themselves.

${renderCapabilitiesSection('codex')}

## Using TOH in Codex (native skills)

TOH workflows are installed as **native Codex skills** under \`.codex/skills/\` — this is the canonical integration:

${renderSkillTable(catalog)}

- Invoke explicitly with \`$<skill>\` (or browse with \`/skills\`), or describe the task — Codex matches skills by description.
- Each skill reads its workflow from \`.toh/commands/\` and supporting rules from \`.toh/skills/\`.

### Legacy \`/toh-*\` compatibility text

Codex has no custom slash commands. If the user types \`/toh-plan\` or \`toh plan\`, interpret it as a request to use the matching skill in \`.codex/skills/\` — compatibility behavior, not a native command.

## TOH runtime & state (\`.toh/\`)

- \`.toh/plan.md\` + \`.toh/progress.md\` — the plan IS a file; resume = first unchecked \`[ ]\` task
- \`.toh/memory/\` — 7-file memory (protocol below)
- \`.toh/skills/\` · \`.toh/commands/\` · \`.toh/capabilities.json\`

## Codex constraints (vs Claude Code)

- **No subagents/teams** — run THE TOH LOOP sequentially in this session (see \`.toh/skills/orchestration-protocol/SKILL.md\`): implement → run the task's checkpoint → quote real output → fix if red (max 5 tries; 3 consecutive failures = \`- [!] BLOCKED\`) → tick the checkbox → next task without asking.
- **No Stop hook** — self-enforce: never end the session while \`.toh/plan.md\` has unchecked, unblocked tasks.
- **No model routing** — ignore haiku/sonnet/opus tiers in TOH docs.

## Memory protocol (tiered)

- BEFORE work: read \`.toh/memory/active.md\` + \`summary.md\` (always); \`architecture.md\` + \`components.md\` for build tasks; \`changelog.md\` for debugging; \`decisions.md\` / \`agents-log.md\` only when referenced.
- AFTER work: always update \`active.md\`; update the others per relevance. Memory files are always in English.
- Close every stage per \`.toh/skills/engineer-harness/SKILL.md\` (Status / Result / Evidence / exactly 3 next actions).

${AGENTS_BLOCK_END}`;
}

function generateAgentsMdTH(catalog) {
  return `${AGENTS_BLOCK_START}
# 🎯 Toh Framework

> **"Type Once, Have it all!"** — AI-Orchestration Driven Development
> "สั่งครั้งเดียว จบครบโดยไม่ต้องถาม"

## Identity

คุณคือ **Toh Framework Agent** ที่รันอยู่บน **Codex CLI** — ช่วย Solo Developer สร้าง SaaS คนเดียวจนจบ

${renderCapabilitiesSection('codex')}

## การใช้ TOH ใน Codex (native skills)

เวิร์กโฟลว์ TOH ถูกติดตั้งเป็น **native Codex skills** ไว้ที่ \`.codex/skills/\` — นี่คือช่องทางหลัก:

${renderSkillTable(catalog)}

- เรียกตรงๆ ด้วย \`$<skill>\` (หรือพิมพ์ \`/skills\` เพื่อดูทั้งหมด) หรือแค่บรรยายงาน — Codex จะจับคู่ skill จาก description เอง
- แต่ละ skill อ่านเวิร์กโฟลว์จาก \`.toh/commands/\` และกฎประกอบจาก \`.toh/skills/\`

### ข้อความ \`/toh-*\` แบบเดิม (compatibility)

Codex ไม่มี slash command แบบกำหนดเอง ถ้าผู้ใช้พิมพ์ \`/toh-plan\` หรือ \`toh plan\` ให้ตีความว่าเป็นคำขอใช้ skill ที่ตรงกันใน \`.codex/skills/\` — เป็น compatibility behavior ไม่ใช่ native command

## TOH runtime & state (\`.toh/\`)

- \`.toh/plan.md\` + \`.toh/progress.md\` — แผนคือไฟล์; resume = task แรกที่ยังไม่ติ๊ก \`[ ]\`
- \`.toh/memory/\` — memory 7 ไฟล์ (protocol ด้านล่าง)
- \`.toh/skills/\` · \`.toh/commands/\` · \`.toh/capabilities.json\`

## ข้อจำกัดของ Codex (เทียบ Claude Code)

- **ไม่มี subagents/teams** — รัน THE TOH LOOP แบบ sequential ใน session นี้ (ดู \`.toh/skills/orchestration-protocol/SKILL.md\`): implement → รัน checkpoint ของ task → quote output จริง → แก้ถ้าแดง (สูงสุด 5 ครั้ง; แพ้ 3 ครั้งติด = \`- [!] BLOCKED\`) → ติ๊ก checkbox → ทำ task ถัดไปโดยไม่ต้องถาม
- **ไม่มี Stop hook** — บังคับตัวเอง: ห้ามจบ session ถ้า \`.toh/plan.md\` ยังมี task ที่ไม่ได้ติ๊กและไม่ blocked
- **ไม่มี model routing** — ข้าม tier haiku/sonnet/opus ในเอกสาร TOH

## Memory protocol (tiered)

- ก่อนทำงาน: อ่าน \`.toh/memory/active.md\` + \`summary.md\` เสมอ; \`architecture.md\` + \`components.md\` สำหรับงาน build; \`changelog.md\` สำหรับงาน debug; \`decisions.md\` / \`agents-log.md\` เฉพาะเมื่อถูกอ้างถึง
- หลังทำงาน: อัปเดต \`active.md\` เสมอ; ไฟล์อื่นตามความเกี่ยวข้อง — memory ทุกไฟล์เป็นภาษาอังกฤษ
- ปิดทุก stage ตาม \`.toh/skills/engineer-harness/SKILL.md\` (Status / Result / Evidence / next actions 3 ข้อ)

${AGENTS_BLOCK_END}`;
}

/**
 * Insert or replace the TOH-managed block in AGENTS.md. All existing user
 * content outside the markers is preserved; duplicate TOH blocks collapse
 * into one, so repeated installs are idempotent by construction.
 */
export async function updateAgentsMd(targetDir, catalog, language = 'en') {
  const block = language === 'th' ? generateAgentsMdTH(catalog) : generateAgentsMdEN(catalog);
  const agentsPath = path.join(targetDir, 'AGENTS.md');

  if (await fs.pathExists(agentsPath)) {
    const existing = await fs.readFile(agentsPath, 'utf8');
    const stripped = existing.replace(AGENTS_BLOCK_RE, '').trimEnd();
    const next = stripped ? `${stripped}\n\n${block}\n` : `${block}\n`;
    await fs.writeFile(agentsPath, next);
  } else {
    await fs.writeFile(agentsPath, `${block}\n`);
  }
  return agentsPath;
}

// ============================================================
// .toh runtime (seed-if-absent — install.js is the primary seeder)
// ============================================================

/**
 * Guarantee the TOH runtime skeleton exists. Seeds only when absent so a
 * reinstall never clobbers live memory/plan state. install.js already creates
 * the full runtime before IDE handlers run; this makes setupCodex() safe to
 * call standalone (tests, partial reinstalls).
 */
export async function ensureTohRuntime(targetDir) {
  const tohDir = path.join(targetDir, '.toh');
  const memoryDir = path.join(tohDir, 'memory');
  await fs.ensureDir(path.join(memoryDir, 'archive'));

  const today = new Date().toISOString().split('T')[0];
  const seeds = {
    'active.md': `# 🔥 Active Task\n\n## Current Work\n[No active task - Waiting for user command]\n\n## Last Action\n[None]\n\n## Next Steps\n- Waiting for user command\n\n## Blockers\n[None]\n`,
    'summary.md': `# 📋 Project Summary\n\n## Project Info\n- **Name:** [Not specified]\n- **Type:** [Not specified]\n\n## Completed Features\n[None yet]\n\n## In Progress\n[None yet]\n`,
    'decisions.md': `# 🧠 Key Decisions\n\n## Architecture Decisions\n| Date | Decision | Reason |\n|------|----------|--------|\n| ${today} | Use Toh Framework v${VERSION} | AI-Orchestration Driven Development |\n`,
    'changelog.md': `# 📝 Session Changelog\n\n## [Current Session] - ${today}\n\n### Changes Made\n| Agent | Action | File/Component |\n|-------|--------|----------------|\n| - | - | - |\n`,
    'agents-log.md': `# 🤖 Agents Activity Log\n\n## Recent Activity\n| Time | Agent | Task | Status | Files |\n|------|-------|------|--------|-------|\n| - | - | - | - | - |\n`,
    'architecture.md': `# 🏗️ Code Architecture\n\n## Directory Structure\n\`\`\`\n[Will be auto-generated when project starts]\n\`\`\`\n`,
    'components.md': `# 🧩 Component Registry\n\n## UI Components\n| Component | Path | Props | Used In |\n|-----------|------|-------|---------|\n| - | - | - | - |\n`
  };

  for (const [file, content] of Object.entries(seeds)) {
    const p = path.join(memoryDir, file);
    if (!(await fs.pathExists(p))) await fs.writeFile(p, content);
  }

  const planPath = path.join(tohDir, 'plan.md');
  if (!(await fs.pathExists(planPath))) {
    await fs.writeFile(
      planPath,
      `# Plan: (no active plan yet)\nStatus: draft\nCreated: ${today} by toh-framework installer\n\n> This file is THE TOH LOOP's backlog. Full schema + loop protocol:\n> \`.toh/skills/orchestration-protocol/SKILL.md\` (Section D).\n\nEmpty backlog — no stories yet. Run the \`toh-plan\` skill to draft a plan here, or\n\`toh-vibe\` to auto-generate a mini-plan and build it.\n`
    );
  }

  const progressPath = path.join(tohDir, 'progress.md');
  if (!(await fs.pathExists(progressPath))) {
    await fs.writeFile(
      progressPath,
      `# Progress Ledger\n\n> Append-only, one line per state change: \`queued → running → done/failed/blocked\`.\n> Format: \`YYYY-MM-DD HH:MM T00x <state> — <detail>\`. Never rewrite history — append.\n`
    );
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Install the Codex integration. Returns a short detail string for the
 * install spinner.
 */
export async function setupCodex(targetDir, srcDir, language = 'en') {
  await ensureTohRuntime(targetDir);
  const catalog = await readCommandCatalog(srcDir);
  const installed = await installCodexSkills(targetDir, srcDir);
  await updateAgentsMd(targetDir, catalog, language);
  return `.codex/skills/ (${installed.length} skills) + AGENTS.md`;
}

/**
 * Remove ONLY the TOH-managed Codex files:
 *   - .codex/skills/<skill> dirs whose SKILL.md carries the TOH generator marker
 *   - the TOH-managed block in AGENTS.md (file deleted if it becomes empty)
 * User skills, user AGENTS.md content, and .toh/ runtime state are preserved.
 * Returns { removedSkills, agentsMd: 'updated'|'removed'|'absent' }.
 */
export async function uninstallCodex(targetDir) {
  const result = { removedSkills: [], agentsMd: 'absent' };

  const skillsRoot = path.join(targetDir, '.codex', 'skills');
  if (await fs.pathExists(skillsRoot)) {
    for (const entry of await fs.readdir(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(skillsRoot, entry.name);
      const skillFile = path.join(dir, 'SKILL.md');
      if (!(await fs.pathExists(skillFile))) continue;
      try {
        const head = (await fs.readFile(skillFile, 'utf8')).slice(0, 4096);
        if (head.includes(`generator: ${SKILL_GENERATOR}`)) {
          await fs.remove(dir);
          result.removedSkills.push(entry.name);
        }
      } catch {
        // Leave unreadable entries untouched.
      }
    }
    result.removedSkills.sort();
  }

  const agentsPath = path.join(targetDir, 'AGENTS.md');
  if (await fs.pathExists(agentsPath)) {
    const existing = await fs.readFile(agentsPath, 'utf8');
    const stripped = existing.replace(AGENTS_BLOCK_RE, '').trim();
    if (stripped === existing.trim()) {
      result.agentsMd = 'absent'; // no TOH block -> nothing to do
    } else if (stripped) {
      await fs.writeFile(agentsPath, `${stripped}\n`);
      result.agentsMd = 'updated';
    } else {
      await fs.remove(agentsPath); // block was the whole file -> file was ours
      result.agentsMd = 'removed';
    }
  }

  return result;
}
