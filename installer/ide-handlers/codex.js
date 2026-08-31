/**
 * Codex CLI IDE Handler
 *
 * Codex discovers repository skills from .agents/skills. TOH keeps the full
 * runtime in .toh/, installs thin wrappers for commands, and translates source
 * agents to native project-scoped TOML files.
 */

import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { parse as parseToml } from 'smol-toml';
import { renderCapabilitiesSection } from './shared.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
const VERSION = pkg.version;

export const CODEX_SKILLS_DIR = path.join('.agents', 'skills');
export const CODEX_AGENTS_DIR = path.join('.codex', 'agents');
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
const AGENT_MODEL_INTENTS = new Set(['lightweight', 'implementation', 'planning', 'review']);
const READ_ONLY_SOURCE_TOOLS = new Set(['Read', 'Grep', 'Glob', 'Bash']);

// Codex model names change independently from Toh's abstract role names. Keep
// that translation in one table so a model refresh does not touch agent source.
export const CODEX_MODEL_ROUTING = Object.freeze({
  lightweight: Object.freeze({ model: 'gpt-5.6-luna', model_reasoning_effort: 'low' }),
  implementation: Object.freeze({ model: 'gpt-5.6', model_reasoning_effort: 'medium' }),
  planning: Object.freeze({ model: 'gpt-5.6', model_reasoning_effort: 'high' }),
  review: Object.freeze({ model: 'gpt-5.6-terra', model_reasoning_effort: 'high' })
});

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
  return parseFrontmatterDocument(raw, label).frontmatter;
}

function parseFrontmatterDocument(raw, label) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${label} must start with YAML frontmatter.`);
  try {
    return { frontmatter: yaml.load(match[1]) || {}, body: match[2] };
  } catch (error) {
    throw new Error(`Invalid YAML frontmatter in ${label}: ${error.message}`);
  }
}

function normalizeModelIntent(value) {
  const intent = String(value || '').trim().toLowerCase().replaceAll('_', '-');
  const aliases = {
    exploration: 'lightweight',
    explore: 'lightweight',
    scaffold: 'lightweight',
    deep: 'planning',
    'deep-reasoning': 'planning',
    security: 'review'
  };
  return aliases[intent] || intent;
}

export function resolveCodexModelIntent(agent) {
  const explicit = normalizeModelIntent(agent.modelIntent || agent.model_intent || agent.codex?.modelIntent);
  if (AGENT_MODEL_INTENTS.has(explicit)) return explicit;

  // Backward-compatible fallback for older source definitions. New definitions
  // should use modelIntent so the source expresses intent, not a vendor tier.
  const legacyTier = String(agent.model || '').trim().toLowerCase();
  if (legacyTier === 'haiku') return 'lightweight';
  if (legacyTier === 'opus') return 'planning';
  return 'implementation';
}

export async function readAgentCatalog(targetDir) {
  const agentsDir = path.join(targetDir, '.toh', 'agents');
  if (!(await fs.pathExists(agentsDir))) return [];

  const files = (await fs.readdir(agentsDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
    .map((entry) => entry.name)
    .sort();
  const catalog = [];

  for (const file of files) {
    const sourcePath = path.join(agentsDir, file);
    const { frontmatter, body } = parseFrontmatterDocument(await fs.readFile(sourcePath, 'utf8'), sourcePath);
    const name = String(frontmatter.name || file.replace(/\.md$/, '')).trim();
    if (!SKILL_NAME_RE.test(name)) continue;

    const tools = Array.isArray(frontmatter.tools) ? frontmatter.tools.map(String) : [];
    const skills = Array.isArray(frontmatter.skills) ? frontmatter.skills.map(String) : [];
    const triggers = Array.isArray(frontmatter.triggers) ? frontmatter.triggers.map(String) : [];
    catalog.push({
      name,
      description: String(frontmatter.description || `${name} Toh Framework agent`).trim().slice(0, 1024),
      body,
      tools,
      skills,
      triggers,
      modelIntent: resolveCodexModelIntent(frontmatter),
      maxTurns: frontmatter.maxTurns
    });
  }

  return catalog;
}

function isReadOnlyAgent(agent) {
  return agent.tools.length > 0 && agent.tools.every((tool) => READ_ONLY_SOURCE_TOOLS.has(tool));
}

export function translateAgentToCodex(agent) {
  const model = CODEX_MODEL_ROUTING[agent.modelIntent] || CODEX_MODEL_ROUTING.implementation;
  const skillRefs = agent.skills.length
    ? `\nAssociated Toh skills (read these files before acting):\n${agent.skills
        .map((skill) => `- .toh/skills/${skill}/SKILL.md`)
        .join('\n')}`
    : '';
  const toolBoundary = agent.tools.length
    ? `\nSource tool boundary: ${agent.tools.join(', ')}. Codex maps this boundary to its sandbox; do not widen it.`
    : '';
  const triggerHints = agent.triggers.length
    ? `\nRouting hints from the canonical definition: ${agent.triggers.join('; ')}`
    : '';
  const turnHint = agent.maxTurns !== undefined
    ? `\nSource turn budget hint: ${agent.maxTurns}. Stay focused and return to the parent when the assigned work is complete.`
    : '';
  const orchestrationContract = `

## Codex runtime contract
- Own only the task and files assigned by the parent orchestrator.
- Return a concise result with Status, Result, Evidence, Files, and Blockers.
- Run the task checkpoint when one is provided. A parent agent re-runs checkpoints before updating .toh/plan.md.
- Never parallelize dependent edits; parallel work is only for genuinely independent files.
${skillRefs}${toolBoundary}${triggerHints}${turnHint}`;
  const instructions = `${agent.body.trim()}${orchestrationContract}`.trim();
  const sandboxMode = isReadOnlyAgent(agent) ? 'read-only' : 'workspace-write';
  const content = [
    `# Toh model intent: ${agent.modelIntent}`,
    `name = ${JSON.stringify(agent.name)}`,
    `description = ${JSON.stringify(agent.description)}`,
    `model = ${JSON.stringify(model.model)}`,
    `model_reasoning_effort = ${JSON.stringify(model.model_reasoning_effort)}`,
    `sandbox_mode = ${JSON.stringify(sandboxMode)}`,
    `developer_instructions = ${JSON.stringify(instructions)}`,
    ''
  ].join('\n');

  try {
    parseToml(content);
  } catch (error) {
    throw new Error(`Invalid generated Codex agent TOML for ${agent.name}: ${error.message}`);
  }
  return content;
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
  const commands = await readCommandCatalog(srcDir);
  const wrappers = commands
    .map((entry) => ({
      ...entry,
      sourcePath: `.toh/commands/${entry.file}`
    }))
    .sort((a, b) => a.skillName.localeCompare(b.skillName));

  const names = new Set();
  for (const wrapper of wrappers) {
    if (names.has(wrapper.skillName)) throw new Error(`Duplicate Codex skill name: ${wrapper.skillName}`);
    names.add(wrapper.skillName);
  }
  return { commands, wrappers };
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

  return `---\n${wrapperFrontmatter(entry)}\n---\n\n# ${entry.command} — ${entry.description}\n\n> Native Codex skill wrapper for the TOH Framework workflow ${entry.command}.\n> Read the runtime workflow from \`${entry.sourcePath}\`; do not duplicate it here.\n\n## When to use\n\n${entry.description}. Triggers: ${triggers}, or any plain-language request that matches.\n\n## Workflow\n\n1. Read the full workflow definition: \`${entry.sourcePath}\`\n${supporting}\n\n## Codex execution\n\n- Delegate independent plan tasks to the matching \`.codex/agents/<name>.toml\`; keep dependent edits sequential.\n- The parent agent owns checkpoint verification and updates \`.toh/plan.md\` only after quoting passing output.\n- Codex has no Toh Stop hook; resume from the first unchecked task when a session ends.\n- Agent TOML files own model and reasoning routing; do not reinterpret Claude model names.\n`;
}

function renderSupportingSkillWrapper(entry) {
  return `---\n${wrapperFrontmatter(entry)}\n---\n\n# ${entry.skillName}\n\nThis is a thin Codex discovery wrapper for the TOH supporting skill.\nRead the complete instructions from \`${entry.sourcePath}\` before acting.\n\nThe runtime copy under \`.toh/skills/\` is the source of truth; this wrapper exists\nonly so Codex can discover and invoke the skill from the repository skill path.\n`;
}

function renderWrapper(entry) {
  return renderCommandWrapper(entry);
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

function agentFileRelativePath(name) {
  return relativePath(CODEX_AGENTS_DIR, `${name}.toml`);
}

export async function installCodexAgents(targetDir) {
  const agentsDir = path.join(targetDir, '.toh', 'agents');
  if (!(await fs.pathExists(agentsDir))) return [];

  const agents = await readAgentCatalog(targetDir);
  const agentsRoot = path.join(targetDir, CODEX_AGENTS_DIR);
  await fs.ensureDir(agentsRoot);
  const previous = await readManifest(targetDir);
  const previousAgents = previous.agents || {};
  const nextAgents = {};
  const wanted = new Set(agents.map((agent) => agentFileRelativePath(agent.name)));

  for (const [relative, record] of Object.entries(previousAgents)) {
    if (!relative.startsWith(`${CODEX_AGENTS_DIR}/`) || wanted.has(relative)) continue;
    const filePath = path.join(targetDir, relative);
    if (await fileMatchesHash(filePath, record.sha256)) {
      await fs.remove(filePath);
      const parent = path.dirname(filePath);
      if ((await fs.readdir(parent)).length === 0) await fs.remove(parent);
    }
  }

  const installed = [];
  for (const agent of agents) {
    const relative = agentFileRelativePath(agent.name);
    const filePath = path.join(targetDir, relative);
    const content = translateAgentToCodex(agent);
    const existingRecord = previousAgents[relative];
    const canReplace = !(await fs.pathExists(filePath)) ||
      await fileMatchesHash(filePath, existingRecord?.sha256);

    if (!canReplace) {
      if (existingRecord) nextAgents[relative] = existingRecord;
      continue;
    }
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
    nextAgents[relative] = {
      sha256: sha256(content),
      source: `.toh/agents/${agent.name}.md`,
      modelIntent: agent.modelIntent
    };
    installed.push(agent.name);
  }

  await writeManifest(targetDir, {
    ...previous,
    generator: SKILL_GENERATOR,
    version: VERSION,
    agents: nextAgents
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
    ? 'คุณคือ **Toh Framework Agent** ที่รันอยู่บน Codex — ช่วย Solo Developer สร้าง SaaS คนเดียวจนจบ'
    : 'You are the **Toh Framework Agent** running in Codex, helping solo developers build SaaS systems by themselves.';
  const intro = thai
    ? 'TOH มี workflow skills แบบ native และ custom agents แบบ native:'
    : 'TOH provides native workflow skills and native custom agents:';
  const runtime = thai
    ? '- `.toh/plan.md` + `.toh/progress.md` — แผนคือไฟล์และใช้ resume จาก task แรกที่ยังไม่ติ๊ก\n- `.toh/memory/` — memory 7 ไฟล์'
    : '- `.toh/plan.md` + `.toh/progress.md` — the plan is a file; resume from the first unchecked task\n- `.toh/memory/` — 7-file memory';
  const compatibility = thai
    ? '- `$<skill>` หรือ `/skills` เพื่อดู workflow\n- แต่ละ workflow อ่านคำสั่งจริงจาก `.toh/commands/` และ skill ภายในจาก `.toh/skills/`\n- ถ้าพิมพ์ `/toh-*` ให้ตีความเป็น backward-compatible plain-text request ไม่ใช่ native slash command'
    : '- Invoke a workflow with `$<skill>` or browse with `/skills`.\n- Each workflow reads its command and internal skills from `.toh/`.\n- If the user types `/toh-*`, interpret it as a backward-compatible plain-text request, not a native slash command.';
  const agents = thai
    ? '- `.codex/agents/*.toml` — custom agents ที่สร้างจาก `.toh/agents/*.md`\n- ใช้ agent ตามชื่อใน task ของ plan; native agent เป็นผู้กำหนด model, reasoning และ sandbox'
    : '- `.codex/agents/*.toml` — custom agents generated from `.toh/agents/*.md`\n- Use the agent named by each plan task; native agent files define model, reasoning, and sandbox.';
  const execution = thai
    ? '- เริ่มจาก task แรกที่ยังไม่ติ๊กใน `.toh/plan.md`\n- delegate เฉพาะงานที่อิสระจริงและไฟล์ไม่ทับกัน; งานที่พึ่งกันทำตามลำดับ\n- parent ต้องรัน checkpoint เองก่อนติ๊ก task\n- ผลจาก agent ต้องมี Status, Result, Evidence, Files, Blockers; ถ้าล้มเหลวส่งกลับ parent เพื่อแก้หรือ mark blocked ตาม protocol'
    : '- Start with the first unchecked task in `.toh/plan.md`.\n- Delegate only genuinely independent work on disjoint files; keep dependent work sequential.\n- The parent re-runs each checkpoint before ticking a task.\n- Agent results must include Status, Result, Evidence, Files, and Blockers; failures return to the parent for repair or blocking per the protocol.';

  return `${AGENTS_BLOCK_START}
# Toh Framework

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

${agents}

## TOH execution contract

${execution}

## ${thai ? 'ขอบเขตของ Codex' : 'Codex boundary'}

- Codex native agents and multi-agent tools are Codex CLI capabilities.
- Installation does not disable multi-agent support when the \`codex\` CLI is absent; an unknown probe result remains eligible for native behavior.
- Codex has no Toh Stop hook. Completion requires the workflow's own quoted checkpoint evidence.

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

function codexConfigBlock(enableMultiAgent = true, enableProjectDocQuota = true) {
  const lines = [
    CONFIG_BLOCK_START,
    '# Enable Codex native delegation and keep project instructions below its discovery ceiling.'
  ];
  if (enableProjectDocQuota) lines.push(`project_doc_max_bytes = ${CODEX_PROJECT_DOC_MAX_BYTES}`);
  if (enableMultiAgent) lines.push('[features]', 'multi_agent = true');
  lines.push(CONFIG_BLOCK_END);
  return `${lines.join('\n')}\n`;
}

function insertCodexConfigBlock(content, block, needsRootKey) {
  if (!content) return `${block}\n`;
  if (!needsRootKey) return `${content}\n\n${block}\n`;

  const firstTable = content.search(/^\s*\[/m);
  if (firstTable === -1) return `${content}\n\n${block}\n`;
  return `${content.slice(0, firstTable).trimEnd()}\n\n${block}\n${content.slice(firstTable)}`;
}

export async function setupCodexConfig(targetDir) {
  const configPath = path.join(targetDir, '.codex', 'config.toml');
  const existing = await fs.pathExists(configPath) ? await fs.readFile(configPath, 'utf8') : '';
  const withoutToh = existing.replace(CONFIG_BLOCK_RE, '').trimEnd();
  let hasUserQuota = false;
  let hasUserFeatures = false;
  if (withoutToh) {
    try {
      const parsed = parseToml(withoutToh);
      hasUserQuota = Object.hasOwn(parsed, 'project_doc_max_bytes');
      hasUserFeatures = Boolean(parsed.features && typeof parsed.features === 'object');
    } catch {
      const rootSection = withoutToh.split(/^\s*\[/m, 1)[0];
      hasUserQuota = /^\s*project_doc_max_bytes\s*=\s*/m.test(rootSection);
      hasUserFeatures = /^\s*\[features\]\s*$/m.test(withoutToh);
    }
  }
  if (hasUserQuota && hasUserFeatures) {
    await updateManifest(targetDir, { configSha256: null });
    return configPath;
  }

  const block = codexConfigBlock(!hasUserFeatures, !hasUserQuota);
  const next = insertCodexConfigBlock(withoutToh, block, !hasUserQuota);
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
  const installedAgents = await installCodexAgents(targetDir);
  await updateAgentsMd(targetDir, wrappers, language);
  return `${CODEX_SKILLS_DIR}/ (${installed.length}/${wrappers.length} workflows) + ${CODEX_AGENTS_DIR}/ (${installedAgents.length} agents) + AGENTS.md + .codex/config.toml`;
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
  const agentRemovals = [];
  const backupFiles = [];

  for (const [relative, record] of Object.entries(manifest.files || {})) {
    if (!relative.startsWith(`${CODEX_SKILLS_DIR}/`) || !relative.endsWith('/SKILL.md')) continue;
    const filePath = path.join(targetDir, relative);
    if (!(await fileMatchesHash(filePath, record.sha256))) continue;
    skillRemovals.push({ relative, filePath, name: path.basename(path.dirname(filePath)) });
    backupFiles.push(relative);
  }

  for (const [relative, record] of Object.entries(manifest.agents || {})) {
    if (!relative.startsWith(`${CODEX_AGENTS_DIR}/`) || !relative.endsWith('.toml')) continue;
    const filePath = path.join(targetDir, relative);
    if (!(await fileMatchesHash(filePath, record.sha256))) continue;
    agentRemovals.push({ relative, filePath, name: path.basename(filePath, '.toml') });
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
    removedAgents: agentRemovals.map((item) => item.name).sort(),
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

  for (const item of agentRemovals) {
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