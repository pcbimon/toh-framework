/**
 * Native Codex CLI installer surfaces.
 *
 * Shared Toh runtime files stay under .toh/. Codex receives workflow skills in
 * .agents/skills and project-scoped native agents in .codex/agents.
 */

import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { parse as parseToml } from 'smol-toml';
import { renderCapabilitiesSection, seedFileIfAbsent, transformCommand } from './shared.js';
import { probeCodexCapabilitiesCached } from './capability-probe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
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
const MODEL_INTENTS = new Set(['lightweight', 'implementation', 'planning', 'review']);
const READ_ONLY_TOOLS = new Set(['Read', 'Grep', 'Glob', 'Bash']);

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

function agentFileRelativePath(name) {
  return relativePath(CODEX_AGENTS_DIR, `${name}.toml`);
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
  if (MODEL_INTENTS.has(explicit)) return explicit;
  const legacyModel = String(agent.model || '').trim().toLowerCase();
  if (legacyModel === 'haiku') return 'lightweight';
  if (legacyModel === 'opus') return 'planning';
  return 'implementation';
}

async function readManifest(targetDir) {
  const manifestPath = path.join(targetDir, MANIFEST_PATH);
  if (!(await fs.pathExists(manifestPath))) {
    return { generator: SKILL_GENERATOR, version: VERSION, files: {}, agents: {} };
  }
  try {
    const manifest = await fs.readJson(manifestPath);
    if (manifest.generator !== SKILL_GENERATOR || typeof manifest.files !== 'object') {
      return { generator: SKILL_GENERATOR, version: VERSION, files: {}, agents: {} };
    }
    return { agents: {}, ...manifest };
  } catch {
    return { generator: SKILL_GENERATOR, version: VERSION, files: {}, agents: {} };
  }
}

async function writeManifest(targetDir, manifest) {
  const manifestPath = path.join(targetDir, MANIFEST_PATH);
  await fs.ensureDir(path.dirname(manifestPath));
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
}

async function updateManifest(targetDir, changes) {
  const manifest = await readManifest(targetDir);
  await writeManifest(targetDir, { ...manifest, ...changes });
}

async function fileMatchesHash(filePath, expectedHash) {
  if (!expectedHash || !(await fs.pathExists(filePath))) return false;
  try {
    return sha256(await fs.readFile(filePath)) === expectedHash;
  } catch {
    return false;
  }
}

export async function readAgentCatalog(targetDir) {
  const agentsDir = path.join(targetDir, '.toh', 'agents');
  if (!(await fs.pathExists(agentsDir))) return [];
  const files = (await fs.readdir(agentsDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
    .map((entry) => entry.name)
    .sort();
  const agents = [];
  for (const file of files) {
    const sourcePath = path.join(agentsDir, file);
    const { frontmatter, body } = parseFrontmatterDocument(await fs.readFile(sourcePath, 'utf8'), sourcePath);
    const name = String(frontmatter.name || file.replace(/\.md$/, '')).trim();
    if (!SKILL_NAME_RE.test(name)) continue;
    agents.push({
      name,
      description: String(frontmatter.description || `${name} Toh Framework agent`).replace(/\s+/g, ' ').trim().slice(0, 1024),
      body,
      tools: Array.isArray(frontmatter.tools) ? frontmatter.tools.map(String) : [],
      skills: Array.isArray(frontmatter.skills) ? frontmatter.skills.map(String) : [],
      triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers.map(String) : [],
      modelIntent: resolveCodexModelIntent(frontmatter),
      maxTurns: frontmatter.maxTurns
    });
  }
  return agents;
}

function isReadOnlyAgent(agent) {
  return agent.tools.length > 0 && agent.tools.every((tool) => READ_ONLY_TOOLS.has(tool));
}

export function translateAgentToCodex(agent) {
  const routing = CODEX_MODEL_ROUTING[agent.modelIntent] || CODEX_MODEL_ROUTING.implementation;
  const skillRefs = agent.skills.length
    ? `\nAssociated Toh skills:\n${agent.skills.map((skill) => `- .toh/skills/${skill}/SKILL.md`).join('\n')}`
    : '';
  const toolBoundary = agent.tools.length
    ? `\nSource tool boundary: ${agent.tools.join(', ')}. Do not widen it.`
    : '';
  const triggerHints = agent.triggers.length
    ? `\nRouting hints: ${agent.triggers.join('; ')}`
    : '';
  const turnHint = agent.maxTurns === undefined
    ? ''
    : `\nSource turn budget hint: ${agent.maxTurns}.`;
  const instructions = `${agent.body.trim()}\n\n## Codex runtime contract\n- Own only the task and files assigned by the parent.\n- Return Status, Result, Evidence, Files, and Blockers.\n- Run the supplied checkpoint; the parent re-runs it before changing .toh/plan.md.\n- Keep dependent work sequential and return to the parent when complete.${skillRefs}${toolBoundary}${triggerHints}${turnHint}`;
  const content = [
    `# Toh model intent: ${agent.modelIntent}`,
    `name = ${JSON.stringify(agent.name)}`,
    `description = ${JSON.stringify(agent.description)}`,
    `model = ${JSON.stringify(routing.model)}`,
    `model_reasoning_effort = ${JSON.stringify(routing.model_reasoning_effort)}`,
    `sandbox_mode = ${JSON.stringify(isReadOnlyAgent(agent) ? 'read-only' : 'workspace-write')}`,
    `developer_instructions = ${JSON.stringify(instructions.trim())}`,
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
  const commands = [];
  for (const file of files) {
    const sourcePath = path.join(commandsDir, file);
    const raw = await fs.readFile(sourcePath, 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) continue;
    let frontmatter;
    try {
      frontmatter = yaml.load(match[1]) || {};
    } catch (error) {
      throw new Error(`Invalid YAML frontmatter in src/commands/${file}: ${error.message}`);
    }
    const command = String(frontmatter.command || '').trim();
    const skillName = command.replace(/^\//, '');
    if (!SKILL_NAME_RE.test(skillName)) continue;
    commands.push({
      kind: 'command',
      skillName,
      command,
      aliases: Array.isArray(frontmatter.aliases) ? frontmatter.aliases.map(String) : [],
      description: String(frontmatter.description || '').trim(),
      skills: Array.isArray(frontmatter.skills) ? frontmatter.skills.map(String) : [],
      file,
      sourcePath: `.toh/commands/${file}`
    });
  }
  if (commands.length === 0) throw new Error(`No TOH commands found in ${commandsDir} — cannot generate Codex skills.`);
  return commands;
}

export async function readSupportingSkillCatalog(srcDir) {
  const skillsDir = path.join(srcDir, 'skills');
  if (!(await fs.pathExists(skillsDir))) {
    throw new Error(`TOH skill source not found: ${skillsDir} — is this a complete toh-framework package?`);
  }
  const entries = (await fs.readdir(skillsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  const skills = [];
  for (const entry of entries) {
    const file = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!(await fs.pathExists(file))) continue;
    const raw = await fs.readFile(file, 'utf8');
    const frontmatter = raw.startsWith('---') ? parseFrontmatterDocument(raw, file).frontmatter : {};
    const name = String(frontmatter.name || entry.name).trim();
    if (!SKILL_NAME_RE.test(name) || name !== entry.name) continue;
    const heading = raw.match(/^#\s+(.+)$/m)?.[1]?.trim();
    skills.push({
      kind: 'skill',
      skillName: name,
      description: String(frontmatter.description || heading || `${name} supporting skill`).trim(),
      file: relativePath('skills', entry.name, 'SKILL.md'),
      sourcePath: `.toh/skills/${entry.name}/SKILL.md`
    });
  }
  if (skills.length === 0) throw new Error(`No TOH supporting skills found in ${skillsDir} — cannot generate Codex skills.`);
  return skills;
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
    ? `2. Read every supporting skill first:\n${entry.skills.map((skill) => `   - .toh/skills/${skill}/SKILL.md`).join('\n')}\n3. Execute the workflow in this session, in order.`
    : '2. Execute the workflow in this session, in order.';
  return `---\n${wrapperFrontmatter(entry)}\n---\n\n# ${entry.command} - ${entry.description}\n\n> Native Codex CLI skill wrapper for the TOH Framework workflow ${entry.command}.\n> Read the runtime workflow from \`${entry.sourcePath}\`; do not duplicate it here.\n\n## When to use\n\n${entry.description}. Triggers: ${triggers}, or any plain-language request that matches.\n\n## Workflow\n\n1. Read the full workflow definition: \`${entry.sourcePath}\`\n${supporting}\n\n## Codex execution\n\n- Delegate independent plan tasks to the matching \`.codex/agents/<name>.toml\`; keep dependent edits sequential.\n- The parent owns checkpoint verification and updates \`.toh/plan.md\` only after quoting passing output.\n- Codex has no Toh Stop hook; resume from the first unchecked task when a session ends.\n- Agent TOML files own model and reasoning routing; do not reinterpret Claude model names.\n`;
}

async function readWrapperCatalog(srcDir) {
  const commands = await readCommandCatalog(srcDir);
  const names = new Set();
  for (const command of commands) {
    if (names.has(command.skillName)) throw new Error(`Duplicate Codex skill name: ${command.skillName}`);
    names.add(command.skillName);
  }
  return commands;
}

export async function installCodexSkills(targetDir, srcDir) {
  const entries = await readWrapperCatalog(srcDir);
  const previous = await readManifest(targetDir);
  const nextFiles = Object.fromEntries(
    Object.entries(previous.files || {}).filter(([, record]) => record.kind && record.kind !== 'command')
  );
  const wanted = new Set(entries.map((entry) => skillFileRelativePath(entry.skillName)));
  const root = path.join(targetDir, CODEX_SKILLS_DIR);
  await fs.ensureDir(root);

  for (const [relative, record] of Object.entries(previous.files || {})) {
    if (!relative.startsWith(`${CODEX_SKILLS_DIR}/`) || wanted.has(relative) || (record.kind && record.kind !== 'command')) continue;
    const filePath = path.join(targetDir, relative);
    if (await fileMatchesHash(filePath, record.sha256)) {
      await fs.remove(filePath);
      const parent = path.dirname(filePath);
      if ((await fs.readdir(parent)).length === 0) await fs.remove(parent);
    }
  }

  const installed = [];
  for (const entry of entries) {
    const relative = skillFileRelativePath(entry.skillName);
    const filePath = path.join(targetDir, relative);
    const content = renderCommandWrapper(entry);
    const existingRecord = previous.files?.[relative];
    const canReplace = !(await fs.pathExists(filePath)) || await fileMatchesHash(filePath, existingRecord?.sha256);
    if (!canReplace) continue;
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
    nextFiles[relative] = { sha256: sha256(content), kind: entry.kind, source: entry.sourcePath };
    installed.push(entry.skillName);
  }
  await writeManifest(targetDir, { ...previous, files: nextFiles, version: VERSION });
  return installed;
}

export async function installCodexAgents(targetDir) {
  const agentsDir = path.join(targetDir, '.toh', 'agents');
  if (!(await fs.pathExists(agentsDir))) return [];
  const agents = await readAgentCatalog(targetDir);
  const previous = await readManifest(targetDir);
  const previousAgents = previous.agents || {};
  const nextAgents = {};
  const wanted = new Set(agents.map((agent) => agentFileRelativePath(agent.name)));
  const root = path.join(targetDir, CODEX_AGENTS_DIR);
  await fs.ensureDir(root);

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
    const canReplace = !(await fs.pathExists(filePath)) || await fileMatchesHash(filePath, existingRecord?.sha256);
    if (!canReplace) {
      if (existingRecord) nextAgents[relative] = existingRecord;
      continue;
    }
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
    nextAgents[relative] = { sha256: sha256(content), source: `.toh/agents/${agent.name}.md`, modelIntent: agent.modelIntent };
    installed.push(agent.name);
  }
  await writeManifest(targetDir, { ...previous, agents: nextAgents, version: VERSION });
  return installed;
}

function agentRoster(srcDir) {
  const agentsDir = path.join(srcDir, 'agents');
  return fs.pathExists(agentsDir).then(async (exists) => {
    if (!exists) return '';
    const rows = [];
    for (const file of (await fs.readdir(agentsDir)).sort()) {
      if (!file.endsWith('.md') || file === 'README.md') continue;
      const source = path.join(agentsDir, file);
      const { frontmatter } = parseFrontmatterDocument(await fs.readFile(source, 'utf8'), source);
      const name = frontmatter.name || file.replace(/\.md$/, '');
      const description = String(frontmatter.description || '').replace(/\s+/g, ' ').trim();
      const role = description.match(/^(.*?)\.(?:\s|$)/)?.[1] || description;
      rows.push(`| \`${name}\` | ${frontmatter.model || 'sonnet'} | ${role} |`);
    }
    return ['| Agent | Model | Role |', '|-------|-------|------|', ...rows].join('\n');
  });
}

function renderSkillTable(entries) {
  return [
    '| Skill | Use it to |',
    '|-------|-----------|',
    ...entries.map((entry) => `| \`$${entry.skillName}\` | ${entry.description} |`)
  ].join('\n');
}

function runtimeIdentity(ide, probedSubagents) {
  const name = ide === 'zcode' ? 'ZCode' : 'Codex CLI';
  const capabilities = probedSubagents
    ? 'Native subagents are available per the installed Codex feature probe; delegate independent work and keep dependent work sequential.'
    : ide === 'zcode'
      ? 'Native subagents are not verified for this runtime; execute the TOH LOOP sequentially.'
      : 'Native Codex CLI subagents and workflows are available; delegate independent work and keep dependent work sequential.';
  return `Runtime Identity: you are running in ${name}. ${capabilities} Implement -> run the story checkpoint -> quote actual output -> fix if red (max 5 tries, 3 consecutive failures = mark BLOCKED and move on) -> tick the checkbox -> next story without asking. Interrupted runs resume from the first unchecked task in .toh/plan.md unless the plan has terminal status. Close every stage with Status/Result/Evidence/exactly 3 next actions.`;
}

function generateAgentsBlock(entries, language, ide, roster, probedSubagents) {
  const thai = language === 'th';
  const isCodex = ide === 'codex';
  const title = thai
    ? `คุณคือ **Toh Framework Agent** ที่รันอยู่บน ${isCodex ? 'Codex CLI' : 'ZCode'} - ช่วย Solo Developer สร้าง SaaS จนจบ`
    : `You are the **Toh Framework Agent** running in ${isCodex ? 'Codex CLI' : 'ZCode'}, helping solo developers build SaaS systems by themselves.`;
  const state = thai
    ? '- `.toh/plan.md` + `.toh/progress.md` - แผนคือไฟล์และใช้ resume จาก task แรกที่ยังไม่ติ๊ก\n- `.toh/memory/` - memory 7 ไฟล์'
    : '- `.toh/plan.md` + `.toh/progress.md` - the plan is a file; resume from the first unchecked task\n- `.toh/memory/` - 7-file memory';
  const commandNote = isCodex
    ? '- Invoke a workflow with `$<skill>` or browse with `/skills`.\n- Native project agents live in `.codex/agents/*.toml` and define model, reasoning, and sandbox.\n- If the user types `/toh-*`, interpret it as a backward-compatible plain-text request, not a native slash command.'
    : '- The same 14 workflows are available from `.agents/commands/` and `.agents/skills/`.\n- ZCode subagent support is deliberately not claimed until it is verified live.';
  return `${AGENTS_BLOCK_START}
# Toh Framework

> **"Type Once, Have it all!"** - AI-Orchestration Driven Development

## Project Memory

This file serves as project memory for ${isCodex ? 'Codex CLI' : 'ZCode'}. It contains the Toh Framework configuration and agent definitions.

This file is a compact index. Full specs live on disk and MUST be read at runtime:
- Commands -> \`.toh/commands/toh-<cmd>.md\`
- Agents -> \`.toh/agents/<name>.md\`
- Skills -> \`.toh/skills/<skill-name>/SKILL.md\`

## Identity

${title}

${renderCapabilitiesSection(ide)}

${runtimeIdentity(ide, probedSubagents)}

## Using TOH

${isCodex ? 'TOH provides native workflow skills and native custom agents:' : 'TOH uses shared open project surfaces:'}

${renderSkillTable(entries)}

${commandNote}

## TOH runtime and state

${state}
- \`.toh/skills/\` - \`.toh/commands/\` - \`.toh/capabilities.json\`

${isCodex && roster ? `## Native project agents\n\n${roster}\n` : ''}
## TOH execution contract

- Start with the first unchecked task in \`.toh/plan.md\`.
- Delegate only genuinely independent work on disjoint files.
- The parent re-runs each checkpoint before ticking a task.
- Results include Status, Result, Evidence, Files, and Blockers.

${AGENTS_BLOCK_END}`;
}

export function assertAgentsMdSize(content) {
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > AGENTS_MAX_BYTES) throw new Error(`AGENTS.md is ${bytes} bytes; Codex limit is ${AGENTS_MAX_BYTES} bytes.`);
}

async function buildAgentsBlock(srcDir, language, ide, options) {
  const entries = await readWrapperCatalog(srcDir);
  const roster = await agentRoster(srcDir);
  let probedSubagents = false;
  if (ide === 'codex' && options.allowProbedSubagents === true) {
    const probe = await probeCodexCapabilitiesCached();
    probedSubagents = probe.ok === true && probe.overrides?.subagents === 'native';
  }
  return transformCommand(generateAgentsBlock(entries, language, ide, roster, probedSubagents), ide);
}

export async function writeAgentsMd(targetDir, srcDir, language = 'en', ide = 'codex', options = {}) {
  const block = await buildAgentsBlock(srcDir, language, ide, options);
  if (Buffer.byteLength(block, 'utf8') > AGENTS_MAX_BYTES) {
    const error = new Error(`Generated AGENTS.md TOH block exceeds the ${AGENTS_MAX_BYTES}-byte Codex limit.`);
    error.fatal = true;
    throw error;
  }
  const agentsPath = path.join(targetDir, 'AGENTS.md');
  const existing = await fs.pathExists(agentsPath) ? await fs.readFile(agentsPath, 'utf8') : '';
  const stripped = existing.replace(AGENTS_BLOCK_RE, '').trimEnd();
  const next = stripped ? `${stripped}\n\n${block}\n` : `${block}\n`;
  assertAgentsMdSize(next);
  await fs.writeFile(agentsPath, next);
  await updateManifest(targetDir, { agentsBlockSha256: sha256(block) });
  return Buffer.byteLength(block, 'utf8');
}

export async function updateAgentsMd(targetDir, entries, language = 'en', ide = 'codex', options = {}) {
  let probedSubagents = false;
  if (ide === 'codex' && options.allowProbedSubagents === true) {
    const probe = await probeCodexCapabilitiesCached();
    probedSubagents = probe.ok === true && probe.overrides?.subagents === 'native';
  }
  const block = transformCommand(generateAgentsBlock(entries, language, ide, '', probedSubagents), ide);
  const agentsPath = path.join(targetDir, 'AGENTS.md');
  const existing = await fs.pathExists(agentsPath) ? await fs.readFile(agentsPath, 'utf8') : '';
  const stripped = existing.replace(AGENTS_BLOCK_RE, '').trimEnd();
  const next = stripped ? `${stripped}\n\n${block}\n` : `${block}\n`;
  assertAgentsMdSize(next);
  await fs.writeFile(agentsPath, next);
  await updateManifest(targetDir, { agentsBlockSha256: sha256(block) });
  return agentsPath;
}

function configBlock(addFeatures, addQuota) {
  const lines = [CONFIG_BLOCK_START, '# Generated by Toh Framework for Codex CLI.'];
  if (addQuota) lines.push(`project_doc_max_bytes = ${CODEX_PROJECT_DOC_MAX_BYTES}`);
  if (addFeatures) lines.push('[features]', 'multi_agent = true');
  lines.push(CONFIG_BLOCK_END);
  return `${lines.join('\n')}\n`;
}

function insertConfig(content, block, needsRootQuota) {
  if (!content) return block;
  if (!needsRootQuota) return `${content}\n${block}`;
  const firstTable = content.search(/^\s*\[/m);
  if (firstTable < 0) return `${content}\n${block}`;
  return `${content.slice(0, firstTable).trimEnd()}\n\n${block}${content.slice(firstTable)}`;
}

export async function setupCodexConfig(targetDir) {
  const configPath = path.join(targetDir, '.codex', 'config.toml');
  const existing = await fs.pathExists(configPath) ? await fs.readFile(configPath, 'utf8') : '';
  const withoutToh = existing.replace(CONFIG_BLOCK_RE, '').trimEnd();
  let hasQuota = false;
  let hasFeatures = false;
  if (withoutToh) {
    try {
      const parsed = parseToml(withoutToh);
      hasQuota = Object.hasOwn(parsed, 'project_doc_max_bytes');
      hasFeatures = Boolean(parsed.features && typeof parsed.features === 'object');
    } catch {
      const root = withoutToh.split(/^\s*\[/m, 1)[0];
      hasQuota = /^\s*project_doc_max_bytes\s*=\s*/m.test(root);
      hasFeatures = /^\s*\[features\]\s*$/m.test(withoutToh);
    }
  }
  if (hasQuota && hasFeatures) {
    await updateManifest(targetDir, { configSha256: null });
    return configPath;
  }
  const block = configBlock(!hasFeatures, !hasQuota);
  const next = insertConfig(withoutToh, block, !hasQuota);
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeFile(configPath, next);
  await updateManifest(targetDir, { configSha256: sha256(next) });
  return configPath;
}

export async function ensureTohRuntime(targetDir) {
  const memoryDir = path.join(targetDir, '.toh', 'memory');
  await fs.ensureDir(path.join(memoryDir, 'archive'));
  const today = new Date().toISOString().split('T')[0];
  const seeds = {
    'active.md': '# Active Task\n\n[No active task - Waiting for user command]\n',
    'summary.md': '# Project Summary\n\n[No project summary yet]\n',
    'decisions.md': `# Key Decisions\n\n| Date | Decision | Reason |\n|------|----------|--------|\n| ${today} | Use Toh Framework v${VERSION} | AI-Orchestration Driven Development |\n`,
    'changelog.md': `# Session Changelog\n\n## Current Session - ${today}\n`,
    'agents-log.md': '# Agents Activity Log\n\n',
    'architecture.md': '# Code Architecture\n\n',
    'components.md': '# Component Registry\n\n'
  };
  for (const [file, content] of Object.entries(seeds)) {
    await seedFileIfAbsent(path.join(memoryDir, file), content);
  }
  await seedFileIfAbsent(path.join(targetDir, '.toh', 'plan.md'), `# Plan: (no active plan yet)\nStatus: draft\nCreated: ${today} by toh-framework installer\n`);
  await seedFileIfAbsent(path.join(targetDir, '.toh', 'progress.md'), '# Progress Ledger\n\n');
}

export async function setupCodex(targetDir, srcDir, language = 'en', options = {}) {
  await ensureTohRuntime(targetDir);
  const entries = await readWrapperCatalog(srcDir);
  await setupCodexConfig(targetDir);
  const installed = await installCodexSkills(targetDir, srcDir);
  const installedAgents = await installCodexAgents(targetDir);
  await writeAgentsMd(targetDir, srcDir, language, 'codex', options);
  return `${CODEX_SKILLS_DIR}/ (${installed.length}/${entries.length} workflows) + ${CODEX_AGENTS_DIR}/ (${installedAgents.length} agents) + AGENTS.md + .codex/config.toml`;
}

async function backupFiles(targetDir, files) {
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
  const backupPaths = [];

  for (const [relative, record] of Object.entries(manifest.files || {})) {
    if (!relative.startsWith(`${CODEX_SKILLS_DIR}/`) || !relative.endsWith('/SKILL.md')) continue;
    const filePath = path.join(targetDir, relative);
    if (await fileMatchesHash(filePath, record.sha256)) {
      skillRemovals.push({ filePath, name: path.basename(path.dirname(filePath)) });
      backupPaths.push(relative);
    }
  }
  for (const [relative, record] of Object.entries(manifest.agents || {})) {
    if (!relative.startsWith(`${CODEX_AGENTS_DIR}/`) || !relative.endsWith('.toml')) continue;
    const filePath = path.join(targetDir, relative);
    if (await fileMatchesHash(filePath, record.sha256)) {
      agentRemovals.push({ filePath, name: path.basename(filePath, '.toml') });
      backupPaths.push(relative);
    }
  }

  let agentsMd = 'absent';
  const agentsPath = path.join(targetDir, 'AGENTS.md');
  if (manifest.agentsBlockSha256 && await fs.pathExists(agentsPath)) {
    const existing = await fs.readFile(agentsPath, 'utf8');
    const match = existing.match(/<!-- TOH-FRAMEWORK-START -->[\s\S]*?<!-- TOH-FRAMEWORK-END -->/);
    if (match && sha256(match[0]) === manifest.agentsBlockSha256) {
      agentsMd = existing.replace(AGENTS_BLOCK_RE, '').trim() ? 'updated' : 'removed';
      backupPaths.push('AGENTS.md');
    }
  }

  let config = 'absent';
  const configPath = path.join(targetDir, '.codex', 'config.toml');
  if (manifest.configSha256 && await fileMatchesHash(configPath, manifest.configSha256)) {
    const existing = await fs.readFile(configPath, 'utf8');
    config = existing.replace(CONFIG_BLOCK_RE, '').trim() ? 'updated' : 'removed';
    backupPaths.push(path.relative(targetDir, configPath));
  }

  const result = {
    removedSkills: skillRemovals.map((item) => item.name).sort(),
    removedAgents: agentRemovals.map((item) => item.name).sort(),
    agentsMd,
    config,
    dryRun,
    backupPath: null
  };
  if (dryRun) return result;
  if (backup) result.backupPath = await backupFiles(targetDir, [...new Set(backupPaths)]);

  for (const item of [...skillRemovals, ...agentRemovals]) {
    await fs.remove(item.filePath);
    const parent = path.dirname(item.filePath);
    if ((await fs.readdir(parent)).length === 0) await fs.remove(parent);
  }
  if (agentsMd !== 'absent') {
    const stripped = (await fs.readFile(agentsPath, 'utf8')).replace(AGENTS_BLOCK_RE, '').trim();
    if (stripped) await fs.writeFile(agentsPath, `${stripped}\n`);
    else await fs.remove(agentsPath);
  }
  if (config !== 'absent') {
    const stripped = (await fs.readFile(configPath, 'utf8')).replace(CONFIG_BLOCK_RE, '').trim();
    if (stripped) await fs.writeFile(configPath, `${stripped}\n`);
    else await fs.remove(configPath);
  }
  const manifestPath = path.join(targetDir, MANIFEST_PATH);
  if (await fs.pathExists(manifestPath)) await fs.remove(manifestPath);
  return result;
}
