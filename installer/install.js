/**
 * Toh Framework Installer
 * Main installation logic
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupClaudeCode } from './ide-handlers/claude-code.js';
import { setupCursor } from './ide-handlers/cursor.js';
import { setupGeminiCLI } from './ide-handlers/gemini-cli.js';
import { setupAntigravityCLI } from './ide-handlers/antigravity-cli.js';
import { setupCodex } from './ide-handlers/codex.js';
import { transformCommand, writeCapabilitiesJson, writeAgentsSkills } from './ide-handlers/shared.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = join(__dirname, '..', 'src');

// Read version from package.json (Single Source of Truth)
const PKG_PATH = join(__dirname, '..', 'package.json');
const pkg = await fs.readJson(PKG_PATH);
const VERSION = pkg.version;

// v2.1 fix: two spinner hazards on unusual terminals.
// (1) discardStdin conflicts with inquirer's readline on the same TTY — disable it.
// (2) a pty with NO window size (columns = 0 — common when automation/AI agents
//     drive the interactive installer through a bare pty) makes ora's clear-line
//     math divide by zero and loop forever inside stop()/succeed(). On a
//     zero-width TTY fall back to plain non-animated output (isEnabled: false).
const spin = (text) => {
  const options = { text, discardStdin: false };
  if (process.stderr.isTTY && !(process.stderr.columns > 0)) {
    options.isEnabled = false; // zero-width pty: plain output, no animation
  }
  return ora(options);
};

export async function install(options) {
  const { target, ide, quick, lang } = options;

  console.log(chalk.cyan('\n📦 Starting Toh Framework Installation...\n'));

  let config = {
    targetDir: target,
    ides: ide.split(',').map(i => i.trim()),
    language: lang || 'en',
    installSkills: true,
    installAgents: true,
    installCommands: true,
    installTemplates: true,
    // v2.1 legacy flags (D1/D5): --legacy-gemini / --legacy-cursorrules
    legacyGemini: !!options.legacyGemini,
    legacyCursorrules: !!options.legacyCursorrules
  };

  // Interactive mode (if not quick)
  if (!quick) {
    config = await promptConfiguration(config);
  }

  // v2.1 (W2/D1): Gemini CLI stopped serving consumer requests on 2026-06-18.
  // The Google default is now Antigravity CLI (agy); Gemini CLI is available
  // ONLY behind the explicit --legacy-gemini flag (Enterprise/GCP users).
  config.ides = resolveGeminiLegacy(config);

  // Validate target directory
  const spinner = spin('Validating target directory...').start();
  if (!fs.existsSync(config.targetDir)) {
    spinner.warn('Target directory does not exist');
    const { create } = await inquirer.prompt([{
      type: 'confirm',
      name: 'create',
      message: `Create directory ${config.targetDir}?`,
      default: true
    }]);
    
    if (create) {
      fs.mkdirSync(config.targetDir, { recursive: true });
      spinner.succeed('Directory created');
    } else {
      spinner.fail('Installation cancelled');
      return;
    }
  } else {
    spinner.succeed('Target directory validated');
  }

  // Check for existing installation
  const existingInstall = await checkExistingInstall(config.targetDir);
  if (existingInstall) {
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Existing Toh Framework installation detected. What would you like to do?',
      choices: [
        { name: '🔄 Quick Update (preserve customizations)', value: 'update' },
        { name: '🗑️  Fresh Install (overwrite all)', value: 'fresh' },
        { name: '❌ Cancel', value: 'cancel' }
      ]
    }]);

    if (action === 'cancel') {
      console.log(chalk.yellow('\nInstallation cancelled.'));
      return;
    }
    
    if (action === 'fresh') {
      await cleanExistingInstall(config.targetDir);
    }
  }

  // Install components
  console.log(chalk.cyan('\n📁 Installing components...\n'));

  if (config.installSkills) {
    await installComponent('skills', config.targetDir);
  }
  
  if (config.installAgents) {
    await installComponent('agents', config.targetDir);
  }
  
  if (config.installCommands) {
    await installComponent('commands', config.targetDir);
  }
  
  if (config.installTemplates) {
    await installComponent('templates', config.targetDir);
  }

  // Setup Memory folder (v1.8.0 - 7 files)
  await setupMemoryFolder(config.targetDir);

  // Setup IDEs
  console.log(chalk.cyan('\n🛠️  Configuring IDEs...\n'));
  
  for (const ideName of config.ides) {
    switch (ideName.toLowerCase()) {
      case 'claude':
      case 'claude-code':
        await setupIDEWithSpinner('Claude Code', () => setupClaudeCode(config.targetDir, SRC_DIR, config.language));
        break;
      case 'cursor':
        await setupIDEWithSpinner('Cursor', () =>
          setupCursor(config.targetDir, config.language, { legacyCursorrules: config.legacyCursorrules }));
        break;
      case 'antigravity':
      case 'agy':
        await setupIDEWithSpinner('Antigravity CLI (agy)', () => setupAntigravityCLI(config.targetDir, SRC_DIR, config.language));
        break;
      case 'gemini':
      case 'gemini-cli':
        // Only reachable with --legacy-gemini (resolveGeminiLegacy filters otherwise)
        await setupIDEWithSpinner('Gemini CLI (legacy)', () => setupGeminiCLI(config.targetDir, SRC_DIR, config.language));
        break;
      case 'codex':
      case 'codex-cli':
        await setupIDEWithSpinner('Codex CLI', () => setupCodex(config.targetDir, SRC_DIR, config.language));
        break;
      default:
        console.log(chalk.yellow(`  ⚠️  Unknown IDE: ${ideName}`));
    }
  }

  // v2.1 (W3): shared .agents/skills surface — Codex, Cursor 2.4, and
  // Antigravity all natively discover Agent Skills from
  // <project>/.agents/skills/<name>/SKILL.md. ONE writer (shared.js) emits
  // 23 thin framework-skill wrappers pointing at .toh/skills/ plus the 14
  // toh-* command skills converted from the TOML prompts.
  await installAgentsSkills(config);

  // v2.0.0: transform the shared .toh/commands copy to the UNIVERSAL variant
  // (drop tfw:claude blocks, unwrap tfw:fallback). Runs AFTER the IDE loop.
  // v2.0.0-r2: claude-code.js builds .claude/commands from the PACKAGE's
  // src/commands (marker-bearing), falling back to .toh/commands only when the
  // package source is unavailable. Idempotent: no markers left = no-op.
  await normalizeUniversalCommands(config.targetDir);

  // Generate manifest + machine-readable capability declaration
  await generateManifest(config);
  await declareCapabilities(config);

  // Success message
  console.log(chalk.green('\n✅ Toh Framework installed successfully!\n'));
  printNextSteps(config);
}

async function promptConfiguration(defaults) {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: '🌐 Select language / เลือกภาษา:',
      choices: [
        { name: '🇺🇸 English (Default)', value: 'en' },
        { name: '🇹🇭 ภาษาไทย', value: 'th' }
      ],
      default: 'en'
    },
    {
      type: 'input',
      name: 'targetDir',
      message: 'Target directory:',
      default: defaults.targetDir
    },
    {
      type: 'checkbox',
      name: 'ides',
      message: 'Which IDEs/CLI tools do you want to configure?',
      choices: [
        { name: '🤖 Claude Code (Anthropic)', value: 'claude', checked: true },
        { name: '📝 Cursor', value: 'cursor', checked: true },
        { name: '💎 Antigravity CLI (agy) — Google', value: 'antigravity', checked: true },
        { name: '🧠 Codex CLI (OpenAI)', value: 'codex', checked: false }
      ],
      validate: (input) => input.length > 0 ? true : 'Please select at least one IDE'
    },
    {
      type: 'checkbox',
      name: 'components',
      message: 'What would you like to install?',
      choices: [
        { name: 'Skills (Core methodology)', value: 'skills', checked: true },
        { name: 'Agents (Sub-agents)', value: 'agents', checked: true },
        { name: 'Commands (/toh-* commands)', value: 'commands', checked: true },
        { name: 'Templates (Next.js starter)', value: 'templates', checked: true }
      ]
    }
  ]);

  return {
    ...defaults,
    ...answers,
    installSkills: answers.components.includes('skills'),
    installAgents: answers.components.includes('agents'),
    installCommands: answers.components.includes('commands'),
    installTemplates: answers.components.includes('templates')
  };
}

/**
 * v2.1 (W2/D1): normalize the Google targets in config.ides.
 * - 'gemini'/'gemini-cli' WITHOUT --legacy-gemini → warn once and substitute
 *   'antigravity' (the surface Gemini CLI users are being migrated to).
 * - --legacy-gemini → ensure 'gemini' is in the list (the flag IS the opt-in;
 *   Enterprise/GCP Gemini CLI users still exist).
 * Deduplicates while preserving order.
 */
function resolveGeminiLegacy(config) {
  const out = [];
  let warned = false;
  for (const name of config.ides) {
    const key = name.toLowerCase();
    if ((key === 'gemini' || key === 'gemini-cli') && !config.legacyGemini) {
      if (!warned) {
        console.log(chalk.yellow(
          '  ⚠️  Google shut down consumer Gemini CLI on 2026-06-18 — installing "Antigravity CLI (agy)" instead.\n' +
          '      Enterprise/GCP Gemini CLI users: re-run with --legacy-gemini to keep the .gemini/ setup.'
        ));
        warned = true;
      }
      if (!out.includes('antigravity')) out.push('antigravity');
      continue;
    }
    if (!out.includes(key)) out.push(key);
  }
  if (config.legacyGemini && !out.some(k => k === 'gemini' || k === 'gemini-cli')) {
    out.push('gemini');
  }
  return out;
}

/**
 * v2.1 (W3): write the shared .agents/skills surface when any runtime that
 * reads it (Codex, Cursor 2.4, Antigravity) is selected. Antigravity's own
 * handler also calls the same shared writer — it is idempotent, never a
 * second competing implementation.
 */
async function installAgentsSkills(config) {
  const consumers = ['cursor', 'codex', 'codex-cli', 'antigravity', 'agy'];
  if (!config.ides.some(name => consumers.includes(name.toLowerCase()))) return;

  const spinner = spin('Writing shared .agents/skills (Codex + Cursor + Antigravity)...').start();
  try {
    const result = await writeAgentsSkills(config.targetDir, SRC_DIR);
    spinner.succeed(`Shared skills written (.agents/skills/ — ${result.skillWrappers} skill wrappers + ${result.commandSkills} toh-* command skills)`);
  } catch (error) {
    spinner.fail(`Failed to write .agents/skills: ${error.message}`);
  }
}

async function checkExistingInstall(targetDir) {
  const markers = [
    join(targetDir, '.toh'),
    join(targetDir, '.claude', 'skills', 'vibe-orchestrator'),
    join(targetDir, '.cursor', 'rules', 'toh-framework.mdc')
  ];
  
  return markers.some(marker => fs.existsSync(marker));
}

async function cleanExistingInstall(targetDir) {
  const spinner = spin('Cleaning existing installation...').start();
  
  const pathsToClean = [
    join(targetDir, '.toh'),
    join(targetDir, '.claude', 'skills'),
    join(targetDir, '.claude', 'agents'),
    join(targetDir, '.claude', 'commands')
  ];

  for (const p of pathsToClean) {
    if (fs.existsSync(p)) {
      await fs.remove(p);
    }
  }
  
  spinner.succeed('Cleaned existing installation');
}

async function setupIDEWithSpinner(ideName, setupFn) {
  const spinner = spin(`Configuring ${ideName}...`).start();
  try {
    const detail = await setupFn();
    const configFile = (typeof detail === 'string' && detail) ? detail : getIDEConfigFile(ideName);
    spinner.succeed(`${ideName} configured (${configFile})`);
  } catch (error) {
    spinner.fail(`Failed to configure ${ideName}: ${error.message}`);
    // Hard budget violations (error.fatal, e.g. the Codex 24 KiB AGENTS.md
    // block or the Antigravity 12,000-char Always-On rule) mean the generated
    // output would be silently broken — never report success past them.
    if (error.fatal) {
      console.error(chalk.red(
        `\n✖ Installation aborted: ${ideName} failed a hard size-budget check (see above). ` +
        `Fix the generator and re-run the installer.\n`
      ));
      process.exit(1);
    }
  }
}

function getIDEConfigFile(ideName) {
  const configs = {
    'Claude Code': 'created CLAUDE.md',
    'Cursor': '.cursor/rules/*.mdc',
    'Antigravity CLI (agy)': '.agents/rules/toh-framework.md',
    'Gemini CLI (legacy)': '.gemini/GEMINI.md',
    'Codex CLI': 'AGENTS.md'
  };
  return configs[ideName] || 'configured';
}

async function installComponent(componentName, targetDir) {
  const spinner = spin(`Installing ${componentName}...`).start();
  
  const srcPath = join(SRC_DIR, componentName);
  let destPath;
  
  // v1.4.0: All resources go to .toh/ (Central Resources)
  switch (componentName) {
    case 'skills':
      destPath = join(targetDir, '.toh', 'skills');
      break;
    case 'agents':
      destPath = join(targetDir, '.toh', 'agents');
      break;
    case 'commands':
      destPath = join(targetDir, '.toh', 'commands');
      break;
    case 'templates':
      destPath = join(targetDir, '.toh', 'templates');
      break;
    default:
      destPath = join(targetDir, '.toh', componentName);
  }

  try {
    await fs.ensureDir(destPath);
    await fs.copy(srcPath, destPath, { overwrite: true });
    
    const files = await countFiles(destPath);
    spinner.succeed(`Installed ${componentName} (${files} files)`);
  } catch (error) {
    spinner.fail(`Failed to install ${componentName}: ${error.message}`);
  }
}

async function countFiles(dir) {
  let count = 0;
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    if (item.isDirectory()) {
      count += await countFiles(join(dir, item.name));
    } else {
      count++;
    }
  }
  
  return count;
}

async function generateManifest(config) {
  const spinner = spin('Generating manifest...').start();
  
  const manifest = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    targetDir: config.targetDir,
    ides: config.ides,
    components: {
      skills: config.installSkills,
      agents: config.installAgents,
      commands: config.installCommands,
      templates: config.installTemplates,
      memory: true
    }
  };

  const manifestPath = join(config.targetDir, '.toh', 'manifest.json');
  await fs.ensureDir(join(config.targetDir, '.toh'));
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });

  spinner.succeed('Manifest generated');
}

/**
 * v2.0.0: Post-process .toh/commands/*.md into the UNIVERSAL variant.
 * The shared copy referenced by Cursor/Codex/Gemini/Antigravity must contain
 * only the fallback prose loop — no Claude-only blocks.
 */
async function normalizeUniversalCommands(targetDir) {
  const commandsDir = join(targetDir, '.toh', 'commands');
  if (!fs.existsSync(commandsDir)) return;

  const spinner = spin('Normalizing shared commands (universal variant)...').start();
  try {
    let changed = 0;
    const walk = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(p);
        } else if (entry.name.endsWith('.md')) {
          const raw = await fs.readFile(p, 'utf8');
          const transformed = transformCommand(raw, 'universal');
          if (transformed !== raw) {
            await fs.writeFile(p, transformed);
            changed++;
          }
        }
      }
    };
    await walk(commandsDir);
    spinner.succeed(`Shared commands normalized (${changed} transformed)`);
  } catch (error) {
    spinner.fail(`Failed to normalize commands: ${error.message}`);
  }
}

/**
 * v2.0.0: Write .toh/capabilities.json — the machine-readable half of the
 * orchestration-protocol 2-step survey (identity lives in each context file).
 */
async function declareCapabilities(config) {
  const spinner = spin('Declaring runtime capabilities...').start();
  try {
    await writeCapabilitiesJson(config.targetDir, config.ides);
    spinner.succeed('Capabilities declared (.toh/capabilities.json)');
  } catch (error) {
    spinner.fail(`Failed to write capabilities.json: ${error.message}`);
  }
}

async function setupMemoryFolder(targetDir) {
  const spinner = spin('Setting up Memory System (7 files)...').start();

  const memoryDir = join(targetDir, '.toh', 'memory');
  const archiveDir = join(memoryDir, 'archive');
  const today = new Date().toISOString().split('T')[0];

  try {
    // Create memory directories
    await fs.ensureDir(memoryDir);
    await fs.ensureDir(archiveDir);

    // ============================================
    // v1.8.0: Enhanced Memory System (7 Files)
    // ============================================

    // 1. active.md - Current task status (~500 tokens)
    const activeTemplate = `# 🔥 Active Task

## Current Work
[No active task - Waiting for user command]

## Last Action
[None]

## Next Steps
- Waiting for user command

## Blockers
[None]

---
*Updated: ${new Date().toISOString()}*
`;

    // 2. summary.md - Project overview (~1,000 tokens)
    const summaryTemplate = `# 📋 Project Summary

## Project Info
- **Name:** [Not specified]
- **Type:** [Not specified]
- **Stack:** Next.js 16 + Tailwind + shadcn/ui + Zustand + Supabase

## Completed Features
[None yet]

## In Progress
[None yet]

## Project Structure
[Will be updated when project starts]

---
*Updated: ${new Date().toISOString()}*
`;

    // 3. decisions.md - Key decisions (~500 tokens)
    const decisionsTemplate = `# 🧠 Key Decisions

## Architecture Decisions
| Date | Decision | Reason |
|------|----------|--------|
| ${today} | Use Toh Framework v${VERSION} | AI-Orchestration Driven Development |

## Design Decisions
| Date | Decision | Reason |
|------|----------|--------|

## Technical Decisions
| Date | Decision | Reason |
|------|----------|--------|

---
*Updated: ${new Date().toISOString()}*
`;

    // 4. changelog.md - Session changes (~300 tokens) - NEW in v1.8.0
    const changelogTemplate = `# 📝 Session Changelog

## [Current Session] - ${today}

### Changes Made
| Agent | Action | File/Component |
|-------|--------|----------------|
| - | - | - |

### Next Session TODO
- [ ] Continue from: [last task]

---
*Auto-updated by agents after each task*
`;

    // 5. agents-log.md - Agent activity (~300 tokens) - NEW in v1.8.0
    const agentsLogTemplate = `# 🤖 Agents Activity Log

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

    // 6. architecture.md - Code structure (~500 tokens) - v1.8.0
    const architectureTemplate = `# 🏗️ Code Architecture

## Directory Structure
\`\`\`
[Will be auto-generated when project starts]
\`\`\`

## Key Files
| File | Purpose | Dependencies |
|------|---------|--------------|
| - | - | - |

## Data Flow
[Will be documented as features are built]

---
*Last updated: ${today}*
`;

    // 7. components.md - Component registry (~500 tokens) - v1.8.0
    const componentsTemplate = `# 🧩 Component Registry

## UI Components
| Component | Path | Props | Used In |
|-----------|------|-------|---------|
| - | - | - | - |

## Stores (Zustand)
| Store | Path | State Shape |
|-------|------|-------------|
| - | - | - |

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| - | - | - |

## Custom Hooks
| Hook | Path | Purpose |
|------|------|---------|
| - | - | - |

---
*Last updated: ${today}*
`;

    // Write all 7 memory files
    await fs.writeFile(join(memoryDir, 'active.md'), activeTemplate);
    await fs.writeFile(join(memoryDir, 'summary.md'), summaryTemplate);
    await fs.writeFile(join(memoryDir, 'decisions.md'), decisionsTemplate);
    await fs.writeFile(join(memoryDir, 'changelog.md'), changelogTemplate);
    await fs.writeFile(join(memoryDir, 'agents-log.md'), agentsLogTemplate);
    await fs.writeFile(join(memoryDir, 'architecture.md'), architectureTemplate);
    await fs.writeFile(join(memoryDir, 'components.md'), componentsTemplate);

    // v2.0.0: seed THE TOH LOOP artifacts — ONLY if absent (they hold live
    // loop state; a reinstall must NEVER clobber an in-flight plan/ledger).
    // NOTE: the seed plan deliberately contains NO real unchecked task lines,
    // so the Claude Code Stop hook never blocks on an empty backlog.
    const planPath = join(targetDir, '.toh', 'plan.md');
    if (!fs.existsSync(planPath)) {
      const planSeed = `# Plan: (no active plan yet)
Status: draft
Created: ${today} by toh-framework installer

> This file is THE TOH LOOP's backlog — the contract between \`/toh-plan\`
> (writes it) and \`/toh-vibe\` (executes it). Full schema + loop protocol:
> \`.toh/skills/orchestration-protocol/SKILL.md\` (Section D).
>
> Task-line grammar (example shown pre-ticked so this doc line can never be
> read as a real open task): \`- [x] T001 [P] agent — description in app/exact/path.tsx\`
> — real open tasks use \`[ ]\` in place of \`[x]\` · exact file path mandatory
> · \`[P]\` = parallel-safe (disjoint files only)
> · blocked tasks flip to \`- [!]\` + \`BLOCKED: <one-line diagnosis>\`
> · flip to \`- [x]\` only after a quoted passing Checkpoint run.

Empty backlog — no stories yet. Run \`/toh-plan\` to draft a plan here, or
\`/toh-vibe\` to auto-generate a mini-plan and build it.
`;
      await fs.writeFile(planPath, planSeed);
    }

    const progressPath = join(targetDir, '.toh', 'progress.md');
    if (!fs.existsSync(progressPath)) {
      const progressSeed = `# Progress Ledger

> Append-only, one line per state change: \`queued → running → done/failed/blocked\`.
> Format: \`YYYY-MM-DD HH:MM T00x <state> — <detail>\` · gotchas as \`LEARNING: <one line>\`.
> Written by THE TOH LOOP (orchestration-protocol skill). Never rewrite history — append.

`;
      await fs.writeFile(progressPath, progressSeed);
    }

    spinner.succeed('Memory System ready - 7 files (.toh/memory/) + plan/progress artifacts');
  } catch (error) {
    spinner.fail(`Failed to setup Memory System: ${error.message}`);
  }
}

function printNextSteps(config) {
  // Box width: 62 (│ + 60 content + │)
  const W = 60;
  const pad = (s) => s.padEnd(W);
  const row = (content) => chalk.cyan('│') + content + chalk.cyan('│');
  const top = chalk.cyan('┌' + '─'.repeat(W) + '┐');
  const mid = chalk.cyan('├' + '─'.repeat(W) + '┤');
  const bot = chalk.cyan('└' + '─'.repeat(W) + '┘');
  const empty = row(' '.repeat(W));

  console.log(top);
  console.log(row(chalk.bold.white(pad(`  Toh Framework v${VERSION} Installed!`))));
  console.log(mid);

  if (config.ides.includes('claude') || config.ides.includes('claude-code')) {
    console.log(row(chalk.white(pad('  Claude Code:'))));
    // /toh flagship: 8 green + 52 gray = 60 ; others: 13 green + 47 gray = 60
    console.log(row(chalk.green('    /toh') + chalk.gray(' - Type anything in plain language'.padEnd(52))));
    console.log(row(chalk.green('    /toh-vibe') + chalk.gray(' - Create new project'.padEnd(47))));
    console.log(row(chalk.green('    /toh-help') + chalk.gray(' - Show all commands'.padEnd(47))));
    console.log(empty);
  }

  if (config.ides.includes('cursor')) {
    console.log(row(chalk.white(pad('  Cursor:'))));
    // 13 chars green + 47 chars gray = 60
    console.log(row(chalk.green('    /toh-plan') + chalk.gray(' - Plan and orchestrate tasks'.padEnd(47))));
    console.log(row(chalk.green('    /toh-vibe') + chalk.gray(' - Create new project'.padEnd(47))));
    console.log(row(chalk.green('    /toh-help') + chalk.gray(' - Show all commands'.padEnd(47))));
    console.log(empty);
  }

  if (config.ides.includes('antigravity') || config.ides.includes('agy')) {
    console.log(row(chalk.white(pad('  Antigravity CLI (agy) + Antigravity IDE:'))));
    // 13 chars green + 47 chars gray = 60
    console.log(row(chalk.green('    /toh-plan') + chalk.gray(' - Plan and orchestrate tasks'.padEnd(47))));
    console.log(row(chalk.green('    /toh-vibe') + chalk.gray(' - Create new project'.padEnd(47))));
    console.log(row(chalk.green('    /toh-help') + chalk.gray(' - Show all commands'.padEnd(47))));
    console.log(empty);
  }

  if (config.ides.includes('gemini') || config.ides.includes('gemini-cli')) {
    console.log(row(chalk.white(pad('  Gemini CLI (legacy - Enterprise/GCP only):'))));
    // 13 chars green + 47 chars gray = 60
    console.log(row(chalk.green('    /toh:plan') + chalk.gray(' - Plan and orchestrate tasks'.padEnd(47))));
    console.log(row(chalk.green('    /toh:vibe') + chalk.gray(' - Create new project'.padEnd(47))));
    console.log(row(chalk.green('    /toh:help') + chalk.gray(' - Show all commands'.padEnd(47))));
    console.log(empty);
  }

  if (config.ides.includes('codex') || config.ides.includes('codex-cli')) {
    console.log(row(chalk.white(pad('  Codex CLI:'))));
    // 9 chars green + 51 chars gray = 60
    console.log(row(chalk.green('    codex') + chalk.gray('     - Start Codex CLI in project'.padEnd(51))));
    // 13 chars green + 47 chars gray = 60
    console.log(row(chalk.green('    /toh-vibe') + chalk.gray(' - Create new project'.padEnd(47))));
    console.log(empty);
  }

  console.log(row(chalk.white(pad('  Documentation:'))));
  console.log(row(chalk.blue(pad('    https://github.com/wasintoh/toh-framework'))));
  console.log(mid);
  console.log(row(chalk.bold.yellow(pad(`  What's New in v${VERSION}:`))));
  console.log(row(chalk.white(pad('  * Codex: compact AGENTS.md, never truncated (24KiB guard)'))));
  console.log(row(chalk.white(pad('  * Antigravity (agy): .agents/ + deterministic Stop hook'))));
  console.log(row(chalk.white(pad('  * Cursor 2.4 native subagents (.cursor/agents/)'))));
  console.log(row(chalk.white(pad('  * Shared .agents/skills: 37 skills for Codex/Cursor/agy'))));
  console.log(row(chalk.white(pad('  * Live-read catalog + real /toh-* aliases (incl. /toh-pt)'))));
  console.log(bot);
  console.log('');
}
