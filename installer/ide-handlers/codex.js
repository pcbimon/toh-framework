/**
 * Codex CLI IDE Handler
 *
 * Codex discovers repository skills from .agents/skills. TOH keeps the full
 * runtime in .toh/ and installs thin wrappers for commands and skills.
 */

import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { renderCapabilitiesSection } from './shared.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
const VERSION = pkg.version;

export const CODEX_SKILLS_DIR = path.join('.agents', 'skills');
export const AGENTS_MAX_BYTES = 24 * 1024;
export const CODEX_PROJECT_DOC_MAX_BYTES = 64 * 1024;

const AGENTS_BLOCK_START = '<!-- TOH-FRAMEWORK-START -->';
const AGENTS_BLOCK_END = '<!-- TOH-FRAMEWORK-END -->';
const AGENTS_BLOCK_RE = /[ \t]*<!-- TOH-FRAMEWORK-START -->[\s\S]*?<!-- TOH-FRAMEWORK-END -->[ \t]*\r?\n?/g;
const CONFIG_BLOCK_START = '# TOH-FRAMEWORK-START';
const CONFIG_BLOCK_END = '# TOH-FRAMEWORK-END';
const CONFIG_BLOCK_RE = /[ \t]*# TOH-FRAMEWORK-START\r?\n[\s\S]*?[ \t]*# TOH-FRAMEWORK-END[ \t]*\r?\n?/g;
const SKILL_GENERATOR = 'toh-framework';
const MANIFEST_PATH = path.join('.codex', 'toh-framework.json');
const SKILL_NAME_RE = /^[a-z0-9-]{1,64}$/;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function relativePath(...parts) {
  return path.posix.join(...parts.map((part) => String(part).replaceAll(path.sep, '/')));
}

function skillFileRelativePath(name) {
  return relativePath(CODEX_SKILLS_DIR, name, 'SKILL.md');
}

async function readManifest(targetDir) {
  const manifestPath = path.join(targetDir, MANIFEST_PATH);
  if (!(await fs.pathExists(manifestPath))) {
    return { generator: SKILL_GENERATOR, version: VERSION, files: {} };
  }

  try {
    const manifest = await fs.readJson(manifestPath);
    if (manifest.generator !== SKILL_GENERATOR || typeof manifest.files !== 'object') {
      return { generator: SKILL_GENERATOR, version: VERSION, files: {} };
    }
    return manifest;
  } catch {
    return { generator: SKILL_GENERATOR, version: VERSION, files: {} };
  }
}

async function writeManifest(targetDir, manifest) {
  const manifestPath = path.join(targetDir, MANIFEST_PATH);
  await fs.ensureDir(path.dirname(manifestPath));
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
}

async function fileMatchesHash(filePath, expectedHash) {
  if (!expectedHash || !(await fs.pathExists(filePath))) return false;
  try {
    return sha256(await fs.readFile(filePath)) === expectedHash;
  } catch {
    return false;
  }
}

function parseFrontmatter(raw, label) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error(`${label} must start with YAML frontmatter.`);
  try {
    return yaml.load(match[1]) || {};
  } catch (error) {
    throw new Error(`Invalid YAML frontmatter in ${label}: ${error.message}`);
  }
}

export async function readCommandCatalog(srcDir) {
  const commandsDir = path.join(srcDir, 'commands');
  if (!(await fs.pathExists(commandsDir))) {
    throw new Error(`TOH command source not found: ${commandsDir} — is this a complete toh-framework package?`);
  }

  const files = (await fs.readdir(commandsDir))
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .sort();
  const catalog = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(commandsDir, file), 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) continue;

    let parsed;
    try {
      parsed = yaml.load(match[1]) || {};
    } catch (error) {
      throw new Error(`Invalid YAML frontmatter in src/commands/${file}: ${error.message}`);
    }

    const command = String(parsed.command || '').trim();
    const skillName = command.replace(/^\//, '');
    if (!SKILL_NAME_RE.test(skillName)) continue;

    catalog.push({
      kind: 'command',
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

export async function readSupportingSkillCatalog(srcDir) {
  const skillsDir = path.join(srcDir, 'skills');
  if (!(await fs.pathExists(skillsDir))) {
    throw new Error(`TOH skill source not found: ${skillsDir} — is this a complete toh-framework package?`);
  }

  const catalog = [];
  const entries = (await fs.readdir(skillsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const file = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!(await fs.pathExists(file))) continue;
    const raw = await fs.readFile(file, 'utf8');
    const frontmatter = raw.startsWith('---\n') || raw.startsWith('---\r\n')
      ? parseFrontmatter(raw, file)
      : {};
    const skillName = String(frontmatter.name || entry.name).trim();
    if (!SKILL_NAME_RE.test(skillName) || skillName !== entry.name) continue;
    const heading = raw.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const description = String(frontmatter.description || heading || `${entry.name} TOH supporting skill`).trim();
    catalog.push({
      kind: 'skill',
      skillName,
      description,
      file: relativePath('skills', entry.name, 'SKILL.md'),
      sourcePath: `.toh/skills/${entry.name}/SKILL.md`
    });
  }

  if (catalog.length === 0) {
    throw new Error(`No TOH supporting skills found in ${skillsDir} — cannot generate Codex skills.`);
  }
  return catalog;
}

async function readWrapperCatalog(srcDir) {
  const [commands, skills] = await Promise.all([
    readCommandCatalog(srcDir),
    readSupportingSkillCatalog(srcDir)
  ]);
  const wrappers = [
    ...skills,
    ...commands.map((entry) => ({
      ...entry,
      sourcePath: `.toh/commands/${entry.file}`
    }))
  ].sort((a, b) => a.skillName.localeCompare(b.skillName));

  const names = new Set();
  for (const wrapper of wrappers) {
    if (names.has(wrapper.skillName)) throw new Error(`Duplicate Codex skill name: ${wrapper.skillName}`);
    names.add(wrapper.skillName);
  }
  return { commands, skills, wrappers };
}

function wrapperFrontmatter(entry) {
  return yaml.dump({
    name: entry.skillName,
    description: entry.description.slice(0, 1024),
    metadata: {
      generator: SKILL_GENERATOR,
      version: VERSION,
      kind: entry.kind,
      source: entry.sourcePath
    }
  }, { lineWidth: -1, noRefs: true }).trimEnd();
}

function renderCommandWrapper(entry) {
  const triggers = [entry.command, ...entry.aliases].map((command) => `\`${command}\``).join(', ');
  const supporting = entry.skills.length
    ? `2. Read every supporting skill BEFORE executing:\n${entry.skills
        .map((skill) => `   - \`.toh/skills/${skill}/SKILL.md\``)
        .join('\n')}\n3. Execute the workflow in this session, in order.`
    : '2. Execute the workflow in this session, in order.';

  return `---\n${wrapperFrontmatter(entry)}\n---\n\n# ${entry.command} — ${entry.description}\n\n> Thin Codex wrapper for the TOH Framework workflow ${entry.command}.\n> Read the runtime workflow from \`${entry.sourcePath}\`; do not duplicate it here.\n\n## When to use\n\n${entry.description}. Triggers: ${triggers}, or any plain-language request that matches.\n\n## Workflow\n\n1. Read the full workflow definition: \`${entry.sourcePath}\`\n${supporting}\n\n## Codex constraints\n\n- **No subagents or teams** — execute delegated work inline, one task at a time.\n- **No Stop hook** — do not end while \`.toh/plan.md\` has unchecked, unblocked tasks.\n- **No model routing** — ignore model tiers in TOH docs.\n- **State** — persist work under \`.toh/\` and resume from the first unchecked task.\n`;
}

function renderSupportingSkillWrapper(entry) {
  return `---\n${wrapperFrontmatter(entry)}\n---\n\n# ${entry.skillName}\n\nThis is a thin Codex discovery wrapper for the TOH supporting skill.\nRead the complete instructions from \`${entry.sourcePath}\` before acting.\n\nThe runtime copy under \`.toh/skills/\` is the source of truth; this wrapper exists\nonly so Codex can discover and invoke the skill from the repository skill path.\n`;
}

function renderWrapper(entry) {
  return entry.kind === 'command'
    ? renderCommandWrapper(entry)
    : renderSupportingSkillWrapper(entry);
}

export async function installCodexSkills(targetDir, srcDir) {
  const { wrappers } = await readWrapperCatalog(srcDir);
  const skillsRoot = path.join(targetDir, CODEX_SKILLS_DIR);
  await fs.ensureDir(skillsRoot);
  const previous = await readManifest(targetDir);
  const nextFiles = {};
  const wanted = new Set(wrappers.map((entry) => skillFileRelativePath(entry.skillName)));

  for (const [relative, record] of Object.entries(previous.files || {})) {
    if (!relative.startsWith(`${CODEX_SKILLS_DIR}/`) || wanted.has(relative)) continue;
    const filePath = path.join(targetDir, relative);
    if (await fileMatchesHash(filePath, record.sha256)) {
      await fs.remove(filePath);
      const parent = path.dirname(filePath);
      if ((await fs.readdir(parent)).length === 0) await fs.remove(parent);
    }
  }

  const installed = [];
  for (const entry of wrappers) {
    const relative = skillFileRelativePath(entry.skillName);
    const filePath = path.join(targetDir, relative);
    const content = renderWrapper(entry);
    const existingRecord = previous.files?.[relative];
    const canReplace = !(await fs.pathExists(filePath)) ||
      await fileMatchesHash(filePath, existingRecord?.sha256);

    if (!canReplace) continue;
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
    nextFiles[relative] = {
      sha256: sha256(content),
      kind: entry.kind,
      source: entry.sourcePath
    };
    installed.push(entry.skillName);
  }

  await writeManifest(targetDir, {
    ...previous,
    generator: SKILL_GENERATOR,
    version: VERSION,
    files: nextFiles
  });
  return installed;
}

function renderSkillTable(wrappers) {
  const rows = wrappers
    .map((entry) => `| \`$${entry.skillName}\` | ${entry.description} |`)
    .join('\n');
  return `| Skill | Use it to |\n|-------|-----------|\n${rows}`;
}

function generateAgentsBlock(wrappers, language) {
  const capabilities = renderCapabilitiesSection('codex');
  const thai = language === 'th';
  const title = thai
    ? 'คุณคือ **Toh Framework Agent** ที่รันอยู่บน **Codex CLI** — ช่วย Solo Developer สร้าง SaaS คนเดียวจนจบ'
    : 'You are the **Toh Framework Agent** running in **Codex CLI**, helping solo developers build SaaS systems by themselves.';
  const intro = thai
    ? 'เวิร์กโฟลว์และกฎของ TOH ถูกติดตั้งเป็น native skills ไว้ที่ `.agents/skills/`:'
    : 'TOH workflows and supporting rules are installed as native skills under `.agents/skills/`:';
  const runtime = thai
    ? '- `.toh/plan.md` + `.toh/progress.md` — แผนคือไฟล์และใช้ resume จาก task แรกที่ยังไม่ติ๊ก\n- `.toh/memory/` — memory 7 ไฟล์'
    : '- `.toh/plan.md` + `.toh/progress.md` — the plan is a file; resume from the first unchecked task\n- `.toh/memory/` — 7-file memory';
  const constraints = thai
    ? '- **ไม่มี subagents/teams** — รัน THE TOH LOOP แบบ sequential ใน session นี้\n- **ไม่มี Stop hook** — ห้ามจบ session ถ้าแผนยังมี task ที่ไม่ได้ติ๊กและไม่ blocked\n- **ไม่มี model routing** — ข้าม tier haiku/sonnet/opus ในเอกสาร TOH'
    : '- **No subagents or teams** — run THE TOH LOOP sequentially in this session\n- **No Stop hook** — never end while `.toh/plan.md` has unchecked, unblocked tasks\n- **No model routing** — ignore haiku/sonnet/opus tiers in TOH docs';
  const compatibility = thai
    ? '- เรียกตรงๆ ด้วย `$<skill>` หรือพิมพ์ `/skills` เพื่อดูทั้งหมด\n- แต่ละ wrapper อ่านเนื้อหาจริงจาก `.toh/commands/` หรือ `.toh/skills/`\n- ถ้าพิมพ์ `/toh-*` ให้ตีความเป็นคำขอใช้ skill ที่ตรงกัน ไม่ใช่ custom slash command'
    : '- Invoke explicitly with `$<skill>` or browse with `/skills`, or describe the task for implicit matching.\n- Each wrapper reads the full source from `.toh/commands/` or `.toh/skills/`.\n- If the user types `/toh-*`, interpret it as a request for the matching skill, not a custom slash command.';

  return `${AGENTS_BLOCK_START}
# 🎯 Toh Framework

> **"Type Once, Have it all!"** — AI-Orchestration Driven Development${thai ? '\n> "สั่งครั้งเดียว จบครบโดยไม่ต้องถาม"' : ''}

## Identity

${title}

${capabilities}

## ${thai ? 'การใช้ TOH ใน Codex (native skills)' : 'Using TOH in Codex (native skills)'}

${intro}

${renderSkillTable(wrappers)}

${compatibility}

## TOH runtime & state (\`.toh/\`)

${runtime}
- \`.toh/skills/\` · \`.toh/commands/\` · \`.toh/capabilities.json\`

## ${thai ? 'ข้อจำกัดของ Codex' : 'Codex constraints'}

${constraints}

${AGENTS_BLOCK_END}`;
}

export function assertAgentsMdSize(content) {
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > AGENTS_MAX_BYTES) {
    throw new Error(`AGENTS.md is ${bytes} bytes; Codex limit is ${AGENTS_MAX_BYTES} bytes.`);
  }
}

async function updateManifest(targetDir, changes) {
  const manifest = await readManifest(targetDir);
  await writeManifest(targetDir, { ...manifest, ...changes });
}

export async function updateAgentsMd(targetDir, wrappers, language = 'en') {
  const block = generateAgentsBlock(wrappers, language);
  const agentsPath = path.join(targetDir, 'AGENTS.md');
  const existing = await fs.pathExists(agentsPath) ? await fs.readFile(agentsPath, 'utf8') : '';
  const stripped = existing.replace(AGENTS_BLOCK_RE, '').trimEnd();
  const next = stripped ? `${stripped}\n\n${block}\n` : `${block}\n`;
  assertAgentsMdSize(next);
  await fs.writeFile(agentsPath, next);
  await updateManifest(targetDir, { agentsBlockSha256: sha256(block) });
  return agentsPath;
}

function codexConfigBlock() {
  return `${CONFIG_BLOCK_START}\n# Keep Codex project instructions below its discovery ceiling.\nproject_doc_max_bytes = ${CODEX_PROJECT_DOC_MAX_BYTES}\n${CONFIG_BLOCK_END}`;
}

export async function setupCodexConfig(targetDir) {
  const configPath = path.join(targetDir, '.codex', 'config.toml');
  const existing = await fs.pathExists(configPath) ? await fs.readFile(configPath, 'utf8') : '';
  const withoutToh = existing.replace(CONFIG_BLOCK_RE, '').trimEnd();
  const hasUserQuota = /^\s*project_doc_max_bytes\s*=/m.test(withoutToh);
  if (hasUserQuota) {
    await updateManifest(targetDir, { configSha256: null });
    return configPath;
  }

  const block = codexConfigBlock();
  const next = withoutToh ? `${withoutToh}\n\n${block}\n` : `${block}\n`;
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeFile(configPath, next);
  await updateManifest(targetDir, { configSha256: sha256(next) });
  return configPath;
}

export async function ensureTohRuntime(targetDir) {
  const tohDir = path.join(targetDir, '.toh');
  const memoryDir = path.join(tohDir, 'memory');
  await fs.ensureDir(path.join(memoryDir, 'archive'));

  const today = new Date().toISOString().split('T')[0];
  const seeds = {
    'active.md': '# 🔥 Active Task\n\n## Current Work\n[No active task - Waiting for user command]\n\n## Last Action\n[None]\n\n## Next Steps\n- Waiting for user command\n\n## Blockers\n[None]\n',
    'summary.md': '# 📋 Project Summary\n\n## Project Info\n- **Name:** [Not specified]\n- **Type:** [Not specified]\n\n## Completed Features\n[None yet]\n\n## In Progress\n[None yet]\n',
    'decisions.md': `# 🧠 Key Decisions\n\n## Architecture Decisions\n| Date | Decision | Reason |\n|------|----------|--------|\n| ${today} | Use Toh Framework v${VERSION} | AI-Orchestration Driven Development |\n`,
    'changelog.md': `# 📝 Session Changelog\n\n## [Current Session] - ${today}\n\n### Changes Made\n| Agent | Action | File/Component |\n|-------|--------|----------------|\n| - | - | - |\n`,
    'agents-log.md': '# 🤖 Agents Activity Log\n\n## Recent Activity\n| Time | Agent | Task | Status | Files |\n|------|-------|------|--------|-------|\n| - | - | - | - | - |\n',
    'architecture.md': '# 🏗️ Code Architecture\n\n## Directory Structure\n```\n[Will be auto-generated when project starts]\n```\n',
    'components.md': '# 🧩 Component Registry\n\n## UI Components\n| Component | Path | Props | Used In |\n|-----------|------|-------|---------|\n| - | - | - | - |\n'
  };

  for (const [file, content] of Object.entries(seeds)) {
    const filePath = path.join(memoryDir, file);
    if (!(await fs.pathExists(filePath))) await fs.writeFile(filePath, content);
  }

  const planPath = path.join(tohDir, 'plan.md');
  if (!(await fs.pathExists(planPath))) {
    await fs.writeFile(planPath, `# Plan: (no active plan yet)\nStatus: draft\nCreated: ${today} by toh-framework installer\n\n> This file is THE TOH LOOP's backlog. Full schema + loop protocol:\n> \.toh/skills/orchestration-protocol/SKILL.md\n\nEmpty backlog — no stories yet. Run the \.toh-plan skill to draft a plan here, or\n\.toh-vibe to auto-generate a mini-plan and build it.\n`);
  }

  const progressPath = path.join(tohDir, 'progress.md');
  if (!(await fs.pathExists(progressPath))) {
    await fs.writeFile(progressPath, '# Progress Ledger\n\n> Append-only, one line per state change: `queued → running → done/failed/blocked`.\n> Format: `YYYY-MM-DD HH:MM T00x <state> — <detail>`. Never rewrite history — append.\n');
  }
}

export async function setupCodex(targetDir, srcDir, language = 'en') {
  await ensureTohRuntime(targetDir);
  const { wrappers } = await readWrapperCatalog(srcDir);
  await setupCodexConfig(targetDir);
  const installed = await installCodexSkills(targetDir, srcDir);
  await updateAgentsMd(targetDir, wrappers, language);
  return `${CODEX_SKILLS_DIR}/ (${installed.length}/${wrappers.length} wrappers) + AGENTS.md + .codex/config.toml`;
}

async function makeBackup(targetDir, files) {
  if (files.length === 0) return null;
  const backupDir = path.join(targetDir, '.toh-backups', `codex-${Date.now()}`);
  for (const relative of files) {
    const source = path.join(targetDir, relative);
    if (!(await fs.pathExists(source))) continue;
    const destination = path.join(backupDir, relative);
    await fs.ensureDir(path.dirname(destination));
    await fs.copy(source, destination);
  }
  return backupDir;
}

export async function uninstallCodex(targetDir, options = {}) {
  const { dryRun = false, backup = true } = options;
  const manifest = await readManifest(targetDir);
  const skillRemovals = [];
  const backupFiles = [];

  for (const [relative, record] of Object.entries(manifest.files || {})) {
    if (!relative.startsWith(`${CODEX_SKILLS_DIR}/`) || !relative.endsWith('/SKILL.md')) continue;
    const filePath = path.join(targetDir, relative);
    if (!(await fileMatchesHash(filePath, record.sha256))) continue;
    skillRemovals.push({ relative, filePath, name: path.basename(path.dirname(filePath)) });
    backupFiles.push(relative);
  }

  let agentsAction = 'absent';
  const agentsPath = path.join(targetDir, 'AGENTS.md');
  if (await fs.pathExists(agentsPath) && manifest.agentsBlockSha256) {
    const existing = await fs.readFile(agentsPath, 'utf8');
    const blockMatch = existing.match(/<!-- TOH-FRAMEWORK-START -->[\s\S]*?<!-- TOH-FRAMEWORK-END -->/);
    if (blockMatch && sha256(blockMatch[0]) === manifest.agentsBlockSha256) {
      agentsAction = existing.replace(AGENTS_BLOCK_RE, '').trim() ? 'updated' : 'removed';
      backupFiles.push('AGENTS.md');
    }
  }

  let configAction = 'absent';
  const configPath = path.join(targetDir, '.codex', 'config.toml');
  if (manifest.configSha256 && await fileMatchesHash(configPath, manifest.configSha256)) {
    const existing = await fs.readFile(configPath, 'utf8');
    const stripped = existing.replace(CONFIG_BLOCK_RE, '').trim();
    configAction = stripped ? 'updated' : 'removed';
    backupFiles.push(path.relative(targetDir, configPath));
  }

  const result = {
    removedSkills: skillRemovals.map((item) => item.name).sort(),
    agentsMd: agentsAction,
    config: configAction,
    dryRun,
    backupPath: null
  };

  if (dryRun) return result;
  if (backup) result.backupPath = await makeBackup(targetDir, [...new Set(backupFiles)]);

  for (const item of skillRemovals) {
    await fs.remove(item.filePath);
    const parent = path.dirname(item.filePath);
    if ((await fs.readdir(parent)).length === 0) await fs.remove(parent);
  }

  if (agentsAction !== 'absent') {
    const existing = await fs.readFile(agentsPath, 'utf8');
    const stripped = existing.replace(AGENTS_BLOCK_RE, '').trim();
    if (stripped) await fs.writeFile(agentsPath, `${stripped}\n`);
    else await fs.remove(agentsPath);
  }

  if (configAction !== 'absent') {
    const existing = await fs.readFile(configPath, 'utf8');
    const stripped = existing.replace(CONFIG_BLOCK_RE, '').trim();
    if (stripped) await fs.writeFile(configPath, `${stripped}\n`);
    else await fs.remove(configPath);
  }

  const manifestPath = path.join(targetDir, MANIFEST_PATH);
  if (await fs.pathExists(manifestPath)) await fs.remove(manifestPath);
  return result;
}