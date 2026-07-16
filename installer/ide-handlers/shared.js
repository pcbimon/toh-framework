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
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
const VERSION = pkg.version;

// ============================================================
// 1. Capability profiles (per IDE)
// ============================================================
// subagents: 'native' | 'none'
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
    subagents: 'none',
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
    subagents: 'none',
    teams: false,
    goal: false,
    loop: false,
    hooks: false,
    workflows: false,
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
  antigravity: { name: 'Google Antigravity', contextFile: 'GEMINI.md' }
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
    antigravity: 'antigravity'
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

  // Normalize selection; 'gemini' installs configure Antigravity too.
  const selected = new Set();
  for (const ide of ides || []) {
    const key = normalizeIde(ide);
    if (CAPABILITY_PROFILES[key]) selected.add(key);
    if (key === 'gemini-cli') selected.add('antigravity');
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
    lines.push('- Native subagents: YES — delegate via the Task tool (parallel only for independent tasks on disjoint files, max 4 concurrent)');
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
  lines.push(p.hooks
    ? '- Hooks: YES — Stop hook in `.claude/settings.json` enforces THE TOH LOOP'
    : '- Hooks: NO');
  lines.push(p.workflows === 'version-gated'
    ? '- Workflows: version-gated (Claude Code >= 2.1.154)'
    : '- Workflows: NO');
  lines.push(p.modelRouting
    ? '- Model routing: YES — haiku = scaffold/tests · sonnet = builders · opus = planning/QC'
    : '- Model routing: NO — ignore model tiers and proceed');
  if (!p.parallel) {
    lines.push('- Execution mode: run THE TOH LOOP **sequentially in this session** (orchestration-protocol skill); recovery = checkbox-resume from `.toh/plan.md`');
  }

  return `## Runtime Identity & Capabilities

${identity}

${lines.join('\n')}

${SURVEY_LINE}`;
}

export default {
  CAPABILITY_PROFILES,
  transformCommand,
  writeCapabilitiesJson,
  renderCapabilitiesSection
};
