/**
 * Shared installer utilities (v2.0.0)
 *
 * Single source of truth for:
 *   1. CAPABILITY_PROFILES        - per-IDE capability declaration
 *   2. transformCommand()         - <!-- tfw:claude --> / <!-- tfw:fallback --> marker transform
 *   3. writeCapabilitiesJson()    - machine-readable .toh/capabilities.json
 *   4. renderCapabilitiesSection()- '## Runtime Identity & Capabilities' markdown block
 *
 * NOTE: this package is "type": "module" — ESM named exports (a default export
 * object is also provided for `import shared from './shared.js'` callers).
 */

import fs from 'fs-extra';
import yaml from 'js-yaml';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
const VERSION = pkg.version;

// ============================================================
// 1. Capability profiles (per IDE)
// ============================================================
// subagents: 'native' | 'file-based' | 'none'
// teams:     'env-gated' | false   (env CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS)
// goal:      'version-gated' | false (Claude Code >= 2.1.139)
// workflows: 'version-gated' | false (Claude Code >= 2.1.154, can be plan-disabled)
export const CAPABILITY_PROFILES = {
  'claude-code': {
    ide: 'claude-code',
    subagents: 'native',
    teams: 'env-gated',
    goal: 'version-gated',
    loop: true,
    hooks: true,
    workflows: 'version-gated',
    parallel: true,
    modelRouting: true
  },
  cursor: {
    ide: 'cursor',
    // v2.1 (W4): Cursor 2.4 has native subagents (.cursor/agents/*.md; on dual
    // installs it also auto-loads .claude/agents/*.md — same Toh agents).
    // parallel stays false: the TOH LOOP prose is written for one task at a
    // time; delegation is allowed, parallel fan-out is not promised.
    subagents: 'native',
    teams: false,
    goal: false,
    loop: false,
    hooks: false,
    workflows: false,
    parallel: false,
    modelRouting: false
  },
  codex: {
    ide: 'codex',
    subagents: 'none',
    teams: false,
    goal: false,
    loop: false,
    hooks: false,
    workflows: false,
    parallel: false,
    modelRouting: false
  },
  'gemini-cli': {
    ide: 'gemini-cli',
    subagents: 'none',
    teams: false,
    goal: false,
    loop: false,
    hooks: false,
    workflows: false,
    parallel: false,
    modelRouting: false
  },
  antigravity: {
    ide: 'antigravity',
    // v2.1 (W2): Antigravity (agy CLI + IDE 2.x) reads workspace .agents/:
    // file-based subagents (.agents/agents/<name>.md with subagent: true,
    // invoked via invoke_subagent), hooks (.agents/hooks.json, incl. Stop),
    // and /toh-* workflows (.agents/workflows/, legacy mirror .agent/workflows/).
    // VERIFY-LIVE (v2.1): workflows-loading by the agy CLI is a documented
    // unknown — if live verification shows .agents/workflows is not loaded,
    // fold workflows into skills (owner decision D7) and flip this to false.
    subagents: 'file-based',
    teams: false,
    goal: false,
    loop: false,
    hooks: true,
    workflows: true,
    parallel: false,
    modelRouting: false
  },
  zcode: {
    ide: 'zcode',
    // v2.1: ZCode (Z.ai, GLM) reads the SAME two open surfaces we already write —
    // workspace AGENTS.md as project memory, and project-scoped `.agents/skills/`.
    // VERIFIED LIVE against ZCode CLI 0.16.3 on macOS:
    //   `zcode skills list --cwd <project> --json`
    //     -> 37 entries, "scope":"project", "source":"agents",
    //        "rootPath":"<project>/.agents/skills", 0 diagnostics
    //   `zcode commands list --cwd <project> --json`
    //     -> "scope":"project", "source":"agents",
    //        "rootPath":"<project>/.agents/commands"
    // So unlike Codex, ZCode DOES take project slash commands — hence commands: true.
    // subagents/hooks stay false: ZCode ships `/expert` and a plugin system, but
    // neither was verified to load OUR files, and an unverified YES would make the
    // model promise delegation it cannot perform. Raise only after a live check.
    subagents: 'none',
    teams: false,
    goal: false,
    loop: false,
    hooks: false,
    workflows: false,
    commands: true,
    parallel: false,
    modelRouting: false
  }
};

// Human-facing metadata used by renderCapabilitiesSection()
const IDE_DISPLAY = {
  'claude-code': { name: 'Claude Code', contextFile: 'CLAUDE.md' },
  cursor: { name: 'Cursor', contextFile: '.cursor/rules/toh-framework.mdc' },
  codex: { name: 'Codex CLI', contextFile: 'AGENTS.md' },
  'gemini-cli': { name: 'Gemini CLI', contextFile: 'GEMINI.md' },
  antigravity: { name: 'Google Antigravity (agy CLI + IDE)', contextFile: '.agents/rules/toh-framework.md' },
  zcode: { name: 'ZCode (Z.ai)', contextFile: 'AGENTS.md' }
};

/**
 * Normalize the many aliases the installer accepts (claude, gemini, codex-cli, ...)
 * to the canonical profile keys above.
 */
function normalizeIde(ide) {
  const key = String(ide || '').toLowerCase().trim();
  const aliases = {
    claude: 'claude-code',
    'claude-code': 'claude-code',
    cursor: 'cursor',
    codex: 'codex',
    'codex-cli': 'codex',
    gemini: 'gemini-cli',
    'gemini-cli': 'gemini-cli',
    antigravity: 'antigravity',
    agy: 'antigravity',
    zcode: 'zcode',
    'z-code': 'zcode',
    zai: 'zcode',
    'z.ai': 'zcode'
  };
  return aliases[key] || key;
}

// ============================================================
// 2. Marker transform (single-source commands -> per-IDE variants)
// ============================================================
// Source command files carry per-IDE divergence in HTML-comment blocks:
//   <!-- tfw:claude -->  ...Claude Code-only instructions...  <!-- /tfw:claude -->
//   <!-- tfw:fallback --> ...universal prose loop...          <!-- /tfw:fallback -->
//
// ide === 'claude-code' : UNWRAP tfw:claude (keep content, drop markers),
//                         REMOVE tfw:fallback blocks entirely.
// any other ide
// (incl. 'universal')   : REMOVE tfw:claude blocks entirely,
//                         UNWRAP tfw:fallback blocks.
// Always strips every remaining tfw marker comment line.
// Idempotent: running it on already-transformed content is a no-op.

function blockRegex(tag) {
  return new RegExp(
    '[ \\t]*<!--\\s*tfw:' + tag + '\\s*-->[ \\t]*\\r?\\n?' + // open marker (own line)
    '([\\s\\S]*?)' +                                          // block content
    '[ \\t]*<!--\\s*\\/tfw:' + tag + '\\s*-->[ \\t]*\\r?\\n?',// close marker (own line)
    'g'
  );
}

export function transformCommand(content, ide) {
  if (typeof content !== 'string') return content;
  const isClaude = normalizeIde(ide) === 'claude-code';

  const keepTag = isClaude ? 'claude' : 'fallback';
  const dropTag = isClaude ? 'fallback' : 'claude';

  let out = content;
  // Unwrap the kept block: keep inner content, drop the marker lines
  out = out.replace(blockRegex(keepTag), '$1');
  // Remove the dropped block entirely (markers + content)
  out = out.replace(blockRegex(dropTag), '');
  // Defensive: strip any stray/unbalanced tfw marker comment lines
  out = out.replace(/^[ \t]*<!--\s*\/?tfw:[a-z-]+\s*-->[ \t]*\r?\n?/gm, '');

  return out;
}

// ============================================================
// 3. .toh/capabilities.json
// ============================================================

/**
 * Write <targetDir>/.toh/capabilities.json for the selected IDEs.
 * Additive across reinstalls: previously declared IDEs are kept (union),
 * so installing Claude Code first and Cursor later declares both.
 * The file itself is machine-owned — profiles are always regenerated.
 */
export async function writeCapabilitiesJson(targetDir, ides) {
  const tohDir = join(targetDir, '.toh');
  const filePath = join(tohDir, 'capabilities.json');
  await fs.ensureDir(tohDir);

  // Normalize selection.
  // v2.1 (W2/D1): 'gemini' no longer implies Antigravity — Gemini CLI is a
  // separate legacy/Enterprise surface behind --legacy-gemini; Antigravity
  // (agy CLI + IDE) is its own first-class target on .agents/ paths.
  const selected = new Set();
  for (const ide of ides || []) {
    const key = normalizeIde(ide);
    if (CAPABILITY_PROFILES[key]) selected.add(key);
  }

  // Union with a previous install (additive, never drop a declared runtime).
  if (await fs.pathExists(filePath)) {
    try {
      const existing = await fs.readJson(filePath);
      for (const ide of existing.ides || []) {
        const key = normalizeIde(ide);
        if (CAPABILITY_PROFILES[key]) selected.add(key);
      }
    } catch {
      // Machine-owned file is corrupt -> regenerate from scratch (self-healing).
    }
  }

  const ideList = [...selected].sort();
  const profiles = {};
  for (const key of ideList) profiles[key] = CAPABILITY_PROFILES[key];

  const payload = {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    ides: ideList,
    profiles,
    gates: {
      teams: 'Claude Code only — requires env CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS',
      goal: 'Claude Code >= 2.1.139',
      workflows: 'Claude Code >= 2.1.154 (can be plan-disabled)'
    }
  };

  await fs.writeJson(filePath, payload, { spaces: 2 });
  return filePath;
}

// ============================================================
// 4. Runtime Identity & Capabilities markdown block
// ============================================================

const SURVEY_LINE =
  '**Survey rule:** confirm via `.toh/capabilities.json`; teams only if env `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set.';

/**
 * Returns the '## Runtime Identity & Capabilities' markdown block that each
 * IDE handler injects into its context file (CLAUDE.md / .cursor rule /
 * AGENTS.md / GEMINI.md).
 */
export function renderCapabilitiesSection(ide) {
  const key = normalizeIde(ide);
  const profile = CAPABILITY_PROFILES[key];
  const display = IDE_DISPLAY[key] || { name: key || 'unknown runtime', contextFile: 'this context file' };

  // Unknown IDE -> conservative sequential profile
  const p = profile || {
    ide: key, subagents: 'none', teams: false, goal: false,
    loop: false, hooks: false, workflows: false, parallel: false, modelRouting: false
  };

  const identity =
    `**Runtime:** ${display.name} — declared by this file (\`${display.contextFile}\`). ` +
    'Never guess your runtime; it is stated here.';

  const lines = [];
  if (p.subagents === 'native') {
    // Claude Code keeps its original wording (Task tool); Cursor's native
    // subagents live in .cursor/agents/ and have no Task tool.
    lines.push(key === 'cursor'
      ? '- Native subagents: YES — delegate to the Toh specialists in `.cursor/agents/*.md` (fall back to sequential execution in this session when delegation is unavailable)'
      : '- Native subagents: YES — delegate via the Agent tool (Task) (parallel only for independent tasks on disjoint files, max 4 concurrent)');
  } else if (p.subagents === 'file-based') {
    lines.push('- Native subagents: file-based — `.agents/agents/<name>.md` (`subagent: true`), delegate via `invoke_subagent`; fall back to sequential execution in this session when delegation is unavailable');
  } else {
    lines.push('- Native subagents: NO — single-session only');
  }
  lines.push(p.teams === 'env-gated'
    ? '- Agent Teams: env-gated — ONLY if `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set'
    : '- Agent Teams: NO');
  lines.push(p.goal === 'version-gated'
    ? '- `/goal`: version-gated (Claude Code >= 2.1.139)'
    : '- `/goal`: NO');
  lines.push(p.loop
    ? '- `/loop`: YES — heartbeat prompt in `.claude/loop.md`'
    : '- `/loop`: NO');
  if (p.hooks) {
    lines.push(key === 'antigravity'
      ? '- Hooks: YES — deterministic Stop hook in `.agents/hooks.json` blocks ending while `.toh/plan.md` still has unchecked `- [ ]` tasks'
      : '- Hooks: YES — Stop hook in `.claude/settings.json` enforces THE TOH LOOP');
  } else {
    lines.push('- Hooks: NO');
  }
  if (p.workflows === 'version-gated') {
    lines.push('- Workflows: version-gated (Claude Code >= 2.1.154)');
  } else if (p.workflows === true) {
    lines.push('- Workflows: YES — `/toh-*` workflows in `.agents/workflows/` (legacy mirror: `.agent/workflows/`)');
  } else {
    lines.push('- Workflows: NO');
  }
  // Only runtimes that actually load project slash commands get this line, so
  // the AGENTS.md/rules text of every other IDE is byte-for-byte unchanged.
  if (p.commands) {
    lines.push('- Slash commands: YES — `/toh-*` load natively from `.agents/commands/` (the same 14 commands also exist as skills)');
  }
  lines.push(p.modelRouting
    ? '- Model routing: YES — haiku = scaffold/tests · sonnet = builders · opus = planning/QC'
    : '- Model routing: NO — ignore model tiers and proceed');
  if (!p.parallel) {
    lines.push(p.subagents === 'none'
      ? '- Execution mode: run THE TOH LOOP **sequentially in this session** (orchestration-protocol skill); recovery = checkbox-resume from `.toh/plan.md`'
      : '- Execution mode: run THE TOH LOOP **one task at a time** (orchestration-protocol skill) — delegation is allowed, parallel fan-out is not; recovery = checkbox-resume from `.toh/plan.md`');
  }

  return `## Runtime Identity & Capabilities

${identity}

${lines.join('\n')}

${SURVEY_LINE}`;
}

// ============================================================
// 5. Shared .agents/skills writer (v2.1 — W2 + W3, ONE writer for three tools)
// ============================================================
// Codex (repo-level skills), Cursor 2.4 (.agents/skills per the agentskills.io
// standard), and Antigravity agy CLI + IDE (workspace skills) all natively
// discover Agent Skills from <project>/.agents/skills/<name>/SKILL.md.
//
// This is the ONLY .agents/skills writer in the installer — install.js calls
// it after the .toh copy, and antigravity-cli.js calls it again for
// standalone safety (idempotent: same inputs produce the same files).
//
// It generates:
//   (a) 23 thin framework-skill wrappers — compliant frontmatter (name +
//       terse third-person description copied from the source skill) whose
//       body points at .toh/skills/<name>/SKILL.md, the cross-IDE source of
//       truth. Wrappers, not verbatim copies: source SKILL.md formats vary,
//       and Codex shares an 8,000-char name+description listing budget.
//   (b) 14 toh-* command skills converted from src/gemini-commands TOML
//       prompts (skills auto-become /toh-vibe etc. slash commands in agy —
//       the /toh:vibe colon namespace cannot survive as a skill name):
//       {{args}} -> "the user's request following the command",
//       @{...} includes -> plain 'Read .agents/skills/<skill>/SKILL.md'
//       lines, /toh:<cmd> -> /toh-<cmd>. Command skills carry
//       disable-model-invocation: true (explicit invocation — on Cursor this
//       surfaces them in the native '/' menu without implicit matching).

/** Split "---\n<yaml>\n---\n<body>" — returns { fm: object|null, body: string }. */
function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: null, body: raw };
  try {
    return { fm: yaml.load(m[1]) || {}, body: m[2] };
  } catch {
    return { fm: null, body: raw };
  }
}

/**
 * Cap a wrapper description at 300 chars (prefer a sentence boundary).
 * Codex shares one 8,000-char name+description listing budget across ALL
 * skills in .agents/skills — verbatim source descriptions (some >800 chars)
 * blow it; the full text still ships in .toh/skills, which the wrapper reads.
 */
function terseDescription(text) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  if (t.length <= 300) return t;
  const cut = t.slice(0, 300);
  const sentence = cut.match(/^[\s\S]*[.!?](?=\s)/);
  if (sentence && sentence[0].length >= 60) return sentence[0].trim();
  return `${cut.slice(0, 297).trimEnd()}...`;
}

/** Terse one-paragraph fallback description from a SKILL.md body. */
function fallbackDescription(body, name) {
  const para = (body || '')
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/^#+\s*/gm, '').replace(/[*_`>]/g, '').trim())
    .find((p) => p.length > 0);
  return terseDescription(para || `Toh Framework skill: ${name}.`);
}

/**
 * Write the shared .agents/skills/ surface for the selected non-Claude
 * runtimes. Returns { dir, skillWrappers, commandSkills }.
 */
export async function writeAgentsSkills(targetDir, srcDir) {
  const outDir = join(targetDir, '.agents', 'skills');
  await fs.ensureDir(outDir);
  let skillWrappers = 0;
  let commandSkills = 0;

  // ---- (a) thin wrappers for the framework skills --------------------
  const skillsSrc = join(srcDir, 'skills');
  if (await fs.pathExists(skillsSrc)) {
    const entries = await fs.readdir(skillsSrc, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = join(skillsSrc, entry.name, 'SKILL.md');
      if (!(await fs.pathExists(skillPath))) continue;

      const raw = await fs.readFile(skillPath, 'utf8');
      const { fm, body } = splitFrontmatter(raw);
      const name = (fm && fm.name) || entry.name;
      const description =
        (fm && typeof fm.description === 'string' && fm.description.trim())
          ? terseDescription(fm.description)
          : fallbackDescription(body, name);

      const wrapperFm = { name, description };
      // Internal skills stay off the user-facing /command surface.
      if (fm && fm['user-invocable'] === false) wrapperFm['user-invocable'] = false;

      const fmYaml = yaml.dump(wrapperFm, { lineWidth: -1, noRefs: true }).trimEnd();
      const wrapperBody =
        `Read \`.toh/skills/${entry.name}/SKILL.md\` and follow it exactly.\n\n` +
        `That file is the full skill — the cross-IDE source of truth installed by ` +
        `Toh Framework v${VERSION}. This entry is a generated pointer so this runtime ` +
        `can discover the skill natively; never edit either copy by hand (re-run the installer instead).\n`;

      await fs.ensureDir(join(outDir, entry.name));
      await fs.writeFile(join(outDir, entry.name, 'SKILL.md'), `---\n${fmYaml}\n---\n\n${wrapperBody}`);
      skillWrappers++;
    }
  }

  // ---- (b) toh-* command skills converted from the TOML prompts ------
  for (const { file, name } of await collectCommandTomls(srcDir)) {
    const parsed = await renderCommandPrompt(file, 'writeAgentsSkills');
    const description = parsed.description;
    // A skill is invoked by name, not by a slash command with arguments, so
    // {{args}} has no value to bind to — commands keep the placeholder, skills
    // must not (an unbound {{args}} reads as literal text to the model).
    const body = parsed.body.replace(/\{\{args\}\}/g, "the user's request following the command");

    const fmYaml = yaml
      .dump(
        { name, description, 'disable-model-invocation': true },
        { lineWidth: -1, noRefs: true }
      )
      .trimEnd();

    await fs.ensureDir(join(outDir, name));
    await fs.writeFile(join(outDir, name, 'SKILL.md'), `---\n${fmYaml}\n---\n\n${body}\n`);
    commandSkills++;
  }

  return { dir: outDir, skillWrappers, commandSkills };
}

/**
 * Enumerate the 14 command prompts in src/gemini-commands/ (root toh.toml plus
 * the toh/ namespace). This TOML set is the single conversion source for every
 * non-Claude command surface — keep it in sync with src/commands/*.md.
 */
async function collectCommandTomls(srcDir) {
  const sources = [];
  const rootToml = join(srcDir, 'gemini-commands', 'toh.toml');
  if (await fs.pathExists(rootToml)) sources.push({ file: rootToml, name: 'toh' });
  const namespacedDir = join(srcDir, 'gemini-commands', 'toh');
  if (await fs.pathExists(namespacedDir)) {
    for (const f of (await fs.readdir(namespacedDir)).sort()) {
      if (f.endsWith('.toml')) {
        sources.push({ file: join(namespacedDir, f), name: `toh-${f.replace(/\.toml$/, '')}` });
      }
    }
  }
  return sources;
}

/**
 * Parse one command TOML and rewrite its prompt for the shared `.agents/`
 * surfaces. A parse failure is a packaging bug — throw, never emit a stub.
 */
async function renderCommandPrompt(file, caller) {
  const raw = await fs.readFile(file, 'utf8');
  const descMatch = raw.match(/^description\s*=\s*"(.*)"\s*$/m);
  const promptMatch = raw.match(/^prompt\s*=\s*"""\r?\n?([\s\S]*?)"""\s*$/m);
  if (!descMatch || !promptMatch) {
    throw new Error(`${caller}: cannot parse description/prompt in ${file}`);
  }

  let body = transformCommand(promptMatch[1], 'antigravity');
  // Colon namespace is dead in agy/ZCode — commands register as /toh-vibe etc.
  body = body.replace(/\/toh:(?=[a-z])/g, '/toh-');
  // TOML @{...} file includes do not exist here — plain read lines.
  body = body.replace(/\.gemini\/skills\//g, '.agents/skills/');
  body = body.replace(/@\{([^}]+)\}/g, 'Read `$1`');

  return { description: descMatch[1], body: body.trimEnd() };
}

/**
 * Write the shared `.agents/commands/` surface — real project slash commands.
 *
 * ZCode discovers these natively (verified live: `zcode commands list --json`
 * reports scope "project", source "agents", rootPath "<project>/.agents/commands").
 * Runtimes that ignore the directory are unaffected: they still reach the same
 * 14 prompts through `.agents/skills/toh-*`.
 *
 * `{{args}}` is Gemini CLI's TOML placeholder and means nothing here, so it is
 * rewritten to `$ARGUMENTS` — the placeholder that pairs with the
 * description/argument-hint frontmatter this function emits. Leaving the raw
 * token in would put a literal `{{args}}` where the user's request belongs.
 *
 * Returns { dir, commands }.
 */
export async function writeAgentsCommands(targetDir, srcDir) {
  const outDir = join(targetDir, '.agents', 'commands');
  await fs.ensureDir(outDir);
  let commands = 0;

  for (const { file, name } of await collectCommandTomls(srcDir)) {
    const parsed = await renderCommandPrompt(file, 'writeAgentsCommands');
    const body = parsed.body.replace(/\{\{args\}\}/g, '$ARGUMENTS');

    const fm = { description: parsed.description };
    // Only prompt for input the prompt actually consumes.
    if (body.includes('$ARGUMENTS')) fm['argument-hint'] = '[what you want, in plain language]';

    const fmYaml = yaml.dump(fm, { lineWidth: -1, noRefs: true }).trimEnd();
    await fs.writeFile(join(outDir, `${name}.md`), `---\n${fmYaml}\n---\n\n${body}\n`);
    commands++;
  }

  return { dir: outDir, commands };
}

export default {
  CAPABILITY_PROFILES,
  transformCommand,
  writeCapabilitiesJson,
  renderCapabilitiesSection,
  writeAgentsSkills,
  writeAgentsCommands
};
