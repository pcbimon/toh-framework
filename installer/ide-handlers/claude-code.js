/**
 * Claude Code IDE Handler
 * Sets up Toh Framework for Claude Code
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { transformCommand, renderCapabilitiesSection } from './shared.js';

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
const VERSION = pkg.version;

export async function setupClaudeCode(targetDir, srcDir, language = 'en') {
  // No spinner here — the caller (setupIDEWithSpinner) owns the spinner so the
  // "Configuring Claude Code..." line isn't printed twice. We just return a
  // short detail string describing the CLAUDE.md outcome for it to display.
  try {
    // v1.4.0: Claude Code needs .claude/ folder for slash commands to work
    // Copy resources from .toh/ to .claude/
    
    const tohDir = join(targetDir, '.toh');
    const claudeDir = join(targetDir, '.claude');
    
    // Create .claude/ directory structure
    await fs.ensureDir(join(claudeDir, 'skills'));
    await fs.ensureDir(join(claudeDir, 'agents'));
    await fs.ensureDir(join(claudeDir, 'commands'));
    await fs.ensureDir(join(claudeDir, 'memory', 'archive'));
    
    // Copy resources from .toh/ to .claude/ (if .toh/ exists)
    if (fs.existsSync(join(tohDir, 'skills'))) {
      await fs.copy(join(tohDir, 'skills'), join(claudeDir, 'skills'), { overwrite: true });
    }
    
    // v2.0: Agents are now a SINGLE source in .toh/agents/*.md. Each file carries
    // a SUPERSET frontmatter (name, description, tools, model, skills, triggers).
    // The old nested per-IDE agent folder no longer exists. Claude Code only
    // understands the NATIVE keys, so transform every top-level agent file:
    //   1. read the file and split off the YAML frontmatter
    //   2. parse it with js-yaml
    //   3. keep ONLY name/description/tools/model + the native 'skills' preload
    //      list, filtered to skills installed in .claude/skills/ (DROP type/triggers)
    //   4. re-serialize with js-yaml (multi-line description stays a block scalar)
    //   5. write .claude/agents/<name>.md with the native frontmatter + body
    // NOTE: never inject a default tool list — that would widen restricted agents
    // like root-cause-debugger (Read/Grep/Glob/Bash, no Write/Edit).
    const agentsSrcDir = join(tohDir, 'agents');
    if (fs.existsSync(agentsSrcDir)) {
      const agentFiles = await fs.readdir(agentsSrcDir);
      for (const file of agentFiles) {
        // Only top-level agent .md files (skip README + any nested dirs)
        if (!file.endsWith('.md') || file === 'README.md') continue;
        const srcPath = join(agentsSrcDir, file);
        if (!(await fs.stat(srcPath)).isFile()) continue;

        const raw = await fs.readFile(srcPath, 'utf8');
        const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

        // No frontmatter → copy through unchanged (defensive)
        if (!fmMatch) {
          await fs.writeFile(join(claudeDir, 'agents', file), raw);
          continue;
        }

        // Per-file guard: a single malformed agent frontmatter must NOT abort the
        // whole Claude Code install. On parse/transform failure, copy through the
        // original file unchanged so the remaining agents (and every later install
        // step) still complete.
        try {
          const parsed = yaml.load(fmMatch[1]) || {};
          const body = fmMatch[2];

          // Keep ONLY Claude-native keys, in order: name, description, tools, model.
          const nativeFm = {};
          if (parsed.name !== undefined) nativeFm.name = parsed.name;
          if (parsed.description !== undefined) nativeFm.description = parsed.description;
          if (parsed.tools !== undefined) nativeFm.tools = parsed.tools; // omit if absent (never widen)
          nativeFm.model = parsed.model || 'sonnet';                     // default sonnet if missing

          // v2.1 (W6): 'skills' is a NATIVE subagent frontmatter key that
          // preloads the FULL content of each listed skill at subagent startup —
          // guaranteed loading instead of prose the subagent can skip. Pass it
          // through, filtered to skills actually installed at
          // .claude/skills/<name>/SKILL.md (a missing name must never ship) and
          // excluding skills marked disable-model-invocation: true (those are
          // user-command-only surfaces). Context cost is accepted per owner
          // decision D4 and bounded by this existence filter.
          // 'triggers' stays dropped — not a native key.
          if (Array.isArray(parsed.skills)) {
            const preload = [];
            for (const skillName of parsed.skills) {
              if (typeof skillName !== 'string') continue;
              if (await isPreloadableSkill(join(claudeDir, 'skills'), skillName)) {
                preload.push(skillName);
              }
            }
            if (preload.length > 0) nativeFm.skills = preload;
          }

          // v2.0.0: autonomy keys — PASS THROUGH when present in the superset
          // frontmatter (memory: project, maxTurns bounds, isolation: worktree,
          // background). Never inject defaults — absent stays absent.
          for (const key of ['memory', 'maxTurns', 'isolation', 'background']) {
            if (parsed[key] !== undefined) nativeFm[key] = parsed[key];
          }

          const fmYaml = yaml.dump(nativeFm, { lineWidth: -1, noRefs: true }).trimEnd();
          const outName = `${parsed.name || file.replace(/\.md$/, '')}.md`;
          await fs.writeFile(
            join(claudeDir, 'agents', outName),
            `---\n${fmYaml}\n---\n${body}`
          );
        } catch (agentErr) {
          // Fallback: copy-through unchanged so one bad agent can't break install.
          await fs.writeFile(join(claudeDir, 'agents', file), raw);
        }
      }
    }
    // v2.0.0: commands are single-source with per-IDE marker blocks. The Claude
    // variant KEEPS <!-- tfw:claude --> content and DROPS <!-- tfw:fallback -->
    // blocks (markers always stripped).
    //
    // v2.0.0-r2: source the transform from the PACKAGE's src/commands (the same
    // SRC_DIR install.js hands codex.js/gemini-cli.js), NOT the target's
    // .toh/commands. install.js normalizes .toh/commands to the UNIVERSAL
    // variant at the end of every run, so on a later Quick Update with the
    // Commands component unchecked, .toh/commands no longer carries the
    // tfw:claude blocks — copying it would silently drop the Claude-only
    // content (/goal, /loop, teams). Fall back to .toh/commands only when the
    // package source is unavailable.
    if (fs.existsSync(join(tohDir, 'commands'))) {
      const pkgCommandsDir = srcDir
        ? join(srcDir, 'commands')
        : join(__dirname, '..', '..', 'src', 'commands');
      // v2.1 (W8): alias command files are generated from whichever source dir
      // the transform above actually used, so aliases always match the
      // commands that were just installed.
      let aliasSourceDir = null;
      if (fs.existsSync(pkgCommandsDir)) {
        await copyCommandsTransformed(pkgCommandsDir, join(claudeDir, 'commands'));
        aliasSourceDir = pkgCommandsDir;
      } else {
        // Fallback: transform is idempotent, so re-running on already-universal
        // content can't double-strip — the real risk is MISSING Claude content.
        // preserveExistingWhenNoMarkers keeps a previously-installed Claude
        // variant instead of clobbering it with the stripped universal copy.
        const sawMarkers = await copyCommandsTransformed(
          join(tohDir, 'commands'),
          join(claudeDir, 'commands'),
          true
        );
        if (!sawMarkers) {
          console.log(chalk.yellow(
            '\n  ⚠️  .toh/commands is already normalized to the universal variant and the ' +
            'package source (src/commands) is unavailable — .claude/commands may be missing ' +
            'Claude Code-only content (/goal, /loop, teams). Run a full reinstall with the ' +
            'Commands component selected to restore it.'
          ));
        }
        aliasSourceDir = join(tohDir, 'commands');
      }
      // v2.1 (W8): the 'aliases' frontmatter key is NOT native to Claude Code
      // (supported command frontmatter ignores it), so a literally-typed
      // /toh-v or /toh-pt hits "Unknown command". Register the shortcuts as
      // REAL slash commands via thin alias files.
      await generateAliasCommands(aliasSourceDir, join(claudeDir, 'commands'));
    }
    if (fs.existsSync(join(tohDir, 'templates'))) {
      await fs.copy(join(tohDir, 'templates'), join(claudeDir, 'templates'), { overwrite: true });
    }

    // Create memory template files in .claude/memory/
    const memoryDir = join(claudeDir, 'memory');
    await createMemoryFiles(memoryDir);

    // v2.0.0: THE TOH LOOP enforcement machinery (Claude Code only)
    // - Stop hook in .claude/settings.json blocks stopping mid-plan (deep-merged,
    //   additive, idempotent via the <TFW-STOP-HOOK> marker)
    // - .claude/loop.md heartbeat lets bare /loop keep finishing stories
    await mergeSettingsStopHook(claudeDir);
    await writeLoopHeartbeat(claudeDir);

    // Create CLAUDE.md with Toh Framework rules (references .claude/*)
    // v2.1: the block is delimited by TOH-FRAMEWORK-START/END markers (the same
    // pair Codex uses in AGENTS.md) so `toh uninstall` can lift out exactly our
    // part of a file the user also writes in — without markers there is no way
    // to tell where our text ends, and the file could never be cleaned up.
    const claudeMdPath = join(targetDir, 'CLAUDE.md');
    const claudeMdContent = generateClaudeMdBlock(language);

    // Check if CLAUDE.md exists
    if (fs.existsSync(claudeMdPath)) {
      // Append to existing CLAUDE.md
      const existing = await fs.readFile(claudeMdPath, 'utf8');
      if (!existing.includes('Toh Framework')) {
        await fs.appendFile(claudeMdPath, '\n\n' + claudeMdContent);
        return 'appended to existing CLAUDE.md';
      }
      return 'already set up';
    }

    // Create new CLAUDE.md
    await fs.writeFile(claudeMdPath, claudeMdContent);
    return 'created CLAUDE.md';
  } catch (error) {
    // Re-throw so the caller's spinner reports the failure (no duplicate spinner).
    throw error;
  }
}

/**
 * v2.0.0: Copy a commands dir -> .claude/commands, transforming every .md
 * through transformCommand(content, 'claude-code') so Claude Code keeps the
 * tfw:claude blocks and drops the tfw:fallback blocks. Non-.md files and
 * nested folders copy through unchanged.
 *
 * v2.0.0-r2: returns true if any .md carried tfw: markers. With
 * preserveExistingWhenNoMarkers (fallback mode, source = .toh/commands), a
 * markerless .md — i.e. one already normalized to the universal variant —
 * never overwrites an existing dest file, which may still hold the richer
 * Claude variant from a previous install.
 */
async function copyCommandsTransformed(srcDir, destDir, preserveExistingWhenNoMarkers = false) {
  await fs.ensureDir(destDir);
  let sawMarkers = false;
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (await copyCommandsTransformed(srcPath, destPath, preserveExistingWhenNoMarkers)) {
        sawMarkers = true;
      }
    } else if (entry.name.endsWith('.md')) {
      const raw = await fs.readFile(srcPath, 'utf8');
      const hasMarkers = raw.includes('tfw:');
      if (hasMarkers) sawMarkers = true;
      if (!hasMarkers && preserveExistingWhenNoMarkers && fs.existsSync(destPath)) {
        continue; // transform is a no-op and dest may be the good Claude variant — keep it
      }
      await fs.writeFile(destPath, transformCommand(raw, 'claude-code'));
    } else {
      await fs.copy(srcPath, destPath, { overwrite: true });
    }
  }
  return sawMarkers;
}

/**
 * v2.1 (W6): a skill may be preloaded into a subagent's native 'skills' list
 * only when it is actually installed at .claude/skills/<name>/SKILL.md AND its
 * frontmatter does not set disable-model-invocation: true (such skills are
 * explicit user-command surfaces, never model-preloaded).
 *
 * A SKILL.md with no (or unparseable) frontmatter counts as preloadable: bare
 * skills are valid — existence is already verified, and without parseable YAML
 * the file cannot carry the disable flag.
 */
async function isPreloadableSkill(skillsDir, name) {
  // Names come from agent frontmatter — restrict to plain directory names so a
  // malformed entry can never resolve outside .claude/skills/.
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) return false;
  const skillPath = join(skillsDir, name, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return false;
  const raw = await fs.readFile(skillPath, 'utf8');
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!fmMatch) return true; // bare skill — no frontmatter, no flags to honor
  try {
    const fm = yaml.load(fmMatch[1]);
    return !(fm && typeof fm === 'object' && fm['disable-model-invocation'] === true);
  } catch {
    return true; // unparseable frontmatter cannot carry the disable flag
  }
}

/**
 * v2.1 (W8): generate thin alias command files (.claude/commands/toh-v.md,
 * toh-pt.md, ...) from each source command's 'aliases' frontmatter list, so the
 * documented shortcuts register as real slash commands instead of relying on
 * CLAUDE.md prose pattern-matching (which cannot save a literally-typed
 * "/toh-v" from "Unknown command").
 *
 * Rules (deterministic, additive):
 * - only aliases shaped like a legal command filename become files
 *   ("/toh-v" -> toh-v.md); prose shortcuts ("toh v") and names like "/toh-?"
 *   are skipped — they stay prose-only
 * - an alias never shadows a real command file, and the first command
 *   (alphabetical source order) to claim an alias wins; a collision is
 *   reported, never silently double-written
 * - alias bodies point at the real command file and forward $ARGUMENTS
 */
async function generateAliasCommands(srcDir, destDir) {
  if (!srcDir || !fs.existsSync(srcDir)) return;
  await fs.ensureDir(destDir);
  const files = (await fs.readdir(srcDir))
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort(); // deterministic claim order
  const realNames = new Set(files.map((f) => f.replace(/\.md$/, '')));
  const claimed = new Map(); // alias name -> command that claimed it

  for (const file of files) {
    const srcPath = join(srcDir, file);
    if (!(await fs.stat(srcPath)).isFile()) continue;
    const raw = await fs.readFile(srcPath, 'utf8');
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!fmMatch) continue; // no frontmatter -> no aliases key
    let parsed;
    try {
      parsed = yaml.load(fmMatch[1]) || {};
    } catch {
      // The command file itself was already installed by the transform above;
      // only its alias generation is skipped. Say so instead of hiding it.
      console.log(chalk.yellow(
        `\n  ⚠️  ${file}: frontmatter did not parse — no alias commands generated from it.`
      ));
      continue;
    }
    if (!Array.isArray(parsed.aliases)) continue;

    const cmdName = file.replace(/\.md$/, '');
    for (const alias of parsed.aliases) {
      if (typeof alias !== 'string') continue;
      const aliasName = alias.replace(/^\//, '');
      if (!/^[a-z0-9][a-z0-9-]*$/.test(aliasName)) continue; // prose-only shortcut
      if (realNames.has(aliasName)) {
        console.log(chalk.yellow(
          `\n  ⚠️  alias /${aliasName} (from ${cmdName}) shadows a real command — skipped.`
        ));
        continue;
      }
      if (claimed.has(aliasName)) {
        console.log(chalk.yellow(
          `\n  ⚠️  alias /${aliasName} claimed by both ${claimed.get(aliasName)} and ${cmdName} — kept ${claimed.get(aliasName)}.`
        ));
        continue;
      }
      claimed.set(aliasName, cmdName);

      const desc = typeof parsed.description === 'string'
        ? parsed.description.trim().split('\n')[0]
        : '';
      const aliasFm = yaml.dump(
        { description: `Alias for /${cmdName}${desc ? ` — ${desc}` : ''}` },
        { lineWidth: -1, noRefs: true }
      ).trimEnd();
      const body =
        `---\n${aliasFm}\n---\n\n` +
        `This is a thin alias for \`/${cmdName}\`.\n\n` +
        `Read \`.claude/commands/${cmdName}.md\` now and execute it exactly as if the user had typed \`/${cmdName}\`, with this as the request: $ARGUMENTS\n`;
      await fs.writeFile(join(destDir, `${aliasName}.md`), body);
    }
  }
}

// Idempotence marker for the TFW Stop hook — a reinstall appends the hook only
// if no existing hook prompt already contains this token.
const TFW_STOP_HOOK_MARKER = '<TFW-STOP-HOOK>';

const TFW_STOP_HOOK_PROMPT =
  '<TFW-STOP-HOOK> Read .toh/plan.md. If it has unchecked, unblocked stories ' +
  "('- [ ]' without '[!]') or the last QC run in the transcript failed, return " +
  '{"ok": false, "reason": "<first unchecked story + its checkpoint command>"}. ' +
  'If stop_hook_active is true and no progress was made since the last block, ' +
  'or every remaining story is [!] BLOCKED, or .toh/plan.md is absent/Status: done/' +
  'Status: draft, return {"ok": true}. These ok:true conditions take precedence ' +
  'even if the last QC run in the transcript failed.';

/**
 * v2.0.0: Deep-merge the TFW Stop hook into .claude/settings.json.
 *
 * Rules (additive + idempotent):
 * - settings.json absent      -> create it with just the Stop hook
 * - settings.json unparseable -> DO NOT touch it; warn and skip
 * - hook already present      -> no-op (detected via the <TFW-STOP-HOOK> marker)
 * - user entries              -> never removed, never reordered — we only append
 * - unexpected shapes (hooks/Stop not object/array) -> warn and skip, never corrupt
 */
async function mergeSettingsStopHook(claudeDir) {
  const settingsPath = join(claudeDir, 'settings.json');

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    const raw = await fs.readFile(settingsPath, 'utf8');
    try {
      settings = JSON.parse(raw);
    } catch {
      console.log(chalk.yellow(
        '\n  ⚠️  .claude/settings.json is not valid JSON — left untouched. ' +
        'Fix it and re-run the installer to get the TFW Stop hook.'
      ));
      return;
    }
    if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
      console.log(chalk.yellow(
        '\n  ⚠️  .claude/settings.json has an unexpected shape — left untouched (no Stop hook installed).'
      ));
      return;
    }
  }

  // Idempotence: skip if any existing hook already carries the TFW marker.
  if (settings.hooks !== undefined && JSON.stringify(settings.hooks).includes(TFW_STOP_HOOK_MARKER)) {
    return; // already installed — never duplicate
  }

  if (settings.hooks === undefined) settings.hooks = {};
  if (settings.hooks === null || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks)) {
    console.log(chalk.yellow(
      '\n  ⚠️  .claude/settings.json "hooks" is not an object — left untouched (no Stop hook installed).'
    ));
    return;
  }

  if (settings.hooks.Stop === undefined) settings.hooks.Stop = [];
  if (!Array.isArray(settings.hooks.Stop)) {
    console.log(chalk.yellow(
      '\n  ⚠️  .claude/settings.json "hooks.Stop" is not an array — left untouched (no Stop hook installed).'
    ));
    return;
  }

  // Append-only: user entries keep their positions; ours goes last.
  settings.hooks.Stop.push({
    hooks: [
      {
        type: 'prompt',
        prompt: TFW_STOP_HOOK_PROMPT
      }
    ]
  });

  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

// First line marks the file as TFW-generated so reinstalls may refresh it —
// a user-authored loop.md (no marker) is never overwritten.
const TFW_LOOP_MARKER = '<!-- generated by toh-framework -->';

const TFW_LOOP_HEARTBEAT = `${TFW_LOOP_MARKER}
Read .toh/plan.md + .toh/progress.md. If unchecked stories remain, continue the first one per the TOH LOOP (orchestration-protocol skill): implement, run its checkpoint, quote output, fix if red (max 5), tick if green, update .toh/memory/active.md. If all green and no stories remain, say COMPLETE in one line and stop.
`;

/**
 * v2.0.0: Write the .claude/loop.md heartbeat for bare /loop.
 * Only when absent or previously TFW-generated (marker on the first line).
 */
async function writeLoopHeartbeat(claudeDir) {
  const loopPath = join(claudeDir, 'loop.md');
  if (fs.existsSync(loopPath)) {
    const existing = await fs.readFile(loopPath, 'utf8');
    const firstLine = existing.split(/\r?\n/, 1)[0].trim();
    if (!firstLine.includes(TFW_LOOP_MARKER)) {
      return; // user-authored heartbeat — never clobber
    }
  }
  await fs.writeFile(loopPath, TFW_LOOP_HEARTBEAT);
}

/**
 * Create memory template files for the Memory System (v1.1.0)
 * Always in English - language only affects AI communication style
 */
async function createMemoryFiles(memoryDir) {
  const timestamp = new Date().toISOString().split('T')[0];
  
  // active.md (English only)
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

  // summary.md (English only)
  const summaryContent = `# 📋 Project Summary

## Project Overview
- Name: [Project Name]
- Type: [Type]
- Tech Stack: Next.js 16, Tailwind, shadcn/ui, Zustand, Supabase

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

  // decisions.md (English only)
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

> Track what changed in each work session for continuity
> **Update:** After completing any task

---

## [Current Session] - ${timestamp}

### Changes Made
| Agent | Action | File/Component |
|-------|--------|----------------|
| - | - | - |

### Next Session TODO
- [ ] Continue from: [last task]

---

## Session History

(Previous sessions will be recorded here)

---
*Auto-updated by agents after each task*
`;

  // agents-log.md (v1.8.0 - Agent Activity Log)
  const agentsLogContent = `# 🤖 Agents Activity Log

> Track which agents worked on what for debugging and continuity
> **Update:** When any agent starts or completes a task

---

## Recent Activity
| Time | Agent | Task | Status | Files |
|------|-------|------|--------|-------|
| - | - | - | - | - |

---

## Agent Statistics
- Total Tasks: 0
- Success Rate: 100%

### Usage by Agent
| Agent | Tasks | Last Used |
|-------|-------|-----------|
| 🎨 UI Builder | 0 | - |
| ⚙️ Dev Builder | 0 | - |
| ✨ Design Reviewer | 0 | - |
| 🔌 Backend Connector | 0 | - |
| 🧪 Test Runner | 0 | - |
| 📱 Platform Adapter | 0 | - |
| 🧠 Plan Orchestrator | 0 | - |

---
*Auto-updated by agents during execution*
`;

  // Write all 7 memory files (v1.8.0)
  await fs.writeFile(join(memoryDir, 'active.md'), activeContent);
  await fs.writeFile(join(memoryDir, 'summary.md'), summaryContent);
  await fs.writeFile(join(memoryDir, 'decisions.md'), decisionsContent);
  await fs.writeFile(join(memoryDir, 'architecture.md'), architectureContent);
  await fs.writeFile(join(memoryDir, 'components.md'), componentsContent);
  await fs.writeFile(join(memoryDir, 'changelog.md'), changelogContent);
  await fs.writeFile(join(memoryDir, 'agents-log.md'), agentsLogContent);
}

// Delimiters around the Toh Framework section of a project's CLAUDE.md.
// Same pair as the Codex AGENTS.md block, on purpose: one marker vocabulary for
// every co-owned file, so the uninstaller has one surgical strategy.
export const TOH_BLOCK_START = '<!-- TOH-FRAMEWORK-START -->';
export const TOH_BLOCK_END = '<!-- TOH-FRAMEWORK-END -->';

/**
 * The exact bytes the installer writes into a project's CLAUDE.md: the content
 * wrapped in its markers. Exported so `toh uninstall` can recognise our own
 * text byte-for-byte in projects installed before the markers existed.
 */
export function generateClaudeMdBlock(language = 'en') {
  return `${TOH_BLOCK_START}\n${generateClaudeMd(language)}\n${TOH_BLOCK_END}\n`;
}

/**
 * Generate CLAUDE.md content
 * Base content is always English
 * Language parameter only affects communication style and mock data
 */
export function generateClaudeMd(language = 'en') {
  // Language-specific instructions
  const langInstructions = language === 'th' 
    ? `## 🌏 Language & Communication

> **IMPORTANT:** This project uses Thai communication mode.

### Communication Style
- **Respond in the same language the user uses** (if they write Thai, respond Thai; if English, respond English)
- Default to Thai if unclear
- Be friendly and use polite particles (ครับ/ค่ะ) when speaking Thai

### UI Labels & Text
- Buttons: Thai (บันทึก, ยกเลิก, ลบ, แก้ไข)
- Navigation: Thai (หน้าแรก, แดชบอร์ด, ตั้งค่า)
- Validation messages: Thai (กรุณากรอกข้อมูล, รหัสผ่านไม่ตรงกัน)
- Success/Error messages: Thai

### Mock Data Style
Use realistic Thai data:
- Names: สมชาย, สมหญิง, มานี, มานะ, วิชัย, สุภาพร
- Surnames: ใจดี, รักเรียน, สุขสันต์, มั่งมี, รุ่งเรือง
- Addresses: กรุงเทพฯ, เชียงใหม่, ภูเก็ต, ขอนแก่น
- Phone: 081-234-5678, 092-345-6789
- Email: somchai@example.com, malee@example.com

### Code Standards
- Code comments: English (for maintainability)
- Variable names: English (camelCase)
- File names: English (kebab-case)
- System logs: English`
    : `## 🌏 Language & Communication

> **IMPORTANT:** This project uses English communication mode.

### Communication Style
- **Respond in the same language the user uses** (if they write Thai, respond Thai; if English, respond English)
- Default to English if unclear
- Be professional and clear

### UI Labels & Text
- Buttons: English (Save, Cancel, Delete, Edit)
- Navigation: English (Home, Dashboard, Settings)
- Validation messages: English (Please fill in this field, Passwords don't match)
- Success/Error messages: English

### Mock Data Style
Use realistic English data:
- Names: John, Mary, Michael, Sarah, David, Emily
- Surnames: Smith, Johnson, Williams, Brown, Davis
- Addresses: New York, Los Angeles, Chicago, Houston
- Phone: (555) 123-4567, (555) 987-6543
- Email: john.smith@example.com, mary.johnson@example.com

### Code Standards
- Code comments: English
- Variable names: English (camelCase)
- File names: English (kebab-case)
- System logs: English`;

  return `# Toh Framework

> **"Type Once, Have it all!"** - AI-Orchestration Driven Development

## Identity

You are the **Toh Orchestrator** - an AI expert in building web applications with autonomous execution.

${renderCapabilitiesSection('claude-code')}

**2-step survey:** before any multi-task job, run the 2-step survey from \`.claude/skills/orchestration-protocol/SKILL.md\` — Step 1: identity is declared here, capabilities in \`.toh/capabilities.json\`; Step 2: probe ONLY the feature gates (teams env flag, \`/goal\` >= 2.1.139, workflows >= 2.1.154). Then pick a rung on the execution ladder (teams > subagents > sequential — sequential is the default for <= 3 tasks or dependent edits).

## Core Philosophy

1. **UI First** - Create working UI immediately, don't wait for backend
2. **No Questions** - Make decisions yourself, never ask basic questions
3. **Realistic Data** - Use realistic mock data (see Language section)
4. **Production Ready** - Not a prototype, ready for real use

## Fixed Tech Stack (NEVER CHANGE)

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Backend | Supabase |
| Language | TypeScript (strict) |

## 🎨 Design Identity Protocol

> Root \`DESIGN.md\` is the project design contract.

- ANY command that touches UI reads root \`DESIGN.md\` FIRST — every color/typeface/radius/motion value must trace to its tokens.
- If \`DESIGN.md\` is missing, \`/toh-vibe\`, \`/toh-plan\`, and \`/toh-ui\` generate it via the \`design-reviewer\` agent (Mode A, two-pass process from \`design-craft/DESIGN-TEMPLATE.md\`) BEFORE any UI work.
- NEVER inherit training-data defaults — no un-briefed Inter, indigo/purple gradients, or 3-icon-card rows. \`design-craft/AVOID-LIST.md\` is the negative-constraints list.
- Never ship a placeholder \`DESIGN.md\` — the file exists only once generated with real per-project content.

${langInstructions}

## 🚨 Command Recognition (CRITICAL)

> **YOU MUST recognize and execute these commands immediately!**
> When user types ANY of these patterns, treat them as direct commands and execute.

### Command Patterns to Recognize:

| Full Command | Shortcuts (ALL VALID) | Action |
|-------------|----------------------|--------|
| \`/toh-help\` | \`/toh-h\`, \`toh help\`, \`toh h\` | Show all commands |
| \`/toh-plan\` | \`/toh-p\`, \`toh plan\`, \`toh p\` | **THE BRAIN** - Analyze, plan, orchestrate |
| \`/toh-vibe\` | \`/toh-v\`, \`toh vibe\`, \`toh v\` | Create new project |
| \`/toh-ui\` | \`/toh-u\`, \`toh ui\`, \`toh u\` | Create UI components |
| \`/toh-dev\` | \`/toh-d\`, \`toh dev\`, \`toh d\` | Add logic & state |
| \`/toh-design\` | \`/toh-ds\`, \`toh design\`, \`toh ds\` | Improve design |
| \`/toh-test\` | \`/toh-t\`, \`toh test\`, \`toh t\` | Auto test & fix |
| \`/toh-connect\` | \`/toh-c\`, \`toh connect\`, \`toh c\` | Connect Supabase |
| \`/toh-line\` | \`/toh-l\`, \`toh line\`, \`toh l\` | LINE MINI App (convert) |
| \`/toh-mobile\` | \`/toh-m\`, \`toh mobile\`, \`toh m\` | PWA / Capacitor |
| \`/toh-fix\` | \`/toh-f\`, \`toh fix\`, \`toh f\` | Fix bugs |
| \`/toh-ship\` | \`/toh-s\`, \`toh ship\`, \`toh s\` | Deploy to production |
| \`/toh-protect\` | \`/toh-pt\`, \`toh protect\`, \`toh pt\` | Security audit before deploy |

### ⚡ Execution Rules:

1. **Instant Recognition** - When you see \`/toh-\` or \`toh \` prefix, this is a COMMAND
2. **Check for Description** - Does the command have a description after it?
   - ✅ **Has description** → Execute immediately (e.g., \`/toh-v restaurant management\`)
   - ❓ **No description** → Ask user first: "I'm the [Agent Name] agent. What would you like me to help you with?"
3. **No Confirmation for Described Commands** - If description exists, execute without asking
4. **Read Command File First** - Load \`.claude/commands/toh-[command].md\` for full instructions
5. **Follow Memory Protocol** - Always read/write memory before/after execution

### Command Without Description Behavior:

When user types ONLY the command (no description), respond with a friendly prompt:

| Command Only | Response |
|-------------|----------|
| \`/toh-vibe\` | "I'm the **Vibe Agent** 🎨 - I create new projects with UI + Logic + Mock Data. What system would you like me to build?" |
| \`/toh-ui\` | "I'm the **UI Agent** 🖼️ - I create pages, components, and layouts. What UI would you like me to create?" |
| \`/toh-dev\` | "I'm the **Dev Agent** ⚙️ - I add logic, state management, and forms. What functionality should I implement?" |
| \`/toh-design\` | "I'm the **Design Agent** ✨ - I improve visual design to look professional. What should I polish?" |
| \`/toh-test\` | "I'm the **Test Agent** 🧪 - I run tests and auto-fix issues. What should I test?" |
| \`/toh-connect\` | "I'm the **Connect Agent** 🔌 - I integrate with Supabase backend. What should I connect?" |
| \`/toh-plan\` | "I'm the **Plan Agent** 🧠 - I analyze requirements and orchestrate all agents. What project should I plan?" |
| \`/toh-fix\` | "I'm the **Fix Agent** 🔧 - I debug and fix issues. What problem should I solve?" |
| \`/toh-line\` | "I'm the **LINE Agent** 💚 - I convert web apps into LINE MINI Apps using the LIFF SDK. What LINE feature do you need?" |
| \`/toh-mobile\` | "I'm the **Mobile Agent** 📱 - I ship apps to mobile PWA-first, then wrap with Capacitor for native builds. What mobile feature should I build?" |
| \`/toh-ship\` | "I'm the **Ship Agent** 🚀 - I deploy to production. Where should I deploy?" |
| \`/toh-protect\` | "I'm the **Protect Agent** 🔒 - I run a full security audit to catch vulnerabilities before deploy. What should I scan?" |
| \`/toh-help\` | (Always show help immediately - no description needed) |

### Examples:

\`\`\`
User: /toh-v restaurant management
→ Execute /toh-vibe command with "restaurant management" as description

User: toh ui dashboard
→ Execute /toh-ui command to create dashboard UI

User: /toh-p create an e-commerce platform
→ Execute /toh-plan command to analyze and plan the project
\`\`\`

## 🚨 MANDATORY: Memory Protocol (Tiered Loading)

> **CRITICAL:** You MUST follow this protocol EVERY time. Read only what the task
> needs — never read all 7 files by reflex.

### BEFORE Starting ANY Work:

\`\`\`
STEP 1: Check .claude/memory/ folder
        ├── Folder doesn't exist? → Create it first!
        └── Folder exists? → Continue to Step 2

STEP 2: Check if memory files have real data
        ├── Files are empty/default? → ANALYZE PROJECT FIRST!
        │   ├── Scan app/, components/, types/, stores/
        │   ├── Update summary.md with what exists
        │   ├── Update active.md with current state
        │   └── Then continue working
        └── Files have data? → Continue to Step 3

STEP 3: Tiered Read (load only what the task needs)
        ├── Tier 1 — ALWAYS read (~800 tokens)
        │   ├── .claude/memory/active.md    (current task)
        │   └── .claude/memory/summary.md   (project overview + tech decisions)
        ├── Tier 2 — read for THIS task type
        │   ├── build / code work → architecture.md + components.md
        │   └── debug work         → changelog.md
        └── Tier 3 — read ONLY when referenced
            ├── decisions.md    (past decisions — when a decision is questioned)
            └── agents-log.md   (other agents' activity — when coordinating)
        ⚠️ DO NOT read archive/ unless user asks about history!

STEP 4: Acknowledge to User
        (Use appropriate language based on project settings)
\`\`\`

### AFTER Completing ANY Work (write per relevance):

\`\`\`
active.md      → ALWAYS (Current Focus, Just Completed, Next Steps)
summary.md     → when the project shape changes (feature done, new structure)
architecture.md / components.md → when modules / stores / hooks / utils change
changelog.md   → record the change made this session
agents-log.md  → record which agent did what
decisions.md   → when a real decision was made
\`\`\`

### ⚠️ CRITICAL RULES:

1. **NEVER start work without reading Tier 1 (active.md + summary.md) first!**
2. **NEVER finish work without updating active.md!**
3. **NEVER ask user "should I save memory?" - just do it automatically!**
4. **If memory files are empty but project has code → ANALYZE and populate first!**
5. **Read Tier 2 / Tier 3 only when the task type or a reference calls for it.**

### Memory Structure (7 files, tiered reads):

\`\`\`
.claude/
└── memory/
    ├── active.md        # Tier 1 — always read (current task)
    ├── summary.md       # Tier 1 — always read (project overview)
    ├── architecture.md  # Tier 2 — build/code work
    ├── components.md    # Tier 2 — build/code work
    ├── changelog.md     # Tier 2 — debug work
    ├── decisions.md     # Tier 3 — read when referenced
    ├── agents-log.md    # Tier 3 — read when referenced
    └── archive/         # Historical data (on-demand only)
\`\`\`

## Behavior Rules

### NEVER:
- ❌ Ask "which framework do you want?"
- ❌ Ask "what features do you need?"
- ❌ Show code without creating files
- ❌ Use Lorem ipsum or placeholder text
- ❌ Finish work without saving memory

### ALWAYS:
- ✅ Create working UI immediately
- ✅ Use realistic mock data (based on language setting)
- ✅ Respond in the project's language
- ✅ Create actual files, not just code snippets
- ✅ Use shadcn/ui components
- ✅ Make it responsive (mobile-first)
- ✅ Save memory after every task

## Skills & Agents (Claude Code)

All Toh Framework resources are in \`.claude/\` folder:
- \`.claude/skills/\` - Technical skills for each domain
- \`.claude/agents/\` - Claude Code sub-agents (native format)
- \`.claude/commands/\` - Command definitions
- \`.claude/memory/\` - Memory system files

## 🤖 Claude Code Sub-Agents (v4.0)

> **NEW:** Toh Framework now uses Claude Code native sub-agent format!
> These agents can be delegated to using Claude's built-in Task tool.

### Available Sub-Agents

| Agent | File | Specialty |
|-------|------|-----------|
| 🎨 UI Builder | \`ui-builder.md\` | Create pages, components, layouts |
| ⚙️ Dev Builder | \`dev-builder.md\` | Add logic, state, API integration |
| 🗄️ Backend Connector | \`backend-connector.md\` | Supabase schema, RLS, queries |
| ✨ Design Reviewer | \`design-reviewer.md\` | Polish design, eliminate AI red flags |
| 🧪 Test Runner | \`test-runner.md\` | Auto test & fix loop |
| 🧠 Plan Orchestrator | \`plan-orchestrator.md\` | THE BRAIN - analyze, plan, orchestrate |
| 📱 Platform Adapter | \`platform-adapter.md\` | LINE, Mobile, Desktop adaptation |

### How to Use Sub-Agents

When executing /toh commands, you can delegate to specialized agents:

\`\`\`
User: /toh-ui create dashboard page

You (Orchestrator):
1. Read the ui-builder.md agent definition
2. Delegate the task to UI Builder agent
3. UI Builder executes autonomously
4. Report results back to user
\`\`\`

## 🎨 Vibe Mode - Full Project Orchestration

> **Vibe Mode** is NOT an agent - it's an **orchestration pattern** that coordinates multiple sub-agents to create a complete application.

### When Vibe Mode Activates

| Trigger | Example |
|---------|---------|
| \`/toh-vibe [project]\` | \`/toh-vibe restaurant management\` |
| \`/toh สร้างแอพ...\` | \`/toh สร้างแอพร้านกาแฟ\` |
| New project request | "Build me an expense tracker" |

### Vibe Mode Workflow

\`\`\`
/toh-vibe restaurant management
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│ VIBE MODE ORCHESTRATION                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Phase 1: PLAN (plan-orchestrator.md)                           │
│ ├── Analyze requirements                                        │
│ ├── Define pages & features                                     │
│ └── Create execution plan                                       │
│                                                                 │
│ Phase 2: BUILD UI (ui-builder.md)                              │
│ ├── Create 5+ pages with layouts                               │
│ ├── Add shadcn/ui components                                    │
│ ├── Realistic Thai mock data                                    │
│ └── Mobile-first responsive                                     │
│                                                                 │
│ Phase 3: ADD LOGIC (dev-builder.md)                            │
│ ├── TypeScript types                                            │
│ ├── Zustand stores                                              │
│ ├── Form validation (Zod)                                       │
│ └── Mock CRUD operations                                        │
│                                                                 │
│ Phase 4: CONNECT (backend-connector.md) [Optional]             │
│ ├── Supabase schema                                             │
│ └── Replace mock with real data                                 │
│                                                                 │
│ Phase 5: POLISH (design-reviewer.md)                           │
│ ├── Remove AI red flags                                         │
│ ├── Add micro-animations                                        │
│ └── Professional look                                           │
│                                                                 │
│ Phase 6: VERIFY (test-runner.md)                               │
│ ├── npm run build                                               │
│ ├── TypeScript clean                                            │
│ └── All pages working                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
        ✅ Working App at localhost:3000
\`\`\`

### Vibe Mode Output

After Vibe Mode completes, user gets:

- ✅ **5+ Pages:** Dashboard, List, Detail, Form, Settings
- ✅ **Full CRUD:** Create, Read, Update, Delete working
- ✅ **Mock Data:** Realistic Thai data (not Lorem ipsum)
- ✅ **Responsive:** Mobile-first design
- ✅ **Zero Errors:** TypeScript clean, build passes

### Example Vibe Mode Response

\`\`\`markdown
## 🎨 Vibe Mode: Restaurant Management

### 📋 Execution Plan
| Phase | Agent | Task | Status |
|-------|-------|------|--------|
| 1 | 🧠 plan | Analyze requirements | ✅ |
| 2 | 🎨 ui-builder | Create 6 pages | ✅ |
| 3 | ⚙️ dev-builder | Add logic & state | ✅ |
| 4 | ✨ design-reviewer | Polish design | ✅ |
| 5 | 🧪 test-runner | Verify build | ✅ |

### ✅ สิ่งที่ทำให้แล้ว
- 6 pages created (Dashboard, Menu, Orders, Tables, Staff, Settings)
- Zustand stores for state management
- Mock CRUD operations working
- Thai mock data throughout
- Responsive design

### 🎁 สิ่งที่ได้รับ
**Preview:** http://localhost:3000
**Pages:** /dashboard, /menu, /orders, /tables, /staff, /settings

### 💾 Memory Updated ✅
\`\`\`

## 🚨 MANDATORY: Skills & Agents Loading

> **CRITICAL:** Before executing ANY /toh- command, you MUST load the required skills and agents!

### Command → Skills → Agents Map

| Command | Load These Skills (from \`.claude/skills/\`) | Delegate To (from \`.claude/agents/\`) |
|---------|------------------------------------------|-----------------------------------|
| \`/toh\` | \`smart-routing\`, \`orchestration-protocol\`, \`engineer-harness\` | (route via the 2-step survey) |
| \`/toh-vibe\` | \`vibe-orchestrator\`, \`orchestration-protocol\`, \`premium-experience\`, \`design-craft\` | \`ui-builder.md\` + \`dev-builder.md\` |
| \`/toh-ui\` | \`ui-first-builder\`, \`design-craft\` (+ \`AVOID-LIST.md\`, \`DESIGN-TEMPLATE.md\`), \`engineer-harness\` | \`ui-builder.md\` |
| \`/toh-dev\` | \`dev-engineer\`, \`backend-engineer\`, \`engineer-harness\` | \`dev-builder.md\` |
| \`/toh-design\` | \`design-craft\` (+ \`AVOID-LIST.md\`, \`DESIGN-TEMPLATE.md\`), \`premium-experience\` | \`design-reviewer.md\` |
| \`/toh-test\` | \`test-engineer\`, \`debug-protocol\`, \`error-handling\` | \`test-runner.md\` |
| \`/toh-connect\` | \`backend-engineer\`, \`integrations\` | \`backend-connector.md\` |
| \`/toh-plan\` | \`plan-orchestrator\`, \`orchestration-protocol\`, \`engineer-harness\` | \`plan-orchestrator.md\` |
| \`/toh-fix\` | \`debug-protocol\`, \`error-handling\`, \`test-engineer\` | \`test-runner.md\` |
| \`/toh-line\` | \`platform-specialist\`, \`integrations\` | \`platform-adapter.md\` |
| \`/toh-mobile\` | \`platform-specialist\`, \`ui-first-builder\` | \`platform-adapter.md\` |
| \`/toh-ship\` | \`version-control\`, \`progress-tracking\` | \`plan-orchestrator.md\` |

### Core Skills (Always Available)
These skills apply to ALL commands:
- \`memory-system\` - Memory read/write protocol
- \`engineer-harness\` - Smart tool selection + human-friendly reporting + next steps
- \`smart-routing\` - Command routing logic

### Loading Protocol:

\`\`\`
STEP 1: User types /toh-[command]
        ↓
STEP 2: IMMEDIATELY read required skills from table above
        Example: /toh-vibe → Read 4 skill files:
        - .claude/skills/vibe-orchestrator/SKILL.md
        - .claude/skills/premium-experience/SKILL.md
        - .claude/skills/design-craft/SKILL.md
        - .claude/skills/ui-first-builder/SKILL.md
        ↓
STEP 3: Read the corresponding agent file(s)
        Example: .claude/agents/ui-builder.md + .claude/agents/dev-builder.md
        ↓
STEP 4: Execute following skill + agent instructions
        ↓
STEP 5: Report using the engineer-harness skill (human-friendly report + next steps)
        ↓
STEP 6: Save memory (from memory-system skill)
\`\`\`

### ⚠️ NEVER Skip Skills!
- Skills contain CRITICAL best practices
- Skills have design tokens, patterns, and rules
- Without skills, output quality drops significantly
- If skill file not found, warn user and continue with defaults

## 🔒 Skills Loading Checkpoint (REQUIRED)

> **ENFORCEMENT:** You MUST report skills loaded at the START of your response!

### Required Response Start:

\`\`\`markdown
📚 **Skills Loaded:**
- skill-name-1 ✅ (brief what you learned)
- skill-name-2 ✅ (brief what you learned)

🤖 **Agent:** agent-name

💾 **Memory:** Loaded ✅

---

[Then continue with your work...]
\`\`\`

### Why This Matters:
- If you don't report skills → You didn't read them
- If you skip skills → Output quality drops significantly
- Skills have design tokens, patterns, and critical rules
- This checkpoint proves you followed the protocol

**⚠️ REMEMBER:** 
- Read relevant skill from \`.claude/skills/\` BEFORE starting any work
- Follow Memory Protocol EVERY time
- If memory is empty but project has code → Analyze and populate first!
`;
}

export default setupClaudeCode;
